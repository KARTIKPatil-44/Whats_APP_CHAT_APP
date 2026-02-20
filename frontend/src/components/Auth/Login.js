import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

const Login = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Welcome back!', {
        description: 'Your session is end-to-end encrypted'
      });
    } else {
      toast.error('Login failed', {
        description: result.error
      });
    }
    
    setLoading(false);
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
          <p className="text-muted-foreground">End-to-end encrypted messaging</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-medium mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
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
                data-testid="login-password-input"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-sm text-primary hover:underline"
              data-testid="switch-to-register-button"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-full border border-primary/20">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Your messages are encrypted end-to-end</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;