import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotebooks(playerId) {
  const [notebooks, setNotebooks] = useState([])
  const [sealed, setSealed] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!playerId) return
    const { data: active } = await supabase
      .from('notebooks')
      .select('*, fragments(*, sf:story_fragments(*))')
      .eq('player_id', playerId)
      .eq('status', 'active')
      .order('created_at')

    const { data: done } = await supabase
      .from('notebooks')
      .select('*, story:stories(*), fragments(*, sf:story_fragments(*))')
      .eq('player_id', playerId)
      .eq('status', 'sealed')
      .order('sealed_at', { ascending: false })

    setNotebooks(active || [])
    setSealed(done || [])
    setLoading(false)
  }, [playerId])

  useEffect(() => { fetch() }, [fetch])

  const addFragment = useCallback(async (notebookId, storyFragmentId) => {
    const nb = notebooks.find(n => n.id === notebookId)
    if (!nb || (nb.fragments?.length ?? 0) >= nb.capacity) return false

    const { error } = await supabase.from('fragments').insert({
      player_id: playerId,
      story_fragment_id: storyFragmentId,
      notebook_id: notebookId,
    })
    if (!error) await fetch()
    return !error
  }, [notebooks, playerId, fetch])

  const moveFragment = useCallback(async (fragmentId, toNotebookId) => {
    await supabase.from('fragments').update({ notebook_id: toNotebookId }).eq('id', fragmentId)
    await fetch()
  }, [fetch])

  const deleteFragment = useCallback(async (fragmentId) => {
    await supabase.from('fragments').delete().eq('id', fragmentId)
    await fetch()
  }, [fetch])

  const updateTag = useCallback(async (fragmentId, tag) => {
    await supabase.from('fragments').update({ player_tag: tag }).eq('id', fragmentId)
    await fetch()
  }, [fetch])

  const renameNotebook = useCallback(async (notebookId, name) => {
    if (!name) return
    await supabase.from('notebooks').update({ name }).eq('id', notebookId)
    await fetch()
  }, [fetch])

  const seal = useCallback(async (notebookId) => {
    const nb = notebooks.find(n => n.id === notebookId)
    if (!nb || !nb.fragments?.length) return { ok: false, msg: '還有什麼沒被記下來。' }

    const fragIds = nb.fragments.map(f => f.story_fragment_id)

    // Fetch all stories
    const { data: stories } = await supabase.from('stories').select('id')
    if (!stories) return { ok: false, msg: '無法連線。' }

    for (const story of stories) {
      for (const layer of ['basic', 'detail', 'lore']) {
        const { data: req } = await supabase
          .from('story_fragments')
          .select('id')
          .eq('story_id', story.id)
          .eq('layer', layer)
        if (!req || req.length === 0) continue

        const reqIds = req.map(r => r.id)
        const hasAll = reqIds.every(id => fragIds.includes(id))
        if (!hasAll) continue

        // Check no extra fragments from different stories
        const { data: allSF } = await supabase
          .from('story_fragments')
          .select('id, story_id')
          .in('id', fragIds)
        const storySet = new Set((allSF || []).map(f => f.story_id))
        if (storySet.size > 1) break // contaminated

        // Success
        await supabase.from('notebooks').update({
          status: 'sealed', story_id: story.id, sealed_at: new Date().toISOString(),
        }).eq('id', notebookId)

        await supabase.from('creature_pages').upsert({
          player_id: playerId, story_id: story.id, unlocked_layer: layer,
          obtained_at: new Date().toISOString(),
        }, { onConflict: 'player_id,story_id,unlocked_layer' })

        // Bonus notebook
        await supabase.from('notebooks').insert({
          player_id: playerId, name: '新筆記本', capacity: 15,
        })

        await supabase.from('players')
          .update({ sealed_count: (nb.sealed_count ?? 0) + 1 })
          .eq('id', playerId)

        await fetch()
        return { ok: true, storyId: story.id, layer }
      }
    }

    // Failure analysis
    const { data: allSF } = await supabase
      .from('story_fragments').select('id, story_id').in('id', fragIds)
    const storySet = new Set((allSF || []).map(f => f.story_id))

    if (storySet.size > 1) return { ok: false, msg: '這裡裝了不該裝的東西。' }

    const storyId = [...storySet][0]
    if (!storyId) return { ok: false, msg: '還有什麼沒被記下來。' }

    const { count } = await supabase
      .from('story_fragments').select('id', { count: 'exact', head: true })
      .eq('story_id', storyId)

    if (fragIds.length < (count ?? 0)) return { ok: false, msg: '還有什麼沒被記下來。' }
    return { ok: false, msg: '似乎已經完整了，但有什麼不對。' }
  }, [notebooks, playerId, fetch])

  return { notebooks, sealed, loading, refetch: fetch, addFragment, moveFragment, deleteFragment, updateTag, renameNotebook, seal }
}
