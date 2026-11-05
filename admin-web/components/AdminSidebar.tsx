'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, Layers, FileText,
  HelpCircle, Brain, Settings, FileSearch, Bell,
  Activity, ChevronDown, ChevronRight, LogOut, Shield,
  Menu, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Người dùng', href: '/admin/users', icon: Users },
  {
    label: 'Nội dung học tập', icon: BookOpen,
    children: [
      { label: 'Môn học', href: '/admin/content/courses', icon: BookOpen },
      { label: 'Chủ đề', href: '/admin/content/topics', icon: Layers },
      { label: 'Phần học', href: '/admin/content/sections', icon: FileText },
      { label: 'Tài liệu', href: '/admin/content/materials', icon: FileText },
      { label: 'Bài kiểm tra', href: '/admin/content/quizzes', icon: HelpCircle },
    ],
  },
  { label: 'Giám sát AI', href: '/admin/ai-monitor', icon: Brain },
  {
    label: 'Hệ thống', icon: Settings,
    children: [
      { label: 'Tổng quan hệ thống', href: '/admin/system', icon: Activity },
      { label: 'Nhật ký hoạt động', href: '/admin/system/audit-logs', icon: FileSearch },
      { label: 'Thông báo hệ thống', href: '/admin/system/notifications', icon: Bell },
    ],
  },
];

function NavItemRow({ item, depth = 0, collapsed }: { item: NavItem; depth?: number; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => c.href && pathname.startsWith(c.href)) ?? false
  );
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
  const Icon = item.icon;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'text-slate-400 hover:text-white hover:bg-white/10',
            open && 'text-white bg-white/10'
          )}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map(child => (
              <NavItemRow key={child.href} item={child} depth={depth + 1} collapsed={false} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-indigo-500 text-white shadow-md'
          : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 h-screen sticky top-0 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">SmartStudy AI</p>
            <p className="text-slate-400 text-xs truncate">Admin Dashboard</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-slate-400 hover:text-white p-1 rounded"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavItemRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User info */}
      <div className="px-2 pb-4 border-t border-white/10 pt-3">
        <div className={cn('flex items-center gap-2 px-2 py-2 rounded-lg', !collapsed && 'mb-2')}>
          <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center shrink-0">
            <Shield size={14} className="text-indigo-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.email}</p>
              <p className="text-slate-400 text-xs">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title="Đăng xuất"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors',
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}

