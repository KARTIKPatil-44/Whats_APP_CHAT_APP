/**
 * Google Drive Backup Manager
 * Uses Google Identity Services (GIS) for OAuth 2.0
 * Implements zero-knowledge encrypted backups
 */

import localforage from 'localforage';
import { storage } from './storage';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

class GoogleDriveBackupManager {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.gisInitialized = false;
    this.initPromise = null;
  }

  /**
   * Load Google Identity Services script dynamically
   */
  async loadGISScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.onload = () => resolve();
        existingScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        return;
      }

      // Create new script element
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Identity Services
   */
  async initializeGIS() {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized
    if (this.gisInitialized && this.tokenClient) {
      return Promise.resolve();
    }

    this.initPromise = (async () => {
      try {
        await this.loadGISScript();

        // Wait for google object to be available
        let retries = 0;
        while (!window.google?.accounts?.oauth2 && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!window.google?.accounts?.oauth2) {
          throw new Error('Google Identity Services not available');
        }

        // Create token client
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // Will be overridden in requestAccessToken
          error_callback: (error) => {
            console.error('GIS error:', error);
          }
        });

        this.gisInitialized = true;
        console.log('Google Identity Services initialized successfully');
      } catch (error) {
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Request access token via OAuth popup
   */
  async requestAccessToken() {
    await this.initializeGIS();

    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      // Set up the callback for this specific request
      this.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('Token request error:', response);
          reject(new Error(response.error_description || response.error));
          return;
        }
        this.accessToken = response.access_token;
        console.log('Access token obtained successfully');
        resolve(response.access_token);
      };

      // Request token - will open OAuth consent popup
      try {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get valid access token (request new one if needed)
   */
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }
    return await this.requestAccessToken();
  }

  /**
   * Derive backup encryption key from password using PBKDF2
   */
  async deriveBackupKey(password, userId) {
    const encoder = new TextEncoder();
    const salt = encoder.encode(`${userId}-securechat-backup-v1`);

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
   * Export all backup data from local storage
   */
  async exportBackupData(userId) {
    try {
      // Get messages from localforage/storage
      const messagesStore = localforage.createInstance({
        name: 'secureChat',
        storeName: 'encrypted_messages'
      });

      const allMessages = {};
      const keys = await messagesStore.keys();

      for (const key of keys) {
        const messages = await messagesStore.getItem(key);
        if (messages) {
          allMessages[key] = messages;
        }
      }

      // Try to get contacts from localStorage
      let contacts = [];
      try {
        contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      } catch (e) {
        console.warn('Could not parse contacts:', e);
      }

      const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        userId: userId,
        messages: allMessages,
        contacts: contacts,
        metadata: {
          messageCount: Object.values(allMessages).reduce((sum, msgs) => sum + (Array.isArray(msgs) ? msgs.length : 0), 0),
          contactCount: contacts.length,
          backupType: 'google_drive'
        }
      };

      return JSON.stringify(backupData);
    } catch (error) {
      console.error('Failed to export backup data:', error);
      throw new Error('Failed to export chat data for backup');
    }
  }

  /**
   * Encrypt backup data
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
      version: 2,
      algorithm: 'AES-256-GCM-PBKDF2',
      iterations: 600000,
      iv: this.arrayBufferToBase64(iv),
      ciphertext: this.arrayBufferToBase64(encrypted),
      timestamp: Date.now(),
      userId: userId
    };
  }

  /**
   * Upload encrypted backup to Google Drive
   */
  async uploadToDrive(encryptedBackup) {
    const token = await this.getAccessToken();
    const filename = `securechat_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.enc`;

    const metadata = {
      name: filename,
      mimeType: 'application/octet-stream',
      description: 'SecureChat encrypted backup'
    };

    // Create multipart form data
    const boundary = '-------SecureChatBackupBoundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/octet-stream\r\n\r\n' +
      JSON.stringify(encryptedBackup) +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List available backups from Google Drive
   */
  async listBackups() {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'securechat_backup' and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size,description)`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('List backups failed:', error);
      throw new Error('Failed to list backups from Google Drive');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download backup from Google Drive
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
      const error = await response.text();
      console.error('Download failed:', error);
      throw new Error('Failed to download backup from Google Drive');
    }

    return await response.text();
  }

  /**
   * Decrypt backup data
   */
  async decryptBackup(encryptedBackup, password, userId) {
    const backupPackage = JSON.parse(encryptedBackup);

    if (backupPackage.version !== 2 && backupPackage.version !== 1) {
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

      // Verify user ownership
      if (backupData.userId !== userId) {
        throw new Error('This backup belongs to a different user account');
      }

      return backupData;
    } catch (error) {
      if (error.name === 'OperationError') {
        throw new Error('Invalid password - decryption failed');
      }
      throw error;
    }
  }

  /**
   * Restore backup data to local storage
   */
  async restoreBackupData(backupData) {
    const messagesStore = localforage.createInstance({
      name: 'secureChat',
      storeName: 'encrypted_messages'
    });

    let restoredMessages = 0;

    // Restore messages
    for (const [chatId, messages] of Object.entries(backupData.messages || {})) {
      if (Array.isArray(messages)) {
        await messagesStore.setItem(chatId, messages);
        restoredMessages += messages.length;
      }
    }

    // Restore contacts
    if (backupData.contacts && Array.isArray(backupData.contacts)) {
      localStorage.setItem('contacts', JSON.stringify(backupData.contacts));
    }

    return {
      success: true,
      messageCount: restoredMessages,
      contactCount: backupData.contacts?.length || 0,
      restoreDate: new Date().toISOString()
    };
  }

  /**
   * Complete backup flow
   */
  async createBackup(password, userId, onProgress) {
    try {
      onProgress?.('Initializing Google Drive...');
      await this.initializeGIS();

      onProgress?.('Connecting to Google Drive...');
      await this.requestAccessToken();

      onProgress?.('Exporting chat data...');
      const backupData = await this.exportBackupData(userId);

      onProgress?.('Encrypting backup...');
      const encrypted = await this.encryptBackup(backupData, password, userId);

      onProgress?.('Uploading to Google Drive...');
      const result = await this.uploadToDrive(encrypted);

      return result;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  /**
   * Complete restore flow
   */
  async restoreBackup(fileId, password, userId, onProgress) {
    try {
      onProgress?.('Downloading backup from Google Drive...');
      const encrypted = await this.downloadBackup(fileId);

      onProgress?.('Decrypting backup...');
      const backupData = await this.decryptBackup(encrypted, password, userId);

      onProgress?.('Restoring data...');
      const result = await this.restoreBackupData(backupData);

      return result;
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Revoke access and clear tokens
   */
  revokeAccess() {
    if (this.accessToken) {
      // Revoke token
      window.google?.accounts?.oauth2?.revoke?.(this.accessToken, () => {
        console.log('Token revoked');
      });
    }
    this.accessToken = null;
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

export const googleDriveBackup = new GoogleDriveBackupManager();
