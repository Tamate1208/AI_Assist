import React, { useEffect, useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [status, setStatus] = useState<'loading' | 'online' | 'error'>('loading');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        // Also check if Gemini API key is available in the environment
        const hasApiKey = !!process.env.GEMINI_API_KEY;
        
        if (data.status === 'ok' && hasApiKey) {
          setStatus('online');
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    checkStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          aria-label="サイドバーを切り替え"
        >
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
            <i className="fa-solid fa-robot text-white text-lg"></i>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-700 tracking-tight truncate">AIアシスタント</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${
          status === 'online' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : status === 'loading'
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-rose-50 text-rose-700 border-rose-100'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            status === 'online' 
              ? 'bg-emerald-500 animate-pulse' 
              : status === 'loading'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-rose-500'
          }`}></span>
          <span className="hidden xs:inline">
            {status === 'online' ? 'AI 接続中' : status === 'loading' ? '接続確認中...' : 'AI 接続エラー'}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-100">
          <img src="https://picsum.photos/32/32" alt="ユーザーアバター" />
        </div>
      </div>
    </header>
  );
};

export default Header;
