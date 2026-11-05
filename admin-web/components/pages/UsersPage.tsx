'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserPlus,
} from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import ConfirmDeleteModal, { CascadeDetail } from '@/components/ConfirmDeleteModal';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';

export interface UserItem {
  id: number;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  created_at: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  last_prediction_date: string | null;
  enrollments_count: number;
  quiz_attempts_count: number;
  sessions_count: number;
  tasks_count: number;
}

interface UsersPageProps {
  apiBaseUrl?: string;
  authToken?: string;
  currentUserId?: number;
}

export default function UsersPage({
  apiBaseUrl = '/api',
  authToken,
  currentUserId,
}: UsersPageProps) {
  const { showSuccess, showError } = useToast();

  // Data States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal Tạo mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal Sửa Vai trò / Mật khẩu
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [editPassword, setEditPassword] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal Xóa an toàn kèm Cascade Warning
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeWarning, setCascadeWarning] = useState('');
  const [cascadeDetails, setCascadeDetails] = useState<CascadeDetail[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Headers helper
  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter !== 'ALL') params.append('role', roleFilter);

      const res = await fetch(`${apiBaseUrl}/admin/users?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ: ${res.status}`);
      }

      const json = await res.json();
      setUsers(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Lỗi tải danh sách người dùng:', err);
      setError(err.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, page, limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Tạo người dùng mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword) {
      setCreateError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError('');

      const res = await fetch(`${apiBaseUrl}/admin/users`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Lỗi khi tạo tài khoản');
      }

      setIsCreateModalOpen(false);
      showSuccess(
        'Tạo tài khoản thành công',
        `Tài khoản "${newEmail.trim()}" (${newRole}) đã được kích hoạt trên hệ thống.`
      );
      setNewEmail('');
      setNewPassword('');
      setNewRole('STUDENT');
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Không thể tạo tài khoản');
      showError('Tạo tài khoản thất bại', err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Mở modal chỉnh sửa vai trò / mật khẩu
  const handleOpenEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPassword('');
    setEditError('');
    setIsEditModalOpen(true);
  };

  // Cập nhật người dùng
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setEditSubmitting(true);
      setEditError('');

      const bodyData: any = { role: editRole };
      if (editPassword.trim()) {
        bodyData.password = editPassword.trim();
      }

      const res = await fetch(`${apiBaseUrl}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Lỗi khi cập nhật tài khoản');
      }

      setIsEditModalOpen(false);
      showSuccess('Cập nhật thành công', `Tài khoản "${editingUser.email}" đã được cập nhật.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || 'Không thể cập nhật tài khoản');
      showError('Cập nhật thất bại', err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Mở modal xóa với Cascade Info
  const handleOpenDeleteModal = async (user: UserItem) => {
    if (currentUserId && user.id === currentUserId) {
      showError('Thao tác bị từ chối', 'Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    setDeletingUser(user);
    setDeleteModalOpen(true);
    setCascadeWarning('');
    setCascadeDetails([]);

    try {
      setCascadeLoading(true);
      const res = await fetch(`${apiBaseUrl}/admin/users/${user.id}/cascade-info`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        setCascadeWarning(info.warning_message);
        setCascadeDetails([
          { label: 'Môn học ghi danh', count: info.enrollments_count },
          { label: 'Lượt làm Quiz', count: info.quiz_attempts_count },
          { label: 'Phiên học ghi nhận', count: info.sessions_count },
          { label: 'Công việc / Nhiệm vụ', count: info.tasks_count },
          { label: 'Flashcard ôn tập', count: info.flashcards_count },
        ]);
      }
    } catch (err) {
      console.error('Lỗi lấy cascade info user:', err);
    } finally {
      setCascadeLoading(false);
    }
  };

  // Xác nhận Xóa User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${apiBaseUrl}/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Xóa tài khoản không thành công');
      }

      setDeleteModalOpen(false);
      showSuccess('Đã xóa tài khoản', `Tài khoản "${deletingUser.email}" đã được xóa.`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      showError('Xóa tài khoản thất bại', err.message || 'Không thể xóa tài khoản người dùng');
    } finally {
      setIsDeleting(false);
    }
  };

  // Columns cấu hình bảng
  const columns: Column<UserItem>[] = [
    {
      key: 'email',
      header: 'Tài khoản Email',
      render: (item) => (
        <div>
          <span className="font-semibold text-gray-900 block">{item.email}</span>
          <span className="text-xs text-gray-400">
            Tham gia: {new Date(item.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò (Role)',
      width: '130px',
      render: (item) => {
        const styles = {
          ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
          TEACHER: 'bg-blue-50 text-blue-700 border-blue-200',
          STUDENT: 'bg-gray-100 text-gray-700 border-gray-200',
        }[item.role] || 'bg-gray-100 text-gray-700';

        const labels = {
          ADMIN: 'Quản trị viên',
          TEACHER: 'Giảng viên',
          STUDENT: 'Học viên',
        }[item.role] || item.role;

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
            {labels}
          </span>
        );
      },
    },
    {
      key: 'risk_level',
      header: 'Nguy cơ AI',
      width: '140px',
      render: (item) => {
        if (item.role !== 'STUDENT') {
          return <span className="text-xs text-gray-400 italic">— Không áp dụng —</span>;
        }

        const riskConfigs = {
          HIGH: {
            label: 'Nguy cơ CAO',
            className: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
            icon: AlertTriangle,
          },
          MEDIUM: {
            label: 'Trung bình',
            className: 'bg-amber-50 text-amber-700 border-amber-300 font-medium',
            icon: ShieldAlert,
          },
          LOW: {
            label: 'An toàn',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium',
            icon: ShieldCheck,
          },
        }[item.risk_level] || {
          label: item.risk_level,
          className: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: Shield,
        };

        const IconComponent = riskConfigs.icon;

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${riskConfigs.className}`}
          >
            <IconComponent className="w-3.5 h-3.5 mr-1" />
            {riskConfigs.label}
          </span>
        );
      },
    },
    {
      key: 'stats',
      header: 'Hoạt động học tập',
      width: '240px',
      render: (item) => (
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <span title="Môn học đang theo học" className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {item.enrollments_count} môn
          </span>
          <span title="Lượt làm bài kiểm tra" className="flex items-center">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {item.quiz_attempts_count} quiz
          </span>
          <span title="Phiên học thực tế" className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {item.sessions_count} buổi
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Quản lý Người dùng & Học viên' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Danh sách Tài khoản & Phân quyền</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi tình trạng học viên, giám sát cảnh báo nguy cơ trượt môn từ mô hình AI và cấp quyền quản trị
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewEmail('');
            setNewPassword('');
            setNewRole('STUDENT');
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Tạo tài khoản mới
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Tìm theo địa chỉ email người dùng..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label htmlFor="userRoleFilter" className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Lọc theo vai trò:
          </label>
          <select
            id="userRoleFilter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="STUDENT">Học viên (Student)</option>
            <option value="TEACHER">Giảng viên (Teacher)</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <DataTable<UserItem>
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="Không tìm thấy người dùng nào phù hợp."
        keyExtractor={(item) => item.id}
        actions={(item) => (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              title="Phân quyền & Đổi mật khẩu"
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(item)}
              disabled={currentUserId === item.id}
              title={currentUserId === item.id ? 'Không thể tự xóa' : 'Xóa tài khoản'}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={limit}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => setLimit(s)}
      />

      {/* Modal Thêm người dùng mới */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Tạo Tài Khoản Người Dùng Mới</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@smartstudy.edu.vn"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu khởi tạo <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vai trò hệ thống
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="STUDENT">Học viên (STUDENT)</option>
                  <option value="TEACHER">Giảng viên (TEACHER)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {createError}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {createSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa vai trò / mật khẩu */}
      {isEditModalOpen && editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Cập nhật Tài khoản</h3>
                <span className="text-xs text-gray-500 font-mono">{editingUser.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vai trò (Role)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="STUDENT">Học viên (STUDENT)</option>
                  <option value="TEACHER">Giảng viên (TEACHER)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Đặt lại mật khẩu mới (để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới nếu muốn thay đổi"
                  minLength={6}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {editError}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {editSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa an toàn kèm Cascade Warning */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Xóa Tài khoản Người dùng"
        itemTitle={deletingUser ? `${deletingUser.email} (${deletingUser.role})` : ''}
        warningMessage={cascadeWarning}
        cascadeDetails={cascadeDetails}
        isLoading={isDeleting || cascadeLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}

