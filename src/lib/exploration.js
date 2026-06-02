import { supabase } from './supabase'

const CLARITY_MAX = 5
export const START_CLARITY = { basic: 3, lore: 2 }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

export async function loadInvestigation(fragment) {
  const startClarity = START_CLARITY[fragment.layer] ?? 3

  const { data: scenes } = await supabase
    .from('fragment_scenes')
    .select('*')
    .eq('story_fragment_id', fragment.id)
    .order('layer_index')

  if (!scenes?.length) return { startClarity, layers: [] }

  const sceneIds = scenes.map(s => s.id)
  const { data: allOpts } = await supabase
    .from('scene_options')
    .select('*')
    .in('scene_id', sceneIds)

  const byScene = {}
  for (const o of allOpts || []) (byScene[o.scene_id] ||= []).push(o)

  const indices = [...new Set(scenes.map(s => s.layer_index))].sort((a, b) => a - b)
  const layers = []

  for (const idx of indices) {
    // Pick a scene from this layer that actually has options
    const pool = scenes.filter(s => s.layer_index === idx && (byScene[s.id] || []).length > 0)
    const scene = pick(pool)
    if (!scene) continue
    const opts = byScene[scene.id] || []

    let chosen
    if (scene.is_skippable) {
      chosen = shuffle(opts)
    } else {
      // Guarantee at least 1 delta≥0 and 1 delta<0 among shown options
      const pos = opts.filter(o => o.signal_delta >= 0)
      const neg = opts.filter(o => o.signal_delta < 0)
      const p = pick(pos), n = pick(neg)
      if (!p || !n) {
        chosen = shuffle(opts).slice(0, 3)
      } else {
        const rest = shuffle(opts.filter(o => o.id !== p.id && o.id !== n.id))
        chosen = shuffle([p, n, ...rest.slice(0, 1)])
      }
    }

    layers.push({
      sceneText: scene.atmosphere_text,
      isSkippable: scene.is_skippable,
      options: chosen.map(o => ({
        text: o.text,
        signal_delta: o.signal_delta ?? 0,
        result_text: o.result_text || '',
      })),
    })
  }

  return { startClarity, layers }
}

export function applyChoice({ clarity, layerIndex, totalLayers }, option) {
  const delta = option.signal_delta ?? 0
  const newClarity = Math.max(0, Math.min(CLARITY_MAX, clarity + delta))
  const outcome = newClarity <= 0 ? 'faded'
    : layerIndex >= totalLayers - 1 ? 'fragment'
    : 'continue'
  return { clarity: newClarity, outcome, resultText: option.result_text || '' }
}

export function buildNarrative(walked) {
  return walked.join('\n')
}
