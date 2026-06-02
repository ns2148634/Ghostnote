import { useState, useEffect, useRef } from 'react'
import { useReaderFont, FontControls } from '../../hooks/useReaderFont'
import { loadInvestigation, applyChoice, getEnding, buildNarrative } from '../../lib/exploration'

const CLARITY_MAX = 5

// ── Signal clarity bar ──────────────────────────────────────────────────────
function ClarityBar({ clarity }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: CLARITY_MAX }, (_, i) => (
        <div
          key={i}
          className="w-5 h-1 transition-all duration-300"
          style={{ background: i < clarity ? '#c9b99a' : 'rgba(201,185,154,0.12)' }}
        />
      ))}
    </div>
  )
}

// ── Fragment reveal transition ──────────────────────────────────────────────
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
  const labelColor = layer === 'lore'  ? '#c8a84a'
                   : rarity === 'rare' ? '#b8c8e0'
                   : '#c8c0b8'

  useEffect(() => {
    cancelled.current = false
    const guard = (fn) => () => { if (!cancelled.current) fn() }
    const t1 = setTimeout(guard(() => setWrapOpacity(1)), 20)
    let idx = 0
    function tick() {
      if (cancelled.current) return
      if (idx >= fullLabel.length) {
        setLabelDone(true)
        setTimeout(guard(() => setLabelFlicker(true)),  0)
        setTimeout(guard(() => setLabelFlicker(false)), 80)
        setTimeout(guard(() => setTextVisible(true)), 300)
        setTimeout(guard(() => onDone?.()), 1500)
        return
      }
      idx++
      setTypedLabel(fullLabel.slice(0, idx))
      const isLore = layer === 'lore'
      let delay = 80 + Math.random() * 140
      if (isLore) delay = 100 + Math.random() * 200
      if (isLore && idx === Math.floor(fullLabel.length / 2)) delay += 600
      setTimeout(tick, delay)
    }
    const t2 = setTimeout(tick, 400)
    return () => { cancelled.current = true; clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center"
      style={{ background: '#080604', opacity: wrapOpacity, transition: 'opacity 0.4s ease-in' }}
    >
      <div className="flex flex-col items-center gap-6 px-10 w-full max-w-[600px] mx-auto">
        <p
          className="font-mono text-2xl font-medium tracking-widest text-center"
          style={{ color: labelColor, opacity: labelFlicker ? 0.3 : 1, transition: 'opacity 80ms' }}
        >
          {typedLabel}
          {!labelDone && <span className="cursor">▌</span>}
        </p>
        <p
          className="font-mono text-sm text-center"
          style={{ color: '#6a6460', opacity: textVisible ? 1 : 0, transition: 'opacity 0.8s ease-in' }}
        >
          {fullText}
        </p>
      </div>
    </div>
  )
}

// ── Typewriter ──────────────────────────────────────────────────────────────
function TypewriterText({ text, speed = 35, onDone }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); onDone?.() }
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

