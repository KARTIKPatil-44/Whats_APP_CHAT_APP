import { storage } from './storage';
import { cryptoManager } from './crypto';

/**
 * Google Drive Backup System
 * Zero-knowledge encrypted backup implementation
 */

class BackupManager {
  constructor() {
    this.CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
    this.API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY';
    this.SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
    this.DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
  }

  /**
   * Initialize Google Drive API
   */
  async initGoogleDrive() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            apiKey: this.API_KEY,
            clientId: this.CLIENT_ID,
            discoveryDocs: this.DISCOVERY_DOCS,
            scope: this.SCOPES
          }).then(() => {
            resolve(window.gapi.client);
          }).catch(reject);
        });
      } else {
        reject(new Error('Google API not loaded'));
      }
    });
  }

  /**
   * Authenticate with Google
   */
  async authenticateGoogle() {
    try {
      const googleAuth = window.gapi.auth2.getAuthInstance();
      if (!googleAuth.isSignedIn.get()) {
        await googleAuth.signIn();
      }
      return true;
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new Error('Failed to authenticate with Google Drive');
    }
  }

  /**
   * Derive backup encryption key from user password using PBKDF2
   */
  async deriveBackupKey(password, userId) {
    const encoder = new TextEncoder();
    
    // Salt = userId + static context (prevents rainbow tables)
    const salt = encoder.encode(userId + '-backup-v1-securechat');
    
    // Import password as key material
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive AES-256 key using PBKDF2 with 600K iterations (OWASP 2023)
    const backupKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,  // High iteration count for security
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,  // Not extractable
      ['encrypt', 'decrypt']
    );
    
    return backupKey;
  }

  /**
   * Export all data from IndexedDB
   */
  async exportBackupData(userId) {
    try {
      // Get all messages from storage
      const allMessages = {};
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      
      // Export messages for each contact
      for (const contact of contacts) {
        const messages = await storage.getMessages(contact.id);
        allMessages[contact.id] = messages;
      }
      
      // Export user's encryption keys (already encrypted in memory)
      const exportedKeys = {
        publicKey: await cryptoManager.exportPublicKey(),
        // Note: Private key is NOT exported (stays on device)
        keyGenerated: true
      };
      
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId: userId,
        messages: allMessages,
        contacts: contacts,
        keys: exportedKeys,
        metadata: {
          messageCount: Object.values(allMessages).reduce((sum, msgs) => sum + msgs.length, 0),
          contactCount: contacts.length
        }
      };
      
      return JSON.stringify(backupData);
    } catch (error) {
      console.error('Failed to export backup data:', error);
      throw new Error('Failed to export backup data');
    }
  }

  /**
   * Encrypt backup bundle with backup key
   */
  async encryptBackup(backupData, password, userId) {
    try {
      const backupKey = await this.deriveBackupKey(password, userId);
      
      // Generate random IV (12 bytes for GCM)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(backupData);
      
      // Encrypt with AES-256-GCM
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        backupKey,
        plaintext
      );
      
      // Package encrypted backup with metadata
      const backupPackage = {
        version: 1,
        algorithm: 'AES-256-GCM-PBKDF2',
        iterations: 600000,
        iv: this.arrayBufferToBase64(iv),
        ciphertext: this.arrayBufferToBase64(ciphertext),
        timestamp: Date.now(),
        userId: userId
      };
      
      return JSON.stringify(backupPackage);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt backup');
    }
  }

  /**
   * Upload encrypted backup to Google Drive
   */
  async uploadToGoogleDrive(encryptedBackup) {
    try {
      await this.authenticateGoogle();
      
      const filename = `securechat_backup_${Date.now()}.enc`;
      
      const metadata = {
        name: filename,
        mimeType: 'application/octet-stream',
        parents: ['appDataFolder']  // Hidden from user's main Drive
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([encryptedBackup], { type: 'application/octet-stream' }));
      
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.gapi.auth.getToken().access_token}`
          },
          body: form
        }
      );
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload to Google Drive failed:', error);
      throw new Error('Failed to upload backup to Google Drive');
    }
  }

  /**
   * List available backups from Google Drive
   */
  async listBackups() {
    try {
      await this.authenticateGoogle();
      
      const response = await window.gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc'
      });
      
      return response.result.files || [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw new Error('Failed to list backups');
    }
  }

  /**
   * Download backup from Google Drive
   */
  async downloadFromGoogleDrive(fileId) {
    try {
      await this.authenticateGoogle();
      
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      
      return response.body;
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download backup');
    }
  }

  /**
   * Decrypt backup bundle
   */
  async decryptBackup(encryptedBackup, password, userId) {
    try {
      const backupPackage = JSON.parse(encryptedBackup);
      
      // Validate version
      if (backupPackage.version !== 1) {
        throw new Error('Unsupported backup version');
      }
      
      // Re-derive backup key from password
      const backupKey = await this.deriveBackupKey(password, userId);
      
      const iv = this.base64ToArrayBuffer(backupPackage.iv);
      const ciphertext = this.base64ToArrayBuffer(backupPackage.ciphertext);
      
      // Decrypt
      const plaintext = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        backupKey,
        ciphertext
      );
      
      const decoder = new TextDecoder();
      const backupData = JSON.parse(decoder.decode(plaintext));
      
      // Verify integrity
      if (backupData.userId !== userId) {
        throw new Error('Backup belongs to different user');
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
   * Import backup data to IndexedDB
   */
  async importBackupData(backupData) {
    try {
      // Import messages
      for (const [contactId, messages] of Object.entries(backupData.messages)) {
        for (const message of messages) {
          await storage.saveMessage(contactId, message);
        }
      }
      
      // Import contacts
      localStorage.setItem('contacts', JSON.stringify(backupData.contacts));
      
      return {
        success: true,
        messageCount: backupData.metadata.messageCount,
        contactCount: backupData.metadata.contactCount,
        restoreDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw new Error('Failed to import backup data');
    }
  }

  /**
   * Complete backup flow
   */
  async createBackup(password, userId) {
    const backupData = await this.exportBackupData(userId);
    const encrypted = await this.encryptBackup(backupData, password, userId);
    const result = await this.uploadToGoogleDrive(encrypted);
    return result;
  }

  /**
   * Complete restore flow
   */
  async restoreBackup(fileId, password, userId) {
    const encrypted = await this.downloadFromGoogleDrive(fileId);
    const backupData = await this.decryptBackup(encrypted, password, userId);
    const result = await this.importBackupData(backupData);
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

export const backupManager = new BackupManager();