'use client';
import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox, Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  keyExtractor: (item: T, index: number) => string | number;
  actionsHeader?: string;
  actions?: (item: T) => React.ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Không tìm thấy dữ liệu phù hợp',
  sortKey,
  sortDirection = 'asc',
  onSort,
  keyExtractor,
  actionsHeader = 'Thao tác',
  actions,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/75 text-gray-600 font-semibold uppercase text-xs tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3.5 w-12 text-center text-gray-400">
                #
              </th>
              {columns.map((col) => {
                const isCurrentSort = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={`px-4 py-3.5 ${col.className || ''}`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="group inline-flex items-center space-x-1 hover:text-indigo-600 font-semibold uppercase focus:outline-none"
                      >
                        <span>{col.header}</span>
                        <span className="text-gray-400 group-hover:text-indigo-600">
                          {isCurrentSort ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
              {actions && (
                <th scope="col" className="px-4 py-3.5 text-right w-36">
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 2 : 1)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                    <span className="text-sm font-medium">Đang tải dữ liệu từ máy chủ...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 2 : 1)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
                      <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor(item, index);
                return (
                  <tr
                    key={key}
                    className="hover:bg-indigo-50/30 transition-colors duration-100 group"
                  >
                    <td className="px-4 py-3.5 text-center text-xs text-gray-400 font-mono">
                      {index + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-gray-800 align-middle ${col.className || ''}`}
                      >
                        {col.render ? col.render(item, index) : (item as any)[col.key] ?? '—'}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


