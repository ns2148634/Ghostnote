// typeLine.js — 不規則打字效果（感知頁 / 通靈頁共用）
//
// typeLine(el, text, done, opts)              — DOM 版，直接寫入 element.textContent
// typeLineCallback(text, onChar, done, opts)  — 回調版，適合 React state 更新
//
// 預設參數（感知頁印象行）：70–160ms/字，12% 機率插入 160–340ms 長停頓
// 碎片顯現版（fragment manifestation）：opts = { minMs:80, maxMs:220 }

function runTypeLine(setter, clearFn, text, done, opts) {
  const {
    minMs = 70,
    maxMs = 160,
    longPauseChance = 0.12,
    longPauseMin = 160,
    longPauseMax = 340,
  } = opts || {}
  let i = 0
  clearFn()
  function step() {
    if (i >= text.length) { done?.(); return }
    i++
    setter(text.slice(0, i))
    const long = Math.random() < longPauseChance
    const delay = long
      ? longPauseMin + Math.random() * (longPauseMax - longPauseMin)
      : minMs + Math.random() * (maxMs - minMs)
    setTimeout(step, delay)
  }
  step()
}

export function typeLine(el, text, done, opts) {
  runTypeLine(
    (s) => { el.textContent = s },
    ()  => { el.textContent = '' },
    text, done, opts
  )
}

export function typeLineCallback(text, onChar, done, opts) {
  runTypeLine(
    onChar,
    () => onChar(''),
    text, done, opts
  )
}
