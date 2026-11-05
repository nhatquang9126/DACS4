'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Tìm kiếm từ khóa...',
  debounceMs = 300,
  className = '',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const isFirstRender = useRef(true);

  // Đồng bộ prop value từ ngoài vào khi URL hoặc parent thay đổi
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce đẩy giá trị ra ngoài sau debounceMs (mặc định 300ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />
      {localValue ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa tìm kiếm"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}


