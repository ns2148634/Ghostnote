export default function StaminaBar({ current, max = 10 }) {
  return (
    <div className="flex items-center gap-0.5 font-mono text-xs select-none">
      <span className="text-muted mr-2 text-xs">體力</span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`text-sm ${i < current ? 'text-accent' : 'text-dim'}`}>
          {i < current ? '▓' : '░'}
        </span>
      ))}
    </div>
  )
}
