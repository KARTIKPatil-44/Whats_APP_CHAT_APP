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
import { 
  ArrowLeft, Trash2, AlertTriangle, ShieldCheck, User, Mail, Key,
  Cloud, Download, Upload, Lock, Loader2, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { googleDriveBackup } from '../../utils/google-drive-backup';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = ({ onBack }) => {
  const { user, token, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Backup state
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');

  const handleCreateBackup = async () => {
    if (!backupPassword || backupPassword.length < 12) {
      toast.error('Backup password must be at least 12 characters');
      return;
    }

    if (backupPassword !== confirmBackupPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsCreatingBackup(true);
    setBackupProgress('Starting backup...');

    try {
      const result = await googleDriveBackup.createBackup(
        backupPassword, 
        user.id,
        (progress) => setBackupProgress(progress)
      );
      
      toast.success('Backup created successfully!', {
        description: `File: ${result.name}`,
        icon: <CheckCircle className="w-4 h-4 text-green-500" />
      });
      
      setShowBackupDialog(false);
      setBackupPassword('');
      setConfirmBackupPassword('');
      setBackupProgress('');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed', {
        description: error.message || 'Please check your Google account permissions and try again',
        icon: <XCircle className="w-4 h-4" />
      });
    } finally {
      setIsCreatingBackup(false);
      setBackupProgress('');
    }
  };

  const handleListBackups = async () => {
    setIsLoadingBackups(true);
    setShowRestoreDialog(true);
    
    try {
      const backups = await googleDriveBackup.listBackups();
      setBackupList(backups);
      
      if (backups.length === 0) {
        toast.info('No backups found', {
          description: 'Create your first backup to enable restore'
        });
      }
    } catch (error) {
      console.error('Failed to list backups:', error);
      toast.error('Failed to load backups', {
        description: error.message || 'Please connect to Google Drive first'
      });
      setShowRestoreDialog(false);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup || !restorePassword) {
      toast.error('Please select a backup and enter password');
      return;
    }

    setIsRestoringBackup(true);
    setBackupProgress('Starting restore...');

    try {
      const result = await googleDriveBackup.restoreBackup(
        selectedBackup.id,
        restorePassword,
        user.id,
        (progress) => setBackupProgress(progress)
      );
      
      toast.success('Backup restored successfully!', {
        description: `Restored ${result.messageCount} messages and ${result.contactCount} contacts`,
        icon: <CheckCircle className="w-4 h-4 text-green-500" />
      });
      
      setShowRestoreDialog(false);
      setRestorePassword('');
      setSelectedBackup(null);
      setBackupProgress('');
      
      // Reload to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Restore failed', {
        description: error.message || 'Invalid password or corrupted backup'
      });
    } finally {
      setIsRestoringBackup(false);
      setBackupProgress('');
    }
  };

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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="settings-page">
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

          {/* Google Drive Backup */}
          <div className="bg-card border border-primary/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Google Drive Backup
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Create encrypted backups of your messages to Google Drive. Your data is encrypted with a password you choose - we never have access to your backup key.
            </p>

            <div className="space-y-3">
              {/* Create Backup Button */}
              <AlertDialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" data-testid="create-backup-button">
                    <Upload className="w-4 h-4 mr-2" />
                    Create Encrypted Backup
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      Create Encrypted Backup
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 pt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                        <strong className="text-primary">Zero-Knowledge Encryption</strong>
                        <p className="text-muted-foreground mt-1">
                          Your backup password encrypts your data locally before uploading. We never see your password or decryption key.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="backup-password">Backup Password (min 12 characters)</Label>
                          <Input
                            id="backup-password"
                            type="password"
                            placeholder="Enter strong password"
                            value={backupPassword}
                            onChange={(e) => setBackupPassword(e.target.value)}
                            className="mt-1"
                            disabled={isCreatingBackup}
                            data-testid="backup-password-input"
                          />
                        </div>

                        <div>
                          <Label htmlFor="confirm-backup-password">Confirm Password</Label>
                          <Input
                            id="confirm-backup-password"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirmBackupPassword}
                            onChange={(e) => setConfirmBackupPassword(e.target.value)}
                            className="mt-1"
                            disabled={isCreatingBackup}
                            data-testid="confirm-backup-password-input"
                          />
                        </div>

                        <div className="text-xs text-destructive">
                          Remember this password! If you lose it, your backup cannot be recovered.
                        </div>

                        {backupProgress && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{backupProgress}</span>
                          </div>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel 
                      onClick={() => {
                        setBackupPassword('');
                        setConfirmBackupPassword('');
                        setBackupProgress('');
                      }}
                      disabled={isCreatingBackup}
                      data-testid="cancel-backup-button"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup || backupPassword.length < 12 || backupPassword !== confirmBackupPassword}
                      data-testid="confirm-backup-button"
                    >
                      {isCreatingBackup ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Backup'
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Restore Backup Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleListBackups}
                disabled={isLoadingBackups}
                data-testid="restore-backup-button"
              >
                {isLoadingBackups ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Restore from Backup
                  </>
                )}
              </Button>
            </div>

            {/* Restore Dialog */}
            <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
              <AlertDialogContent className="bg-card max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Restore from Backup
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4 pt-4">
                    {isLoadingBackups ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : backupList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No backups found</p>
                        <p className="text-sm">Create your first backup to enable restore</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label>Select a backup to restore:</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {backupList.map((backup) => (
                            <div
                              key={backup.id}
                              onClick={() => setSelectedBackup(backup)}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedBackup?.id === backup.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'bg-muted border-border hover:bg-accent'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{backup.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(backup.createdTime)}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(backup.size)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedBackup && (
                          <div className="pt-3 border-t border-border">
                            <Label htmlFor="restore-password">Enter Backup Password</Label>
                            <Input
                              id="restore-password"
                              type="password"
                              placeholder="Your backup password"
                              value={restorePassword}
                              onChange={(e) => setRestorePassword(e.target.value)}
                              className="mt-1"
                              disabled={isRestoringBackup}
                              data-testid="restore-password-input"
                            />
                          </div>
                        )}

                        {backupProgress && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{backupProgress}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => {
                      setRestorePassword('');
                      setSelectedBackup(null);
                      setBackupProgress('');
                    }}
                    disabled={isRestoringBackup}
                  >
                    Cancel
                  </AlertDialogCancel>
                  {backupList.length > 0 && (
                    <Button
                      onClick={handleRestoreBackup}
                      disabled={isRestoringBackup || !selectedBackup || !restorePassword}
                      data-testid="confirm-restore-button"
                    >
                      {isRestoringBackup ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        'Restore Backup'
                      )}
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
