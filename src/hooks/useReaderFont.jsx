import { useState } from 'react'

export const FONT_SIZES = [
  { cls: 'text-xs',   leading: 'leading-6' },
  { cls: 'text-sm',   leading: 'leading-7' },
  { cls: 'text-base', leading: 'leading-8' },
  { cls: 'text-lg',   leading: 'leading-9' },
]
export const FONT_KEY = 'ghostnote_font_size'

export function useReaderFont() {
  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem(FONT_KEY)
    const n = parseInt(saved)
    return isNaN(n) ? 1 : Math.max(0, Math.min(FONT_SIZES.length - 1, n))
  })
  function change(delta) {
    setIdx(prev => {
      const next = Math.max(0, Math.min(FONT_SIZES.length - 1, prev + delta))
      localStorage.setItem(FONT_KEY, String(next))
      return next
    })
  }
  return { fontCls: FONT_SIZES[idx].cls, leadingCls: FONT_SIZES[idx].leading, idx, change }
}

export function FontControls({ idx, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(-1)}
        disabled={idx === 0}
        className="font-mono text-muted hover:text-ink disabled:opacity-30 transition-colors select-none"
        style={{ fontSize: '11px' }}
      >A-</button>
      <button
        onClick={() => onChange(1)}
        disabled={idx === FONT_SIZES.length - 1}
        className="font-mono text-muted hover:text-ink disabled:opacity-30 transition-colors select-none"
        style={{ fontSize: '15px' }}
      >A+</button>
    </div>
  )
}
