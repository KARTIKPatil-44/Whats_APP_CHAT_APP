import localforage from 'localforage';
import { cryptoManager } from './crypto';

/**
 * Simplified Google Drive Backup Manager
 * Works with OAuth 2.0 client-side flow
 */

class SimplifiedBackupManager {
  constructor() {
    this.CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
    this.tokenClient = null;
    this.accessToken = null;
  }

  /**
   * Initialize Google Identity Services
   */
  async initGoogle() {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (response) => {
            if (response.error) {
              reject(response);
              return;
            }
            this.accessToken = response.access_token;
            resolve(response);
          },
        });
        
        console.log('Google Identity Services initialized');
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Request access token
   */
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      // Update callback for this specific request
      this.tokenClient.callback = (response) => {
        if (response.error) {
          reject(response);
          return;
        }
        this.accessToken = response.access_token;
        resolve(response.access_token);
      };

      this.tokenClient.requestAccessToken();
    });
  }

  /**
   * Derive backup key from password
   */
  async deriveBackupKey(password, userId) {
    const encoder = new TextEncoder();
    const salt = encoder.encode(userId + '-backup-securechat-v1');
    
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export backup data
   */
  async exportBackupData(userId) {
    // Get messages from localforage
    const messagesStore = localforage.createInstance({
      name: 'secureChat',
      storeName: 'encrypted_messages'
    });

    const allMessages = {};
    const keys = await messagesStore.keys();
    
    for (const key of keys) {
      const messages = await messagesStore.getItem(key);
      allMessages[key] = messages;
    }

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      userId: userId,
      messages: allMessages,
      messageCount: Object.values(allMessages).reduce((sum, msgs) => sum + (msgs?.length || 0), 0)
    };

    return JSON.stringify(backupData);
  }

  /**
   * Encrypt backup
   */
  async encryptBackup(backupData, password, userId) {
    const backupKey = await this.deriveBackupKey(password, userId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      backupKey,
      new TextEncoder().encode(backupData)
    );

    return {
      version: 1,
      algorithm: 'AES-256-GCM-PBKDF2',
      iterations: 600000,
      iv: this.arrayBufferToBase64(iv),
      ciphertext: this.arrayBufferToBase64(encrypted),
      timestamp: Date.now(),
      userId: userId
    };
  }

  /**
   * Upload to Google Drive
   */
  async uploadToDrive(encryptedBackup) {
    const token = await this.getAccessToken();
    const filename = `securechat_backup_${Date.now()}.enc`;
    
    const metadata = {
      name: filename,
      mimeType: 'application/octet-stream'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(encryptedBackup)], { type: 'application/octet-stream' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List backups
   */
  async listBackups() {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'securechat_backup'&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list backups');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download from Drive
   */
  async downloadBackup(fileId) {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    return await response.text();
  }

  /**
   * Decrypt backup
   */
  async decryptBackup(encryptedBackup, password, userId) {
    const backupPackage = JSON.parse(encryptedBackup);
    
    if (backupPackage.version !== 1) {
      throw new Error('Unsupported backup version');
    }

    const backupKey = await this.deriveBackupKey(password, userId);
    const iv = this.base64ToArrayBuffer(backupPackage.iv);
    const ciphertext = this.base64ToArrayBuffer(backupPackage.ciphertext);

    try {
      const plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        backupKey,
        ciphertext
      );

      const backupData = JSON.parse(new TextDecoder().decode(plaintext));
      
      if (backupData.userId !== userId) {
        throw new Error('Backup belongs to different user');
      }

      return backupData;
    } catch (error) {
      throw new Error('Invalid password - decryption failed');
    }
  }

  /**
   * Restore backup data
   */
  async restoreBackupData(backupData) {
    const messagesStore = localforage.createInstance({
      name: 'secureChat',
      storeName: 'encrypted_messages'
    });

    for (const [chatId, messages] of Object.entries(backupData.messages)) {
      await messagesStore.setItem(chatId, messages);
    }

    return {
      success: true,
      messageCount: backupData.messageCount,
      restoreDate: new Date().toISOString()
    };
  }

  /**
   * Complete backup flow
   */
  async createBackup(password, userId) {
    await this.initGoogle();
    const backupData = await this.exportBackupData(userId);
    const encrypted = await this.encryptBackup(backupData, password, userId);
    const result = await this.uploadToDrive(encrypted);
    return result;
  }

  /**
   * Complete restore flow
   */
  async restoreBackup(fileId, password, userId) {
    const encrypted = await this.downloadBackup(fileId);
    const backupData = await this.decryptBackup(encrypted, password, userId);
    const result = await this.restoreBackupData(backupData);
    return result;
  }

  // Utility functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const backupManager = new SimplifiedBackupManager();