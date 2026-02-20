import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { initializeSocket, getSocket, disconnectSocket } from '../../utils/socket';
import { cryptoManager } from '../../utils/crypto';
import { storage } from '../../utils/storage';
import SimpleScreenshotDetector from '../../utils/screenshot-simple';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import UserSearch from './UserSearch';
import AuditLogs from './AuditLogs';
import Settings from './Settings';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [sharedKeys, setSharedKeys] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const screenshotDetector = useRef(null);

  useEffect(() => {
    if (token) {
      initializeSocket(token);
      loadContacts();
      setupSocketListeners();
      setupScreenshotDetection();
    }

    return () => {
      disconnectSocket();
      if (screenshotDetector.current) {
        screenshotDetector.current.stop();
      }
    };
  }, [token]);

  const setupScreenshotDetection = () => {
    screenshotDetector.current = new SimpleScreenshotDetector(async (data) => {
      // Log to audit trail
      try {
        await axios.post(
          `${API}/audit-logs`,
          {
            event_type: 'screenshot_attempt',
            chat_id: activeChat?.id,
            device_info: JSON.stringify({
              method: data.method,
              platform: data.platform,
              userAgent: data.userAgent
            })
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        toast.warning('Screenshot detected', {
          description: 'This action has been logged for security',
          icon: <AlertTriangle className="w-4 h-4" />
        });
      } catch (error) {
        console.error('Failed to log screenshot attempt:', error);
      }
    });

    screenshotDetector.current.start();
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('new_message', async (message) => {
      // Decrypt and add to messages
      const chatId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
      
      try {
        let sharedKey = sharedKeys[chatId];
        
        if (!sharedKey) {
          // Derive shared key
          const theirPublicKey = await cryptoManager.importPublicKey(message.sender_public_key);
          sharedKey = await cryptoManager.deriveSharedSecret(theirPublicKey);
          setSharedKeys(prev => ({ ...prev, [chatId]: sharedKey }));
        }

        const decryptedText = await cryptoManager.decryptMessage(
          message.encrypted_content,
          message.iv,
          sharedKey
        );

        const decryptedMessage = {
          ...message,
          decryptedText
        };

        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), decryptedMessage]
        }));

        // Save to local storage
        await storage.saveMessage(chatId, decryptedMessage);
      } catch (error) {
        console.error('Failed to decrypt message:', error);
      }
    });

    socket.on('user_typing', (data) => {
      // Handle typing indicator
      console.log('User typing:', data);
    });
  };

  const loadContacts = async () => {
    try {
      const response = await axios.get(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadMessages = async (contactId) => {
    try {
      // First try to load from local storage
      const localMessages = await storage.getMessages(contactId);
      
      if (localMessages.length > 0) {
        setMessages(prev => ({ ...prev, [contactId]: localMessages }));
      }

      // Then fetch from server
      const response = await axios.get(`${API}/messages/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const serverMessages = response.data;
      
      // Decrypt messages
      const contact = contacts.find(c => c.id === contactId) || await fetchUser(contactId);
      const theirPublicKey = await cryptoManager.importPublicKey(contact.public_key);
      const sharedKey = await cryptoManager.deriveSharedSecret(theirPublicKey);
      
      setSharedKeys(prev => ({ ...prev, [contactId]: sharedKey }));

      const decryptedMessages = await Promise.all(
        serverMessages.map(async (msg) => {
          try {
            const decryptedText = await cryptoManager.decryptMessage(
              msg.encrypted_content,
              msg.iv,
              sharedKey
            );
            return { ...msg, decryptedText };
          } catch (error) {
            return { ...msg, decryptedText: '[Decryption failed]' };
          }
        })
      );

      setMessages(prev => ({ ...prev, [contactId]: decryptedMessages }));
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const fetchUser = async (userId) => {
    const response = await axios.get(`${API}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  const sendMessage = async (text) => {
    if (!activeChat || !text.trim()) return;

    try {
      const sharedKey = sharedKeys[activeChat.id];
      if (!sharedKey) {
        toast.error('Encryption key not established');
        return;
      }

      const { encrypted, iv } = await cryptoManager.encryptMessage(text, sharedKey);
      const myPublicKey = await cryptoManager.exportPublicKey();

      const response = await axios.post(
        `${API}/messages`,
        {
          receiver_id: activeChat.id,
          encrypted_content: encrypted,
          iv: iv,
          sender_public_key: myPublicKey
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const newMessage = {
        ...response.data,
        decryptedText: text
      };

      setMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), newMessage]
      }));

      // Save to local storage
      await storage.saveMessage(activeChat.id, newMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSelectContact = async (contact) => {
    setActiveChat(contact);
    setShowSearch(false);
    await loadMessages(contact.id);
  };

  const handleAddContact = async (contact) => {
    try {
      await axios.post(
        `${API}/contacts`,
        { contact_id: contact.id },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      await loadContacts();
      toast.success('Contact added');
      handleSelectContact(contact);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  if (showAuditLogs) {
    return <AuditLogs onBack={() => setShowAuditLogs(false)} />;
  }

  if (showSearch) {
    return (
      <UserSearch
        onSelectUser={handleAddContact}
        onBack={() => setShowSearch(false)}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background" data-testid="chat-dashboard">
      <Sidebar
        contacts={contacts}
        activeChat={activeChat}
        onSelectContact={handleSelectContact}
        onShowSearch={() => setShowSearch(true)}
        onShowAuditLogs={() => setShowAuditLogs(true)}
        onShowSettings={() => setShowSettings(true)}
        onLogout={logout}
        user={user}
      />
      
      <ChatWindow
        activeChat={activeChat}
        messages={messages[activeChat?.id] || []}
        onSendMessage={sendMessage}
        currentUser={user}
      />
    </div>
  );
};

export default Dashboard;