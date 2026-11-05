'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('QuangAdmin@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-4 ring-1 ring-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SmartStudy AI</h1>
          <p className="text-indigo-200 text-sm mt-1">Cổng Quản Trị Hệ Thống (Admin Portal)</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">Email Quản trị</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartstudy.edu.vn"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập Quản trị</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Hệ thống quản lý giáo dục thông minh &bull; Bảo mật đa lớp RBAC
          </p>
        </div>
      </div>
    </div>
  );
}

