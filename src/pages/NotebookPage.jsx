import { useState, useEffect } from 'react'
import Modal from '../components/ui/Modal'

function FragmentCard({ frag, onTagChange, onDelete, onMoveClick, sealed }) {
  const [editingTag, setEditingTag] = useState(false)
  const [tagVal, setTagVal] = useState(frag.player_tag || '')

  function submitTag() {
    onTagChange(frag.id, tagVal.trim())
    setEditingTag(false)
  }

  return (
    <div className="border border-border p-4 bg-[#111] relative group">
      {frag.player_tag && !editingTag && (
        <span className="absolute top-2 right-2 font-mono text-[9px] text-accent/70 bg-dim/30 px-1.5 py-0.5 border border-dim/40">
          {frag.player_tag}
        </span>
      )}
      <p className="font-mono text-muted text-xs leading-6 pr-12">
        {frag.sf?.text || '（碎片文字遺失）'}
      </p>
      {!sealed && (
        <div className="flex gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {editingTag ? (
            <div className="flex gap-2 items-center">
              <input
                className="bg-surface border border-border font-mono text-[10px] text-ink px-2 py-0.5 w-28 outline-none focus:border-muted"
                value={tagVal}
                onChange={e => setTagVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitTag() }}
                maxLength={12}
                autoFocus
              />
              <button onClick={submitTag} className="font-mono text-accent text-[10px]">確定</button>
              <button onClick={() => setEditingTag(false)} className="font-mono text-dim text-[10px]">取消</button>
            </div>
          ) : (
            <>
              <button onClick={() => setEditingTag(true)}
                className="font-mono text-dim text-[10px] hover:text-muted transition-colors">
                {frag.player_tag ? '改標籤' : '+ 標籤'}
              </button>
              <button onClick={() => onMoveClick(frag)}
                className="font-mono text-dim text-[10px] hover:text-muted transition-colors">移動</button>
              <button onClick={() => onDelete(frag.id)}
                className="font-mono text-dim text-[10px] hover:text-danger transition-colors">刪除</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NotebookView({ notebook, allNotebooks, onBack, onTagChange, onDelete, onMove, onSeal, onRename }) {
  const [moving, setMoving]       = useState(null)
  const [sealing, setSealing]     = useState(false)
  const [sealResult, setSealResult] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]     = useState(notebook.name)

  useEffect(() => { setNameVal(notebook.name) }, [notebook.name])

  async function doSeal() {
    setSealing(true)
    const result = await onSeal(notebook.id)
    setSealing(false)
    setSealResult(result)
  }

  async function confirmMove(targetId) {
    await onMove(moving.id, targetId)
    setMoving(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <button onClick={onBack} className="font-mono text-dim text-xs hover:text-muted transition-colors">
          ← 返回
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1 mx-3">
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(notebook.id, nameVal.trim() || notebook.name); setEditingName(false) }
                if (e.key === 'Escape') { setNameVal(notebook.name); setEditingName(false) }
              }}
              maxLength={20}
              autoFocus
              className="flex-1 bg-transparent border-b border-muted font-mono text-ink text-xs
                         outline-none text-center tracking-wide"
            />
            <button
              onClick={() => { onRename(notebook.id, nameVal.trim() || notebook.name); setEditingName(false) }}
              className="font-mono text-accent text-[10px] shrink-0"
            >確定</button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="font-mono text-ink text-xs hover:text-accent transition-colors flex-1 text-center mx-3"
          >
            {notebook.name}
          </button>
        )}

        <span className="font-mono text-dim text-[10px] shrink-0">
          {notebook.fragments?.length ?? 0} / {notebook.capacity}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {(!notebook.fragments || notebook.fragments.length === 0) && (
          <p className="font-mono text-dim text-xs mt-8 text-center">筆記本是空的。</p>
        )}
        {(notebook.fragments || []).map(f => (
          <FragmentCard
            key={f.id}
            frag={f}
            onTagChange={onTagChange}
            onDelete={id => setConfirmDel(id)}
            onMoveClick={setMoving}
            sealed={false}
          />
        ))}
      </div>

      <div className="px-4 py-4 border-t border-border shrink-0">
        {sealResult ? (
          <div className={`font-mono text-xs text-center py-2 ${sealResult.ok ? 'text-ok' : 'text-muted'}`}>
            {sealResult.ok ? `封存完成。鬼怪筆記本已更新。` : sealResult.msg}
          </div>
        ) : (
          <button
            onClick={doSeal}
            disabled={sealing || !notebook.fragments?.length}
            className="w-full font-mono text-dim text-[10px] tracking-widest py-2.5 border border-dim/40
                       hover:border-muted hover:text-muted transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sealing ? '確認中...' : '封存'}
          </button>
        )}
      </div>

      {/* Move modal */}
      <Modal open={!!moving} onClose={() => setMoving(null)} title="移動碎片至">
        {allNotebooks.filter(n => n.id !== notebook.id).map(nb => (
          <button key={nb.id} onClick={() => confirmMove(nb.id)}
            className="w-full text-left border border-border p-3 mb-2 hover:border-muted transition-colors font-mono text-xs text-ink flex justify-between">
            <span>{nb.name}</span>
            <span className="text-dim">{nb.fragments?.length ?? 0}/{nb.capacity}</span>
          </button>
        ))}
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="刪除碎片">
        <p className="font-mono text-muted text-xs mb-5">刪除後無法復原。</p>
        <div className="flex gap-4">
          <button onClick={() => { onDelete(confirmDel); setConfirmDel(null) }}
            className="font-mono text-danger text-xs hover:text-ink transition-colors">確認刪除</button>
          <button onClick={() => setConfirmDel(null)}
            className="font-mono text-dim text-xs hover:text-muted transition-colors">取消</button>
        </div>
      </Modal>
    </div>
  )
}

export default function NotebookPage({ notebooks, onTagChange, onDelete, onMove, onSeal, onRename }) {
  const [selected, setSelected] = useState(null)
  const nb = notebooks.find(n => n.id === selected)

  if (nb) {
    return (
      <NotebookView
        notebook={nb}
        allNotebooks={notebooks}
        onBack={() => setSelected(null)}
        onTagChange={onTagChange}
        onDelete={onDelete}
        onMove={onMove}
        onSeal={onSeal}
        onRename={onRename}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-6 pb-2">
        <p className="font-mono text-dim text-[10px] tracking-widest">— 筆記本 —</p>
      </div>
      <div className="px-4 py-2 flex flex-col gap-3">
        {notebooks.length === 0 && (
          <p className="font-mono text-dim text-xs mt-6 text-center">尚無筆記本。</p>
        )}
        {notebooks.map(nb => (
          <button
            key={nb.id}
            onClick={() => setSelected(nb.id)}
            className="text-left border border-border p-4 hover:border-muted transition-colors w-full"
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-ink text-xs">{nb.name}</span>
              <span className="font-mono text-dim text-[10px]">
                {nb.fragments?.length ?? 0} / {nb.capacity}
              </span>
            </div>
            <div className="mt-2 h-px bg-border">
              <div
                className="h-full bg-dim/60 transition-all"
                style={{ width: `${((nb.fragments?.length ?? 0) / nb.capacity) * 100}%` }}
              />
            </div>
            {nb.fragments?.length > 0 && (
              <p className="font-mono text-dim text-[10px] mt-2 truncate">
                {nb.fragments[0].sf?.text?.slice(0, 40)}…
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
