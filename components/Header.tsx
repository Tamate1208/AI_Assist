import React, { useEffect, useState } from 'react';
import { WorkMode } from '../types';
import { WORK_MODES } from '../constants/workModes';

interface HeaderProps {
  onToggleSidebar: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  currentMode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
  isOnline?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  selectedModel, 
  onModelChange,
  currentMode,
  onModeChange,
  isOnline = true
}) => {
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
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const modeKeys: WorkMode[] = ['office', 'field', 'tech', 'general', 'review'];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-3 sm:px-4 py-2 flex flex-col gap-2 z-20 shadow-sm transition-colors duration-200">
      {/* 上段: ロゴ・タイトル ＆ ステータス・モデル選択 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-600 dark:text-slate-300 transition-colors shrink-0"
            aria-label="サイドバーを切り替え"
          >
            <i className="fa-solid fa-bars text-lg sm:text-xl"></i>
          </button>
          
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-gradient-to-tr from-blue-700 to-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <i className="fa-solid fa-wand-magic-sparkles text-white text-sm"></i>
            </div>
            <div className="flex items-baseline gap-2 overflow-hidden">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 dark:text-slate-100 tracking-tight truncate">
                AI業務アシスタント
              </h1>
              <span className="hidden xl:inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full shrink-0">
                実務・現場・照査対応
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* オフライン警告バッジ */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
              <i className="fa-solid fa-plane-slash text-[10px]"></i>
              <span className="hidden sm:inline">オフライン</span>
            </div>
          )}

          {/* Model Selector */}
          <div className="flex items-center gap-1.5">
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              aria-label="AIモデルの選択"
              className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors max-w-[150px] sm:max-w-[240px] md:max-w-none truncate"
            >
              <optgroup label="🚀 最新世代・推奨（最高コスパ・高度推論）">
                <option value="gemini-3.8-flash">Gemini 3.8 Flash 【最新・推奨】高度推論・最高コスパ 🚀</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash 【高速・低コスト】日常要約・簡易チェック ⚡</option>
              </optgroup>
              <optgroup label="🧠 最新深層推論（高難度・最終確認）">
                <option value="gemini-3.5-pro">Gemini 3.5 Pro 【深層推論】高難度特殊構造・示方書精査 🧠</option>
              </optgroup>
              <optgroup label="📦 安定版">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash 【安定版】標準応答 📦</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro 【安定版】詳細推論 📦</option>
              </optgroup>
            </select>
          </div>

          {/* ダークモード切り替えボタン */}
          <button
            type="button"
            onClick={() => {
              const isDark = document.documentElement.classList.contains('dark');
              const nextMode = !isDark;
              document.documentElement.classList.toggle('dark', nextMode);
              localStorage.setItem('theme_mode', nextMode ? 'dark' : 'light');
            }}
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="ダーク/ライトモード切替"
            aria-label="ダークモード切替"
          >
            <span className="text-sm dark:hidden">🌙</span>
            <span className="text-sm hidden dark:inline">☀️</span>
            <span className="text-xs hidden lg:inline font-medium dark:hidden">ダーク</span>
            <span className="text-xs hidden lg:inline font-medium hidden dark:lg:inline">ライト</span>
          </button>

          {/* 接続状態インジケーター */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            status === 'online' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
              : status === 'loading'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              status === 'online' 
                ? 'bg-emerald-500 animate-pulse' 
                : status === 'loading'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}></span>
            <span className="hidden md:inline">
              {status === 'online' ? '接続中' : status === 'loading' ? '確認中' : 'エラー'}
            </span>
          </div>
        </div>
      </div>

      {/* 下段: 業務モード切り替えタブバー */}
      <nav aria-label="業務モード切替" className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5 -mx-1 px-1">
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <i className="fa-solid fa-briefcase text-blue-500"></i>
          業務モード:
        </span>
        {modeKeys.map((key) => {
          const mode = WORK_MODES[key];
          const isActive = currentMode === key;
          return (
            <button
              key={key}
              onClick={() => onModeChange(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-500'
                  : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300'
              }`}
              title={mode.description}
            >
              <i className={`fa-solid ${mode.icon} text-xs`}></i>
              <span>{mode.shortLabel}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
              }`}>
                {mode.badge}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export default Header;
