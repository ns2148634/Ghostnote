// Map.jsx — 感知主頁（v4，priority roster + 不規則打字氛圍 + CRT overlay）
// 進頁面不自動感知、不扣靈力。玩家按中央的「感知」按鈕才扣 1 靈力、浮現 2-3 道墨痕印象。
// 選一道深入、其餘慢慢淡去（1.4s）；通靈深入免費。
import { useState, useEffect, useRef } from 'react'
import { fetchImpressions, fetchOwnedFragmentIds, fetchSealedStoryIds } from '../lib/signals'
import { typeLineCallback } from '../lib/typeLine'
import CRTOverlay from '../components/ui/CRTOverlay'

const GOLD     = '#c9b99a'   // 焦點元素（感知鈕、選中印象、通靈深入）
const COLD     = '#c8c0b8'   // 非焦點文字
const COLD_DIM = '#5f5a51'   // 次要提示（狀態列、hint）
const INK      = '#0c0a08'
const PAPER    = '#141210'

export default function Map({ env, playerId, stamina, onSense, onDeepDive }) {
  const [phase, setPhase]                   = useState('idle')
  const [impressions, setImpressions]       = useState([])
  const [displayedTexts, setDisplayedTexts] = useState([])
  const [selected, setSelected]             = useState(null)
  const [note, setNote]                     = useState('')
  const [revealReady, setRevealReady]       = useState(false)
  const sensingSession = useRef(0)          // 遞增以中止舊的打字序列

  const lowStamina = typeof stamina === 'number' && stamina < 1

  // 感知觸發後等 520ms 再開始打字（純黑死寂）
  useEffect(() => {
    if (phase === 'sensing') {
      setRevealReady(false)
      const t = setTimeout(() => setRevealReady(true), 520)
      return () => clearTimeout(t)
    }
    setRevealReady(false)
  }, [phase])

  // revealReady 後啟動交錯打字序列
  useEffect(() => {
    if (!revealReady || phase !== 'sensing' || !impressions.length) return
    const sid = ++sensingSession.current
    setDisplayedTexts(impressions.map(() => ''))

    function typeSeq(i) {
      if (sensingSession.current !== sid || i >= impressions.length) return
      typeLineCallback(
        impressions[i].atmosphere,
        (slice) => {
          if (sensingSession.current !== sid) return
          setDisplayedTexts((prev) => { const a = [...prev]; a[i] = slice; return a })
        },
        () => {
          if (sensingSession.current !== sid) return
          if (i + 1 < impressions.length) {
            const gap = 420 + Math.random() * 340   // 420–760ms 行間停頓
            setTimeout(() => typeSeq(i + 1), gap)
          }
        }
      )
    }
    typeSeq(0)
  }, [revealReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const doSense = async () => {
    sensingSession.current++   // 中止任何進行中的打字序列
    setNote('')
    const ok = onSense ? onSense() : true
    if (ok === false) { setNote('靈力不足，無法感知。'); return }
    setPhase('loading'); setSelected(null); setImpressions([]); setDisplayedTexts([])
    if (!env) { setPhase('empty'); return }
    const ownedIds       = playerId ? await fetchOwnedFragmentIds(playerId) : []
    const sealedStoryIds = playerId ? await fetchSealedStoryIds(playerId)   : []
    const imps = await fetchImpressions(env, { ownedIds, sealedStoryIds })
    if (!imps.length) { setPhase('empty'); return }
    setImpressions(imps)
    setPhase('sensing')
  }

  const choose = (i) => { setSelected(i); setPhase('selected') }
  const reset  = () => {
    sensingSession.current++
    setPhase('idle'); setSelected(null); setImpressions([]); setDisplayedTexts([]); setNote('')
  }

  return (
    <div style={{
      minHeight: '100%', background: INK, color: COLD, padding: '24px 20px',
      backgroundImage: `radial-gradient(120% 80% at 50% -10%, ${PAPER} 0%, ${INK} 70%)`,
      display: 'flex', flexDirection: 'column',
    }}>
      <CRTOverlay />

      {/* 環境狀態列 */}
      <div style={{ fontSize: 13, color: COLD_DIM, letterSpacing: 2 }}>
        {env
          ? `此地 · ${labelTime(env.time)} · ${labelWeather(env.weather)}${env.date ? ' · ' + labelDate(env.date) : ''}`
          : '定位中…'}
      </div>

      {/* ── 待機：中央感知按鈕 ── */}
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
          <div style={{ fontSize: 13, color: COLD_DIM, letterSpacing: 1 }}>
            {lowStamina ? '靈力不足' : '凝神感知此地（−1 靈力）'}
          </div>
          {note && <div style={{ fontSize: 13, color: GOLD, opacity: 0.7 }}>{note}</div>}
        </div>
      )}

      {/* ── 載入中 / 520ms 死寂 ── */}
      {(phase === 'loading' || (phase === 'sensing' && !revealReady)) && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLD_DIM, letterSpacing: 2, fontSize: 13 }}>
          墨色正在滲開…
        </div>
      )}

      {/* ── 空頁 ── */}
      {phase === 'empty' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLD_DIM, lineHeight: 2.2, textAlign: 'center' }}>
          <div style={{ fontSize: 17 }}>今晚很安靜。</div>
          <div style={{ fontSize: 13 }}>紙上沒有浮現任何痕跡。</div>
          <button onClick={reset} style={btn}>退出</button>
        </div>
      )}

      {/* ── 感知中 / 已選 ── */}
      {((phase === 'sensing' && revealReady) || phase === 'selected') && (
        <div style={{ marginTop: 24 }}>
          {impressions.map((imp, i) => {
            const isSel = selected === i
            const faded = phase === 'selected' && !isSel
            return (
              <div
                key={imp.fragment.id}
                onClick={() => phase === 'sensing' && choose(i)}
                style={{
                  margin: '0 0 20px', padding: '16px 18px 16px 22px',
                  borderLeft: `2px solid ${isSel ? GOLD + 'cc' : COLD + '33'}`,
                  background: `linear-gradient(90deg, ${isSel ? GOLD : COLD}08, transparent 70%)`,
                  cursor: phase === 'sensing' ? 'pointer' : 'default',
                  opacity: faded ? 0.1 : 1,
                  transition: 'opacity 1400ms ease, border-color 400ms ease',
                }}
              >
                <p style={{
                  lineHeight: 1.9, fontSize: 17, margin: 0,
                  color: isSel ? GOLD : COLD,
                  transition: 'color 400ms ease',
                }}>
                  {displayedTexts[i] || ''}
                </p>
              </div>
            )
          })}

          {phase === 'sensing' && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: COLD_DIM }}>
              選一道墨痕凝神細看，其餘會散去。
            </div>
          )}

          {phase === 'selected' && selected != null && (
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button
                onClick={() => onDeepDive?.(impressions[selected].fragment)}
                style={{ ...btn, flex: 1, borderColor: GOLD + '99', color: GOLD }}
              >
                通靈深入
              </button>
              <button
                onClick={doSense}
                disabled={lowStamina}
                style={{ ...btn, flex: 1, opacity: lowStamina ? 0.4 : 1 }}
              >
                重新感知（−1）
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes breathe {
          0%,100% { box-shadow:0 0 40px -8px ${GOLD}55, inset 0 0 30px -10px ${GOLD}44 }
          50%     { box-shadow:0 0 60px -6px ${GOLD}77, inset 0 0 40px -8px ${GOLD}66 }
        }
      `}</style>
    </div>
  )
}

const btn = {
  background: 'transparent', color: COLD, border: `1px solid ${COLD}44`,
  padding: '12px 18px', fontSize: 13, letterSpacing: 1, borderRadius: 4,
  cursor: 'pointer', marginTop: 12,
}

const labelTime    = (t) => ({ dawn: '清晨', day: '白日', dusk: '黃昏', night: '深夜' }[t] || '—')
const labelWeather = (w) => ({ clear: '晴', cloudy: '陰', rain: '雨', fog: '霧' }[w] || '—')
const labelDate    = (d) => ({ ghost_month: '鬼月', qingming: '清明', dongzhi: '冬至' }[d] || '')
