import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { usePlayer } from './hooks/usePlayer'
import { useStamina } from './hooks/useStamina'
import { useNotebooks } from './hooks/useNotebooks'
import TopBar from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import Auth from './pages/Auth'
import SetupName from './pages/SetupName'

const MapPage       = lazy(() => import('./pages/Map'))
const NotebookPage  = lazy(() => import('./pages/NotebookPage'))
const BookshelfPage = lazy(() => import('./pages/BookshelfPage'))
const ShopPage      = lazy(() => import('./pages/ShopPage'))

function PageLoader() {
  return <div className="flex-1 flex items-center justify-center"><span className="font-mono text-dim text-xs animate-pulse">...</span></div>
}

function AppShell() {
  const { player, loading, isNew, setIsNew, setPlayer, updateName } = usePlayer()
  const { stamina, consume, max } = useStamina(player, setPlayer)
  const {
    notebooks, sealed,
    addFragment, moveFragment, deleteFragment, updateTag, seal,
  } = useNotebooks(player?.id)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-mono text-dim text-xs animate-pulse tracking-widest">載入中...</span>
      </div>
    )
  }

  if (!player) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    )
  }

  // First-time setup: prompt for display name
  if (isNew) {
    return (
      <SetupName onDone={async (name) => {
        await updateName(name)
        setIsNew(false)
      }} />
    )
  }

  return (
    <>
      <TopBar
        player={player}
        stamina={stamina}
        maxStamina={max}
        sealedCount={sealed.length}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={
              <MapPage
                player={player}
                notebooks={notebooks}
                stamina={stamina}
                consume={consume}
                addFragment={addFragment}
              />
            } />
            <Route path="/notebook" element={
              <NotebookPage
                notebooks={notebooks}
                onTagChange={updateTag}
                onDelete={deleteFragment}
                onMove={moveFragment}
                onSeal={seal}
              />
            } />
            <Route path="/bookshelf" element={
              <BookshelfPage sealed={sealed} />
            } />
            <Route path="/guild" element={
              <ShopPage
                player={player}
                setPlayer={setPlayer}
                stamina={stamina}
                maxStamina={max}
                sealedCount={sealed.length}
              />
            } />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </Suspense>
      </div>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
