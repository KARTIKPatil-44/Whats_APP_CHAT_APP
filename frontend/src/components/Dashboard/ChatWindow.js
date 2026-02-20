import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Lock, CheckCheck, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ChatWindow = ({ activeChat, messages, onSendMessage, currentUser }) => {
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background" data-testid="no-chat-selected">
        <div className="text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your messages are secure
          </h2>
          <p className="text-muted-foreground">
            Select a contact to start an encrypted conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background" data-protected="true">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center gap-3" data-testid="chat-header">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(activeChat.username)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{activeChat.username}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" data-testid="messages-container">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSent = msg.sender_id === currentUser.id;
              const timestamp = new Date(msg.timestamp);
              
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${isSent ? 'sent' : 'received'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 ${
                      isSent
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.decryptedText}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                      {isSent && (
                        <span className="ml-1">
                          {msg.is_read ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : msg.is_delivered ? (
                            <CheckCheck className="w-3 h-3 opacity-50" />
                          ) : (
                            <Check className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            data-testid="message-input"
          />
          <Button type="submit" size="icon" disabled={!messageText.trim()} data-testid="send-message-button">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;