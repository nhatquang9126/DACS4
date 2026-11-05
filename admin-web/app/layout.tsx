import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'SmartStudy AI — Admin Dashboard',
  description: 'Hệ thống quản trị nền tảng học tập SmartStudy AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
