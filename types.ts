
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
  mode?: WorkMode;
}

export interface AppState {
  files: FileItem[];
  messages: ChatMessage[];
  isProcessing: boolean;
  isSidebarOpen: boolean;
}

export type PersonalityType = 'default' | 'reviewer' | 'friendly' | 'tutor' | 'kansai' | 'custom';

export type WorkMode = 'review' | 'office' | 'field' | 'tech' | 'general';

export interface ActionPreset {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: string;
  prompt: string;
}

export interface WorkModeConfig {
  id: WorkMode;
  label: string;
  shortLabel: string;
  icon: string;
  badge: string;
  description: string;
  placeholder: string;
  systemPromptAddition: string;
  presets: ActionPreset[];
}

