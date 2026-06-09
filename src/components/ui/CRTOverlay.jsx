// CRTOverlay.jsx — vignette + scanlines（共用，全頁固定底層）
// 限制在 max-width:600px 容器內，pointer-events:none。
// scanlines 有 ~6s 緩慢 opacity pulse（0.18 ↔ 0.34）。
export default function CRTOverlay() {
  return (
    <>
      {/* 暗角 vignette */}
      <div style={{
        position: 'fixed', inset: 0, maxWidth: 600, margin: '0 auto',
        pointerEvents: 'none', zIndex: 10,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,3,2,0.88) 100%)',
      }} />
      {/* Scanlines */}
      <div className="pn-scanlines" style={{
        position: 'fixed', inset: 0, maxWidth: 600, margin: '0 auto',
        pointerEvents: 'none', zIndex: 11,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)',
      }} />
      <style>{`
        @keyframes pnScanPulse { 0%,100% { opacity:.18 } 50% { opacity:.34 } }
        .pn-scanlines { animation: pnScanPulse 6s ease-in-out infinite; }
      `}</style>
    </>
  )
}