// ── Main overlay ────────────────────────────────────────────────────────────
// phase: 'atmosphere' | 'scene' | 'result' | 'faded' | 'success'
export default function ExplorationOverlay({
  atmosphereText,
  fragment,
  noStamina,
  onClose,
  onDeepen,   // async () => bool — consumes stamina
  onSuccess,  // (fragment, narrative) => void
}) {
  const [phase, setPhase]               = useState('atmosphere')
  const [layers, setLayers]             = useState([])
  const [layerIdx, setLayerIdx]         = useState(0)
  const [clarity, setClarity]           = useState(3)
  const [done, setDone]                 = useState(false)
  const [busy, setBusy]                 = useState(false)
  const [resultText, setResultText]         = useState('')
  const [pendingOutcome, setPendingOutcome] = useState(null)
  const [tier, setTier]                     = useState(null)
  const walkedRef = useRef([])
  const { fontCls, leadingCls, idx: fontIdx, change: changeFont } = useReaderFont()
  const textCls = `${fontCls} ${leadingCls}`

  // Compute ending text for 'fragment' outcome (depends on tier + last layer)
  const endingText = (pendingOutcome === 'fragment' && tier && layers[layerIdx])
    ? getEnding(layers[layerIdx], tier)
    : ''
  const displayText = [resultText, endingText].filter(Boolean).join('\n\n')

  // Auto-advance from 'result' phase
  useEffect(() => {
    if (phase !== 'result' || !pendingOutcome) return
    const delay = pendingOutcome === 'faded' ? 2500 : displayText ? 2500 : 400
    const t = setTimeout(() => {
      if      (pendingOutcome === 'faded')    setPhase('faded')
      else if (pendingOutcome === 'fragment') setPhase('success')
      else { setLayerIdx(i => i + 1); setDone(false); setPhase('scene') }
    }, delay)
    return () => clearTimeout(t)
  }, [phase, pendingOutcome, displayText])

  async function handleDeepen() {
    setBusy(true)
    const ok = await onDeepen()
    if (!ok) { setBusy(false); return }

    const inv = await loadInvestigation(fragment)
    setBusy(false)

    if (!inv.layers.length) {
      setResultText('')
      setPhase('faded')
      return
    }
    walkedRef.current = []
    setLayers(inv.layers)
    setClarity(inv.startClarity)
    setLayerIdx(0)
    setDone(false)
    setPhase('scene')
  }

  function handleChoice(opt) {
    const r = applyChoice({ clarity, layerIndex: layerIdx, totalLayers: layers.length }, opt)
    walkedRef.current = [...walkedRef.current, { sceneText: layers[layerIdx].sceneText, resultText: r.resultText }]
    setClarity(r.clarity)
    setResultText(r.resultText)
    setTier(r.tier ?? null)
    setPendingOutcome(r.outcome)
    setPhase('result')
  }

  const layer = layers[layerIdx]
  const showClarity = phase === 'scene' || phase === 'result'

  return (
    <>
    <div className="fixed inset-0 bg-[#0d0d0d] z-[2000] flex flex-col fade-in">

      {/* Font controls */}
      <div className="absolute right-3 z-10" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <FontControls idx={fontIdx} onChange={changeFont} />
      </div>

      {/* Clarity bar */}
      {showClarity && (
        <div className="shrink-0 px-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <ClarityBar clarity={clarity} />
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-12 min-h-full flex flex-col justify-center w-full max-w-[600px] mx-auto">

          {/* Atmosphere */}
          {phase === 'atmosphere' && (
            <>
              <p className={`font-mono text-ink ${textCls} whitespace-pre-line break-words`}>
                <TypewriterText text={atmosphereText || ''} onDone={() => setDone(true)} />
              </p>
              {done && (
                <div className="flex gap-8 mt-10 fade-in">
                  <button onClick={onClose}
                    className="font-mono text-dim text-xs tracking-widest hover:text-muted transition-colors">
                    放掉
                  </button>
                  <button
                    onClick={handleDeepen}
                    disabled={busy || noStamina}
                    className="font-mono text-accent text-xs tracking-widest hover:text-ink transition-colors
                               underline underline-offset-4 decoration-dim disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {noStamina ? '靈力不足' : busy ? '...' : '通靈深入'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Scene (choice layer) */}
          {phase === 'scene' && layer && (
            <>
              <p className={`font-mono text-ink ${textCls} whitespace-pre-line break-words`}>
                <TypewriterText key={layerIdx} text={layer.sceneText} onDone={() => setDone(true)} />
              </p>
              {done && (
                <div className="flex flex-col gap-5 mt-10 fade-in">
                  {layer.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleChoice(opt)}
                      className={`text-left font-mono text-accent ${textCls} hover:text-ink transition-colors
                                  underline underline-offset-4 decoration-dim break-words`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Result (brief feedback + optional ending, auto-advances) */}
          {phase === 'result' && (
            displayText
              ? <p className={`font-mono text-muted ${textCls} whitespace-pre-line break-words fade-in`}>{displayText}</p>
              : <p className="font-mono text-dim text-xs text-center animate-pulse">...</p>
          )}

          {/* Faded */}
          {phase === 'faded' && (
            <>
              {resultText && (
                <p className={`font-mono text-muted ${textCls} whitespace-pre-line break-words fade-in mb-6`}>
                  {resultText}
                </p>
              )}
              <p className="font-mono text-dim text-xs tracking-widest fade-in">— 訊號散去 —</p>
              <button onClick={onClose}
                className="mt-8 font-mono text-dim text-xs tracking-widest hover:text-muted transition-colors self-start fade-in">
                離開
              </button>
            </>
          )}

          {/* Success — handled by FragmentReveal below */}

        </div>
      </div>

      {/* Layer progress dots */}
      {showClarity && layers.length > 1 && (
        <div className="flex justify-center gap-2 pb-6 w-full max-w-[600px] mx-auto shrink-0">
          {layers.map((_, i) => (
            <span key={i}
              className={`inline-block w-1 h-1 rounded-full transition-colors ${i <= layerIdx ? 'bg-accent' : 'bg-dim'}`}
            />
          ))}
        </div>
      )}
    </div>

    {phase === 'success' && (
      <FragmentReveal
        fragment={fragment}
        onDone={() => onSuccess(fragment, buildNarrative(walkedRef.current))}
      />
    )}
    </>
  )
}
