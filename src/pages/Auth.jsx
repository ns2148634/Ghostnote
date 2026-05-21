import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Email OTP flow: email → send code → enter 6-digit code → verify
// Google OAuth: redirect to Google then back

export default function Auth() {
  const [email, setEmail]   = useState('')
  const [otp,   setOtp]     = useState('')
  const [step,  setStep]    = useState('input')  // 'input' | 'otp'
  const [err,   setErr]     = useState('')
  const [busy,  setBusy]    = useState(false)

  async function sendOtp(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) setErr(error.message)
      else setStep('otp')
    } catch {
      setErr('網路連線失敗，請稍後再試。')
    }
    setBusy(false)
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'email',
      })
      if (error) setErr(error.message)
      // on success, onAuthStateChange in usePlayer will handle redirect
    } catch {
      setErr('網路連線失敗，請稍後再試。')
    }
    setBusy(false)
  }

  async function signInWithGoogle() {
    setErr('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) setErr(error.message)
    } catch {
      setErr('網路連線失敗，請稍後再試。')
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <h1 className="font-mono text-accent text-2xl tracking-[0.3em] text-center mb-2">靈異筆記</h1>
        <p className="font-mono text-dim text-[10px] text-center tracking-widest mb-12">
          PARANORMAL NOTEBOOK
        </p>

        {step === 'input' && (
          <div className="flex flex-col gap-4">
            {/* Google */}
            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-3 border border-border py-3
                         font-mono text-xs text-ink hover:border-muted transition-all"
            >
              <GoogleIcon />
              以 Google 帳號登入
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-dim text-[10px]">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email OTP */}
            <form onSubmit={sendOtp} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="電子郵件"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-surface border border-border font-mono text-ink text-xs px-4 py-3
                           outline-none focus:border-muted transition-colors placeholder:text-dim"
              />
              {err && <p className="font-mono text-danger text-[10px]">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="font-mono text-accent text-xs tracking-widest py-3 border border-dim
                           hover:border-muted transition-all disabled:opacity-40"
              >
                {busy ? '傳送中...' : '傳送驗證碼'}
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            <p className="font-mono text-muted text-xs leading-6 text-center">
              驗證碼已寄至<br />
              <span className="text-ink">{email}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="6 位驗證碼"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              className="bg-surface border border-border font-mono text-ink text-xs px-4 py-3
                         outline-none focus:border-muted transition-colors placeholder:text-dim
                         text-center tracking-[0.4em]"
            />
            {err && <p className="font-mono text-danger text-[10px] text-center">{err}</p>}
            <button
              type="submit"
              disabled={busy || otp.length < 6}
              className="font-mono text-accent text-xs tracking-widest py-3 border border-dim
                         hover:border-muted transition-all disabled:opacity-40"
            >
              {busy ? '驗證中...' : '確認'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('input'); setOtp(''); setErr('') }}
              className="font-mono text-dim text-[10px] hover:text-muted transition-colors text-center"
            >
              重新輸入 Email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
