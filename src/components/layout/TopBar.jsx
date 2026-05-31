import StaminaBar from '../ui/StaminaBar'

const LEVELS = [
  [0,  '見習靈探'],
  [5,  '靈探'],
  [15, '資深靈探'],
  [30, '首席靈探'],
  [60, '靈異檔案官'],
]
function getLevel(n) {
  let l = LEVELS[0][1]
  for (const [min, label] of LEVELS) if (n >= min) l = label
  return l
}

export default function TopBar({ player, stamina, maxStamina, sealedCount = 0 }) {
  if (!player) return null
  return (
    <div className="bg-bg border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-ink text-sm truncate">{player.display_name}</span>
        <span className="font-mono text-muted text-xs shrink-0">{getLevel(sealedCount)}</span>
      </div>
      <StaminaBar current={stamina} max={maxStamina} />
    </div>
  )
}
