'use client';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  if (totalRecords === 0) {
    return null;
  }

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Tạo danh sách các số trang cần hiển thị thông minh (1 ... 4 5 6 ... 12)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white border-t border-gray-200 ${className}`}
    >
      {/* Thông tin số lượng bản ghi & chọn pageSize */}
      <div className="flex items-center space-x-3 text-sm text-gray-600">
        <span>
          Hiển thị <span className="font-semibold text-gray-800">{startRecord}</span> -{' '}
          <span className="font-semibold text-gray-800">{endRecord}</span> trên tổng số{' '}
          <span className="font-semibold text-indigo-600">{totalRecords}</span> bản ghi
        </span>
        <div className="flex items-center space-x-1 pl-2 border-l border-gray-300">
          <label htmlFor="pageSizeSelect" className="text-xs text-gray-500">
            Số dòng:
          </label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="text-xs font-medium border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nút phân trang */}
      <div className="flex items-center space-x-1">
        {/* Nút Trước */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Danh sách các trang */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">
                ...
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Nút Tiếp */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
          className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


