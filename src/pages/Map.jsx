// Map.jsx — 感知主頁：筆記感知頁（取代調頻盤 / 舊雷達）
// 感知 → 翻開的筆記頁上滲出 2-3 道墨痕印象 → 看完選一道深入 → 其餘墨痕散回紙裡 → 再感知。
// 沒有錯覺（浮現的都是真的）；沒有難關；選擇的重量來自「只能挑一個，其餘消失」。
// 感知（−1 靈力），通靈深入免費。
//
// props.env        來自 weather.js，形如 { time:'night', weather:'rain', date:null }
// props.playerId   目前玩家 id
// props.stamina    當前靈力（數字）
// props.consume    async (n) => bool — 扣靈力
// props.onDeepDive(fragment)  按〔通靈深入〕時呼叫，由父層開 ExplorationOverlay（免費）
import { useState, useCallback } from 'react'
import { fetchImpressions, fetchOwnedFragmentIds } from '../lib/signals'

const GOLD = '#c9b99a'
const INK = '#0c0a08'
const PAPER = '#141210'

export default function Map({ env, playerId, stamina, consume, onDeepDive }) {
  const [phase, setPhase] = useState('idle')   // idle | loading | empty | sensing | selected
  const [impressions, setImpressions] = useState([])
  const [selected, setSelected] = useState(null)

  const canSense = stamina >= 1

  const sense = useCallback(async () => {
    if (!canSense) return
    setPhase('loading'); setSelected(null); setImpressions([])
    try {
      await consume(1)
      if (!env) { setPhase('empty'); return }
      const ownedIds = playerId ? await fetchOwnedFragmentIds(playerId) : []
      const imps = await fetchImpressions(env, { ownedIds })
      if (!imps.length) { setPhase('empty'); return }
      setImpressions(imps)
      setPhase('sensing')
    } catch {
      setPhase('empty')
    }
  }, [env, playerId, canSense, consume])

  const choose = (i) => { setSelected(i); setPhase('selected') }

  const SenseBtn = ({ label, style: s }) => (
    <button
      onClick={sense}
      disabled={!canSense}
      style={{ ...btn, ...s, opacity: canSense ? 1 : 0.35, cursor: canSense ? 'pointer' : 'not-allowed' }}
    >
      {canSense ? label : '靈力不足'}
    </button>
  )

  return (
    <div style={{
      minHeight: '100%', background: INK, color: GOLD, padding: '24px 20px',
      backgroundImage: `radial-gradient(120% 80% at 50% -10%, ${PAPER} 0%, ${INK} 70%)`,
    }}>
      {/* 環境狀態列 */}
      <div style={{ fontSize: 12, opacity: 0.55, letterSpacing: 2, marginBottom: 6 }}>
        {env ? `此地 · ${labelTime(env.time)} · ${labelWeather(env.weather)}${env.date ? ' · ' + labelDate(env.date) : ''}` : '定位中…'}
      </div>
      <div style={{ fontSize: 13, opacity: 0.4, letterSpacing: 4, marginBottom: 28 }}>感 知</div>

      {phase === 'idle' && (
        <div style={{ textAlign: 'center', marginTop: 80 }}>
          <SenseBtn label="感知（−1）" />
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ opacity: 0.5, textAlign: 'center', marginTop: 80, letterSpacing: 2 }}>墨色正在滲開…</div>
      )}

      {phase === 'empty' && (
        <div style={{ textAlign: 'center', marginTop: 80, opacity: 0.55, lineHeight: 2.2 }}>
          <div>今晚很安靜。</div>
          <div style={{ fontSize: 13 }}>紙上沒有浮現任何痕跡，換個時機再來。</div>
          <SenseBtn label="重新感知（−1）" style={{ marginTop: 20 }} />
        </div>
      )}

      {(phase === 'sensing' || phase === 'selected') && impressions.map((imp, i) => {
        const isSel = selected === i
        const faded = phase === 'selected' && !isSel
        return (
          <div
            key={imp.fragment.id}
            onClick={() => phase === 'sensing' && choose(i)}
            style={{
              position: 'relative',
              margin: '0 0 16px', padding: '16px 18px 16px 22px',
              borderLeft: `2px solid ${GOLD}${isSel ? 'cc' : '55'}`,
              background: `linear-gradient(90deg, ${GOLD}0d, transparent 70%)`,
              cursor: phase === 'sensing' ? 'pointer' : 'default',
              opacity: faded ? 0.12 : 1,
              transition: 'opacity 700ms ease',
              animation: phase === 'sensing' ? `ink 700ms ease ${i * 180}ms both` : 'none',
            }}
          >
            <p style={{ lineHeight: 1.9, fontSize: 15, margin: 0 }}>{imp.atmosphere}</p>
          </div>
        )
      })}

      {phase === 'sensing' && (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, opacity: 0.45 }}>
          選一道墨痕凝神細看，其餘會散去。
        </div>
      )}

      {phase === 'selected' && selected != null && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button
            onClick={() => onDeepDive?.(impressions[selected].fragment)}
            style={{ ...btn, flex: 1, borderColor: GOLD }}
          >
            通靈深入
          </button>
          <SenseBtn label="重新感知（−1）" style={{ flex: 1, marginTop: 0 }} />
        </div>
      )}

      <style>{`@keyframes ink { from { opacity: 0; filter: blur(3px) } to { opacity: 1; filter: blur(0) } }`}</style>
    </div>
  )
}

const btn = {
  background: 'transparent', color: GOLD, border: `1px solid ${GOLD}66`,
  padding: '12px 18px', fontSize: 13, letterSpacing: 1, borderRadius: 4, cursor: 'pointer', marginTop: 12,
}

const labelTime = (t) => ({ dawn: '清晨', day: '白日', dusk: '黃昏', night: '深夜' }[t] || '—')
const labelWeather = (w) => ({ clear: '晴', cloudy: '陰', rain: '雨', fog: '霧' }[w] || '—')
const labelDate = (d) => ({ ghost_month: '鬼月', qingming: '清明', dongzhi: '冬至' }[d] || '')
