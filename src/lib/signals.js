// signals.js — 訊號可見度：每日輪替 + 環境條件加權（v4）
// roster = priority（近完成 ≤ PRIORITY_SLOTS 格）∪ date-seed 補位；已封存才降權。
// priority 部分依玩家各自進度而異（per-player）；date-seed 補位全員同日相同（same-day-same-board）。
import { supabase } from './supabase'

// ── 可調參數 ─────────────────────────────────────────────
export const DAILY_ROSTER_SIZE = 6
export const IMPRESSION_COUNT = 3
const COND_FACTOR = { neutral: 1, match: 3, mismatch: 0.25 }
const SEALED_FACTOR = 0.15       // 已封存生物降權（取代舊 OWNED_FACTOR；僅對已封存故事套用）
const RARITY_WEIGHT = { common: 1, rare: 0.4, lore: 0.15 }

// ── Priority roster 參數 ─────────────────────────────────
const PRIORITY_SLOTS = 2           // roster 最多幾格給近完成生物
const NEAR_COMPLETE_REMAINING = 2  // 剩 ≤ 此數張基礎碎片（未封存）= 近完成
const NEAR_COMPLETE_BOOST = 1.0    // 近完成感知加權（1.0 = 先不開；上線後依補完率再評估）

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

// 近完成平手 tiebreaker：per-story per-day 確定性雜湊
function storyDateHash(storyId, dateKey) {
  const key = `${dateKey}-${storyId}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

// ── 條件 → 倍率 ──────────────────────────────────────────
function condFactor(cond, envValue) {
  if (cond == null) return COND_FACTOR.neutral
  return cond === envValue ? COND_FACTOR.match : COND_FACTOR.mismatch
}
function fragmentWeight(frag, env) {
  const rarityW = frag.layer === 'lore' ? RARITY_WEIGHT.lore : (RARITY_WEIGHT[frag.rarity] ?? 1)
  return (
    rarityW *
    condFactor(frag.time_condition, env.time) *
    condFactor(frag.weather_condition, env.weather) *
    condFactor(frag.date_condition, env.date)
  )
}

// ── 取此刻可浮現的訊號（加權清單）────────────────────────
// sealedStoryIds：玩家已封存的故事 id（各玩家不同，影響 priority 組成與降權）
export async function getAvailableSignals(env, { date = new Date(), ownedIds = [], sealedStoryIds = [] } = {}) {
  const { data: stories } = await supabase.from('stories').select('id')
  if (!stories || stories.length === 0) return []

  const sealed = new Set(sealedStoryIds)
  const ownedSet = new Set(ownedIds)
  const dateKey = localDateKey(date)

  // 取所有基礎碎片（計算近完成用；含所有故事，不只 roster）
  const { data: basicFrags } = await supabase
    .from('story_fragments')
    .select('id, story_id')
    .eq('layer', 'basic')

  const basicByStory = {}
  for (const f of basicFrags || []) {
    if (!basicByStory[f.story_id]) basicByStory[f.story_id] = []
    basicByStory[f.story_id].push(f.id)
  }

  // ── 近完成集 NC ──────────────────────────────────────────
  // 未封存、已開始收集（ownedBasic > 0）、剩餘基礎碎片 ≤ NEAR_COMPLETE_REMAINING
  const nc = []
  for (const story of stories) {
    if (sealed.has(story.id)) continue
    const storyBasicIds = basicByStory[story.id] || []
    const totalBasic = storyBasicIds.length
    if (totalBasic === 0) continue
    const ownedBasic = storyBasicIds.filter((id) => ownedSet.has(id)).length
    if (ownedBasic === 0) continue
    const remaining = totalBasic - ownedBasic
    if (remaining <= NEAR_COMPLETE_REMAINING) {
      nc.push({ id: story.id, remaining })
    }
  }

  // 依剩餘遞增排序；平手以 date-seed hash 決定（確定性）
  nc.sort((a, b) =>
    a.remaining !== b.remaining
      ? a.remaining - b.remaining
      : storyDateHash(a.id, dateKey) - storyDateHash(b.id, dateKey)
  )

  const priorityIds = nc.slice(0, Math.min(nc.length, PRIORITY_SLOTS)).map((s) => s.id)
  const prioritySet = new Set(priorityIds)

  // ── Date-seed 補位（排除 priority；全員同日相同）────────
  const rand = seededRandom(dateSeed(date))
  const nonPriority = stories.filter((s) => !prioritySet.has(s.id)).map((s) => s.id)
  const fillCount = DAILY_ROSTER_SIZE - priorityIds.length
  const fillIds = seededShuffle(nonPriority, rand).slice(0, Math.min(fillCount, nonPriority.length))

  const rosterIds = [...priorityIds, ...fillIds]

  // ── 取 roster 碎片，計算加權 ──────────────────────────────
  const { data: frags } = await supabase
    .from('story_fragments')
    .select('id, story_id, layer, rarity, fragment_label, fragment_text, time_condition, weather_condition, date_condition')
    .in('story_id', rosterIds)
  if (!frags || frags.length === 0) return []

  return frags.map((fragment) => {
    let weight = fragmentWeight(fragment, env)
    if (sealed.has(fragment.story_id)) weight *= SEALED_FACTOR
    if (prioritySet.has(fragment.story_id)) weight *= NEAR_COMPLETE_BOOST
    return { fragment, weight }
  }).filter((s) => s.weight > 0)
}

// ── 加權抽 n 個不重複碎片（盡量來自不同鬼）─────────────
export function pickSignals(signals, n = IMPRESSION_COUNT) {
  const pool = [...signals]
  const chosen = []
  const usedStories = new Set()
  while (chosen.length < n && pool.length > 0) {
    let cands = pool.filter((s) => !usedStories.has(s.fragment.story_id))
    if (cands.length === 0) cands = pool
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

// ── 高階：感知頁 2-3 個印象 ─────────────────────────────
export async function fetchImpressions(env, { ownedIds = [], sealedStoryIds = [], n = IMPRESSION_COUNT, date = new Date() } = {}) {
  const signals = await getAvailableSignals(env, { ownedIds, sealedStoryIds, date })
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

// ── 玩家已封存故事 id ─────────────────────────────────────
export async function fetchSealedStoryIds(playerId) {
  const { data } = await supabase
    .from('notebooks')
    .select('story_id')
    .eq('player_id', playerId)
    .eq('status', 'sealed')
  return (data || []).map((r) => r.story_id).filter(Boolean)
}
