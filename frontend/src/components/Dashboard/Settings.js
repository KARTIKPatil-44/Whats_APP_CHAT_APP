import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { ArrowLeft, Trash2, AlertTriangle, ShieldCheck, User, Mail, Key } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = ({ onBack }) => {
  const { user, token, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (!password || confirmationText !== 'DELETE') {
      toast.error('Please fill all fields correctly');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await axios.delete(
        `${API}/users/me`,
        {
          data: {
            password: password,
            confirmation_text: confirmationText
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 200) {
        toast.success('Account deleted successfully', {
          description: 'All your data has been permanently removed',
          icon: <Trash2 className="w-4 h-4" />
        });

        // Wait a moment then logout
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account', {
        description: error.response?.data?.detail || 'Please check your password and try again'
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="settings-page">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="back-from-settings-button">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Settings
            </h2>
            <p className="text-xs text-muted-foreground">Manage your account and privacy</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Account Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Account Information
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{user?.username}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">User ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-mono text-muted-foreground">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Security
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm">End-to-end encryption</span>
                </div>
                <span className="text-xs font-medium text-primary">Active</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-sm">Encryption keys</span>
                </div>
                <span className="text-xs font-medium text-primary">Generated</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Danger Zone
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. All your messages, contacts, and data will be permanently removed.
            </p>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="open-delete-dialog-button">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4 pt-4">
                    <p className="text-foreground">
                      This action <strong>cannot be undone</strong>. This will permanently delete:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Your account and profile</li>
                      <li>All your messages (sent and received)</li>
                      <li>Your contacts and connections</li>
                      <li>Your audit logs and security data</li>
                      <li>Your encryption keys</li>
                    </ul>

                    <div className="space-y-3 pt-2">
                      <div>
                        <Label htmlFor="delete-password">Enter your password</Label>
                        <Input
                          id="delete-password"
                          type="password"
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="mt-1"
                          data-testid="delete-password-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="delete-confirmation">
                          Type <strong>DELETE</strong> to confirm
                        </Label>
                        <Input
                          id="delete-confirmation"
                          type="text"
                          placeholder="DELETE"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          className="mt-1"
                          data-testid="delete-confirmation-input"
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => {
                      setPassword('');
                      setConfirmationText('');
                    }}
                    data-testid="cancel-delete-button"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !password || confirmationText !== 'DELETE'}
                    data-testid="confirm-delete-button"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account Permanently'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;