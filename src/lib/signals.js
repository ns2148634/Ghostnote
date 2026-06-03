import { supabase } from './supabase'

// ── 參數 ────────────────────────────────────────────
export const DAILY_ROSTER_SIZE = 6        // 每天固定幾隻鬼在線
export const COND_FACTOR = { match: 3, neutral: 1, mismatch: 0.25 }
export const OWNED_FACTOR = 0.15          // 已持有碎片降低出現權重

// ── 工具 ────────────────────────────────────────────

// Deterministic position on frequency band (5–93%), based on fragment id
export function fragPos(id) {
  const num = parseInt(id.replace(/-/g, '').slice(0, 8), 16)
  return 5 + (num % 88)
}

// Seeded pseudo-random [0,1) from a string seed + index
function seededRand(seed, index) {
  let h = 0
  const s = `${seed}:${index}`
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return (h >>> 0) / 0xFFFFFFFF
}

// Today's date key used as roster seed (YYYY-M-D)
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Pick daily roster: deterministic subset of allIds, stable for the day
function getDailyRoster(allIds) {
  const key = todayKey()
  const scored = allIds.map((id, i) => ({ id, score: seededRand(key, i) }))
  scored.sort((a, b) => b.score - a.score)
  return new Set(scored.slice(0, DAILY_ROSTER_SIZE).map(s => s.id))
}

// Condition weight: null condition → neutral, match → high, mismatch → low
function condWeight(frag, env) {
  const factor = (cond, envVal) =>
    cond == null         ? COND_FACTOR.neutral
    : cond === envVal    ? COND_FACTOR.match
    : COND_FACTOR.mismatch

  return (
    factor(frag.time_condition,    env.time)         *
    factor(frag.weather_condition, env.weather)      *
    factor(frag.date_condition,    env.date ?? null)
  )
}

// ── 公開函式 ────────────────────────────────────────

// Get IDs of fragments the player already possesses (any copy counts)
export async function fetchOwnedFragmentIds(playerId) {
  if (!playerId) return new Set()
  const { data } = await supabase
    .from('fragments')
    .select('story_fragment_id')
    .eq('player_id', playerId)
  return new Set((data || []).map(r => r.story_fragment_id))
}

// Load available signals for the current environment.
// Stable for the same (date, env) — call once on mount or after 重新感知.
// Returns [{ id, fragment, position, weight, atmospheres }], sorted by weight desc.
export async function getAvailableSignals(env, { playerId, ownedIds } = {}) {
  // 1. All fragment IDs that have at least one scene
  const { data: sceneRows } = await supabase
    .from('fragment_scenes').select('story_fragment_id').gte('layer_index', 1)
  const allIds = [...new Set((sceneRows || []).map(r => r.story_fragment_id))]
  if (!allIds.length) return []

  // 2. Hard filter: today's daily roster
  const roster = getDailyRoster(allIds)
  const rosterIds = allIds.filter(id => roster.has(id))
  if (!rosterIds.length) return []

  // 3. Load fragment metadata
  const { data: frags } = await supabase
    .from('story_fragments')
    .select('id, layer, rarity, fragment_label, fragment_text, time_condition, weather_condition, date_condition')
    .in('id', rosterIds)

  // 4. Atmospheres in one batch
  const { data: atms } = await supabase
    .from('fragment_atmosphere').select('*').in('story_fragment_id', rosterIds)
  const atmByFrag = {}
  for (const a of atms || []) (atmByFrag[a.story_fragment_id] ||= []).push(a)

  // 5. Compute weights; drop zero-weight
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || [])
  const signals = []
  for (const frag of frags || []) {
    let w = condWeight(frag, env)
    if (owned.has(frag.id)) w *= OWNED_FACTOR
    if (w <= 0) continue
    signals.push({
      id: frag.id,
      fragment: frag,
      position: fragPos(frag.id),
      weight: w,
      atmospheres: atmByFrag[frag.id] || [],
    })
  }

  return signals.sort((a, b) => b.weight - a.weight)
}

// Weighted-random pick of one signal from the list.
// Returns the fragment object, or null if list is empty.
export function pickSignal(signals) {
  if (!signals || signals.length === 0) return null
  const total = signals.reduce((s, sig) => s + sig.weight, 0)
  if (total <= 0) return signals[0].fragment
  let r = Math.random() * total
  for (const sig of signals) {
    r -= sig.weight
    if (r <= 0) return sig.fragment
  }
  return signals[signals.length - 1].fragment
}
