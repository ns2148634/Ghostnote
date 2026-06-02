// exploration.js — 探查邏輯：訊號清晰度模型（v2，含分層結局）
// 取代舊的 is_correct / fail_text 對錯判定。
import { supabase } from './supabase'

// ── 參數（母本定義；playtest 可調，結構不變）──────────────
export const CLARITY_MAX = 5
export const START_CLARITY = { basic: 3, lore: 2 } // 起始格數依碎片 layer
export const HIGH_TIER_MIN = 4 // 結算時 >= 此值 → 'high'（乾淨接通），否則 'low'（差點斷線）

// ── 小工具 ────────────────────────────────────────────────
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const shuffle = (a) =>
  a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1])
const randomPick = (a) => a[Math.floor(Math.random() * a.length)]

// 從選項池抽 3 個：保證至少 1 個活路(delta>=0)、至少 1 個錯步(delta<0)
function drawOptions(pool, isSkippable) {
  // 氛圍層：全部 delta=0，任選都過，顯示其中 3 個就好
  if (isSkippable) return shuffle(pool).slice(0, 3)

  const safe = pool.filter((o) => o.signal_delta >= 0)
  const risky = pool.filter((o) => o.signal_delta < 0)

  // 內容若不符規則（缺活路或缺錯步），退而求其次直接抽 3 個
  if (safe.length === 0 || risky.length === 0) return shuffle(pool).slice(0, 3)

  const chosen = [randomPick(safe), randomPick(risky)]
  const rest = pool.filter((o) => o.id !== chosen[0].id && o.id !== chosen[1].id)
  if (rest.length > 0) chosen.push(randomPick(rest))
  return shuffle(chosen)
}

// ── 載入一次探查的所有層 ──────────────────────────────────
// 回傳 { startClarity, layers: [{ sceneId, sceneText, isSkippable, options, endingHigh, endingLow }] }
// options: [{ id, text, signal_delta, result_text }]
// endingHigh / endingLow 只有最後一層會有值（分層結局），其餘層為 null
export async function loadInvestigation(fragment) {
  const { data: scenes } = await supabase
    .from('fragment_scenes')
    .select('id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low')
    .eq('story_fragment_id', fragment.id)
    .order('layer_index', { ascending: true })

  // 依 layer_index 分組（規則上每層恰好 1 個場景；多個時挑有選項的一個）
  const byLayer = new Map()
  for (const s of scenes || []) {
    if (!byLayer.has(s.layer_index)) byLayer.set(s.layer_index, [])
    byLayer.get(s.layer_index).push(s)
  }

  const layers = []
  for (const layerIndex of [...byLayer.keys()].sort((a, b) => a - b)) {
    const candidates = shuffle(byLayer.get(layerIndex))
    for (const scene of candidates) {
      const { data: pool } = await supabase
        .from('scene_options')
        .select('id, text, signal_delta, result_text')
        .eq('scene_id', scene.id)

      if (pool && pool.length > 0) {
        layers.push({
          sceneId: scene.id,
          sceneText: scene.atmosphere_text,
          isSkippable: scene.is_skippable,
          options: drawOptions(pool, scene.is_skippable),
          endingHigh: scene.ending_high ?? null,
          endingLow: scene.ending_low ?? null,
        })
        break // 這一層搞定，換下一層
      }
    }
  }

  return {
    startClarity: START_CLARITY[fragment.layer] ?? 3,
    layers,
  }
}

// ── 選一個選項，回傳新狀態 ────────────────────────────────
// outcome: 'continue' | 'faded'（存在散去）| 'fragment'（得到碎片）
// tier: 僅 outcome==='fragment' 時有值 → 'high'（乾淨接通）| 'low'（差點斷線）
export function applyChoice({ clarity, layerIndex, totalLayers }, option) {
  const next = clamp(clarity + option.signal_delta, 0, CLARITY_MAX)
  const isLast = layerIndex >= totalLayers - 1

  let outcome
  let tier = null
  if (next <= 0) {
    outcome = 'faded'
  } else if (isLast) {
    outcome = 'fragment'
    tier = next >= HIGH_TIER_MIN ? 'high' : 'low'
  } else {
    outcome = 'continue'
  }

  return { clarity: next, resultText: option.result_text, outcome, tier }
}

// ── 取分層結局文字 ────────────────────────────────────────
// 在 outcome==='fragment' 時呼叫，依 tier 取最後一層的收尾文字。
// 內容缺 ending 欄位時回傳 ''（UI 可省略收尾，不致報錯）。
export function getEnding(lastLayer, tier) {
  if (!lastLayer) return ''
  return (tier === 'high' ? lastLayer.endingHigh : lastLayer.endingLow) || ''
}

// ── 串成玩家的探查敘事（走過的場景 + 選擇後的反應）────────
// walked: [{ sceneText, resultText }]
export function buildNarrative(walked) {
  return walked
    .map((w) => [w.sceneText, w.resultText].filter(Boolean).join(' '))
    .join('\n')
}
