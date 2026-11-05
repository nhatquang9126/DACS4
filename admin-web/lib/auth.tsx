'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api, { setAuth, clearAuth, getStoredUser } from '@/lib/api';

interface AdminUser {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    if (newUser.role !== 'ADMIN') {
      throw new Error('Tài khoản này không có quyền truy cập Admin Dashboard.');
    }
    setAuth(newToken, newUser);
    setUser(newUser);
    setToken(newToken);
    router.push('/admin/dashboard');
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

