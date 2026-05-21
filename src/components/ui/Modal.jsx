export default function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-md rounded-sm p-6 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <p className="font-mono text-muted text-[10px] tracking-[0.2em] uppercase mb-5 border-b border-border pb-3">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
