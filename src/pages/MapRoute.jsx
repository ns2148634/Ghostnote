import { useState, useEffect } from 'react'
import { getWeatherCondition, getTimeCondition, getDateCondition } from '../lib/weather'
import Map from './Map'
import ExplorationOverlay from '../components/exploration/ExplorationOverlay'
import NotebookSelectModal from '../components/exploration/NotebookSelectModal'

// MapRoute — wraps the Map dial component with env computation and overlay management.
// Props mirror what AppShell provides: player, notebooks, stamina, consume, addFragment.
export default function MapRoute({ player, notebooks, stamina, consume, addFragment }) {
  const [env, setEnv]         = useState(null)
  const [scanKey, setScanKey] = useState(0)   // increment to force Map remount → new scan
  const [overlay, setOverlay] = useState(null) // { fragment }
  const [pending, setPending] = useState(null) // { frag, narrative }

  // Compute env once on mount (GPS optional, only needed for weather)
  useEffect(() => {
    async function load() {
      const time = getTimeCondition()
      const date = getDateCondition()
      let weather = 'clear'
      if (navigator.geolocation) {
        await new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            async p => {
              try { weather = await getWeatherCondition(p.coords.latitude, p.coords.longitude) }
              catch {}
              resolve()
            },
            () => resolve(),
            { enableHighAccuracy: false, timeout: 6000 }
          )
        })
      }
      setEnv({ time, weather, date })
    }
    load()
  }, [])

  // Called by Map when user clicks 通靈深入（免費，靈力已在感知時扣過）
  function handleDeepDive(fragment) {
    setOverlay({ fragment })
  }

  // Called by ExplorationOverlay on success (before NotebookSelectModal)
  function handleSuccess(frag, narrative) {
    setPending({ frag, narrative })
    setOverlay(null)
  }

  // Close overlay (fail / user bailed) → trigger a new scan
  function handleOverlayClose() {
    setOverlay(null)
    setScanKey(k => k + 1)
  }

  // Called when user picks a notebook in the modal
  async function handleNotebookSelect(notebookId) {
    if (!pending) return
    await addFragment(notebookId, pending.frag.id, pending.narrative || '')
    setPending(null)
    setScanKey(k => k + 1) // new scan after picking up a fragment
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <Map
        key={scanKey}
        env={env}
        playerId={player?.id}
        stamina={stamina}
        consume={consume}
        onDeepDive={handleDeepDive}
      />

      {overlay && (
        <ExplorationOverlay
          atmosphereText=""
          fragment={overlay.fragment}
          onClose={handleOverlayClose}
          onSuccess={handleSuccess}
          startScene={true}
        />
      )}

      <NotebookSelectModal
        open={!!pending}
        notebooks={notebooks}
        fragment={pending?.frag}
        onSelect={handleNotebookSelect}
        onClose={() => { setPending(null); setScanKey(k => k + 1) }}
      />
    </div>
  )
}
