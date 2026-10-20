import React, { useState, useEffect } from 'react';

export interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  activeTab, 
  onSelectTab,
  onToggleSidebar,
  isSidebarOpen
}) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') !== 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme_mode', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <nav
      aria-label="モバイル業務ナビゲーション"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-t border-gray-200 dark:border-slate-800 px-2 py-1.5 md:hidden backdrop-blur-md shadow-lg print-hide"
    >
      {/* チャット */}
      <button
        type="button"
        aria-label="チャット画面"
        onClick={() => onSelectTab('chat')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl px-2 py-1 transition-all ${
          activeTab === 'chat' && !isSidebarOpen
            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
        }`}
      >
        <i className="fa-solid fa-comments text-base"></i>
        <span className="text-[10px] mt-0.5">対話</span>
      </button>

      {/* 資料・メモ一覧（サイドバー開閉） */}
      <button
        type="button"
        aria-label="資料・メモ一覧"
        onClick={onToggleSidebar}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl px-2 py-1 transition-all ${
          isSidebarOpen
            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
        }`}
      >
        <i className="fa-solid fa-folder-open text-base"></i>
        <span className="text-[10px] mt-0.5">資料</span>
      </button>

      {/* 印刷・PDF保存 */}
      <button
        type="button"
        aria-label="印刷・PDF保存"
        onClick={() => window.print()}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl px-2 py-1 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-all"
      >
        <i className="fa-solid fa-print text-base"></i>
        <span className="text-[10px] mt-0.5">印刷/PDF</span>
      </button>

      {/* ダークモード切替 */}
      <button
        type="button"
        aria-label="ダークモード切替"
        onClick={() => setDarkMode(!darkMode)}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl px-2 py-1 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
      >
        <span className="text-base">{darkMode ? '🌙' : '☀️'}</span>
        <span className="text-[10px] mt-0.5">{darkMode ? 'ダーク' : 'ライト'}</span>
      </button>
    </nav>
  );
};
