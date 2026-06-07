// Map.jsx — 感知主頁：筆記感知頁（v3，中央感知按鈕觸發）
// 進頁面不自動感知、不扣靈力。玩家按中央的「感知」按鈕才扣 1 靈力、浮現 2-3 道墨痕印象。
// 選一道深入、其餘淡掉；通靈深入免費。
//
// 整合點（交給專案接）：
//   props.env        來自 weather.js，{ time, weather, date }
//   props.playerId   目前玩家 id（usePlayer）
//   props.stamina    目前靈力（數字，用來顯示/停用按鈕）
//   props.onSense()  按感知時呼叫：父層扣 1 靈力，回傳 true=扣成功 / false=靈力不足
//   props.onDeepDive(fragment)  按〔通靈深入〕時呼叫，開 ExplorationOverlay（不扣靈力）
//
// 用法：
//   <Map env={env} playerId={player.id} stamina={stamina}
//        onSense={() => spendStamina(1)}   // 回傳 boolean
//        onDeepDive={(frag) => openExploration(frag)} />
import { useState } from 'react'
import { fetchImpressions, fetchOwnedFragmentIds } from '../lib/signals'

const GOLD = '#c9b99a'
const INK = '#0c0a08'
const PAPER = '#141210'

export default function Map({ env, playerId, stamina, onSense, onDeepDive }) {
  const [phase, setPhase] = useState('idle') // idle | loading | empty | sensing | selected
  const [impressions, setImpressions] = useState([])
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')

  const lowStamina = typeof stamina === 'number' && stamina < 1

  // 按「感知 / 重新感知」：先扣靈力，扣成功才浮現
  const doSense = async () => {
    setNote('')
    const ok = onSense ? onSense() : true   // 父層扣 1 靈力，回傳是否成功
    if (ok === false) { setNote('靈力不足，無法感知。'); return }
    setPhase('loading'); setSelected(null); setImpressions([])
    if (!env) { setPhase('empty'); return }
    const ownedIds = playerId ? await fetchOwnedFragmentIds(playerId) : []
    const imps = await fetchImpressions(env, { ownedIds })
    if (!imps.length) { setPhase('empty'); return }
    setImpressions(imps); setPhase('sensing')
  }

  const choose = (i) => { setSelected(i); setPhase('selected') }
  const reset = () => { setPhase('idle'); setSelected(null); setImpressions([]); setNote('') }

  return (
    <div style={{
      minHeight: '100%', background: INK, color: GOLD, padding: '24px 20px',
      backgroundImage: `radial-gradient(120% 80% at 50% -10%, ${PAPER} 0%, ${INK} 70%)`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 12, opacity: 0.55, letterSpacing: 2 }}>
        {env ? `此地 · ${labelTime(env.time)} · ${labelWeather(env.weather)}${env.date ? ' · ' + labelDate(env.date) : ''}` : '定位中…'}
      </div>

      {/* 待機：中央感知按鈕 */}
      {phase === 'idle' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button
            onClick={doSense}
            disabled={lowStamina}
            style={{
              width: 150, height: 150, borderRadius: '50%',
              background: `radial-gradient(circle at 50% 40%, ${GOLD}1a, transparent 70%)`,
              border: `1px solid ${GOLD}${lowStamina ? '33' : '88'}`,
              color: GOLD, fontSize: 18, letterSpacing: 6, paddingLeft: 6,
              cursor: lowStamina ? 'not-allowed' : 'pointer',
              opacity: lowStamina ? 0.4 : 1,
              boxShadow: lowStamina ? 'none' : `0 0 40px -8px ${GOLD}55, inset 0 0 30px -10px ${GOLD}44`,
              animation: lowStamina ? 'none' : 'breathe 3.2s ease-in-out infinite',
            }}
          >感知</button>
          <div style={{ fontSize: 12, opacity: 0.5, letterSpacing: 1 }}>
            {lowStamina ? '靈力不足' : '凝神感知此地（−1 靈力）'}
          </div>
          {note && <div style={{ fontSize: 12, color: GOLD, opacity: 0.7 }}>{note}</div>}
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, letterSpacing: 2 }}>墨色正在滲開…</div>
      )}

      {phase === 'empty' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.55, lineHeight: 2.2, textAlign: 'center' }}>
          <div>今晚很安靜。</div>
          <div style={{ fontSize: 13 }}>紙上沒有浮現任何痕跡。</div>
          <button onClick={reset} style={btn}>退出</button>
        </div>
      )}

      {(phase === 'sensing' || phase === 'selected') && (
        <div style={{ marginTop: 24 }}>
          {impressions.map((imp, i) => {
            const isSel = selected === i
            const faded = phase === 'selected' && !isSel
            return (
              <div key={imp.fragment.id}
                onClick={() => phase === 'sensing' && choose(i)}
                style={{
                  margin: '0 0 16px', padding: '16px 18px 16px 22px',
                  borderLeft: `2px solid ${GOLD}${isSel ? 'cc' : '55'}`,
                  background: `linear-gradient(90deg, ${GOLD}0d, transparent 70%)`,
                  cursor: phase === 'sensing' ? 'pointer' : 'default',
                  opacity: faded ? 0.12 : 1, transition: 'opacity 700ms ease',
                  animation: phase === 'sensing' ? `ink 700ms ease ${i * 180}ms both` : 'none',
                }}>
                <p style={{ lineHeight: 1.9, fontSize: 15, margin: 0 }}>{imp.atmosphere}</p>
              </div>
            )
          })}

          {phase === 'sensing' && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, opacity: 0.45 }}>選一道墨痕凝神細看，其餘會散去。</div>
          )}

          {phase === 'selected' && selected != null && (
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button onClick={() => onDeepDive?.(impressions[selected].fragment)} style={{ ...btn, flex: 1, borderColor: GOLD }}>通靈深入</button>
              <button onClick={doSense} disabled={lowStamina} style={{ ...btn, flex: 1, opacity: lowStamina ? 0.4 : 1 }}>重新感知（−1）</button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ink { from { opacity:0; filter:blur(3px) } to { opacity:1; filter:blur(0) } }
        @keyframes breathe { 0%,100% { box-shadow:0 0 40px -8px ${GOLD}55, inset 0 0 30px -10px ${GOLD}44 } 50% { box-shadow:0 0 60px -6px ${GOLD}77, inset 0 0 40px -8px ${GOLD}66 } }
      `}</style>
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
