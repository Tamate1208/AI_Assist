
import React, { useState, useCallback, useRef } from 'react';
import { FileItem, ChatMessage, AppState } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import { askGeminiStream } from './services/geminiService';

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
      const stream = askGeminiStream(content, state.files, state.messages, selectedModel);
      
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
      const errorMessage = `Error: ${error instanceof Error ? error.message : "Something went wrong."}`;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        messages: prev.messages.map(msg => 
          msg.id === aiMessageId ? { ...msg, content: errorMessage } : msg
        )
      }));
    } finally {
      setTimeout(scrollToBottom, 50);
    }
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }));
  };

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
