import React, { useEffect, useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, selectedModel, onModelChange }) => {
  const [status, setStatus] = useState<'loading' | 'online' | 'error'>('loading');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.status === 'ok' && data.hasApiKey) {
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
          <div className="bg-gradient-to-tr from-blue-700 to-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <i className="fa-solid fa-shield-halved text-white text-base"></i>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight truncate">AI設計照査アシスタント</h1>
            <span className="hidden lg:inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              発注者支援・不適正予防
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <label htmlFor="model-select" className="text-xs font-semibold text-gray-500 hidden md:block">
            モデル:
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 hover:border-gray-300 rounded px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-colors duration-150"
          >
            <optgroup label="⚡ 標準・節約（デフォルト）">
              <option value="gemini-3.5-flash">Gemini 3.5 Flash 【超低コスト・高速】日常要約・簡易チェック 💰</option>
            </optgroup>
            <optgroup label="🚀 高度推論・最高コスパ（本格照査に推奨）">
              <option value="gemini-3.8-flash">Gemini 3.8 Flash 【最高コスパ・推奨】図面/計算書クロスチェック 💰💰</option>
            </optgroup>
            <optgroup label="🧠 深層推論（高難度・最終確認）">
              <option value="gemini-3.5-pro">Gemini 3.5 Pro 【深層推論】高難度特殊構造・示方書精査 💰💰💰💰</option>
            </optgroup>
          </select>
        </div>

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
