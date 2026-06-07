import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'

const ITEMS = [
  { id: 'stamina',  label: '靈力藥水',          desc: '立即回復 5 格靈力。',              price: 30,  icon: '◈' },
  { id: 'notebook', label: '追加筆記本',         desc: '新增一本 15 格容量的個人筆記本。', price: 80,  icon: '▣' },
  { id: 'shared3',  label: '聯靈筆記本（小組）', desc: '3 人協作筆記本，消耗品。',         price: 150, icon: '▥' },
  { id: 'shared6',  label: '聯靈筆記本（團隊）', desc: '6 人協作筆記本，消耗品。',         price: 250, icon: '▦' },
]

const LEVELS = [
  [0,  '見習靈探'],
  [5,  '靈探'],
  [15, '資深靈探'],
  [30, '首席靈探'],
  [60, '靈異檔案官'],
]
function getLevel(n) {
  let l = LEVELS[0][1]
  for (const [min, label] of LEVELS) if (n >= min) l = label
  return l
}

export default function ShopPage({ player, setPlayer, stamina, maxStamina, sealedCount = 0 }) {
  const [confirm, setConfirm]           = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [msg, setMsg]                   = useState('')
  const [busy, setBusy]                 = useState(false)

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  async function buyStamina() {
    if (!player) return
    const { data } = await supabase
      .from('players')
      .update({ stamina: Math.min(10, (player.stamina || 0) + 5), stamina_updated_at: new Date().toISOString() })
      .eq('id', player.id).select().single()
    if (data) setPlayer(data)
    flash('靈力回復 5 格。')
  }

  async function buyNotebook() {
    if (!player) return
    await supabase.from('notebooks').insert({ player_id: player.id, name: '新筆記本', capacity: 15 })
    flash('新筆記本已加入。')
  }

  async function handleBuy(item) {
    setConfirm(null)
    if (item.id === 'stamina')  await buyStamina()
    if (item.id === 'notebook') await buyNotebook()
    if (item.id === 'shared3' || item.id === 'shared6') flash('聯靈筆記本功能即將開放。')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleDeleteAccount() {
    if (!player) return
    setBusy(true)
    try {
      await supabase.from('players').delete().eq('id', player.id)
      await supabase.auth.signOut()
    } finally {
      setBusy(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-6 pb-4">
        <p className="font-mono text-dim text-[10px] tracking-[0.3em]">— 調查員協會 —</p>
      </div>

      {msg && (
        <div className="mx-4 mb-3 border border-ok/30 p-3">
          <p className="font-mono text-ok text-xs">{msg}</p>
        </div>
      )}

      {/* 玩家資訊 */}
      <section className="px-4 pb-6">
        <p className="font-mono text-dim text-[10px] tracking-widest mb-3">調查員資訊</p>
        <div className="border border-border p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-muted text-xs">調查員</span>
            <span className="font-mono text-ink text-xs tracking-wide">{player?.display_name || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-muted text-xs">稱號</span>
            <span className="font-mono text-accent text-xs">{getLevel(sealedCount)}</span>
          </div>
          <div className="w-full h-px bg-border" />
          <div className="flex justify-between items-center">
            <span className="font-mono text-muted text-xs">封存筆記</span>
            <span className="font-mono text-ink text-xs">{sealedCount} 本</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-muted text-xs">靈力</span>
            <span className="font-mono text-ink text-xs">{stamina ?? '—'} / {maxStamina ?? 10}</span>
          </div>
        </div>
      </section>

      {/* 補給站 */}
      <section className="px-4 pb-6">
        <p className="font-mono text-dim text-[10px] tracking-widest mb-1">補給站</p>
        <p className="font-mono text-dim/50 text-[10px] mb-3">（示範用途，目前購買免費）</p>
        <div className="flex flex-col gap-3">
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
      </section>

      {/* 帳號管理 */}
      <section className="px-4 pb-10">
        <p className="font-mono text-dim text-[10px] tracking-widest mb-3">帳號管理</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="w-full font-mono text-muted text-xs tracking-widest py-3.5 border border-dim/40
                       hover:border-muted transition-all text-left px-4"
          >
            登出
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full font-mono text-danger/60 text-xs tracking-widest py-3.5 border border-danger/20
                       hover:border-danger/50 hover:text-danger transition-all text-left px-4"
          >
            刪除帳號
          </button>
        </div>
      </section>

      {/* 購買確認 */}
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

      {/* 刪除帳號確認 */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="刪除帳號">
        <p className="font-mono text-ink text-xs mb-2 leading-6">
          確定要刪除帳號嗎？<br />
          所有調查記錄、筆記本及碎片將永久消失。
        </p>
        <p className="font-mono text-danger/70 text-[10px] mb-5">此操作無法復原。</p>
        <div className="flex gap-5">
          <button
            onClick={handleDeleteAccount}
            disabled={busy}
            className="font-mono text-danger text-xs hover:text-ink transition-colors disabled:opacity-40"
          >
            {busy ? '處理中...' : '確認刪除'}
          </button>
          <button onClick={() => setDeleteConfirm(false)}
            className="font-mono text-dim text-xs hover:text-muted transition-colors">
            取消
          </button>
        </div>
      </Modal>
    </div>
  )
}
