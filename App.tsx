import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileItem, ChatMessage, AppState, PersonalityType, WorkMode } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import AudioController from './components/AudioController';
import { askGeminiStream } from './services/geminiService';
import Login from './components/Login';
import { MobileBottomNav } from './team_updates/MobileBottomNav';
import { useOfflineStorage } from './team_updates/useOfflineStorage';
import { WORK_MODES } from './constants/workModes';

interface ExtendedAppState extends AppState {
  isFileLoading: boolean;
}

const App: React.FC = () => {
  // オフライン永続化フックによるステート管理
  const { value: storedMessages, saveValue: setStoredMessages, isOnline } = useOfflineStorage<ChatMessage[]>('app_chat_messages', []);
  const { value: workMode, saveValue: setWorkMode } = useOfflineStorage<WorkMode>('app_work_mode', 'office');
  const { value: personality, saveValue: setPersonality } = useOfflineStorage<PersonalityType>('app_personality', 'default');
  const { value: selectedModel, saveValue: setSelectedModel } = useOfflineStorage<string>('app_selected_model', 'gemini-2.5-flash');
  const { value: customInstruction, saveValue: setCustomInstruction } = useOfflineStorage<string>('app_custom_instruction', '');

  const [activeMobileTab, setActiveMobileTab] = useState<string>('chat');

  const [state, setState] = useState<ExtendedAppState>(() => {
    const initialMessages = (storedMessages || []).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    return {
      files: [],
      messages: initialMessages,
      isProcessing: false,
      isSidebarOpen: false, // スマホでは初期閉じ、PCではレスポンシブ
      isFileLoading: false
    };
  });

  // PC初期表示で画面幅が広いときはサイドバーを開く
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setState(prev => ({ ...prev, isSidebarOpen: true }));
    }
  }, []);

  // チャット履歴の同期
  useEffect(() => {
    setStoredMessages(state.messages);
  }, [state.messages, setStoredMessages]);

  const handleModelChange = useCallback((newModel: string) => {
    setSelectedModel(newModel);
  }, [setSelectedModel]);

  const handlePersonalityChange = useCallback((newPersonality: PersonalityType) => {
    setPersonality(newPersonality);
  }, [setPersonality]);

  const handleCustomInstructionChange = useCallback((newInstruction: string) => {
    setCustomInstruction(newInstruction);
  }, [setCustomInstruction]);

  const handleWorkModeChange = useCallback((newMode: WorkMode) => {
    setWorkMode(newMode);
  }, [setWorkMode]);

  // モードと性格に応じたシステムプロンプトの動的合成
  const getSystemInstruction = useCallback(() => {
    const currentModeConfig = WORK_MODES[workMode] || WORK_MODES.office;
    const modeSpecificPrompt = currentModeConfig.systemPromptAddition;

    let characterPrompt = '';
    switch (personality) {
      case 'reviewer':
        characterPrompt = `【回答スタイル: 厳格照査官】公用文・示方書の観点から、不整合や旧基準の流用、机上設計の甘さ、形式不備を一切見逃さず客観的証跡とともに厳格に指摘・指導してください。`;
        break;
      case 'friendly':
        characterPrompt = `【回答スタイル: 親切な同僚】フランクで親身なトーンで話し、適宜絵文字（😊、💡など）を交えて、相談しやすく前向きなサポートをしてください。`;
        break;
      case 'tutor':
        characterPrompt = `【回答スタイル: 丁寧な先生】難しい専門用語を噛み砕いて解説し、ステップ・バイ・ステップで論理的に説明してください。最後に確認の問いかけを添えてください。`;
        break;
      case 'kansai':
        characterPrompt = `【回答スタイル: 関西弁エンジニア】フレンドリーでノリの良い関西弁を使いつつも、技術的な内容は正確に明瞭に説明してください。`;
        break;
      case 'custom':
        characterPrompt = customInstruction.trim() || '高度な専門知識と実務能力を持つAIアシスタントの役割を担います。';
        break;
      case 'default':
      default:
        characterPrompt = `【回答スタイル: 標準・実務エキスパート】常に格調高く客観的かつ丁寧な日本語で、実務に即役立つ具体的で完成度の高い回答を提供してください。`;
        break;
    }

    return `${characterPrompt}\n\n${modeSpecificPrompt}\n\n【共通回答指針】
- 資料が提供されている場合は、資料内の具体的な記載箇所や数値を引用して回答してください。
- 箇条書きや表（Markdownテーブル）を適切に活用し、視認性の高い構成にしてください。
- 根拠法令、通達、示方書、仕様書がある場合は条項番号や基準名を明記してください。`;
  }, [workMode, personality, customInstruction]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const checkSavedPassword = async () => {
      const savedPassword = localStorage.getItem("app_password") || "";
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: savedPassword }),
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
          if (savedPassword) {
            localStorage.setItem("app_password", savedPassword);
          }
        } else {
          localStorage.removeItem("app_password");
          setIsAuthenticated(false);
        }
      } catch (err) {
        if (savedPassword) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSavedPassword();
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearMessages = () => {
    setState(prev => ({ ...prev, messages: [] }));
    setStoredMessages([]);
  };

  // ファイルアップロード処理（PDF, Excel, CSV, 画像等）
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setState(prev => ({ ...prev, isFileLoading: true }));

    const readFile = async (file: any): Promise<FileItem | null> => {
      if (file.name.startsWith('.')) return null;

      const lowerName = file.name.toLowerCase();
      const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
      const isCsv = lowerName.endsWith('.csv');

      // 1. Excel (.xlsx / .xls)
      if (isExcel) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const XLSX = (window as any).XLSX;
              let markdownContent = `# Excelデータ: ${file.name}\n\n`;

              if (XLSX) {
                const workbook = XLSX.read(data, { type: 'array' });
                workbook.SheetNames.forEach((sheetName: string) => {
                  const worksheet = workbook.Sheets[sheetName];
                  const csv = XLSX.utils.sheet_to_csv(worksheet);
                  if (csv && csv.trim()) {
                    markdownContent += `## シート名: ${sheetName}\n\`\`\`csv\n${csv}\n\`\`\`\n\n`;
                  }
                });
              } else {
                markdownContent += `(※Excel解析ライブラリのロードに失敗しました)\n`;
              }

              const encoded = btoa(unescape(encodeURIComponent(markdownContent)));
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                path: file.webkitRelativePath || '',
                type: 'text/plain',
                size: file.size,
                data: `data:text/plain;base64,${encoded}`,
              });
            } catch (err) {
              console.error('Excel parse error:', err);
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsArrayBuffer(file);
        });
      }

      // 2. CSV (.csv)
      if (isCsv) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            const encoded = btoa(unescape(encodeURIComponent(text)));
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              path: file.webkitRelativePath || '',
              type: 'text/csv',
              size: file.size,
              data: `data:text/csv;base64,${encoded}`,
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        });
      }

      // 3. 通常ファイル (PDF, 画像, テキスト等)
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            path: file.webkitRelativePath || '',
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: base64Data,
            preview: file.type.startsWith('image/') ? base64Data : undefined
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    };

    const filePromises = Array.from(uploadedFiles).map(file => readFile(file));
    const results = await Promise.all(filePromises);
    const validFiles = results.filter((f): f is FileItem => f !== null);

    setState(prev => ({ 
      ...prev, 
      files: [...prev.files, ...validFiles],
      isFileLoading: false 
    }));

    event.target.value = '';
  };

  // テキスト・議事録メモ直接貼り付け登録
  const handleAddTextFile = (title: string, content: string) => {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${title}.txt`,
      type: 'text/plain',
      size: new Blob([content]).size,
      data: `data:text/plain;base64,${encoded}`,
    };
    setState(prev => ({
      ...prev,
      files: [...prev.files, newFile]
    }));
  };

  const removeFile = (id: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== id)
    }));
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || state.isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      mode: workMode
    };

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: workMode
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, initialAiMessage],
      isProcessing: true
    }));

    setTimeout(scrollToBottom, 50);

    let fullContent = '';
    try {
      const stream = askGeminiStream(content, state.files, state.messages, selectedModel, getSystemInstruction());
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: fullContent } : msg
          )
        }));
        scrollToBottom();
      }

      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        localStorage.removeItem("app_password");
        setIsAuthenticated(false);
        setState(prev => ({
          ...prev,
          isProcessing: false,
          messages: prev.messages.filter(msg => msg.id !== userMessage.id && msg.id !== aiMessageId)
        }));
      } else {
        const errorMessage = `エラーが発生しました: ${error instanceof Error ? error.message : "予期せぬエラーです。"}`;
        setState(prev => ({
          ...prev,
          isProcessing: false,
          messages: prev.messages.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: errorMessage } : msg
          )
        }));
      }
    } finally {
      setTimeout(scrollToBottom, 50);
    }
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }));
  };

  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 font-sans">
        <div className="w-10 h-10 border-4 border-blue-500/80 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm">システム起動中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login 
        onSuccess={(password) => {
          localStorage.setItem("app_password", password);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Header 
        onToggleSidebar={toggleSidebar} 
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        currentMode={workMode}
        onModeChange={handleWorkModeChange}
        isOnline={isOnline}
      />
      
      <div className="flex flex-1 overflow-hidden relative pb-14 md:pb-0">
        {/* Mobile Backdrop */}
        {state.isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden animate-fade-in"
            onClick={toggleSidebar}
          />
        )}

        <Sidebar 
          isOpen={state.isSidebarOpen} 
          files={state.files} 
          onUpload={handleFileUpload} 
          onRemove={removeFile}
          onAddTextFile={handleAddTextFile}
          isFileLoading={state.isFileLoading}
          personality={personality}
          onPersonalityChange={handlePersonalityChange}
          customInstruction={customInstruction}
          onCustomInstructionChange={handleCustomInstructionChange}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-950 relative">
          <ChatInterface 
            messages={state.messages} 
            onSendMessage={sendMessage} 
            isProcessing={state.isProcessing}
            hasFiles={state.files.length > 0}
            chatEndRef={chatEndRef}
            onClearChat={clearMessages}
            currentMode={workMode}
            onModeChange={handleWorkModeChange}
          />
        </main>
      </div>

      {/* 音声読み上げプレイヤーコントローラー */}
      <AudioController />

      {/* モバイル用片手操作ボトムナビ */}
      <MobileBottomNav 
        activeTab={activeMobileTab}
        onSelectTab={(tabId) => {
          setActiveMobileTab(tabId);
          if (tabId === 'chat' && state.isSidebarOpen) {
            setState(prev => ({ ...prev, isSidebarOpen: false }));
          }
        }}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={state.isSidebarOpen}
      />
    </div>
  );
};

export default App;
