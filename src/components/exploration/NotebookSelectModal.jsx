import Modal from '../ui/Modal'

export default function NotebookSelectModal({ open, notebooks, fragment, onSelect, onClose }) {
  const available = (notebooks || []).filter(n => (n.fragments?.length ?? 0) < n.capacity)

  return (
    <Modal open={open} onClose={onClose} title="放入哪一本筆記本">
      {fragment && (
        <p className="font-mono text-muted text-xs leading-5 mb-5 line-clamp-3">
          {fragment.text}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {available.length === 0 && (
          <p className="font-mono text-danger text-xs">所有筆記本已滿。請先刪除碎片或至商城購買新筆記本。</p>
        )}
        {available.map(nb => (
          <button
            key={nb.id}
            onClick={() => onSelect(nb.id)}
            className="text-left border border-border p-4 hover:border-muted transition-colors"
          >
            <div className="flex justify-between items-center">
              <span className="font-mono text-ink text-xs">{nb.name}</span>
              <span className="font-mono text-dim text-xs">
                {nb.fragments?.length ?? 0} / {nb.capacity}
              </span>
            </div>
            <div className="mt-1.5 h-0.5 bg-border">
              <div
                className="h-full bg-dim transition-all"
                style={{ width: `${((nb.fragments?.length ?? 0) / nb.capacity) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
