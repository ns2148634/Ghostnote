import { useState, useEffect, useRef } from 'react'
import { useReaderFont, FontControls, FONT_SIZES } from '../../hooks/useReaderFont'

function FragmentReveal({ fragment, onDone }) {
  const [wrapOpacity, setWrapOpacity]   = useState(0)
  const [typedLabel, setTypedLabel]     = useState('')
  const [labelDone, setLabelDone]       = useState(false)
  const [labelFlicker, setLabelFlicker] = useState(false)
  const [textVisible, setTextVisible]   = useState(false)
  const cancelled = useRef(false)

  const layer     = fragment?.layer   || 'basic'
  const rarity    = fragment?.rarity  || 'common'
  const fullLabel = fragment?.fragment_label || ''
  const fullText  = fragment?.fragment_text  || ''
  const labelColor = layer === 'lore'    ? '#c8a84a'
                   : rarity === 'rare'   ? '#b8c8e0'
                   : '#c8c0b8'

  useEffect(() => {
    cancelled.current = false
    const guard = (fn) => () => { if (!cancelled.current) fn() }

    // Phase 1: fade in overlay
    const t1 = setTimeout(guard(() => setWrapOpacity(1)), 20)

    // Phase 2: typewriter starts at 400ms
    let idx = 0
    function tick() {
      if (cancelled.current) return
      if (idx >= fullLabel.length) {
        setLabelDone(true)
        // Flicker: 1 → 0.3 → 1, 80ms each step
        setTimeout(guard(() => setLabelFlicker(true)),  0)
        setTimeout(guard(() => setLabelFlicker(false)), 80)
        // Phase 3: text fadeIn at +300ms, onDone at +1500ms
        setTimeout(guard(() => setTextVisible(true)), 300)
        setTimeout(guard(() => onDone?.()),           1500)
        return
      }
      idx++
      setTypedLabel(fullLabel.slice(0, idx))
      const isLore = layer === 'lore'
      let delay = 80 + Math.random() * 140          // 80–220ms
      if (isLore) delay = 100 + Math.random() * 200 // 100–300ms for lore
      if (isLore && idx === Math.floor(fullLabel.length / 2)) delay += 600
      setTimeout(tick, delay)
    }
    const t2 = setTimeout(tick, 400)

    return () => {
      cancelled.current = true
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center"
      style={{ background: '#080604', opacity: wrapOpacity, transition: 'opacity 0.4s ease-in' }}
    >
      <div className="flex flex-col items-center gap-6 px-10 w-full max-w-[600px] mx-auto">
        <p
          className="font-mono text-2xl font-medium tracking-widest text-center"
          style={{
            color: labelColor,
            opacity: labelFlicker ? 0.3 : 1,
            transition: 'opacity 80ms',
          }}
        >
          {typedLabel}
          {!labelDone && <span className="cursor">▌</span>}
        </p>
        <p
          className="font-mono text-sm text-center"
          style={{
            color: '#6a6460',
            opacity: textVisible ? 1 : 0,
            transition: 'opacity 0.8s ease-in',
          }}
        >
          {fullText}
        </p>
      </div>
    </div>
  )
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
  const { fontCls, leadingCls, idx: fontIdx, change: changeFont } = useReaderFont()

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
    <>
    <div className="fixed inset-0 bg-[#0d0d0d] z-[2000] flex flex-col fade-in">

      {/* Font size controls */}
      <div className="absolute right-3 z-10" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <FontControls idx={fontIdx} onChange={changeFont} />
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
                      className={`text-left font-mono text-accent ${textCls} hover:text-ink transition-colors underline underline-offset-4 decoration-dim break-words`}
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

          {/* Success phase — handled by FragmentReveal overlay below */}

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

    {/* Fragment reveal transition — appears on top when last layer answered correctly */}
    {phase === 'success' && (
      <FragmentReveal
        fragment={fragment}
        onDone={() => onSuccess(fragment, narrativeRef.current.join('\n'))}
      />
    )}
    </>
  )
}
