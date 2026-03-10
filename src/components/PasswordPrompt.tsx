import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

interface PasswordPromptProps {
  mode: 'encrypt' | 'decrypt';
  onSubmit: (password: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function PasswordPrompt({ mode, onSubmit, isLoading, error }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'encrypt' && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    onSubmit(password);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex justify-center mb-6">
        <div className={`p-4 rounded-full ${mode === 'encrypt' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {mode === 'encrypt' ? <Lock size={32} /> : <KeyRound size={32} />}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        {mode === 'encrypt' ? 'Secure Your Chat' : 'Unlock Chat'}
      </h2>
      
      <p className="text-center text-gray-500 mb-8 text-sm">
        {mode === 'encrypt' 
          ? 'Create a password to encrypt this chat. You will need it to view the chat later. If you lose it, the data cannot be recovered.' 
          : 'Enter the password you used to encrypt this chat.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            placeholder="Enter password"
            required
            autoFocus
          />
        </div>

        {mode === 'encrypt' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Confirm password"
              required
            />
          </div>
        )}

        {(error || localError) && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error || localError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              {mode === 'encrypt' ? 'Encrypt & Save' : 'Decrypt & View'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
