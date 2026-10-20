import React, { useState, useRef, useEffect } from 'react';
import { FileItem, PersonalityType } from '../types';
import { speechService, SpeechState } from '../services/speechService';

interface SidebarProps {
  isOpen: boolean;
  files: FileItem[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  onAddTextFile?: (title: string, content: string) => void;
  isFileLoading?: boolean;
  personality: PersonalityType;
  onPersonalityChange: (personality: PersonalityType) => void;
  customInstruction: string;
  onCustomInstructionChange: (instruction: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  files, 
  onUpload, 
  onRemove, 
  onAddTextFile,
  isFileLoading,
  personality,
  onPersonalityChange,
  customInstruction,
  onCustomInstructionChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPersonalityOpen, setIsPersonalityOpen] = useState(true);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentId: null,
    currentTitle: null,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setSpeechState(state);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTextFile = () => {
    if (!textContent.trim()) return;
    const title = textTitle.trim() || `業務メモ_${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    if (onAddTextFile) {
      onAddTextFile(title, textContent);
    }
    setTextTitle('');
    setTextContent('');
    setShowTextModal(false);
  };

  const getFileTextContent = (file: FileItem): string => {
    if (file.type.includes('pdf')) {
      return `PDFファイル「${file.name}」は直接読み上げできません。チャットでAIに内容を要約させてから、その回答を読み上げてください。`;
    }
    if (file.type.includes('image')) {
      return `画像ファイル「${file.name}」は読み上げできません。`;
    }

    if (!file.data) return `ファイル「${file.name}」の内容を取得できませんでした。`;
    try {
      if (file.data.startsWith('data:')) {
        const base64Parts = file.data.split(',');
        if (base64Parts.length > 1) {
          const decoded = new TextDecoder('utf-8').decode(
            Uint8Array.from(atob(base64Parts[1]), c => c.charCodeAt(0))
          );
          const printableRatio = (decoded.match(/[\x20-\x7E\u3000-\u9FFF\uFF00-\uFFEF]/g) || []).length / Math.max(decoded.length, 1);
          if (printableRatio > 0.7 && decoded.trim().length > 0) {
            return decoded;
          }
        }
      }
      return `ファイル「${file.name}」のテキスト内容を読み取れませんでした。`;
    } catch (e) {
      return `ファイル「${file.name}」の読み込み中にエラーが発生しました。`;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (type: string, name?: string) => {
    const lowerName = (name || '').toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
      return <i className="fa-solid fa-file-excel text-emerald-600 dark:text-emerald-400"></i>;
    }
    if (type.includes('pdf')) return <i className="fa-solid fa-file-pdf text-red-500"></i>;
    if (type.includes('image')) return <i className="fa-solid fa-file-image text-green-500"></i>;
    if (type.includes('text') || type.includes('plain')) return <i className="fa-solid fa-file-lines text-blue-500"></i>;
    return <i className="fa-solid fa-file text-gray-400"></i>;
  };

  return (
    <aside className={`
      fixed md:relative inset-y-0 left-0 w-80 h-full border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex flex-col z-30 md:z-10 
      transition-all duration-300 ease-in-out shrink-0 print-hide
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
    `}>
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="relative" ref={menuRef}>
          <button 
            disabled={isFileLoading}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-bold shadow-lg transition-all cursor-pointer ${
              isFileLoading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]'
            }`}
          >
            {isFileLoading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                <span>読み込み中...</span>
              </>
            ) : (
              <>
                <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-plus'}`}></i>
                <span>資料・メモを追加</span>
              </>
            )}
          </button>

