'use client';
import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface CascadeDetail {
  label: string;
  count: number;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemTitle: string;
  warningMessage?: string;
  cascadeDetails?: CascadeDetail[];
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  itemTitle,
  warningMessage,
  cascadeDetails = [],
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center space-x-2 text-red-600">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn xóa bản ghi:
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="font-semibold text-gray-900 break-words">{itemTitle}</span>
          </div>

          {/* Cảnh báo xóa theo tầng (Cascade Deletion Warning) */}
          {(warningMessage || cascadeDetails.length > 0) && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start space-x-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Cảnh báo ảnh hưởng dữ liệu liên quan (Cascade)
                </span>
              </div>
              {warningMessage && (
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {warningMessage}
                </p>
              )}
              {cascadeDetails.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {cascadeDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-amber-200 rounded text-xs text-amber-900"
                    >
                      <span className="truncate">{detail.label}:</span>
                      <span className="font-bold ml-1 text-red-600">{detail.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 italic">
            * Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
          </p>
        </div>

        {/* Nút thao tác */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none shadow-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Xác nhận xóa vĩnh viễn
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


