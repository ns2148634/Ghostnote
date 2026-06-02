import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getWeatherCondition, getTimeCondition, getDateCondition } from '../lib/weather'
import ExplorationOverlay from '../components/exploration/ExplorationOverlay'
import NotebookSelectModal from '../components/exploration/NotebookSelectModal'

const TIME_LABELS    = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '深夜' }
const WEATHER_LABELS = { clear: '晴', cloudy: '陰', fog: '霧', rain: '雨' }
const IDLE_MSGS = ['靜候訊號', '頻帶寂靜', '等待感應', '無異常訊號']
const SNAP_PCT  = 9  // % — signal starts to glow
const LOCK_PCT  = 4  // % — considered "locked on"
const FREQ_LABELS = [88, 92, 96, 100, 104, 108]

// Deterministic position from fragment id (5–93%)
function fragPos(id) {
  const num = parseInt(id.replace(/-/g, '').slice(0, 8), 16)
  return 5 + (num % 88)
}

export default function MapPage({ player, notebooks, stamina, consume, addFragment }) {
  const [signals, setSignals]     = useState([])
  const [usedIds, setUsedIds]     = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [env, setEnv]             = useState({ time: '', weather: '', date: null })
  const [pos, setPos]             = useState(null)
  const [needlePos, setNeedlePos] = useState(15)
  const [lockedAtm, setLockedAtm] = useState(null)
  const [overlay, setOverlay]     = useState(null)
  const [noStamina, setNoStamina] = useState(false)
  const [pending, setPending]     = useState(null)
  const [idleMsg, setIdleMsg]     = useState(IDLE_MSGS[0])

  const bandRef    = useRef(null)
  const dragging   = useRef(false)
  const envRef     = useRef(env)
  useEffect(() => { envRef.current = env }, [env])

  // ── Init: GPS → env → signals ────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { initEnv(null); return }
    navigator.geolocation.getCurrentPosition(
      p => { const c = { lat: p.coords.latitude, lng: p.coords.longitude }; setPos(c); initEnv(c) },
      ()  => initEnv(null),
      { enableHighAccuracy: false, timeout: 6000 }
    )
  }, [])

  async function initEnv(coords) {
    const time    = getTimeCondition()
    const date    = getDateCondition()
    const weather = coords ? await getWeatherCondition(coords.lat, coords.lng) : 'clear'
    const e = { time, weather, date }
    setEnv(e)
    await fetchSignals(time, weather, date)
  }

  async function fetchSignals(time, weather, date) {
    setLoading(true)
    setUsedIds(new Set())

    // 1. Fragment IDs that have at least one scene
    const { data: sceneRows } = await supabase
      .from('fragment_scenes').select('story_fragment_id').gte('layer_index', 1)
    const eligibleIds = [...new Set((sceneRows || []).map(r => r.story_fragment_id))]
    if (!eligibleIds.length) { setSignals([]); setLoading(false); return }

    // 2. Load fragments + client-side env filter
    const { data: frags } = await supabase
      .from('story_fragments')
      .select('id, layer, rarity, fragment_label, fragment_text, time_condition, weather_condition, date_condition')
      .in('id', eligibleIds)

    const filtered = (frags || []).filter(f => {
      if (f.time_condition    && f.time_condition    !== time)    return false
      if (f.weather_condition && f.weather_condition !== weather) return false
      if (f.date_condition    && f.date_condition    !== date)    return false
      return true
    })
    if (!filtered.length) { setSignals([]); setLoading(false); return }

    // 3. Atmospheres
    const { data: atms } = await supabase
      .from('fragment_atmosphere').select('*')
      .in('story_fragment_id', filtered.map(f => f.id))
    const atmByFrag = {}
    for (const a of atms || []) (atmByFrag[a.story_fragment_id] ||= []).push(a)

    setSignals(filtered.map(f => ({
      id: f.id,
      fragment: f,
      position: fragPos(f.id),
      atmospheres: atmByFrag[f.id] || [],
    })))
    setLoading(false)
  }

  // ── Active signals (minus used) ──────────────────────────────────────────
  const activeSignals = useMemo(
    () => signals.filter(s => !usedIds.has(s.id)),
    [signals, usedIds]
  )

  // ── Nearest / locked signal ──────────────────────────────────────────────
  const nearestSignal = useMemo(() => {
    let best = null, bestDist = Infinity
    for (const s of activeSignals) {
      const d = Math.abs(needlePos - s.position)
      if (d < SNAP_PCT && d < bestDist) { best = s; bestDist = d }
    }
    return best
  }, [needlePos, activeSignals])

  const isLocked = !!nearestSignal && Math.abs(needlePos - nearestSignal.position) < LOCK_PCT

  // Pick atmosphere text once when locked signal changes
  useEffect(() => {
    if (!isLocked || !nearestSignal) { setLockedAtm(null); return }
    const atms = nearestSignal.atmospheres
    setLockedAtm(
      atms.length > 0
        ? atms[Math.floor(Math.random() * atms.length)].atmosphere_text
        : '這裡有什麼不尋常。'
    )
  }, [isLocked, nearestSignal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Idle message cycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (isLocked || overlay || nearestSignal || loading) return
    let i = 0
    const t = setInterval(() => { i = (i + 1) % IDLE_MSGS.length; setIdleMsg(IDLE_MSGS[i]) }, 3500)
    return () => clearInterval(t)
  }, [isLocked, overlay, nearestSignal, loading])

  // ── Band drag ────────────────────────────────────────────────────────────
  function posFromEvent(e) {
    const rect = bandRef.current?.getBoundingClientRect()
    if (!rect) return needlePos
    return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  }
  function onBandDown(e) {
    e.preventDefault()
    dragging.current = true
    bandRef.current?.setPointerCapture(e.pointerId)
    setNeedlePos(posFromEvent(e))
  }
  function onBandMove(e) { if (dragging.current) setNeedlePos(posFromEvent(e)) }
  function onBandUp()    { dragging.current = false }

  // ── Actions ──────────────────────────────────────────────────────────────
  function handleEnterOverlay() {
    if (!isLocked || !nearestSignal) return
    setOverlay({ signalId: nearestSignal.id, atmosphereText: lockedAtm || '', fragment: nearestSignal.fragment })
    setNoStamina(false)
  }

  async function handleDeepen() {
    if (stamina < 1) { setNoStamina(true); return false }
    const ok = await consume(1)
    if (!ok) { setNoStamina(true); return false }
    if (overlay?.signalId) setUsedIds(prev => new Set([...prev, overlay.signalId]))
    return true
  }

  async function handleRefresh() {
    if (stamina < 1 || loading) return
    const ok = await consume(1)
    if (!ok) return
    const { time, weather, date } = envRef.current
    await fetchSignals(time, weather, date)
  }

  function handleSuccess(frag, narrative) {
    setPending({ frag, narrative })
    setOverlay(null)
  }

  async function handleNotebookSelect(notebookId) {
    if (!pending) return
    await addFragment(notebookId, pending.frag.id, pending.narrative || '')
    setPending(null)
  }

  // ── Derived display ──────────────────────────────────────────────────────
  const statusText = loading          ? '感應中...'
    : isLocked                        ? '— 訊號定位 —'
    : nearestSignal                   ? '調頻中...'
    : activeSignals.length === 0      ? '此刻無訊號'
    : idleMsg

  const timeLabel    = TIME_LABELS[env.time]       || ''
  const weatherLabel = WEATHER_LABELS[env.weather] || ''

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: '#080604' }}>

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(201,185,154,0.013) 3px,rgba(201,185,154,0.013) 4px)',
      }} />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,6,4,0.85) 100%)',
      }} />

      {/* ── Status bar ── */}
      <div className="relative z-10 shrink-0 mt-3 mx-3">
        <div className="border border-dim/40 bg-[#080604]/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {timeLabel    && <span className="font-mono text-muted text-xs">{timeLabel}</span>}
            {weatherLabel && <span className="font-mono text-dim   text-xs">{weatherLabel}</span>}
          </div>
          <span className="font-mono text-muted text-xs tracking-wide">{statusText}</span>
        </div>
        {pos && (
          <p className="font-mono text-dim/40 text-[9px] text-right mt-1 pr-1 tracking-wider">
            {pos.lat.toFixed(4)} N&nbsp;&nbsp;{pos.lng.toFixed(4)} E
          </p>
        )}
      </div>

      {/* ── Centre area: atmosphere / idle ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-8 gap-6">
        {isLocked && lockedAtm ? (
          <>
            <p key={nearestSignal?.id}
               className="font-mono text-ink text-sm leading-7 text-center max-w-xs fade-in whitespace-pre-line">
              {lockedAtm}
            </p>
            <button
              onClick={handleEnterOverlay}
              disabled={stamina < 1}
              className="font-mono text-accent text-xs tracking-widest hover:text-ink transition-colors
                         underline underline-offset-4 decoration-dim disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {stamina < 1 ? '靈力不足' : '通靈深入'}
            </button>
          </>
        ) : loading ? (
          <span className="font-mono text-dim text-xs animate-pulse tracking-widest">感應中...</span>
        ) : activeSignals.length === 0 ? (
          <p className="font-mono text-dim text-xs text-center leading-7">
            此刻無異常訊號<br />換個時間再來
          </p>
        ) : (
          <p className="font-mono text-dim/50 text-[10px] tracking-[0.3em]">
            {nearestSignal ? '▷ 調頻中' : '左右拖動調頻'}
          </p>
        )}
      </div>

      {/* ── Frequency band ── */}
      <div className="relative z-10 px-5 pb-1 shrink-0">
        <div
          ref={bandRef}
          className="relative h-12 border border-dim/25 select-none cursor-pointer"
          style={{ background: 'rgba(201,185,154,0.025)', touchAction: 'none' }}
          onPointerDown={onBandDown}
          onPointerMove={onBandMove}
          onPointerUp={onBandUp}
          onPointerCancel={onBandUp}
        >
          {/* Signal markers */}
          {activeSignals.map(s => {
            const dist   = Math.abs(needlePos - s.position)
            const near   = dist < SNAP_PCT
            const locked = dist < LOCK_PCT
            return (
              <div key={s.id} className="absolute top-1.5 bottom-1.5 pointer-events-none"
                style={{
                  left: `${s.position}%`,
                  width: locked ? 2 : 1,
                  transform: 'translateX(-50%)',
                  background: locked ? '#c9b99a' : near ? 'rgba(201,185,154,0.65)' : 'rgba(201,185,154,0.22)',
                  boxShadow: locked ? '0 0 10px 5px rgba(201,185,154,0.5)' : near ? '0 0 5px 2px rgba(201,185,154,0.28)' : 'none',
                  transition: 'all 0.15s',
                }}
              />
            )
          })}

          {/* Needle */}
          <div className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${needlePos}%`,
              width: 1,
              transform: 'translateX(-50%)',
              background: '#c9b99a',
              boxShadow: '0 0 6px 2px rgba(201,185,154,0.45)',
            }}
          />
          {/* Needle tip triangle */}
          <div className="absolute bottom-0 pointer-events-none"
            style={{
              left: `${needlePos}%`,
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: '5px solid rgba(201,185,154,0.6)',
            }}
          />
        </div>

        {/* Frequency decoration labels */}
        <div className="relative h-4 mt-0.5">
          {FREQ_LABELS.map((f, i) => (
            <span key={f} className="absolute font-mono text-[8px] text-dim/25 tracking-tight"
              style={{ left: `${(i / (FREQ_LABELS.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="relative z-10 flex items-center justify-end px-5 pb-4 shrink-0">
        <button
          onClick={handleRefresh}
          disabled={stamina < 1 || loading}
          className="font-mono text-dim text-[10px] tracking-widest hover:text-muted transition-colors
                     disabled:opacity-25 disabled:cursor-not-allowed"
        >
          重新感知 −1
        </button>
      </div>

      {/* ── Exploration overlay ── */}
      {overlay && (
        <ExplorationOverlay
          atmosphereText={overlay.atmosphereText}
          fragment={overlay.fragment}
          noStamina={noStamina}
          onClose={() => { setOverlay(null); setNoStamina(false) }}
          onDeepen={handleDeepen}
          onSuccess={handleSuccess}
        />
      )}

      <NotebookSelectModal
        open={!!pending}
        notebooks={notebooks}
        fragment={pending?.frag}
        onSelect={handleNotebookSelect}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
