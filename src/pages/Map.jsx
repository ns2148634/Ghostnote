import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getWeatherCondition, getTimeCondition } from '../lib/weather'
import ExplorationOverlay from '../components/exploration/ExplorationOverlay'
import NotebookSelectModal from '../components/exploration/NotebookSelectModal'

const TIME_LABELS = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '深夜' }
const IDLE_MSGS   = ['環境靜默', '無異常訊號', '周圍平靜', '等待偵測']
const ANOMALY_MSGS = (n) => [`感知到 ${n} 處異常`, `偵測到 ${n} 個訊號`, `異常點：${n}`]

// Convert GPS offset → screen percentage (player always at 50 %, 50 %)
function toScreen(playerPos, anomaly) {
  const centre = playerPos || { lat: 25.0478, lng: 121.5319 }
  const dx =  (anomaly.lng - centre.lng) * 111320 * Math.cos(centre.lat * Math.PI / 180)
  const dy = -(anomaly.lat - centre.lat) * 110540
  const pctPerMeter = 0.028   // ~1 km = ±28 % from centre
  return {
    x: Math.max(6, Math.min(94, 50 + dx * pctPerMeter)),
    y: Math.max(6, Math.min(94, 50 + dy * pctPerMeter)),
  }
}

export default function MapPage({ player, notebooks, stamina, consume, addFragment }) {
  const [pos, setPos]           = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [scanning, setScanning] = useState(false)
  const [timeLabel, setTimeLabel] = useState('')
  const [statusMsg, setStatusMsg] = useState(IDLE_MSGS[0])
  const [overlay, setOverlay]   = useState(null)
  const [noStamina, setNoStamina] = useState(false)
  const [pendingFrag, setPending] = useState(null)

  // Direct GPS — no Leaflet
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      null,
      { enableHighAccuracy: true },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    const t = getTimeCondition()
    setTimeLabel(TIME_LABELS[t] || '')
  }, [])

  useEffect(() => {
    if (scanning || anomalies.length > 0) return
    let i = 0
    const id = setInterval(() => { i = (i + 1) % IDLE_MSGS.length; setStatusMsg(IDLE_MSGS[i]) }, 4000)
    return () => clearInterval(id)
  }, [scanning, anomalies.length])

  function jitter(max = 0.009) { return (Math.random() - 0.5) * 2 * max }

  function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function pickN(arr, n) {
    const copy = [...arr]
    const out = []
    while (out.length < n && copy.length) {
      const i = Math.floor(Math.random() * copy.length)
      out.push(copy.splice(i, 1)[0])
    }
    return out
  }
  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

  async function handleScan() {
    if (scanning || stamina < 1) return
    setScanning(true)
    setStatusMsg('偵測中...')
    const ok = await consume(1)
    if (!ok) { setScanning(false); setStatusMsg(IDLE_MSGS[0]); return }

    const centre = pos || { lat: 25.0478, lng: 121.5319 }
    try { await getWeatherCondition(centre.lat, centre.lng) } catch {}

    const { data: eligibleScenes } = await supabase
      .from('fragment_scenes')
      .select('story_fragment_id')
      .gte('layer_index', 1)
    const ids = [...new Set((eligibleScenes || []).map(n => n.story_fragment_id))]
    const count = 3 + Math.floor(Math.random() * 3)

    const spots = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      lat: centre.lat + jitter(),
      lng: centre.lng + jitter(),
      intensity: 0.3 + Math.random() * 0.7,
      eligibleIds: ids,
    }))

    setAnomalies(spots)
    setScanning(false)
    const pick = ANOMALY_MSGS(count)
    setStatusMsg(pick[Math.floor(Math.random() * pick.length)])
  }

  async function handleAnomalyClick(anomaly) {
    if (!anomaly.eligibleIds.length) return
    const fragmentId = randomPick(anomaly.eligibleIds)

    const [{ data: frag }, { data: atmospheres }, { data: scenes }] = await Promise.all([
      supabase.from('story_fragments').select('*').eq('id', fragmentId).single(),
      supabase.from('fragment_atmosphere').select('*').eq('story_fragment_id', fragmentId),
      supabase.from('fragment_scenes').select('*').eq('story_fragment_id', fragmentId).order('layer_index'),
    ])
    if (!frag) return

    const atmRow = randomPick(atmospheres || [])
    const atmosphereText = atmRow?.atmosphere_text || '這裡有什麼不尋常。'

    const layerIndices = [...new Set((scenes || []).map(s => s.layer_index))].sort()
    const layers = []
    for (const idx of layerIndices) {
      const pool = (scenes || []).filter(s => s.layer_index === idx)
      const scene = randomPick(pool)
      if (!scene) continue

      const { data: allOptions } = await supabase
        .from('scene_options')
        .select('*')
        .eq('scene_id', scene.id)

      const correct = randomPick((allOptions || []).filter(o => o.is_correct))
      const wrongs = pickN((allOptions || []).filter(o => !o.is_correct), 2)
      if (!correct) continue

      layers.push({
        sceneText: scene.atmosphere_text,
        options: shuffle([correct, ...wrongs]).map(o => ({
          text: o.text,
          isCorrect: o.is_correct,
          failText: o.fail_text,
        })),
      })
    }

    setNoStamina(false)
    setOverlay({ anomalyId: anomaly.id, atmosphereText, layers, fragment: frag })
  }

  async function handleDeepen() {
    if (stamina < 1) { setNoStamina(true); return false }
    const ok = await consume(1)
    if (!ok) { setNoStamina(true); return false }
    setAnomalies(prev => prev.filter(a => a.id !== overlay?.anomalyId))
    return true
  }

  function handleSuccess(frag) {
    setPending({ frag, anomalyId: overlay.anomalyId })
    setOverlay(null)
  }

  async function handleNotebookSelect(notebookId) {
    if (!pendingFrag) return
    await addFragment(notebookId, pendingFrag.frag.id)
    setPending(null)
  }

  const dotColor = scanning ? 'bg-accent animate-pulse'
    : anomalies.length > 0   ? 'bg-danger animate-pulse'
    : 'bg-dim'

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: '#080604' }}>

      {/* ── Horror scanner background ── */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* CRT scanlines */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(201,185,154,0.013) 3px,rgba(201,185,154,0.013) 4px)',
        }} />
        {/* Radar rings */}
        {[18, 34, 50, 66, 82].map((pct, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: `${pct}%`, height: `${pct}%`,
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            border: `1px solid rgba(201,185,154,${i === 0 ? 0.07 : 0.04})`,
          }} />
        ))}
        {/* Crosshair */}
        <div className="absolute inset-x-0" style={{ top: '50%', height: '1px', background: 'rgba(201,185,154,0.045)' }} />
        <div className="absolute inset-y-0" style={{ left: '50%', width: '1px', background: 'rgba(201,185,154,0.045)' }} />
      </div>

      {/* ── Vignette ── */}
      <div className="absolute inset-0 map-vignette pointer-events-none" />

      {/* ── Status bar (top) ── */}
      <div className="absolute top-3 inset-x-3 pointer-events-none z-10">
        <div className="border border-dim/40 bg-[#080604]/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="font-mono text-muted text-xs tracking-wider">{timeLabel}</span>
          </div>
          <span className="font-mono text-muted text-xs tracking-wide">{statusMsg}</span>
        </div>
        {pos && (
          <p className="font-mono text-dim/50 text-[10px] text-right mt-1 pr-1 tracking-wider">
            {pos.lat.toFixed(4)}&nbsp;N&nbsp;&nbsp;{pos.lng.toFixed(4)}&nbsp;E
          </p>
        )}
      </div>

      {/* ── Anomaly dots ── */}
      {anomalies.map(a => {
        const { x, y } = toScreen(pos, a)
        const s = Math.round(12 + a.intensity * 12)
        const alpha = (0.5 + a.intensity * 0.5).toFixed(2)
        return (
          <button
            key={a.id}
            onClick={() => handleAnomalyClick(a)}
            className="absolute anomaly-dot rounded-full z-10"
            style={{
              left: `${x}%`, top: `${y}%`,
              width: s + 16, height: s + 16,
              transform: 'translate(-50%,-50%)',
              background: `radial-gradient(circle,rgba(201,185,154,${alpha}) 0%,rgba(201,185,154,0.05) 65%,transparent 100%)`,
              boxShadow: `0 0 ${Math.round(s * 1.4)}px rgba(201,185,154,${(parseFloat(alpha) * 0.45).toFixed(2)})`,
            }}
          />
        )
      })}

      {/* ── Player dot (centre, click = scan) ── */}
      <button
        onClick={handleScan}
        disabled={scanning || stamina < 1}
        className="absolute z-10 disabled:cursor-not-allowed"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      >
        <div style={{ position: 'relative', width: 44, height: 44 }}>
          <div className="anomaly-dot absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle,rgba(201,185,154,0.12) 0%,transparent 70%)',
            border: '1px solid rgba(201,185,154,0.22)',
          }} />
          <div className="absolute" style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 10, height: 10,
            borderRadius: '50%',
            background: '#c9b99a',
            boxShadow: `0 0 12px 5px rgba(201,185,154,${scanning ? '0.85' : '0.38'})`,
          }} />
        </div>
      </button>

      {/* ── Stamina / scan hint ── */}
      <div className="absolute pointer-events-none z-10" style={{ left: '50%', top: 'calc(50% + 30px)', transform: 'translateX(-50%)' }}>
        <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
          {stamina < 1 ? '體力不足' : anomalies.length === 0 ? '點擊偵測' : ''}
        </span>
      </div>

      {/* ── Scan rings ── */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="scan-ring absolute w-16 h-16 rounded-full" />
          <span className="scan-ring scan-ring-2 absolute w-16 h-16 rounded-full" />
          <span className="scan-ring scan-ring-3 absolute w-16 h-16 rounded-full" />
        </div>
      )}

      {/* ── Exploration overlay ── */}
      {overlay && (
        <ExplorationOverlay
          atmosphereText={overlay.atmosphereText}
          layers={overlay.layers}
          fragment={overlay.fragment}
          noStamina={noStamina}
          onClose={() => { setOverlay(null); setNoStamina(false) }}
          onDeepen={handleDeepen}
          onSuccess={handleSuccess}
        />
      )}

      <NotebookSelectModal
        open={!!pendingFrag}
        notebooks={notebooks}
        fragment={pendingFrag?.frag}
        onSelect={handleNotebookSelect}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
