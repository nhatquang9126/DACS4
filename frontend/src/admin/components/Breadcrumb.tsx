import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm text-gray-500 ${className}`}>
      <ol className="flex items-center space-x-2">
        <li className="flex items-center">
          <span className="flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-default">
            <Home className="w-4 h-4 mr-1" />
            <span>Admin</span>
          </span>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {item.onClick && !isLast ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-indigo-600 transition-colors font-medium text-gray-600 focus:outline-none"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`${
                    isLast ? 'text-gray-900 font-semibold' : 'text-gray-500'
                  } truncate max-w-xs`}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

