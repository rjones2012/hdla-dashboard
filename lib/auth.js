'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ACCESS_CODES, ROLE_PAGES } from './constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const stored = localStorage.getItem('hdla_role');
    if (stored && (stored === 'partner' || stored === 'principal')) {
      setRole(stored);
    }
    setLoading(false);
  }, []);

  const login = (code) => {
    const userRole = ACCESS_CODES[code];
    if (userRole) {
      setRole(userRole);
      localStorage.setItem('hdla_role', userRole);
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('hdla_role');
  };

  const canAccess = (page) => {
    if (!role) return false;
    const allowed = ROLE_PAGES[role] || [];
    return allowed.includes(page);
  };

  return (
    <AuthContext.Provider value={{ role, loading, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
