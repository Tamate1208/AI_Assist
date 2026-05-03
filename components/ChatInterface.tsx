
import React, { useState, KeyboardEvent, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isProcessing: boolean;
  hasFiles: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isProcessing, 
  hasFiles,
  chatEndRef 
}) => {
  const [input, setInput] = useState('');

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

  // Ensure scroll occurs when messages content updates (for streaming)
  useEffect(() => {
    if (isProcessing) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isProcessing]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 lg:px-20 space-y-6 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-3xl">
              <i className="fa-solid fa-robot"></i>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">本日はどのようなお手伝いをしましょうか？</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {hasFiles 
                ? "資料の内容を詳細に分析しました。ストリーミング回答と推論機能により、高速かつ正確にお答えします。"
                : "サイドバーから資料をアップロードしてください。内容に基づいて的確に回答します。"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {[
                "資料の内容を要約して",
                "重要なポイントを分析して",
                "特定の数値データを抽出して",
                "資料に基づいた改善案を提示して"
              ].map((suggestion, i) => (
                <button 
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 text-left transition-all shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            msg.content || msg.role === 'user' ? (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex max-w-[92%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2 sm:gap-3`}>
                  <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm shadow-sm ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-2xl shadow-sm leading-relaxed transition-all ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none text-sm' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none overflow-x-auto overflow-y-hidden'
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
                    <div className={`text-[9px] sm:text-[10px] mt-2 opacity-60 text-right ${msg.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ))
        )}
        {isProcessing && !messages[messages.length - 1]?.content && (
          <div className="flex justify-start">
            <div className="flex gap-2 sm:gap-3">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 sm:p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium italic">内容を慎重に推論中...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 md:p-6 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-1 shadow-inner focus-within:border-blue-400 transition-colors">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasFiles ? "資料について質問する..." : "メッセージを入力..."}
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 sm:py-3 sm:px-4 resize-none max-h-40 min-h-[40px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              input.trim() && !isProcessing 
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="送信"
          >
            <i className="fa-solid fa-paper-plane text-sm sm:text-base"></i>
          </button>
        </div>
        <p className="text-[9px] sm:text-[10px] text-gray-400 text-center mt-2 sm:mt-3">
          AIは推論を行い精度を高めていますが、重要な事実は必ず元の資料で再確認してください。
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
