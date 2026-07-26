// Web Speech API (SpeechSynthesis) ラッパーサービス

export interface SpeechState {
  isPlaying: boolean;
  isPaused: boolean;
  currentId: string | null;
  currentTitle: string | null;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
}

type SpeechStateListener = (state: SpeechState) => void;

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<SpeechStateListener> = new Set();
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesReady = false;

  private state: SpeechState = {
    isPlaying: false,
    isPaused: false,
    currentId: null,
    currentTitle: null,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      speechSynthesis.onvoiceschanged = () => this.initVoices();
      this.initVoices();
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const allVoices = this.synth.getVoices();
    if (allVoices.length === 0) return;

    this.voicesReady = true;
    const jaVoices = allVoices.filter(v => v.lang.startsWith('ja'));

    const preferredVoice =
      jaVoices.find(v =>
        v.name.includes('Natural') ||
        v.name.includes('Online') ||
        v.name.includes('Google') ||
        v.name.includes('Nanami') ||
        v.name.includes('Kyoko')
      ) || jaVoices[0] || allVoices[0] || null;

    if (preferredVoice) {
      this.selectedVoice = preferredVoice;
      this.state = { ...this.state, voice: preferredVoice };
      this.notifyListeners();
    }
  }

  public getAvailableJapaneseVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    const all = this.synth.getVoices();
    const ja = all.filter(v => v.lang.startsWith('ja'));
    return ja.length > 0 ? ja : all;
  }

  public setVoice(voiceName: string) {
    const all = this.getAvailableJapaneseVoices();
    const target = all.find(v => v.name === voiceName);
    if (target) {
      this.selectedVoice = target;
      this.state = { ...this.state, voice: target };
      this.notifyListeners();
    }
  }

  public setRate(rate: number) {
    this.state = { ...this.state, rate };
    this.notifyListeners();
  }

  public subscribe(listener: SpeechStateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  /** Markdown 記号を除去して読み上げ用テキストを生成 */
  public prepareTextForSpeech(text: string): string {
    if (!text) return '';
    let t = text;

    // コードブロック
    t = t.replace(/```[\s\S]*?```/g, '。コードブロック省略。');
    // インラインコード
    t = t.replace(/`([^`]+)`/g, '$1');
    // 画像
    t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, '画像');
    // リンク
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 見出し
    t = t.replace(/^#{1,6}\s+/gm, '');
    // 引用
    t = t.replace(/^\s*>\s*/gm, '');
    // 箇条書き（★太字/斜体より先に処理）
    t = t.replace(/^\s*[-*+]\s+/gm, '');
    t = t.replace(/^\s*\d+\.\s+/gm, '');
    // 太字
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    t = t.replace(/__([^_\n]+)__/g, '$1');
    // 斜体（改行を跨がない）
    t = t.replace(/\*([^*\n]+)\*/g, '$1');
    t = t.replace(/_([^_\n]+)_/g, '$1');
    // 水平線
    t = t.replace(/^[-*_]{3,}\s*$/gm, '。');
    // 改行をポーズに
    t = t.replace(/\n{2,}/g, '。');
    t = t.replace(/\n/g, '、');
    // 連続句読点を整理
    t = t.replace(/[。、]{2,}/g, '。');
    t = t.replace(/^[、。]+/, '').replace(/[、]+$/, '。');

    return t.trim();
  }

  private executeSpeak(id: string, title: string, cleanText: string) {
    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // ボイス設定
    const voice = this.selectedVoice || this.getAvailableJapaneseVoices()[0] || null;
    if (voice) utterance.voice = voice;
    utterance.lang = 'ja-JP';
    utterance.rate = this.state.rate;
    utterance.pitch = this.state.pitch;

    utterance.onstart = () => {
      this.state = { ...this.state, isPlaying: true, isPaused: false, currentId: id, currentTitle: title };
      this.notifyListeners();
    };
    utterance.onend = () => {
      this.state = { ...this.state, isPlaying: false, isPaused: false, currentId: null, currentTitle: null };
      this.notifyListeners();
    };
    utterance.onerror = (e) => {
      // "interrupted" は stop() によるキャンセルなので正常動作、ログは最小限に
      if (e.error !== 'interrupted') {
        console.error('SpeechSynthesis error:', e.error);
      }
      this.state = { ...this.state, isPlaying: false, isPaused: false, currentId: null, currentTitle: null };
      this.notifyListeners();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public speak(id: string, title: string, textContent: string) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    // 同一IDが再生中なら一時停止/再開
    if (this.state.currentId === id) {
      if (this.state.isPlaying) { this.pause(); return; }
      if (this.state.isPaused) { this.resume(); return; }
    }

    const cleanText = this.prepareTextForSpeech(textContent);
    if (!cleanText) {
      console.warn('speechService: テキストが空です（Markdown除去後）');
      return;
    }

    // ★ Chrome バグ対策: cancel() の直後に speak() すると interrupted エラーになる
    // 先に cancel して、100ms 後に speak を実行する
    this.synth.cancel();
    this.state = { ...this.state, isPlaying: false, isPaused: false, currentId: null, currentTitle: null };
    this.notifyListeners();

    // ボイスがまだロードされていない場合はロード待ち
    const trySpeak = () => {
      if (!this.voicesReady) this.initVoices();
      this.executeSpeak(id, title, cleanText);
    };

    // 100ms 待ってから発話（Chrome の cancel → speak バグ回避）
    setTimeout(trySpeak, 100);
  }

  public pause() {
    if (this.synth && this.state.isPlaying) {
      this.synth.pause();
      this.state = { ...this.state, isPlaying: false, isPaused: true };
      this.notifyListeners();
    }
  }

  public resume() {
    if (this.synth && this.state.isPaused) {
      this.synth.resume();
      this.state = { ...this.state, isPlaying: true, isPaused: false };
      this.notifyListeners();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.state = { ...this.state, isPlaying: false, isPaused: false, currentId: null, currentTitle: null };
      this.notifyListeners();
    }
  }
}

export const speechService = new SpeechService();
