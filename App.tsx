import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileItem, ChatMessage, AppState, PersonalityType } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import { askGeminiStream } from './services/geminiService';
import Login from './components/Login';

interface ExtendedAppState extends AppState {
  isFileLoading: boolean;
}

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [state, setState] = useState<ExtendedAppState>({
    files: [],
    messages: [],
    isProcessing: false,
    isSidebarOpen: true,
    isFileLoading: false
  });

  const [personality, setPersonality] = useState<PersonalityType>(() => {
    return (localStorage.getItem('app_personality') as PersonalityType) || 'default';
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
    const baseGuidelines = `以下のガイドラインを厳守して回答の精度を高めてください：

1. 根拠の明示: 提供された資料の内容に基づき、可能な限り「どの資料のどの部分」を参照したか明記してください。
2. 専門性: 土木建築、コード生成、資料要約など、各分野において正確かつ高度な情報を提供してください。
3. 思考プロセス: 回答の前に内部で論理的なステップを組み立て、正確性を期してください。
4. 情報の境界: 資料に記載がない場合は、自身の知識を使用しつつ「資料外の情報であること」を明記してください。
5. 構成: 専門用語は分かりやすく解説し、Markdown形式（表、箇条書き、太字など）を積極的に活用して構造的で読みやすい回答を作成してください。`;

    let characterPrompt = '';

    switch (personality) {
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
        characterPrompt = `あなたは「AIアシスタント」として、高度な専門知識を持つアシスタントの役割を担います。
特に、土木建築技術に対して深い造詣をもち、専門的な視点からアドバイスや解説を行うことができます。常に丁寧な日本語で、人間らしく親身に回答してください。`;
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setState(prev => ({ ...prev, isFileLoading: true }));

    const newFiles: FileItem[] = [];
    const readFile = (file: any): Promise<FileItem | null> => {
      return new Promise((resolve) => {
        if (file.name.startsWith('.')) return resolve(null); // Ignore hidden files

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

    // Reset input value so the same folder can be selected again
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
        onModelChange={setSelectedModel}
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
          />
        </main>
      </div>
    </div>
  );
};

export default App;
