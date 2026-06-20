
export interface FileItem {
  id: string;
  name: string;
  path?: string; // Original path in the folder
  type: string;
  size: number;
  data: string; // base64
  preview?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AppState {
  files: FileItem[];
  messages: ChatMessage[];
  isProcessing: boolean;
  isSidebarOpen: boolean;
}

export type PersonalityType = 'default' | 'friendly' | 'tutor' | 'kansai' | 'custom';

