
import React, { useState, useRef, useEffect } from 'react';
import { FileItem, PersonalityType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  files: FileItem[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
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
  isFileLoading,
  personality,
  onPersonalityChange,
  customInstruction,
  onCustomInstructionChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPersonalityOpen, setIsPersonalityOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (type: string) => {
    if (type.includes('pdf')) return <i className="fa-solid fa-file-pdf text-red-500"></i>;
    if (type.includes('image')) return <i className="fa-solid fa-file-image text-green-500"></i>;
    if (type.includes('text') || type.includes('plain')) return <i className="fa-solid fa-file-lines text-blue-500"></i>;
    return <i className="fa-solid fa-file text-gray-400"></i>;
  };

  return (
    <aside className={`
      fixed md:relative inset-y-0 left-0 w-80 h-full border-r border-gray-200 bg-gray-50 flex flex-col z-30 md:z-10 
      transition-transform duration-300 ease-in-out shrink-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
    `}>
      <div className="p-4 border-b border-gray-200">
        <div className="relative" ref={menuRef}>
          <button 
            disabled={isFileLoading}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg transition-all ${
              isFileLoading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isFileLoading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                読み込み中...
              </>
            ) : (
              <>
                <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-plus'}`}></i>
                資料を追加
              </>
            )}
          </button>

          {isMenuOpen && !isFileLoading && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-2 animate-fade-in-down">
              <button 
                onClick={() => { fileInputRef.current?.click(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i className="fa-solid fa-file-circle-plus"></i>
                </div>
                <div className="text-left">
                  <p className="font-bold">ファイルを選択</p>
                  <p className="text-[10px] text-gray-400">個別の資料をアップロード</p>
                </div>
              </button>
              
              <button 
                onClick={() => { folderInputRef.current?.click(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <i className="fa-solid fa-folder-tree"></i>
                </div>
                <div className="text-left">
                  <p className="font-bold">フォルダを指定</p>
                  <p className="text-[10px] text-gray-400">ドライブから落としたフォルダを丸ごと</p>
                </div>
              </button>
              
              <div className="mx-4 my-1 border-t border-gray-100"></div>
              
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                  <i className="fa-brands fa-google-drive text-blue-400"></i>
                  Google Drive フォルダに対応
                </div>
              </div>
            </div>
          )}

          {/* Hidden Inputs */}
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            multiple 
            onChange={onUpload}
            accept=".pdf,image/*,text/*"
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

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-layer-group"></i>
            Current Sources ({files.length})
          </h2>
        </div>

        {isFileLoading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-blue-600 font-bold">フォルダを解析中...</p>
            <p className="text-[10px] text-gray-400 mt-2">大量のファイルがある場合、<br/>少し時間がかかります。</p>
          </div>
        )}

        {files.length === 0 && !isFileLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 border-dashed">
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-300"></i>
            </div>
            <p className="text-xs text-gray-400 font-medium px-6 leading-relaxed">
              上のボタンから講座資料を<br/>読み込ませてください。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="group bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all relative">
                <div className="flex items-start gap-3">
                  <div className="text-xl mt-0.5">
                    {getIcon(file.type)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-gray-700 truncate pr-6" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[9px] text-gray-400 font-bold">
                        {formatSize(file.size)}
                      </p>
                      {file.path && (
                        <span className="text-[9px] text-gray-300 truncate max-w-[100px]">
                          in {file.path.split('/')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(file.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-300 rounded-lg transition-all"
                  title="削除"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* AIの性格設定 アコーディオン */}
        <div className="mt-6 border-t border-gray-150 pt-6">
          <button
            onClick={() => setIsPersonalityOpen(!isPersonalityOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-[0.2em] mb-4"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
              AIの性格設定
            </span>
            <i className={`fa-solid fa-chevron-${isPersonalityOpen ? 'up' : 'down'} text-[10px]`}></i>
          </button>

          {isPersonalityOpen && (
            <div className="space-y-3 animate-fade-in-down">
              {/* プリセット選択肢 */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'default',
                    label: '標準',
                    desc: '丁寧で専門的',
                    icon: 'fa-robot text-blue-500',
                  },
                  {
                    id: 'friendly',
                    label: 'フレンドリー',
                    desc: '親しみやすい同僚',
                    icon: 'fa-face-smile text-emerald-500',
                  },
                  {
                    id: 'tutor',
                    label: '家庭教師',
                    desc: '丁寧なステップ解説',
                    icon: 'fa-graduation-cap text-amber-500',
                  },
                  {
                    id: 'kansai',
                    label: '関西弁',
                    desc: 'ノリの良いエンジニア',
                    icon: 'fa-user-gear text-rose-500',
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onPersonalityChange(preset.id as any)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer hover:shadow-sm active:scale-[0.98] ${
                      personality === preset.id
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fa-solid ${preset.icon} text-xs`}></i>
                      <span className="text-xs font-bold text-gray-800">{preset.label}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 font-medium leading-tight">{preset.desc}</span>
                  </button>
                ))}
              </div>

              {/* カスタム選択ボタン */}
              <button
                type="button"
                onClick={() => onPersonalityChange('custom')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer hover:shadow-sm active:scale-[0.98] ${
                  personality === 'custom'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-sliders text-indigo-500 text-xs"></i>
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-800 block leading-tight">カスタム設定</span>
                    <span className="text-[9px] text-gray-400 font-medium block mt-0.5 leading-none">独自の指示を自由に設定できます</span>
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-right text-[10px] text-gray-400 ${personality === 'custom' ? 'text-blue-500' : ''}`}></i>
              </button>

              {/* カスタムテキストエリア */}
              {personality === 'custom' && (
                <div className="mt-2 space-y-1.5 animate-fade-in-down">
                  <label htmlFor="custom-instruction" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    AIへのカスタム指示
                  </label>
                  <textarea
                    id="custom-instruction"
                    rows={4}
                    value={customInstruction}
                    onChange={(e) => onCustomInstructionChange(e.target.value)}
                    placeholder="例：あなたは親切なアシスタントです。語尾に「〜にゃん」をつけて可愛くお話ししてください。"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-300 resize-none leading-relaxed shadow-inner"
                  />
                  <p className="text-[9px] text-gray-400 font-medium leading-relaxed">
                    ※資料参照のルールやMarkdown出力などの基本動作は、カスタム指示の後ろに自動で追加されます。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 ${isFileLoading ? 'bg-amber-500' : 'bg-green-500'} rounded-full`}></span>
            {isFileLoading ? 'Processing Files...' : 'System Ready'}
          </div>
          <div className="font-mono">v1.2.6</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
