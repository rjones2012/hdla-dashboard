'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { role, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role) {
      router.push('/executive');
    }
  }, [role, loading, router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (login(code)) {
      router.push('/executive');
    } else {
      setError('Invalid access code.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-hdla-muted">Loading...</div>
      </div>
    );
  }

  if (role) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hdla-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-flecha text-3xl font-semibold text-hdla-text">
            Hodgson Douglas
          </h1>
          <p className="font-flecha text-lg text-hdla-muted italic mt-1">
            Landscape Architects
          </p>
        </div>

        <div className="bg-white rounded-hdla shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-hdla-text mb-2">
              Access Code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hdla-magenta/20 focus:border-hdla-magenta"
              placeholder="Enter your access code"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <button
              type="submit"
              className="w-full mt-4 py-3 bg-hdla-text text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
