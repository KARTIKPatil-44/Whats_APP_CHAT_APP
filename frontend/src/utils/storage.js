import localforage from 'localforage';

// Configure localforage for encrypted storage
const encryptedStore = localforage.createInstance({
  name: 'secureChat',
  storeName: 'encrypted_messages'
});

const keysStore = localforage.createInstance({
  name: 'secureChat',
  storeName: 'encryption_keys'
});

export const storage = {
  // Store encrypted message
  async saveMessage(chatId, message) {
    const messages = await this.getMessages(chatId) || [];
    messages.push(message);
    await encryptedStore.setItem(chatId, messages);
  },

  // Get messages for a chat
  async getMessages(chatId) {
    return await encryptedStore.getItem(chatId) || [];
  },

  // Clear messages for a chat
  async clearMessages(chatId) {
    await encryptedStore.removeItem(chatId);
  },

  // Store encryption key
  async saveKey(userId, key) {
    await keysStore.setItem(userId, key);
  },

  // Get encryption key
  async getKey(userId) {
    return await keysStore.getItem(userId);
  },

  // Clear all data
  async clearAll() {
    await encryptedStore.clear();
    await keysStore.clear();
  }
};