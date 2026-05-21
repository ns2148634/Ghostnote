import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/map',       icon: '◎', label: '地圖' },
  { to: '/notebook',  icon: '▣', label: '筆記本' },
  { to: '/bookshelf', icon: '≡', label: '書架' },
  { to: '/guild',     icon: '◈', label: '協會' },
]

export default function BottomNav() {
  return (
    <nav
      className="bg-bg border-t border-border flex shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-4 gap-1.5 font-mono text-xs tracking-widest transition-colors
             ${isActive ? 'text-accent' : 'text-dim hover:text-muted'}`
          }
        >
          <span className="text-base leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
