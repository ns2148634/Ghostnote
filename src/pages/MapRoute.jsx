import { useState, useEffect } from 'react'
import { getWeatherCondition, getTimeCondition, getDateCondition } from '../lib/weather'
import Map from './Map'
import ExplorationOverlay from '../components/exploration/ExplorationOverlay'
import NotebookSelectModal from '../components/exploration/NotebookSelectModal'

// MapRoute — wraps the Map dial component with env computation and overlay management.
// Props mirror what AppShell provides: player, notebooks, stamina, consume, addFragment.
//
// Map is conditionally rendered only when overlay is closed. This prevents the Map's
// previous phase from flashing through when the overlay opens or closes.
export default function MapRoute({ player, notebooks, stamina, consume, addFragment }) {
  const [env, setEnv]         = useState(null)
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
    setOverlay(null) // Map remounts fresh (idle) when overlay closes
  }

  // Close overlay (fail / user bailed) → Map remounts fresh (idle)
  function handleOverlayClose() {
    setOverlay(null)
  }

  // Called when user picks a notebook in the modal
  async function handleNotebookSelect(notebookId) {
    if (!pending) return
    await addFragment(notebookId, pending.frag.id, pending.narrative || '')
    setPending(null)
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {!overlay && (
        <Map
          env={env}
          playerId={player?.id}
          stamina={stamina}
          consume={consume}
          onDeepDive={handleDeepDive}
        />
      )}

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
        onClose={() => setPending(null)}
      />
    </div>
  )
}
