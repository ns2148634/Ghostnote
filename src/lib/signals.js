// signals.js — 訊號可用性：每日輪替 + 環境條件加權（v3，浮現多個）
// 決定「此刻感知能浮現哪幾個異常印象」。全程不需移動，GPS 只用於環境（time/weather/date）。
//
// 用法（Map.jsx 感知時）：
//   import { fetchImpressions, fetchOwnedFragmentIds } from '../lib/signals'
//   const ownedIds = await fetchOwnedFragmentIds(playerId)
//   const impressions = await fetchImpressions(env, { ownedIds, n: 3 })
//   // impressions: [{ fragment, atmosphere }]，浮現 2-3 個，玩家選一個深入，其餘淡掉
//
// 兩層設計：
//   1. 每日輪替（硬門檻）：當天本地日期當種子，決定今天哪幾隻鬼在線上。一整天固定。
//   2. 環境加權（軟）：玩家當下 time/weather/date 對上碎片條件 → 訊號強；不符 → 很弱但仍可能浮現。
import { supabase } from './supabase'

// ── 可調參數 ──────────────────────────────────────────────
export const DAILY_ROSTER_SIZE = 6   // 每天有幾隻鬼在線上
export const IMPRESSION_COUNT = 3     // 每次感知浮現幾個印象
const COND_FACTOR = {
  neutral: 1,      // 條件為 NULL：常駐
  match: 3,        // 條件吻合：訊號增強
  mismatch: 0.25,  // 條件不吻合：很弱但非零
}
const OWNED_FACTOR = 0.15  // 已持有碎片大幅降權（設 0 則完全排除）
// lore 出現機率壓低，讓它真正稀少；basic-rare 次之
const RARITY_WEIGHT = { common: 1, rare: 0.4, lore: 0.15 }

// ── 本地日期種子 ─────────────────────────────────────────
function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function dateSeed(date = new Date()) {
  const key = localDateKey(date)
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seededShuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 條件 → 倍率 ──────────────────────────────────────────
function condFactor(cond, envValue) {
  if (cond == null) return COND_FACTOR.neutral
  return cond === envValue ? COND_FACTOR.match : COND_FACTOR.mismatch
}
function fragmentWeight(frag, env) {
  // lore → 0.15；basic-rare → 0.4；basic-common → 1
  const rarityW = frag.layer === 'lore'
    ? RARITY_WEIGHT.lore
    : RARITY_WEIGHT[frag.rarity] ?? 1
  return (
    rarityW *
    condFactor(frag.time_condition, env.time) *
    condFactor(frag.weather_condition, env.weather) *
    condFactor(frag.date_condition, env.date)
  )
}

// ── 取此刻可浮現的訊號（加權清單）────────────────────────
// 回傳 [{ fragment, weight }]，weight > 0
export async function getAvailableSignals(env, { date = new Date(), ownedIds = [] } = {}) {
  const { data: stories } = await supabase.from('stories').select('id')
  if (!stories || stories.length === 0) return []

  const rand = seededRandom(dateSeed(date))
  const rosterIds = seededShuffle(stories.map((s) => s.id), rand)
    .slice(0, Math.min(DAILY_ROSTER_SIZE, stories.length))

  const { data: frags } = await supabase
    .from('story_fragments')
    .select('id, story_id, layer, rarity, fragment_label, fragment_text, time_condition, weather_condition, date_condition')
    .in('story_id', rosterIds)
  if (!frags || frags.length === 0) return []

  const owned = new Set(ownedIds)
  return frags
    .map((fragment) => {
      let weight = fragmentWeight(fragment, env)
      if (owned.has(fragment.id)) weight *= OWNED_FACTOR
      return { fragment, weight }
    })
    .filter((s) => s.weight > 0)
}

// ── 加權抽 n 個不重複的碎片（盡量來自不同鬼，讓選擇更有差異）──
export function pickSignals(signals, n = IMPRESSION_COUNT) {
  const pool = [...signals]
  const chosen = []
  const usedStories = new Set()
  while (chosen.length < n && pool.length > 0) {
    let cands = pool.filter((s) => !usedStories.has(s.fragment.story_id))
    if (cands.length === 0) cands = pool // 不同鬼不夠了，才允許同一隻的另一片
    const total = cands.reduce((a, s) => a + s.weight, 0)
    let r = Math.random() * total
    let picked = cands[cands.length - 1]
    for (const s of cands) { r -= s.weight; if (r <= 0) { picked = s; break } }
    chosen.push(picked.fragment)
    usedStories.add(picked.fragment.story_id)
    pool.splice(pool.indexOf(picked), 1)
  }
  return chosen
}

// ── 高階：一次拿好「感知頁要顯示的 2-3 個印象」───────────
// 回傳 [{ fragment, atmosphere }]；atmosphere 是各碎片隨機抽的一句現場感知
export async function fetchImpressions(env, { ownedIds = [], n = IMPRESSION_COUNT, date = new Date() } = {}) {
  const signals = await getAvailableSignals(env, { ownedIds, date })
  const frags = pickSignals(signals, n)
  if (frags.length === 0) return []

  const ids = frags.map((f) => f.id)
  const { data } = await supabase
    .from('fragment_atmosphere')
    .select('story_fragment_id, atmosphere_text')
    .in('story_fragment_id', ids)

  const byFrag = {}
  for (const row of data || []) (byFrag[row.story_fragment_id] ||= []).push(row.atmosphere_text)

  return frags.map((f) => {
    const pool = byFrag[f.id] || []
    const atmosphere = pool.length ? pool[Math.floor(Math.random() * pool.length)] : (f.fragment_text || '')
    return { fragment: f, atmosphere }
  })
}

// ── 玩家已持有碎片 id ─────────────────────────────────────
export async function fetchOwnedFragmentIds(playerId) {
  const { data } = await supabase
    .from('fragments')
    .select('story_fragment_id')
    .eq('player_id', playerId)
  return (data || []).map((r) => r.story_fragment_id)
}
