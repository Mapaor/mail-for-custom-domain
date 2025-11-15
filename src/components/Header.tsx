'use client';

import { RefreshCw, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function Header({ title, onRefresh, isRefreshing }: HeaderProps) {
  const { toggleTheme } = useTheme();

  console.log('Header rendered');

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
      <h2 className="ml-14 text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white lg:ml-0">{title}</h2>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`ml-auto mr-auto w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
        
        {/* CSS-only theme toggle - both icons rendered, CSS controls visibility */}
        <button
          onClick={() => {
            console.log('Theme button clicked!');
            toggleTheme();
          }}
          className="p-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="w-5 h-5 ml-auto mr-auto dark:hidden" />
          <Moon className="w-5 h-5 ml-auto mr-auto hidden dark:block" />
        </button>
      </div>
    </header>
  );
}
