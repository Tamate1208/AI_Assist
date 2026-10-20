import React, { useState, KeyboardEvent, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, WorkMode } from '../types';
import { speechService, SpeechState } from '../services/speechService';
import { WORK_MODES } from '../constants/workModes';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isProcessing: boolean;
  hasFiles: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onClearChat?: () => void;
  currentMode: WorkMode;
  onModeChange?: (mode: WorkMode) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isProcessing, 
  hasFiles, 
  chatEndRef,
  onClearChat,
  currentMode,
  onModeChange
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPlainId, setCopiedPlainId] = useState<string | null>(null);
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentId: null,
    currentTitle: null,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  });

  const activeModeConfig = WORK_MODES[currentMode] || WORK_MODES.office;

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setSpeechState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // メールや日報向けにマークダウン記号を除去してコピー
  const handleCopyPlainText = (id: string, text: string) => {
    const plain = text
      .replace(/^#+\s+/gm, '') // 見出し記号除去
      .replace(/\*\*(.*?)\*\*/g, '$1') // 太字除去
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{3}[\s\S]*?`{3}/g, (match) => match.replace(/`{3}[a-z]*\n?/gi, ''))
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    navigator.clipboard.writeText(plain);
    setCopiedPlainId(id);
    setTimeout(() => setCopiedPlainId(null), 2000);
  };

  // ファイルとしてダウンロード保存
  const handleDownloadFile = (filenamePrefix: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 印刷・PDF出力プレビュー
  const handlePrint = () => {
    window.print();
  };

  const handleCreateDirective = (baseContent: string) => {
    const prompt = `先ほどの内容に基づき、関係者宛てに正式に送付・回覧する『公用文・業務連絡指示書（兼 協議書）』を格式高い文面で起案してください。
【必須項目】
1. 件名
2. 趣旨および背景
3. 項目別の要請・指示・決定事項
4. 期限および担当者連絡先`;
    onSendMessage(prompt);
  };

  useEffect(() => {
    if (isProcessing) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isProcessing, chatEndRef]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 md:px-8 lg:px-12 space-y-5 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto p-4 animate-fade-in my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 text-2xl sm:text-3xl shadow-lg shadow-blue-500/20">
              <i className={`fa-solid ${activeModeConfig.icon}`}></i>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
              <i className="fa-solid fa-sparkles"></i>
              {activeModeConfig.label}
            </div>

            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">
              {activeModeConfig.description}
            </h2>
            
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed max-w-xl">
              {hasFiles 
                ? "アップロードされた資料を参照して回答します。下のメニューを選択するか、直接プロンプトを入力してください。"
                : "資料をアップロードして分析させることも、直接指示や相談を入力して日常業務に使うことも可能です。"}
            </p>

            {/* モード別クイックアクションカード群 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {activeModeConfig.presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSendMessage(preset.prompt)}
                  className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md rounded-2xl transition-all group flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <i className={`fa-solid ${preset.icon} text-base shrink-0`}></i>
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {preset.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 shrink-0">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {preset.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <span>このテンプレートを実行</span>
                    <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {onClearChat && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-slate-800 mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-blue-600 dark:text-blue-400"></i>
                  業務対話履歴 ({messages.filter(m => m.role === 'user').length}件のやり取り)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer print-hide"
                    title="印刷またはPDF保存"
                  >
                    <i className="fa-solid fa-print"></i>
                    <span className="hidden sm:inline">印刷 / PDF</span>
                  </button>
                  <button
                    onClick={onClearChat}
                    className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer print-hide"
                    title="チャット履歴を消去"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    <span>履歴クリア</span>
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg) => (
            msg.content || msg.role === 'user' ? (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex max-w-[95%] sm:max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2 sm:gap-3`}>
                  <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gradient-to-tr from-slate-800 to-indigo-900 text-white'
                  }`}>
                    <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm leading-relaxed transition-all relative group ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none text-sm' 
                      : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-100 rounded-tl-none overflow-x-auto'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* アクションフッター */}
                    <div className={`flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t text-[10px] print-hide ${
                      msg.role === 'user' ? 'border-white/10 text-white/70' : 'border-gray-100 dark:border-slate-800 text-gray-400'
                    }`}>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* 音声読み上げボタン */}
                        <button
                          onClick={() => {
                            const title = msg.role === 'user' ? 'ユーザー指示' : 'AI回答';
                            speechService.speak(msg.id, title, msg.content);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                            speechState.currentId === msg.id
                              ? msg.role === 'user' 
                                ? 'bg-white/20 text-white font-bold' 
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                              : msg.role === 'user'
                                ? 'hover:bg-white/10 text-white/80'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                          }`}
                          title="読み上げ"
                        >
                          <i className={`fa-solid ${
                            speechState.currentId === msg.id && speechState.isPlaying ? 'fa-pause' : 'fa-volume-high'
                          } text-[10px]`}></i>
                          <span>
                            {speechState.currentId === msg.id && speechState.isPlaying
                              ? '再生中'
                              : speechState.currentId === msg.id && speechState.isPaused
                                ? '一時停止'
                                : '音声'}
                          </span>
                        </button>

                        {/* Markdownコピーボタン */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                            copiedId === msg.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold'
                              : msg.role === 'user'
                                ? 'hover:bg-white/10 text-white/80'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                          }`}
                          title="Markdown形式でコピー"
                        >
                          <i className={`fa-solid ${copiedId === msg.id ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                          <span>{copiedId === msg.id ? 'コピー完了' : 'コピー'}</span>
                        </button>

                        {/* メール・文書用プレーンテキストコピー */}
                        <button
                          onClick={() => handleCopyPlainText(msg.id, msg.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                            copiedPlainId === msg.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                              : msg.role === 'user'
                                ? 'hover:bg-white/10 text-white/80'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                          }`}
                          title="メール・日報用に記号を除去してコピー"
                        >
                          <i className={`fa-solid ${copiedPlainId === msg.id ? 'fa-check' : 'fa-envelope'} text-[10px]`}></i>
                          <span>{copiedPlainId === msg.id ? '本文コピー済' : 'メール用'}</span>
                        </button>

                        {/* AI回答用：ファイル保存 ＆ 指示書起案 */}
                        {msg.role === 'assistant' && (
                          <>
                            <button
                              onClick={() => handleDownloadFile('AI業務成果物', msg.content)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 font-medium transition-all cursor-pointer"
                              title="Markdownファイルとして保存"
                            >
                              <i className="fa-solid fa-download text-[10px]"></i>
                              <span>保存</span>
                            </button>
                            <button
                              onClick={() => handleCreateDirective(msg.content)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold transition-all cursor-pointer"
                              title="この内容をもとに公用文・指示書を起案"
                            >
                              <i className="fa-solid fa-file-pen text-[10px]"></i>
                              <span>公用文起案</span>
                            </button>
                          </>
                        )}
                      </div>

                      <span>
                        {msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ))}
          </>
        )}

        {isProcessing && !messages[messages.length - 1]?.content && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-2 sm:gap-3">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm">
                <i className={`fa-solid ${activeModeConfig.icon}`}></i>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                </div>
                <span className="text-xs text-gray-600 dark:text-slate-300 font-bold">
                  {activeModeConfig.shortLabel}の視点でAIが推論中...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* フッター：常設モード専用クイックバー ＋ 入力欄 */}
      <div className="p-2 sm:p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] print-hide transition-colors duration-200">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* モード別クイックバー */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 shrink-0 uppercase tracking-wider flex items-center gap-1 mr-1">
              <i className="fa-solid fa-bolt text-amber-500"></i>
              {activeModeConfig.shortLabel}クイック:
            </span>
            {activeModeConfig.presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSendMessage(preset.prompt)}
                disabled={isProcessing}
                className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-gray-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={preset.desc}
              >
                <i className={`fa-solid ${preset.icon} text-[10px]`}></i>
                <span>{preset.title}</span>
              </button>
            ))}
          </div>

          {/* 入力テキストエリア */}
          <div className="relative flex items-end gap-2">
            <div className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasFiles ? `${activeModeConfig.shortLabel}: 資料を参照して指示を入力...` : activeModeConfig.placeholder}
                className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 sm:py-3 sm:px-4 resize-none max-h-40 min-h-[42px] text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                input.trim() && !isProcessing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95 cursor-pointer' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="送信"
            >
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center mt-1.5 font-medium">
          ※業務アシスタントAIです。作成文書・数値計算・技術判断は公式通達や現行示方書と照合してご活用ください。
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
