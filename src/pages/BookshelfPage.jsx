import { useState } from 'react'
import { useReaderFont, FontControls } from '../hooks/useReaderFont'

const LAYER_W = { basic: 'w-7', lore: 'w-14' }
const LAYER_LABEL = { basic: '基礎版', lore: '鬼怪志版' }

function getLayer(nb) {
  if (nb.sealed_layer) return nb.sealed_layer
  const hasLore = (nb.fragments || []).some(f => f.sf?.layer === 'lore')
  return hasLore ? 'lore' : 'basic'
}

function SealedBook({ notebook, onClick }) {
  const layer = getLayer(notebook)
  const title = notebook.story?.title || notebook.name
  return (
    <button
      onClick={onClick}
      className={`${LAYER_W[layer]} h-32 relative group
                  border border-dim/50 bg-surface
                  hover:border-accent/60 hover:bg-card
                  transition-all duration-300 active:scale-95`}
    >
      {/* spine gradient */}
      <div className="absolute inset-0 opacity-20"
           style={{ background: 'linear-gradient(to right, rgba(201,185,154,0.15) 0%, transparent 40%)' }} />
      {/* title */}
      <div className="absolute inset-x-0 inset-y-2 flex items-center justify-center overflow-hidden">
        <span
          className="font-mono text-dim text-[10px] leading-snug group-hover:text-muted transition-colors"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '100%' }}
        >
          {title}
        </span>
      </div>
      {/* bottom badge */}
      <div className="absolute bottom-0 inset-x-0 border-t border-dim/30 py-0.5 text-center">
        <span className="font-mono text-dim/50 text-[8px]">{LAYER_LABEL[layer][0]}</span>
      </div>
    </button>
  )
}

function SealedModal({ notebook, onClose }) {
  const { fontCls, leadingCls, idx: fontIdx, change: changeFont } = useReaderFont()
  if (!notebook) return null
  const layer = getLayer(notebook)
  const textCls = `${fontCls} ${leadingCls}`
  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center"
         onClick={onClose}>
      <div className="bg-card border-t border-border w-full max-w-[480px] max-h-[75vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between sticky top-0 bg-card z-10">
          <div>
            <p className="font-mono text-dim text-xs tracking-widest">{LAYER_LABEL[layer]}</p>
            <p className="font-mono text-ink text-base mt-0.5">{notebook.story?.title || notebook.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <FontControls idx={fontIdx} onChange={changeFont} />
            <button onClick={onClose} className="font-mono text-dim text-lg hover:text-muted transition-colors leading-none">✕</button>
          </div>
        </div>
        {/* Creature image */}
        {notebook.story?.image_slug && (
          <div className="relative w-full overflow-hidden" style={{ height: '220px' }}>
            <img
              src={`/creatures/${notebook.story.image_slug}.webp`}
              alt={notebook.story.title}
              className={`w-full h-full object-cover object-top transition-opacity ${layer === 'lore' ? 'opacity-90' : 'opacity-50'}`}
              onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
            />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'linear-gradient(to bottom, transparent 25%, #1e1e1e 100%)' }} />
            {layer === 'basic' && (
              <div className="absolute inset-0 pointer-events-none bg-black/40" />
            )}
          </div>
        )}

        {/* Sealed story or fragment list */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {notebook.sealed_story ? (
            <p className={`font-mono text-muted ${textCls} whitespace-pre-line break-words`}>
              {notebook.sealed_story}
            </p>
          ) : (
            <>
              {(!notebook.fragments || notebook.fragments.length === 0) && (
                <p className="font-mono text-dim text-sm text-center py-4">（無碎片記錄）</p>
              )}
              {(notebook.fragments || []).map(f => (
                <div key={f.id} className="border border-border/60 p-4 bg-[#111] relative">
                  {f.player_tag && (
                    <span className="absolute top-2.5 right-2.5 font-mono text-[10px] text-accent/60 bg-dim/20 px-1.5 py-0.5">
                      {f.player_tag}
                    </span>
                  )}
                  {f.sf?.fragment_label && (
                    <p className="font-mono text-accent/70 text-[10px] tracking-wider mb-1">{f.sf.fragment_label}</p>
                  )}
                  <p className={`font-mono text-muted ${textCls} pr-12 whitespace-pre-line break-words`}>
                    {f.exploration_narrative || f.sf?.fragment_text || '（文字遺失）'}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookshelfPage({ sealed }) {
  const [viewing, setViewing] = useState(null)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-5 pt-6 pb-3 shrink-0">
        <p className="font-mono text-dim text-xs tracking-[0.25em]">— 封存書架 —</p>
        {sealed.length > 0 && (
          <p className="font-mono text-dim/50 text-[11px] mt-1">{sealed.length} 本封存</p>
        )}
      </div>

      {/* Shelf */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {sealed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="font-mono text-dim text-sm">書架空蕩蕩的。</p>
            <p className="font-mono text-dim/50 text-xs">封存第一本筆記本後，書會在這裡出現。</p>
          </div>
        ) : (
          /* Shelf rows — bottom border acts as shelf plank */
          <div className="flex flex-col gap-0">
            {chunkArray(sealed, 8).map((row, ri) => (
              <div key={ri}>
                <div className="flex items-end gap-1 pt-6">
                  {row.map(nb => (
                    <SealedBook key={nb.id} notebook={nb} onClick={() => setViewing(nb)} />
                  ))}
                </div>
                {/* Shelf plank */}
                <div className="h-px bg-dim/30 mt-0 shadow-sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      <SealedModal notebook={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function chunkArray(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}
