import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX = 10
const RECOVER_MS = 8 * 60 * 1000

export function calcStamina(stored, updatedAt) {
  if (!updatedAt) return stored
  const elapsed = Date.now() - new Date(updatedAt).getTime()
  return Math.min(MAX, stored + Math.floor(elapsed / RECOVER_MS))
}

export function useStamina(player, setPlayer) {
  const [stamina, setStamina] = useState(0)

  useEffect(() => {
    if (!player) return
    const update = () => setStamina(calcStamina(player.stamina, player.stamina_updated_at))
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [player])

  const consume = useCallback(async (amount = 1) => {
    if (!player) return false
    const cur = calcStamina(player.stamina, player.stamina_updated_at)
    if (cur < amount) return false

    const elapsed = Date.now() - new Date(player.stamina_updated_at).getTime()
    const recovered = Math.floor(elapsed / RECOVER_MS)
    const newStored = Math.min(MAX, player.stamina + recovered) - amount

    const { data } = await supabase
      .from('players')
      .update({ stamina: newStored, stamina_updated_at: new Date().toISOString() })
      .eq('id', player.id)
      .select()
      .single()

    if (data) setPlayer(data)
    return true
  }, [player, setPlayer])

  return { stamina, consume, max: MAX }
}
