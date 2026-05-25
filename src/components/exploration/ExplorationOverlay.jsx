import { useState, useEffect, useRef } from 'react'

const FONT_SIZES = [
  { cls: 'text-xs',   leading: 'leading-6' },
  { cls: 'text-sm',   leading: 'leading-7' },
  { cls: 'text-base', leading: 'leading-8' },
  { cls: 'text-lg',   leading: 'leading-9' },
]
const FONT_KEY = 'ghostnote_font_size'

function useExplorationFont() {
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

function TypewriterText({ text, speed = 35, onDone }) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span>
      {displayed}
      {displayed.length < text?.length && <span className="cursor">▌</span>}
    </span>
  )
}

// phase: 'atmosphere' | 'layer' | 'success' | 'fail'
export default function ExplorationOverlay({
  atmosphereText,
  layers = [],       // [{sceneText, options:[{text,isCorrect,failText}]}]
  fragment,          // story_fragment row
  noStamina,
  onClose,
  onDeepen,          // async fn, returns bool (stamina ok)
  onSuccess,         // fn(fragment, narrative)
}) {
  const [phase, setPhase] = useState('atmosphere')
  const [layerIdx, setLayerIdx] = useState(0)
  const [bodyText, setBodyText] = useState(atmosphereText || '')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const narrativeRef = useRef([])
  const { fontCls, leadingCls, idx: fontIdx, change: changeFont } = useExplorationFont()

  useEffect(() => {
    setBodyText(atmosphereText || '')
    setDone(false)
    setPhase('atmosphere')
    setLayerIdx(0)
    narrativeRef.current = []
  }, [atmosphereText])

  async function handleDeepen() {
    setBusy(true)
    const ok = await onDeepen()
    setBusy(false)
    if (!ok) return
    if (layers.length === 0) {
      setBodyText('氣息已散去，什麼都沒有留下。')
      setDone(true)
      setPhase('fail')
      return
    }
    narrativeRef.current = []
    setBodyText(layers[0].sceneText)
    setDone(false)
    setPhase('layer')
    setLayerIdx(0)
  }

  function handleChoice(opt) {
    if (opt.isCorrect) {
      narrativeRef.current = [...narrativeRef.current, layers[layerIdx].sceneText]
      const next = layerIdx + 1
      if (next < layers.length) {
        setBodyText(layers[next].sceneText)
        setDone(false)
        setLayerIdx(next)
      } else {
        setPhase('success')
      }
    } else {
      setBodyText(opt.failText || '黑暗中什麼都看不見，也什麼都沒有留下。')
      setDone(false)
      setPhase('fail')
    }
  }

  const textCls = `${fontCls} ${leadingCls}`

  return (
    <div className="fixed inset-0 bg-[#0d0d0d] z-[2000] flex flex-col fade-in">

      {/* Font size controls */}
      <div className="absolute top-3 right-3 flex items-center gap-3 z-10">
        <button
          onClick={() => changeFont(-1)}
          disabled={fontIdx === 0}
          className="font-mono text-dim hover:text-muted disabled:opacity-20 transition-colors select-none"
          style={{ fontSize: '11px' }}
        >A-</button>
        <button
          onClick={() => changeFont(1)}
          disabled={fontIdx === FONT_SIZES.length - 1}
          className="font-mono text-dim hover:text-muted disabled:opacity-20 transition-colors select-none"
          style={{ fontSize: '15px' }}
        >A+</button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-12 min-h-full flex flex-col justify-center w-full max-w-[600px] mx-auto">

          {/* Atmosphere */}
          {phase === 'atmosphere' && (
            <>
              <p className={`font-mono text-ink ${textCls} whitespace-pre-line break-words`}>
                <TypewriterText text={bodyText} onDone={() => setDone(true)} />
              </p>
              {done && (
                <div className="flex gap-8 mt-10 fade-in">
                  <button onClick={onClose}
                    className="font-mono text-dim text-xs tracking-widest hover:text-muted transition-colors">
                    離開
                  </button>
                  <button
                    onClick={handleDeepen}
                    disabled={busy || noStamina}
                    className="font-mono text-accent text-xs tracking-widest hover:text-ink transition-colors
                               underline underline-offset-4 decoration-dim disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {noStamina ? '體力不足' : busy ? '...' : '深入探查'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Choice layer */}
          {phase === 'layer' && layers[layerIdx] && (
            <>
              <p className={`font-mono text-ink ${textCls} whitespace-pre-line break-words`}>
                <TypewriterText key={layerIdx} text={bodyText} onDone={() => setDone(true)} />
              </p>
              {done && (
                <div className="flex flex-col gap-5 mt-10 fade-in">
                  {layers[layerIdx].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleChoice(opt)}
                      className="text-left font-mono text-accent text-xs leading-6 hover:text-ink transition-colors
                                 underline underline-offset-4 decoration-dim break-words"
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Fail */}
          {phase === 'fail' && (
            <>
              <p className={`font-mono text-muted ${textCls} whitespace-pre-line break-words fade-in`}>
                <TypewriterText text={bodyText} onDone={() => setDone(true)} />
              </p>
              {done && (
                <button onClick={onClose}
                  className="mt-10 font-mono text-dim text-xs tracking-widest hover:text-muted transition-colors self-start fade-in">
                  離開
                </button>
              )}
            </>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="fade-in flex flex-col gap-6">
              <p className="font-mono text-muted text-xs tracking-widest">── 碎片 ──</p>
              {fragment && (
                <div className="border border-dim p-5 bg-[#111]">
                  <p className="font-mono text-accent text-[11px] tracking-wider mb-2">
                    {fragment.fragment_label}
                  </p>
                  <p className={`font-mono text-muted ${textCls} break-words`}>
                    {fragment.fragment_text}
                  </p>
                </div>
              )}
              <button
                onClick={() => onSuccess(fragment, narrativeRef.current.join('\n'))}
                className="font-mono text-accent text-xs tracking-widest hover:text-ink transition-colors
                           underline underline-offset-4 decoration-dim self-start"
              >
                收入筆記本
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Layer progress dots */}
      {phase === 'layer' && layers.length > 1 && (
        <div className="flex justify-center gap-2 pb-6 w-full max-w-[600px] mx-auto shrink-0">
          {layers.map((_, i) => (
            <span key={i}
              className={`inline-block w-1 h-1 rounded-full transition-colors ${i <= layerIdx ? 'bg-accent' : 'bg-dim'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
