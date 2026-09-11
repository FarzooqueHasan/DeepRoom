import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Sparkles, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInGuest,
} from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/config';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user;
      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        user = await signUpWithEmail(email, password, fullName);
      } else {
        user = await signInWithEmail(email, password);
      }
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInGuest();
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
            {mode === 'login' ? 'Welcome back to DeepRoom' : 'Create your DeepRoom Account'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Join your focus squad and boost your deep work'
              : 'Start tracking your verified focus and study sessions'}
          </p>

          {!isFirebaseConfigured && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Indigenous Local Mode Active</span>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Full Name</Label>
              <Input
                type="text"
                placeholder="Arya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300">Email Address</Label>
            <Input
              type="email"
              placeholder="scholar@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300">Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-emerald-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold py-2.5 rounded-xl transition-colors mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'login' ? (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Sign In
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Create Account
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        {/* Social / Guest Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs"
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGuest}
            disabled={loading}
            className="border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs"
          >
            Guest Demo
          </Button>
        </div>

        {/* Toggle Switch */}
        <div className="text-center mt-6 text-xs text-zinc-400">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
