import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient, {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from '../api/axiosClient';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        // Gọi API /auth/me để xác thực token và lấy thông tin user thực tế
        const response = await axiosClient.get('/auth/me');
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('Phiên đăng nhập đã hết hạn hoặc không hợp lệ:', e);
      await removeStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    await setStoredToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await removeStoredToken();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const response = await axiosClient.get('/auth/me');
      setUser(response.data);
    } catch (e) {
      console.warn('Không thể làm mới thông tin hồ sơ:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
