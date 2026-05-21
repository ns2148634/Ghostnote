import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { getWeatherCondition, getTimeCondition } from '../lib/weather'
import ExplorationOverlay from '../components/exploration/ExplorationOverlay'
import NotebookSelectModal from '../components/exploration/NotebookSelectModal'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TIME_LABELS = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '深夜' }

function makeAnomalyIcon(intensity) {
  const s = Math.round(10 + intensity * 10)
  const alpha = (0.5 + intensity * 0.5).toFixed(2)
  return L.divIcon({
    className: '',
    html: `<div class="anomaly-dot" style="
      width:${s}px;height:${s}px;border-radius:50%;
      background:radial-gradient(circle,rgba(201,185,154,${alpha}) 0%,rgba(201,185,154,0.05) 65%,transparent 100%);
      box-shadow:0 0 ${Math.round(s*1.2)}px rgba(201,185,154,${(parseFloat(alpha)*0.4).toFixed(2)});
    "></div>`,
    iconSize: [s, s],
    iconAnchor: [s/2, s/2],
  })
}

function makePlayerIcon(scanning) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;cursor:pointer;">
        <div class="anomaly-dot" style="
          position:absolute;inset:0;border-radius:50%;
          background:radial-gradient(circle,rgba(201,185,154,0.15) 0%,transparent 70%);
          border:1px solid rgba(201,185,154,0.25);
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:10px;height:10px;border-radius:50%;
          background:#c9b99a;
          box-shadow:0 0 10px 4px rgba(201,185,154,${scanning ? '0.8' : '0.4'});
        "></div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function GeoLocator({ onPosition }) {
  useMapEvents({ locationfound: e => onPosition(e.latlng) })
  const map = useMap()
  useEffect(() => { map.locate({ watch: true, setView: false, enableHighAccuracy: true }) }, [map])
  return null
}

function AutoCenter({ pos, ready }) {
  const map = useMap()
  const centred = useRef(false)
  useEffect(() => {
    if (pos && !centred.current && ready) { map.setView([pos.lat, pos.lng], 16); centred.current = true }
  }, [pos, ready, map])
  return null
}

function MapController({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map])
  return null
}

// Horror status messages
const IDLE_MSGS    = ['環境靜默', '無異常訊號', '周圍平靜', '等待偵測']
const ANOMALY_MSGS = (n) => [`感知到 ${n} 處異常`, `偵測到 ${n} 個訊號`, `異常點：${n}`]