          {isMenuOpen && !isFileLoading && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-2 animate-fade-in-down">
              <button 
                onClick={() => { fileInputRef.current?.click(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-slate-200 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <i className="fa-solid fa-file-circle-plus"></i>
                </div>
                <div>
                  <p className="font-bold">ファイルを選択</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">PDF、画像、Excel、CSV</p>
                </div>
              </button>
              
              <button 
                onClick={() => { setShowTextModal(true); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-slate-200 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <i className="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                  <p className="font-bold">テキスト・議事録メモを貼付</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">文章を直接ペーストして資料化</p>
                </div>
              </button>

              <button 
                onClick={() => { folderInputRef.current?.click(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-slate-200 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <i className="fa-solid fa-folder-tree"></i>
                </div>
                <div>
                  <p className="font-bold">フォルダごと指定</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">成果品フォルダを一括解析</p>
                </div>
              </button>
            </div>
          )}

          {/* Hidden Inputs */}
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            multiple 
            onChange={onUpload}
            accept=".pdf,image/*,text/*,.xlsx,.xls,.csv"
          />
          <input 
            ref={folderInputRef}
            type="file" 
            className="hidden" 
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={onUpload}
          />
        </div>
      </div>

      {/* テキスト貼り付けモーダル */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-emerald-500"></i>
                テキスト・議事録メモを資料に追加
              </h3>
              <button 
                onClick={() => setShowTextModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="メモのタイトル（例: 20261020_定例協議メモ）"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-slate-200"
            />

            <textarea 
              rows={6}
              placeholder="会議の発言録、長文メール、仕様書の抜粋などをここに貼り付けてください..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-slate-200 resize-none"
            />

            <div className="flex justify-end gap-2 mt-1">
              <button 
                onClick={() => setShowTextModal(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveTextFile}
                disabled={!textContent.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50"
              >
                資料として登録
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 資料リスト */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-white/40 dark:bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-layer-group"></i>
            参照資料 ({files.length})
          </h2>
        </div>

        {isFileLoading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-blue-600 font-bold">ファイルを解析中...</p>
          </div>
        )}

        {files.length === 0 && !isFileLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 border border-gray-200 dark:border-slate-700 border-dashed">
              <i className="fa-solid fa-cloud-arrow-up text-xl text-gray-400 dark:text-slate-500"></i>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-400 font-medium px-4 leading-relaxed">
              上のボタンから資料や<br/>議事録メモを登録できます。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(file => {
              const isCurrentPlaying = speechState.currentId === file.id;
              return (
                <div key={file.id} className={`group bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border transition-all relative ${
                  isCurrentPlaying 
                    ? 'border-blue-500 shadow-md shadow-blue-500/10 bg-blue-50/30 dark:bg-blue-950/30 ring-1 ring-blue-400' 
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
                }`}>
                  <div className="flex items-start gap-2.5 pr-12">
                    <div className="text-lg mt-0.5 shrink-0">
                      {getIcon(file.type, file.name)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] text-gray-400 dark:text-slate-400 font-bold">
                          {formatSize(file.size)}
                        </p>
                        {file.path && (
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate max-w-[90px]">
                            in {file.path.split('/')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => {
                        const content = getFileTextContent(file);
                        speechService.speak(file.id, `資料: ${file.name}`, content);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        isCurrentPlaying
                          ? 'bg-blue-600 text-white'
                          : 'opacity-70 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-600'
                      }`}
                      title="読み上げ"
                    >
                      <i className={`fa-solid ${
                        isCurrentPlaying && speechState.isPlaying ? 'fa-pause text-[10px]' : 'fa-volume-high text-[10px]'
                      }`}></i>
                    </button>

                    <button 
                      onClick={() => onRemove(file.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 text-gray-300 rounded-lg transition-all"
                      title="削除"
                    >
                      <i className="fa-solid fa-xmark text-[10px]"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AIのトーン・性格設定 */}
        <div className="mt-6 border-t border-gray-200 dark:border-slate-800 pt-5">
          <button
            onClick={() => setIsPersonalityOpen(!isPersonalityOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors uppercase tracking-[0.2em] mb-3"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
              回答スタイル設定
            </span>
            <i className={`fa-solid fa-chevron-${isPersonalityOpen ? 'up' : 'down'} text-[10px]`}></i>
          </button>

          {isPersonalityOpen && (
            <div className="space-y-2 animate-fade-in-down">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: 'default',
                    label: '標準・専門的',
                    desc: '丁寧・高精度',
                    icon: 'fa-robot text-blue-500',
                  },
                  {
                    id: 'reviewer',
                    label: '厳格照査官',
                    desc: '不整合を指摘',
                    icon: 'fa-shield-halved text-indigo-500',
                  },
                  {
                    id: 'friendly',
                    label: '親切な同僚',
                    desc: '相談しやすい',
                    icon: 'fa-face-smile text-emerald-500',
                  },
                  {
                    id: 'tutor',
                    label: '解説の先生',
                    desc: '分かりやすい',
                    icon: 'fa-graduation-cap text-amber-500',
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onPersonalityChange(preset.id as any)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                      personality === preset.id
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 ring-1 ring-blue-500'
                        : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <i className={`fa-solid ${preset.icon} text-xs`}></i>
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{preset.label}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-slate-400">{preset.desc}</span>
                  </button>
                ))}
              </div>

              {/* カスタム指示 */}
              <button
                type="button"
                onClick={() => onPersonalityChange('custom')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                  personality === 'custom'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-indigo-500 text-xs"></i>
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200">自由指示（カスタム）</span>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
              </button>

              {personality === 'custom' && (
                <textarea
                  rows={3}
                  value={customInstruction}
                  onChange={(e) => onCustomInstructionChange(e.target.value)}
                  placeholder="例：回答は箇条書きを多用し、公用文の用字用語（及び/並びに、又は/若しくは）に厳格に沿ってください。"
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 ${isFileLoading ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full`}></span>
            {isFileLoading ? '処理中...' : 'システム準備完了'}
          </div>
          <div className="font-mono">v2.0.0 Multi-Work</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
