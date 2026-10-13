import React, { useState, KeyboardEvent, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types';
import { speechService, SpeechState } from '../services/speechService';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isProcessing: boolean;
  hasFiles: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onClearChat?: () => void;
}

interface ReviewPreset {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: string;
  prompt: string;
}

const REVIEW_PRESETS: ReviewPreset[] = [
  {
    id: 'cross-check',
    title: '成果品クロスチェック',
    badge: '不整合検出',
    desc: '計算書 ⇄ 図面 ⇄ 数量 ⇄ 仕様書の寸法・強度・数量の食い違いを徹底照合',
    icon: 'fa-layer-group text-blue-600',
    prompt: `提供された設計成果品資料（報告書、構造計算書、設計図面、数量計算書、特記仕様書等）を横断的に照合し、以下の観点で不整合・食い違いがないか徹底的にクロスチェックしてください：

1. 【部材寸法・鉄筋・材料強度】: 計算書の部材断面・鉄筋径・ピッチ・コンクリート呼び強度と、図面注記・仕様書表記の一致確認
2. 【数量・工種・項目名】: 数量計算書の算出数量と、設計書・特記仕様書の項目名・数量の一致確認
3. 【設計諸条件】: 設計荷重、設計水平震度、土質定数N値、地下水位が各書類で統一されているか

指摘事項は【不整合の内容】【該当箇所（図面番号/計算書ページ）】【想定される影響】【是正要請事項】の表形式で整理してください。`
  },
  {
    id: 'excel-check',
    title: '数量計算書・積算検算',
    badge: 'Excel/数値突合',
    desc: '数量計算書の集計・算式検算、金抜設計書との数量差分、控除漏れを自動照合',
    icon: 'fa-file-excel text-emerald-600',
    prompt: `アップロードされた数量計算書（Excel/CSV）および設計成果品に基づき、数量と積算の適正性を検算・照合してください：

1. 【算式・集計の検算】: 小計・合計値の集計ミス、単位換算の誤り（m⇄km、m2⇄ha等）がないか
2. 【数量控除の妥当性】: コンクリート体積からの開口部・箱抜き・鋼材体積の控除漏れがないか
3. 【設計書数量との突合】: 数量計算書の算出結果と設計書（金抜設計書）の内訳数量に食い違いがないか

検算結果を【工種・部材名】【計算書数量】【設計書数量】【差分・判定】【指摘理由】の表形式で出力してください。`
  },
  {
    id: 'standard-check',
    title: '基準書・示方書適合チェック',
    badge: '旧基準・違反検知',
    desc: '最新示方書・共通仕様書に照らし、規格値違反や過去業務のコピペ設計を検知',
    icon: 'fa-book-bookmark text-indigo-600',
    prompt: `道路橋示方書、河川構造令、コンクリート示方書、土木工事共通仕様書などの現行基準に照らし、以下の観点で設計成果品を厳格に点検してください：

1. 【旧基準の流用】: 示方書改定前の古い許容応力度・継手長・設計荷重基準がそのまま流用されていないか
2. 【規格値の適合性】: 鉄筋かぶり厚（環境区分別）、鉄筋あき、定着長、排水勾配、余裕高、建築限界離隔の規格値違反がないか
3. 【適用条項】: 適合/不適合の判断根拠となる示方書や共通仕様書の該当条項を明示

問題箇所について【該当箇所】【適用基準・条項】【基準値 vs 設計値】【発注者としての指摘内容】を明記してください。`
  },
  {
    id: 'constructability',
    title: '施工性・現場成立性検証',
    badge: '机上設計の罠予防',
    desc: '重機ヤード・搬入路不足、鉄筋過密で打設不能など現場で施工できない点を看破',
    icon: 'fa-helmet-safety text-amber-600',
    prompt: `机上設計にとどまらず、現場で実際に施工可能か「現場成立性・施工性」の視点から照査してください：

1. 【重機作業ヤード・搬入路】: クレーン旋回半径、杭打機・生コン車の進入・待機スペース、道路幅員制約が考慮されているか
2. 【コンクリート打設・充填性】: 鉄筋が過密で粗骨材が通過できない、または棒状バイブレータが挿入できない箇所がないか
3. 【仮設工・近接制約】: 土留めアンカーが用地境界を越境していないか、地下水位低下による周辺地盤沈下や埋設物防護の検討漏れがないか

現場で工事中止・設計変更・施工事故になり得るリスクを優先度順に洗い出してください。`
  },
  {
    id: 'audit-risk',
    title: '会計検査院リスク審査',
    badge: '過大積算・説明責任',
    desc: '不経済な工法選定・ボーリング結果無視の過大基礎・数量控除漏れをスクリーニング',
    icon: 'fa-scale-balanced text-rose-600',
    prompt: `会計検査院や行政監査の視点で、設計成果品の説明責任と経済性をスクリーニングしてください：

1. 【工法比較の形骸化】: 複数工法の経済性比較において、現地に適合する安価な別工法が不当に除外されていないか
2. 【地盤定数と過大設計】: ボーリング調査結果（N値等）に対して過度に安全側の数値を採用し、基礎や杭が過大設計になっていないか
3. 【数量計算の適正性】: コンクリート体積からの開口部・箱抜き体積の控除漏れ、単位換算ミス、既存物再利用検討の欠落がないか

監査で指摘を受けやすい論点と、発注者として事前に求めておくべき選定根拠・補足資料を整理してください。`
  },
  {
    id: 'checklist-gen',
    title: '照査記録簿（チェックシート）出力',
    badge: '公的書類化',
    desc: '納品検査決裁書類にそのまま添付できる項目別判定表・照査記録簿を自動出力',
    icon: 'fa-clipboard-check text-purple-600',
    prompt: `提供された設計成果品（報告書・計算書・図面・数量計算書）に基づき、納品検査決裁書類に添付できる正式な『土木設計成果品 設計照査記録簿（チェックシート）』をMarkdown表形式で作成してください：

【必須出力項目】
1. 業務概要（業務名、照査実施日、照査技術者/発注者確認印欄）
2. 照査項目別判定表:
   - 照査区分（①書類間整合性、②示方書・基準適合性、③施工性・現場成立性、④会計検査リスク、⑤数量・積算妥当性）
   - 照査対象・該当書類（図面番号、計算書P.xxなど）
   - 判定結果（「適」/「要修正」/「要協議」）
   - 確認根拠（適用示方書・共通仕様書条文等）
   - 発注者確認意見・是正指示内容
3. 総合照査所見（納品承認の可否・修正再提出要件）`
  }
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isProcessing, 
  hasFiles, 
  chatEndRef,
  onClearChat
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentId: null,
    currentTitle: null,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  });

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

  const handleCreateDirective = (baseContent: string) => {
    const prompt = `先ほどの設計照査指摘内容に基づき、受注者（設計コンサルタント）宛てに正式に送付・指示する『設計成果品に関する照査指摘・修正指示書』を公用文形式で起案してください。

【記載項目】
1. 指示件名（〇〇業務委託 設計成果品修正指示について）
2. 指示の趣旨（納品前照査における不整合・疑義の是正）
3. 項目別指摘事項（該当図面/計算書、不整合内容、修正要求）
4. 再提出期限および回答書の提出要請`;
    onSendMessage(prompt);
  };

  useEffect(() => {
    if (isProcessing) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isProcessing]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-16 space-y-6 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto p-4 animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-5 text-3xl shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <i className="fa-solid fa-compass-drafting"></i>
              発注者側・設計照査予防システム
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              設計成果品の不適正・不整合を徹底照査します
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed max-w-xl">
              {hasFiles 
                ? "アップロードされた設計成果品（報告書・計算書・図面・数量書）を読み込みました。以下の照査メニューを選択するか、直接ご指示ください。"
                : "サイドバーから設計成果品（報告書、構造計算書、図面PDF等）を追加してください。書類間の不整合や基準違反、会計検査リスクを自動摘出します。"}
            </p>

            {/* 設計照査の4大アクションカード */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {REVIEW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSendMessage(preset.prompt)}
                  className="p-4 bg-white border border-gray-200 hover:border-blue-500 hover:shadow-md rounded-2xl transition-all group flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid ${preset.icon} text-base`}></i>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {preset.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-blue-600">
                    <span>この照査を実行</span>
                    <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {onClearChat && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 mb-2">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-blue-600"></i>
                  設計照査ログ ({messages.filter(m => m.role === 'user').length}件の質疑)
                </span>
                <button
                  onClick={onClearChat}
                  className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                  title="チャット履歴を消去"
                >
                  <i className="fa-solid fa-trash-can"></i>
                  <span>履歴をクリア</span>
                </button>
              </div>
            )}
            {messages.map((msg) => (
            msg.content || msg.role === 'user' ? (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex max-w-[94%] sm:max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2 sm:gap-3`}>
                  <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gradient-to-tr from-slate-800 to-indigo-900 text-white'
                  }`}>
                    <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-shield-halved'}`}></i>
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm leading-relaxed transition-all relative group ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none text-sm' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none overflow-x-auto'
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
                    <div className={`flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t text-[10px] ${
                      msg.role === 'user' ? 'border-white/10 text-white/70' : 'border-gray-100 text-gray-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        {/* 音声読み上げボタン */}
                        <button
                          onClick={() => {
                            const title = msg.role === 'user' ? '照査指示内容' : '設計照査結果';
                            speechService.speak(msg.id, title, msg.content);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                            speechState.currentId === msg.id
                              ? msg.role === 'user' 
                                ? 'bg-white/20 text-white font-bold' 
                                : 'bg-blue-50 text-blue-600 font-bold'
                              : msg.role === 'user'
                                ? 'hover:bg-white/10 text-white/80'
                                : 'hover:bg-gray-100 text-gray-600'
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

                        {/* テキストコピーボタン */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                            copiedId === msg.id
                              ? 'bg-emerald-50 text-emerald-600 font-bold'
                              : msg.role === 'user'
                                ? 'hover:bg-white/10 text-white/80'
                                : 'hover:bg-gray-100 text-gray-600'
                          }`}
                          title="テキストをクリップボードにコピー"
                        >
                          <i className={`fa-solid ${copiedId === msg.id ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                          <span>{copiedId === msg.id ? 'コピー完了' : 'コピー'}</span>
                        </button>

                        {/* AI回答用：コンサル修正指示書ドラフト起案ボタン */}
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCreateDirective(msg.content)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition-all cursor-pointer"
                            title="この照査結果をもとに、コンサル宛の修正指示書を起案します"
                          >
                            <i className="fa-solid fa-file-pen text-[10px]"></i>
                            <span>指示書を起案</span>
                          </button>
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
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                </div>
                <span className="text-xs text-gray-600 font-bold">
                  成果品の不整合・示方書適合・施工性を厳格に照査中...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* フッター：常設設計照査クイックバー ＋ 入力欄 */}
      <div className="p-3 md:p-5 bg-white border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
          {/* 設計照査クイックバー */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[10px] font-bold text-gray-400 shrink-0 uppercase tracking-wider flex items-center gap-1 mr-1">
              <i className="fa-solid fa-bolt text-amber-500"></i>
              照査クイック:
            </span>
            {REVIEW_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSendMessage(preset.prompt)}
                disabled={isProcessing}
                className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-[11px] font-bold text-gray-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={preset.desc}
              >
                <i className={`fa-solid ${preset.icon} text-[10px]`}></i>
                <span>{preset.title}</span>
              </button>
            ))}
          </div>

          {/* 入力テキストエリア */}
          <div className="relative flex items-end gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-1 shadow-inner focus-within:border-blue-500 focus-within:bg-white transition-all">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasFiles ? "設計成果品について照査指示や確認事項を入力..." : "成果品について質問または指示を入力..."}
                className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 sm:py-3 sm:px-4 resize-none max-h-40 min-h-[40px] text-gray-800 placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                input.trim() && !isProcessing 
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="送信"
            >
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
          ※本ツールは発注者側の照査支援AIです。指摘事項は元図面・計算書・現行示方書と必ず突き合わせて最終確認を行ってください。
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
