import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Search, FileText, LogOut, ShieldCheck, User, Settings as SettingsIcon } from 'lucide-react';

const Sidebar = ({ contacts, activeChat, onSelectContact, onShowSearch, onShowAuditLogs, onShowSettings, onLogout, user }) => {
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="app-title">
                SecureChat
              </h1>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowSettings}
              data-testid="settings-button"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              data-testid="logout-button"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onShowSearch}
            className="flex-1"
            size="sm"
            data-testid="search-users-button"
          >
            <Search className="w-4 h-4 mr-2" />
            Find Users
          </Button>
          
          <Button
            onClick={onShowAuditLogs}
            variant="outline"
            size="sm"
            data-testid="audit-logs-button"
            aria-label="View audit logs"
          >
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-contacts-message">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts yet</p>
              <p className="text-xs mt-1">Click "Find Users" to start chatting</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeChat?.id === contact.id
                    ? 'bg-accent/50'
                    : 'hover:bg-accent/30'
                }`}
                data-testid={`contact-item-${contact.id}`}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(contact.username)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{contact.username}</div>
                  <div className="text-xs text-muted-foreground truncate">{contact.email}</div>
                </div>

                {activeChat?.id === contact.id && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Encryption Badge */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;