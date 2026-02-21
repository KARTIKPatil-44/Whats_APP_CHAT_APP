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
  ArrowLeft,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  User,
  Mail,
  Key,
  Cloud,
  Download,
  Upload,
  Lock,
  Loader2,
  CheckCircle,
  XCircle,
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

  const handleDeleteAccount = async () => {
    if (!password || confirmationText !== 'DELETE') {
      toast.error('Please fill all fields correctly');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await axios.delete(`${API}/users/me`, {
        data: {
          password: password,
          confirmation_text: confirmationText,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        toast.success('Account deleted successfully', {
          description: 'All your data has been permanently removed',
        });

        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);

      // SAFER ERROR HANDLING (NO OPTIONAL CHAINING)
      let errorMessage = 'Please check your password and try again';

      if (
        error &&
        error.response &&
        error.response.data &&
        error.response.data.detail
      ) {
        errorMessage = error.response.data.detail;
      }

      toast.error('Failed to delete account', {
        description: errorMessage,
      });

      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">
                Danger Zone
              </h3>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Account Permanently
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 mt-4">
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Type DELETE to confirm</Label>
                    <Input
                      type="text"
                      value={confirmationText}
                      onChange={(e) =>
                        setConfirmationText(e.target.value)
                      }
                    />
                  </div>
                </div>

                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={
                      isDeleting ||
                      !password ||
                      confirmationText !== 'DELETE'
                    }
                  >
                    {isDeleting
                      ? 'Deleting...'
                      : 'Delete Account Permanently'}
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