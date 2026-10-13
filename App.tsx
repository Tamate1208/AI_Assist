import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileItem, ChatMessage, AppState, PersonalityType } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import AudioController from './components/AudioController';
import { askGeminiStream } from './services/geminiService';
import Login from './components/Login';

interface ExtendedAppState extends AppState {
  isFileLoading: boolean;
}

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('app_selected_model') || 'gemini-3.5-flash';
  });

  const handleModelChange = useCallback((newModel: string) => {
    setSelectedModel(newModel);
    localStorage.setItem('app_selected_model', newModel);
  }, []);
  const [state, setState] = useState<ExtendedAppState>(() => {
    let initialMessages: ChatMessage[] = [];
    try {
      const saved = localStorage.getItem('app_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        initialMessages = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {}

    return {
      files: [],
      messages: initialMessages,
      isProcessing: false,
      isSidebarOpen: true,
      isFileLoading: false
    };
  });

  const [personality, setPersonality] = useState<PersonalityType>(() => {
    return (localStorage.getItem('app_personality') as PersonalityType) || 'reviewer';
  });
  const [customInstruction, setCustomInstruction] = useState<string>(() => {
    return localStorage.getItem('app_custom_instruction') || '';
  });

  const handlePersonalityChange = useCallback((newPersonality: PersonalityType) => {
    setPersonality(newPersonality);
    localStorage.setItem('app_personality', newPersonality);
  }, []);

  const handleCustomInstructionChange = useCallback((newInstruction: string) => {
    setCustomInstruction(newInstruction);
    localStorage.setItem('app_custom_instruction', newInstruction);
  }, []);

  const getSystemInstruction = useCallback(() => {
    const baseGuidelines = `以下の設計照査・発注者業務ガイドラインを厳守して回答の精度を高めてください：

1. 設計成果の不適正見抜き・照査:
   - 書類間・図面間のクロスチェック: 報告書、構造計算書、設計図面、数量計算書、特記仕様書の間で寸法・仕様・鉄筋径・数量・設計条件に不整合がないか徹底的に照合してください。
   - 基準適合と旧基準検知: 道路橋示方書、河川構造令、コンクリート示方書、土木工事共通仕様書などの現行基準に適合しているか、改定前の古い基準が流用されていないか確認してください。
   - 施工性・現場成立性の検証: 机上設計にとどまらず、クレーン進入路・重機作業ヤードの有無、鉄筋過密によるコンクリート充填性、仮設工・地下水処理の考慮漏れがないか現場視点でチェックしてください。
   - 会計検査院指摘リスクの予防: 不経済な工法選定理由の曖昧さ、ボーリング地盤定数を過小評価した過大設計、開口部や部材体積の控除漏れを摘出してください。
2. 根拠の明示: 提供された資料の内容に基づき、可能な限り「どの資料のどの部分（図面番号、計算書P.xxなど）」および「適用される示方書・共通仕様書の条項」を明記してください。
3. 専門性: 発注者（官公庁・公社）の立場で、工事着工後の設計変更・工期遅延・増額・会計検査トラブルを未然に防ぐ視点を徹底してください。
4. 構成: 指摘事項は【不整合・疑義の内容】【該当箇所（図面/計算書番号等）】【適用基準・示方書】【発注者としての指摘・是正指示案】の形式でMarkdown（表や箇条書き）を用いて構造的に出力してください。`;

    let characterPrompt = '';

    switch (personality) {
      case 'reviewer':
        characterPrompt = `あなたは官公庁・公社の発注者側に立つ「厳格かつ的確な土木設計照査官」として回答してください。
提出された設計成果品（報告書、図面、計算書、特記仕様書）の不整合や旧基準の流用、机上設計の甘さ、会計検査院からの指摘リスクを一切見逃さず、客観的証跡とともに公用文の格調高いトーンで指摘・指導してください。`;
        break;
      case 'friendly':
        characterPrompt = `あなたは親しみやすく温かい「同僚のAIアシスタント」として回答してください。
フランクで親切なトーンで話し、適宜絵文字や顔文字（😊、✨、💡など）を交えて、ユーザーが話しやすい雰囲気を作ってください。ユーザーの疑問に親身に寄り添い、優しくサポートしてください。`;
        break;
      case 'tutor':
        characterPrompt = `あなたは非常に丁寧でわかりやすい解説を得意とする「家庭教師の先生」として回答してください。
難しい専門用語を噛み砕いて説明し、段階的に（ステップ・バイ・ステップで）論理を解説してください。最後に「ここまでの説明で分かりにくい部分はありましたか？」や「次に進みますか？」など、ユーザーの理解を促すような丁寧な問いかけを入れてください。`;
        break;
      case 'kansai':
        characterPrompt = `あなたは技術力が高く、ノリの良い「関西弁のエンジニア」として、親しみやすい関西弁で回答してください。
丁寧語ではなく、フレンドリーな関西弁（「〜やで」「〜やんか」「〜せなあかんで」「知らんけど」など）を使いつつも、技術的な内容は正確に説明してください。`;
        break;
      case 'custom':
        characterPrompt = customInstruction.trim() || 'あなたは「AIアシスタント」として、高度な専門知識を持つアシスタントの役割を担います。';
        break;
      case 'default':
      default:
        characterPrompt = `あなたは「発注者側土木技術アドバイザー」として、高度な土木専門知識と設計照査の視点を持つアシスタントの役割を担います。
特に、土木建築技術に対して深い造詣をもち、設計成果の不適正見抜き、示方書適合、施工性検証、会計検査院対策などの専門的な視点からアドバイスや解説を行うことができます。常に丁寧な日本語で、客観的かつ親身に回答してください。`;
        break;
    }

    return `${characterPrompt}\n\n${baseGuidelines}`;
  }, [personality, customInstruction]);

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

  // チャット履歴のLocalStorage自動保存
  useEffect(() => {
    try {
      if (state.messages.length > 0) {
        localStorage.setItem('app_chat_messages', JSON.stringify(state.messages));
      } else {
        localStorage.removeItem('app_chat_messages');
      }
    } catch (e) {
      console.warn('Failed to save chat history to localStorage:', e);
    }
  }, [state.messages]);

  const clearMessages = () => {
    setState(prev => ({ ...prev, messages: [] }));
    localStorage.removeItem('app_chat_messages');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setState(prev => ({ ...prev, isFileLoading: true }));

    const readFile = async (file: any): Promise<FileItem | null> => {
      if (file.name.startsWith('.')) return null;

      const lowerName = file.name.toLowerCase();
      const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
      const isCsv = lowerName.endsWith('.csv');

      // 1. Excel (.xlsx / .xls) の解析処理
      if (isExcel) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const XLSX = (window as any).XLSX;
              let markdownContent = `# Excel成果品データ: ${file.name}\n\n`;

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

      // 2. CSV (.csv) の解析処理
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
      timestamp: new Date()
    };

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
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
        const errorMessage = `Error: ${error instanceof Error ? error.message : "Something went wrong."}`;
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
        <p className="text-slate-400 text-sm">読み込み中...</p>
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
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      <Header 
        onToggleSidebar={toggleSidebar} 
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {state.isSidebarOpen && (
          <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden animate-fade-in"
            onClick={toggleSidebar}
          />
        )}

        <Sidebar 
          isOpen={state.isSidebarOpen} 
          files={state.files} 
          onUpload={handleFileUpload} 
          onRemove={removeFile}
          isFileLoading={state.isFileLoading}
          personality={personality}
          onPersonalityChange={handlePersonalityChange}
          customInstruction={customInstruction}
          onCustomInstructionChange={handleCustomInstructionChange}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-white relative">
          <ChatInterface 
            messages={state.messages} 
            onSendMessage={sendMessage} 
            isProcessing={state.isProcessing}
            hasFiles={state.files.length > 0}
            chatEndRef={chatEndRef}
            onClearChat={clearMessages}
          />
        </main>
      </div>

      {/* 音声読み上げプレイヤーコントローラー */}
      <AudioController />
    </div>
  );
};

export default App;
