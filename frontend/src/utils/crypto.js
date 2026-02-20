// Client-side encryption utilities using Web Crypto API

export class CryptoManager {
  constructor() {
    this.keyPair = null;
  }

  // Generate Diffie-Hellman key pair
  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    this.keyPair = keyPair;
    return keyPair;
  }

  // Export public key
  async exportPublicKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey || this.keyPair.publicKey);
    return this.arrayBufferToBase64(exported);
  }

  // Import public key
  async importPublicKey(base64Key) {
    const keyData = this.base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      true,
      []
    );
  }

  // Derive shared secret
  async deriveSharedSecret(theirPublicKey) {
    const sharedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: theirPublicKey
      },
      this.keyPair.privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return sharedKey;
  }

  // Encrypt message
  async encryptMessage(message, sharedKey) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      sharedKey,
      encodedMessage
    );
    
    return {
      encrypted: this.arrayBufferToBase64(encryptedContent),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  // Decrypt message
  async decryptMessage(encryptedData, iv, sharedKey) {
    try {
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
      const ivBuffer = this.base64ToArrayBuffer(iv);
      
      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer
        },
        sharedKey,
        encryptedBuffer
      );
      
      return new TextDecoder().decode(decryptedContent);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Decryption failed]';
    }
  }

  // Helper: ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Helper: Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Generate a unique nonce for each message
  generateNonce() {
    return this.arrayBufferToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
  }
}

export const cryptoManager = new CryptoManager();