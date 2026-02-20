import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Key } from 'lucide-react';

const Register = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const result = await register(username, email, password);
    
    if (result.success) {
      toast.success('Account created!', {
        description: 'Your encryption keys have been generated',
        icon: <Key className="w-4 h-4" />
      });
    } else {
      toast.error('Registration failed', {
        description: result.error
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-semibold text-foreground mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            SecureChat
          </h1>
          <p className="text-muted-foreground">Create your encrypted account</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-medium mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Sign Up</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="register-username-input"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                data-testid="register-password-input"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                data-testid="register-confirm-password-input"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-primary hover:underline"
              data-testid="switch-to-login-button"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-full border border-primary/20">
            <Key className="w-4 h-4 text-primary" />
            <span>Encryption keys generated on your device</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;