import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayer() {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let sub

    async function fetchOrCreate(userId) {
      let { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        const res = await supabase
          .from('players')
          .insert({ id: userId, display_name: '無名靈探', stamina: 10 })
          .select()
          .single()
        data = res.data

        // Starter notebooks
        if (data) {
          await supabase.from('notebooks').insert([
            { player_id: userId, name: '筆記本一', capacity: 15 },
            { player_id: userId, name: '筆記本二', capacity: 15 },
          ])
        }
      }

      setPlayer(data)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchOrCreate(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) fetchOrCreate(session.user.id)
      else { setPlayer(null); setLoading(false) }
    })
    sub = subscription

    return () => sub?.unsubscribe()
  }, [])

  async function updateName(name) {
    const { data } = await supabase
      .from('players')
      .update({ display_name: name })
      .eq('id', player.id)
      .select()
      .single()
    setPlayer(data)
  }

  return { player, loading, setPlayer, updateName }
}
