// exploration.js — 探查邏輯：訊號清晰度模型（Phase 1：取得閘 + 1+2 選項結構）
import { supabase } from './supabase'

// ── 參數 ───────────────────────────────────────────────────
export const CLARITY_MAX   = 5
export const START_CLARITY = { basic: 3, lore: 2 }
export const HIGH_TIER_MIN = 4   // clarity ≥ 4 → tier 'high'，否則 'low'
export const BASIC_GET_MIN = 2   // basic 最後一層 clarity ≥ 2 才拿到；= 1 → missed
export const LORE_GET_MIN  = 2   // 無 archetype lore 的退化門檻

// ── 小工具 ────────────────────────────────────────────────
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const shuffle = (a) =>
  a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1])
const randomPick = (a) => a[Math.floor(Math.random() * a.length)]

// 每層抽 3 個選項：1 個活路(delta≥0) + 2 個壞路(delta<0)
// plusOneUsed: 本場已用過 delta=+1 → 活路池限縮為 delta=0（回血每場最多一次）
function drawOptions(pool, isSkippable, plusOneUsed = false) {
  if (isSkippable) return shuffle(pool).slice(0, 3)

  const safe  = pool.filter((o) => plusOneUsed ? o.signal_delta === 0 : o.signal_delta >= 0)
  const risky = pool.filter((o) => o.signal_delta < 0)

  if (safe.length === 0 || risky.length === 0) return shuffle(pool).slice(0, 3)

  const safeOne = randomPick(safe)
  const r1      = randomPick(risky)
  const r2Pool  = risky.filter((o) => o.id !== r1.id)
  const r2      = r2Pool.length > 0 ? randomPick(r2Pool) : r1

  return shuffle([safeOne, r1, r2])
}

// ── 載入一次探查的所有層 ──────────────────────────────────
// 回傳 { startClarity, layers: [{ sceneId, sceneText, isSkippable, options, endingHigh, endingLow }] }
export async function loadInvestigation(fragment) {
  const { data: scenes } = await supabase
    .from('fragment_scenes')
    .select('id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low')
    .eq('story_fragment_id', fragment.id)
    .order('layer_index', { ascending: true })

  const byLayer = new Map()
  for (const s of scenes || []) {
    if (!byLayer.has(s.layer_index)) byLayer.set(s.layer_index, [])
    byLayer.get(s.layer_index).push(s)
  }

  let plusOneUsed = false
  const layers = []
  for (const layerIndex of [...byLayer.keys()].sort((a, b) => a - b)) {
    const candidates = shuffle(byLayer.get(layerIndex))
    for (const scene of candidates) {
      const { data: pool } = await supabase
        .from('scene_options')
        .select('id, text, signal_delta, result_text')
        .eq('scene_id', scene.id)

      if (pool && pool.length > 0) {
        const drawn = drawOptions(pool, scene.is_skippable, plusOneUsed)
        if (drawn.some((o) => o.signal_delta === 1)) plusOneUsed = true
        layers.push({
          sceneId:     scene.id,
          sceneText:   scene.atmosphere_text,
          isSkippable: scene.is_skippable,
          options:     drawn,
          endingHigh:  scene.ending_high  ?? null,
          endingLow:   scene.ending_low   ?? null,
        })
        break
      }
    }
  }

  return { startClarity: START_CLARITY[fragment.layer] ?? 3, layers }
}

// ── 選一個選項，回傳新狀態 ────────────────────────────────
// outcome: 'continue' | 'faded'（散去）| 'missed'（沒留下）| 'fragment'（拿到）
// tier: 僅 outcome==='fragment' 時有值 → 'high' | 'low'
export function applyChoice(
  { clarity, layerIndex, totalLayers, fragmentLayer = 'basic' },
  option
) {
  const next   = clamp(clarity + option.signal_delta, 0, CLARITY_MAX)
  const isLast = layerIndex >= totalLayers - 1

  let outcome
  let tier = null

  if (next <= 0) {
    outcome = 'faded'
  } else if (!isLast) {
    outcome = 'continue'
  } else {
    // 最後一層，clarity > 0
    const getMin = fragmentLayer === 'lore' ? LORE_GET_MIN : BASIC_GET_MIN
    if (next >= getMin) {
      outcome = 'fragment'
      tier    = next >= HIGH_TIER_MIN ? 'high' : 'low'
    } else {
      outcome = 'missed'
    }
  }

  return { clarity: next, resultText: option.result_text, outcome, tier }
}

// ── 取分層結局文字 ────────────────────────────────────────
export function getEnding(lastLayer, tier) {
  if (!lastLayer) return ''
  return (tier === 'high' ? lastLayer.endingHigh : lastLayer.endingLow) || ''
}

// ── 串成玩家的探查敘事 ────────────────────────────────────
export function buildNarrative(walked) {
  return walked
    .map((w) => [w.sceneText, w.resultText].filter(Boolean).join(' '))
    .join('\n')
}
