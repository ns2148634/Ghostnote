import { useState } from 'react'

export default function SetupName({ onDone }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setErr('請輸入名稱'); return }
    if (trimmed.length > 16) { setErr('名稱最多 16 個字'); return }
    setBusy(true)
    await onDone(trimmed)
    setBusy(false)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <p className="font-mono text-dim text-xs tracking-[0.25em] text-center mb-3">
          — 初次登入 —
        </p>
        <h1 className="font-mono text-accent text-xl tracking-widest text-center mb-2">
          調查員登記
        </h1>
        <p className="font-mono text-muted text-sm text-center leading-6 mb-10">
          你將以這個名稱<br />進行所有靈異調查。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="調查員名稱（最多 16 字）"
            value={name}
            onChange={e => { setName(e.target.value); setErr('') }}
            maxLength={16}
            autoFocus
            required
            className="bg-surface border border-border font-mono text-ink text-sm px-4 py-3.5
                       outline-none focus:border-muted transition-colors placeholder:text-dim
                       text-center tracking-wide"
          />

          {err && <p className="font-mono text-danger text-xs text-center">{err}</p>}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="font-mono text-accent text-sm tracking-widest py-3.5 border border-dim
                       hover:border-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          >
            {busy ? '登記中...' : '確認'}
          </button>
        </form>
      </div>
    </div>
  )
}
