import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      navigate('/');
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
          <div className="absolute top-4 right-4"><ThemeToggle /></div>
          <Card className="bg-glass/50 border-glass-border backdrop-blur-md p-8 max-w-md w-full text-center">
            <KeyRound className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
            <p className="text-muted-foreground mb-4">This link is invalid or has expired. Please request a new password reset.</p>
            <Button onClick={() => navigate('/auth')} className="bg-gradient-primary text-primary-foreground shadow-glow">
              Back to Sign In
            </Button>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Coins className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
              <p className="text-sm text-muted-foreground">Enter your new password below</p>
            </div>
          </div>
          <Card className="bg-glass/50 border-glass-border backdrop-blur-md p-6">
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="New password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" minLength={6} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow" disabled={loading}>
                <KeyRound className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </ThemeProvider>
  );
};

export default ResetPassword;
