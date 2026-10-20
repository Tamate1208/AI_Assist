import React, { useEffect, useState } from 'react';
import { speechService, SpeechState } from '../services/speechService';

const AudioController: React.FC = () => {
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentId: null,
    currentTitle: null,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setSpeechState(state);
    });

    const voices = speechService.getAvailableJapaneseVoices();
    setAvailableVoices(voices);

    return () => unsubscribe();
  }, []);

  if (!speechState.isPlaying && !speechState.isPaused && !speechState.currentId) {
    return null; // 何も読み上げていない時は非表示
  }

  const rates = [0.8, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col gap-2 animate-fade-in-up print-hide">
      <div className="flex items-center justify-between gap-3">
        {/* 左側: アイコン & タイトル */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 shrink-0">
            {speechState.isPlaying ? (
              <span className="flex items-center gap-0.5 h-4">
                <span className="w-1 bg-blue-400 h-3 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 bg-blue-400 h-4 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 bg-blue-400 h-2 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            ) : (
              <i className="fa-solid fa-volume-high text-sm"></i>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <span>{speechState.isPlaying ? '読み上げ中' : '一時停止中'}</span>
            </p>
            <p className="text-xs font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[280px]">
              {speechState.currentTitle || '読み上げテキスト'}
            </p>
          </div>
        </div>

        {/* 右側: コントロールボタン群 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 速度切り替え */}
          <div className="relative group">
            <select
              value={speechState.rate}
              onChange={(e) => speechService.setRate(parseFloat(e.target.value))}
              className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-5"
              title="再生速度"
            >
              {rates.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down text-[8px] text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>

          {/* ボイス設定ボタン */}
          {availableVoices.length > 0 && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-colors ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="音声エンジンの設定"
            >
              <i className="fa-solid fa-gear text-xs"></i>
            </button>
          )}

          {/* 再生/一時停止 */}
          <button
            onClick={() => {
              if (speechState.isPlaying) {
                speechService.pause();
              } else {
                speechService.resume();
              }
            }}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all"
            title={speechState.isPlaying ? '一時停止' : '再開'}
          >
            <i className={`fa-solid ${speechState.isPlaying ? 'fa-pause' : 'fa-play'} text-sm`}></i>
          </button>

          {/* 停止 */}
          <button
            onClick={() => speechService.stop()}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="停止"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      {/* 音声エンジン（ボイス）設定ドロップダウン表示 */}
      {showSettings && availableVoices.length > 0 && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs gap-2 animate-fade-in">
          <span className="text-slate-400 text-[11px] shrink-0">音声エンジン:</span>
          <select
            value={speechState.voice?.name || ''}
            onChange={(e) => speechService.setVoice(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 w-full truncate cursor-pointer"
          >
            {availableVoices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default AudioController;
