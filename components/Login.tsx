import React, { useState, useEffect, useRef } from 'react';

interface LoginProps {
  onSuccess: (password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('パスワードを入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        onSuccess(password);
      } else {
        setError(data.error || 'パスワードが正しくありません。');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('サーバーとの通信中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl filter animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl filter animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl shadow-black/50 max-w-md w-full mx-4 relative overflow-hidden transition-all duration-300 animate-fade-in-down">
        {/* Glow border element */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-600/30">
            <i className="fa-solid fa-lock text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider mb-2">AIアシスタント</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            アクセス制限が有効です。<br className="xs:hidden" />管理パスワードを入力してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <i className="fa-solid fa-key"></i>
            </div>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              placeholder="パスワードを入力..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          {error && (
            <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 py-2.5 px-3.5 rounded-xl flex items-center gap-2 animate-fade-in-down">
              <i className="fa-solid fa-circle-exclamation shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/15 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>認証中...</span>
              </>
            ) : (
              <>
                <span>認証する</span>
                <i className="fa-solid fa-arrow-right-to-bracket text-xs transition-transform hover:translate-x-1"></i>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