export default function MapPage({ player, notebooks, stamina, consume, addFragment }) {
  const [pos, setPos]             = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [scanning, setScanning]   = useState(false)
  const [mapReady, setMapReady]   = useState(false)
  const [timeLabel, setTimeLabel] = useState('')
  const [statusMsg, setStatusMsg] = useState(IDLE_MSGS[0])
  const [overlay, setOverlay]     = useState(null)
  const [noStamina, setNoStamina] = useState(false)
  const [pendingFrag, setPending] = useState(null)
  const mapRef = useRef(null)

  function handleLocate() {
    if (pos && mapRef.current) mapRef.current.setView([pos.lat, pos.lng], 16, { animate: true })
  }

  useEffect(() => {
    const t = getTimeCondition()
    setTimeLabel(TIME_LABELS[t] || '')
  }, [])

  // Cycle idle status message
  useEffect(() => {
    if (scanning || anomalies.length > 0) return
    const msgs = IDLE_MSGS
    let i = 0
    const id = setInterval(() => { i = (i + 1) % msgs.length; setStatusMsg(msgs[i]) }, 4000)
    return () => clearInterval(id)
  }, [scanning, anomalies.length])

  function jitter(max = 0.009) { return (Math.random() - 0.5) * 2 * max }

  async function handleScan() {
    if (scanning || stamina < 1) return
    setScanning(true)
    setStatusMsg('偵測中...')
    const ok = await consume(1)
    if (!ok) { setScanning(false); setStatusMsg(IDLE_MSGS[0]); return }

    const centre = pos || { lat: 25.0478, lng: 121.5319 }
    try { await getWeatherCondition(centre.lat, centre.lng) } catch {}

    const { data: eligible } = await supabase.from('story_fragments').select('id')
    const ids = (eligible || []).map(f => f.id)
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
    const pick = anomaly.eligibleIds[Math.floor(Math.random() * anomaly.eligibleIds.length)]
    const [{ data: frag }, { data: nodes }] = await Promise.all([
      supabase.from('story_fragments').select('*').eq('id', pick).single(),
      supabase.from('exploration_nodes').select('*').eq('story_fragment_id', pick).order('layer_index'),
    ])
    if (!frag || !nodes) return
    const atm = nodes.find(n => n.layer_index === 0)
    const layers = nodes.filter(n => n.layer_index > 0).map(n => ({
      sceneText: n.atmosphere_text,
      options: (n.options || []).map(o => ({ text: o.text, isCorrect: o.is_correct, failText: o.fail_text })),
    }))
    setNoStamina(false)
    setOverlay({ anomalyId: anomaly.id, atmosphereText: atm?.atmosphere_text || '這裡有什麼不尋常。', layers, fragment: frag })
  }

  async function handleDeepen() {
    if (stamina < 1) { setNoStamina(true); return false }
    const ok = await consume(1)
    if (!ok) { setNoStamina(true); return false }
    return true
  }

  function handleSuccess(frag) { setOverlay(null); setPending(frag) }

  async function handleNotebookSelect(notebookId) {
    if (!pendingFrag) return
    await addFragment(notebookId, pendingFrag.id)
    setAnomalies(prev => prev.filter(a => a.id !== overlay?.anomalyId))
    setPending(null); setOverlay(null)
  }

  const dotColor = scanning ? 'bg-accent animate-pulse'
    : anomalies.length > 0  ? 'bg-danger animate-pulse'
    : 'bg-dim'

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* ── Map ── */}
      <MapContainer
        center={[25.0478, 121.5319]} zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                   attribution='&copy; <a href="https://carto.com">CARTO</a>' />
        <GeoLocator onPosition={setPos} />
        <AutoCenter pos={pos} ready={mapReady} />
        <MapController mapRef={mapRef} />
        {pos && (
          <Marker
            position={[pos.lat, pos.lng]}
            icon={makePlayerIcon(scanning)}
            eventHandlers={{ click: handleScan }}
          />
        )}
        {anomalies.map(a => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={makeAnomalyIcon(a.intensity)}
                  eventHandlers={{ click: () => handleAnomalyClick(a) }} />
        ))}
      </MapContainer>

      {/* ── Vignette ── */}
      <div className="absolute inset-0 map-vignette pointer-events-none" />

      {/* ── Status overlay (top) ── */}
      <div className="absolute top-3 inset-x-3 pointer-events-none z-10">
        <div className="border border-dim/40 bg-bg/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="font-mono text-muted text-xs tracking-wider">{timeLabel}</span>
          </div>
          <span className="font-mono text-muted text-xs tracking-wide">{statusMsg}</span>
        </div>
        {pos && (
          <p className="font-mono text-dim/60 text-[10px] text-right mt-1 pr-1 tracking-wider">
            {pos.lat.toFixed(4)}&nbsp;N&nbsp;&nbsp;{pos.lng.toFixed(4)}&nbsp;E
          </p>
        )}
      </div>

      {/* ── Scan rings (visual feedback when scanning) ── */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="scan-ring absolute w-16 h-16 rounded-full" />
          <span className="scan-ring scan-ring-2 absolute w-16 h-16 rounded-full" />
          <span className="scan-ring scan-ring-3 absolute w-16 h-16 rounded-full" />
        </div>
      )}

      {/* ── Locate button (bottom right) ── */}
      <div className="absolute bottom-8 right-4 z-[1100]">
        <button
          onClick={handleLocate}
          disabled={!pos}
          className="w-10 h-10 rounded-full border border-dim bg-bg/90 backdrop-blur
                     flex items-center justify-center
                     hover:border-muted active:scale-95
                     transition-all duration-200
                     disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <span className="font-mono text-accent text-sm leading-none">⊕</span>
        </button>
      </div>

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
        fragment={pendingFrag}
        onSelect={handleNotebookSelect}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
