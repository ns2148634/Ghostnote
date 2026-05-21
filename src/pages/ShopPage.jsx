import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'

const ITEMS = [
  { id: 'stamina',  label: '體力藥水',          desc: '立即回復 5 格體力。',              price: 30,  icon: '◈' },
  { id: 'notebook', label: '追加筆記本',         desc: '新增一本 15 格容量的個人筆記本。', price: 80,  icon: '▣' },
  { id: 'shared3',  label: '聯靈筆記本（小組）', desc: '3 人協作筆記本，消耗品。',         price: 150, icon: '▥' },
  { id: 'shared6',  label: '聯靈筆記本（團隊）', desc: '6 人協作筆記本，消耗品。',         price: 250, icon: '▦' },
]

export default function ShopPage({ player, setPlayer }) {
  const [confirm, setConfirm] = useState(null)
  const [msg, setMsg]         = useState('')

  async function buyStamina() {
    if (!player) return
    // Add 5 stamina (cap at 10)
    const { data } = await supabase
      .from('players')
      .update({ stamina: Math.min(10, (player.stamina || 0) + 5), stamina_updated_at: new Date().toISOString() })
      .eq('id', player.id).select().single()
    if (data) setPlayer(data)
    setMsg('體力回復 5 格。')
  }

  async function buyNotebook() {
    if (!player) return
    await supabase.from('notebooks').insert({ player_id: player.id, name: '新筆記本', capacity: 15 })
    setMsg('新筆記本已加入。')
  }

  async function handleBuy(item) {
    setConfirm(null)
    if (item.id === 'stamina')  await buyStamina()
    if (item.id === 'notebook') await buyNotebook()
    if (item.id === 'shared3' || item.id === 'shared6') setMsg('聯靈筆記本功能即將開放。')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-6 pb-2">
        <p className="font-mono text-dim text-[10px] tracking-widest">— 商城 —</p>
        <p className="font-mono text-dim text-[10px] mt-1">（示範用途，目前購買免費）</p>
      </div>

      {msg && (
        <div className="mx-4 mt-3 border border-ok/30 p-3">
          <p className="font-mono text-ok text-xs">{msg}</p>
        </div>
      )}

      <div className="px-4 py-4 flex flex-col gap-3">
        {ITEMS.map(item => (
          <div key={item.id} className="border border-border p-4 flex justify-between items-center">
            <div className="flex gap-3 items-start">
              <span className="font-mono text-accent text-sm mt-0.5">{item.icon}</span>
              <div>
                <p className="font-mono text-ink text-xs">{item.label}</p>
                <p className="font-mono text-muted text-[10px] mt-1 leading-4">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setConfirm(item)}
              className="shrink-0 ml-4 font-mono text-dim text-[10px] border border-dim/40 px-3 py-1.5
                         hover:border-muted hover:text-muted transition-all"
            >
              {item.price} 幣
            </button>
          </div>
        ))}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="確認購買">
        {confirm && (
          <>
            <p className="font-mono text-ink text-xs mb-2">{confirm.label}</p>
            <p className="font-mono text-muted text-xs mb-5">{confirm.price} 遊戲幣</p>
            <div className="flex gap-5">
              <button onClick={() => handleBuy(confirm)}
                className="font-mono text-accent text-xs hover:text-ink transition-colors">
                確認
              </button>
              <button onClick={() => setConfirm(null)}
                className="font-mono text-dim text-xs hover:text-muted transition-colors">
                取消
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
