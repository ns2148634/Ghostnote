# HANDOFF — Roster 留存修正 + 感知頁氛圍規格 + 全站文字放大

> 設計討論成果，交付 Claude Code 實作。三項變更彼此獨立，可分開套用。
> 所有常數均為易調整的具名常數；下方「決策定稿」為已拍板值。

## 決策定稿（已拍板）
- 近完成判定：以**基礎 5 片 (basic)** 為準，不含 lore。
- `PRIORITY_SLOTS = 2`（6 格中最多 2 格給近完成；維持探索／收尾平衡）。
- `NEAR_COMPLETE_BOOST = 1.0`（先不開；上線後依補完率再評估）。
- `SEALED_FACTOR = 0.15`、`NEAR_COMPLETE_REMAINING = 2` 採預設。
- 字級：base 18px、正文／印象 17–18px、行高 ≥1.8。

---

## 變更一：可見度系統修正（已封存才降權 + 差一兩片進 roster 優先）

### 現況
- 當日 roster：date-seed 輪替，`DAILY_ROSTER_SIZE = 6`，全員同日同盤、無伺服器。
- soft condition weighting：match×3 / neutral×1 / mismatch×0.25（never zero）。
- owned-fragment 降權：任何「已擁有碎片」的生物一律 `OWNED_FACTOR = 0.15`。

問題：玩家差一兩片就快補完某隻鬼時，「擁有碎片」反而讓它變稀有，
留存動機（今天想補完椅仔姑）被自己的稀有度系統卡死。

### 改為
1. **降權只作用在「已封存(sealed)」的生物**，不再對「只是擁有碎片」的生物降權。
   - 進行中（含差一兩片）的生物 = 不降權。
2. **差一兩片（未封存）的生物，保證進入當日 roster**，最多佔用 `PRIORITY_SLOTS` 格。

### 參數
| 常數 | 預設 | 說明 |
|---|---|---|
| `SEALED_FACTOR` | 0.15 (可調) | 取代舊 `OWNED_FACTOR`；僅對已封存生物套用 |
| `NEAR_COMPLETE_REMAINING` | 2 (可調) | 基礎碎片「剩 ≤ 此數且未封存」即視為近完成 |
| `PRIORITY_SLOTS` | 2 (可調) | roster 中保留給近完成生物的最大格數（共 6 格） |
| `NEAR_COMPLETE_BOOST` | 1.0（**已定：先不開**） | 近完成感知加權；上線後依補完率再評估是否調 1.0–1.5 |

> 近完成的判定建議落在**基礎碎片集（5 片 basic）**，不含 lore（3 片）；
> 因為留存鉤子是「封存基礎鬼怪志」，lore 是另一條收集線。**已定：以基礎 5 片為準，不含 lore。**

### Roster 組成演算法（每日，client 端計算）
1. 計算玩家近完成集 `NC = 生物 where (basic_owned ≥ BASIC_TOTAL − NEAR_COMPLETE_REMAINING) 且 未封存`。
2. `NC` 依「剩餘片數遞增」排序（最接近完成者優先）；平手以 date-seed hash 排序（保持決定性）。
3. `priority = NC` 取前 `min(NC.length, PRIORITY_SLOTS)` 個。
4. 其餘 `6 − priority.length` 格，沿用現有 **date-seed 選取**填補；
   排除已在 `priority` 中者（避免重複），並照常套用 condition weighting + `SEALED_FACTOR`。
5. `roster = priority ∪ date-seed 補位`。

### 感知浮現權重（roster 內）
- condition：match×3 / neutral×1 / mismatch×0.25（**不變，never zero**）。
- sealed：×`SEALED_FACTOR`（**僅已封存**；取代舊的全面 owned 降權）。
- owned-but-not-sealed（含近完成）：×1（不罰）。可選再乘 `NEAR_COMPLETE_BOOST`。

### 邊界情況
- 近完成生物數 > `PRIORITY_SLOTS`：依步驟 2 排序取前幾名，其餘等候後續日。
- `PRIORITY_SLOTS = 2 / 6` 的用意：保證 ≥4 格仍由 date-seed 供應，**探索新鬼不被進度綁架**。
- 一旦封存完成，該生物即轉入 `SEALED_FACTOR` 降權、退出 priority 機制。

### 對「同日同盤」性質的影響（重要）
- date-seed 補位部分：仍全員相同。
- priority 部分：**玩家端本地、依各自進度而異**——這是預期行為，非 bug。
- 全程仍 client 計算、無需伺服器。

---

## 變更二：感知頁氛圍規格（套用於既有頁面，未來推廣全站）

核心原則：受限於「只准 fadeIn / pulse / typewriter」，氛圍主要來自**節奏與留白**，不是特效。

### 1. 節奏即氛圍（最大槓桿）
- 感知後，印象行**不可同時 render**；浮現前先留一拍純黑死寂（建議 ~520ms）。
- 抽出共用 `typeLine(el, text, done)`：每字延遲 70–160ms 隨機；12% 機率插入 160–340ms 長停頓。
  - 碎片顯現（fragment manifestation）沿用既定 80–220ms 版本——同一支 util、不同參數即可。
- 多行印象**錯開**出現（上一行打完 + 420–760ms 隨機間隔再起下一行）。

### 2. CRT 會呼吸，不要當靜態濾鏡
- 抽出共用 overlay component（vignette + scanlines），全頁固定底層。
- scanline 透明度給**很慢的 pulse**（~6s 一循環，opacity .18↔.34）。
- 偶發極輕微閃爍即可——**稀少才不安，持續只會煩**。

### 3. 金色為唯一的光 + 暗角
- `#c9b99a` 只打在**當下焦點元素**（如感知鈕、被選中的印象、通靈深入）。
- 其餘文字一律冷灰白 `#c8c0b8`，次要提示更暗 `~#5f5a51`。
- 加 radial 暗角：中央微亮、四周收暗，視野像被收進中心。

### 4. 克制回饋
- 選一行後，其餘印象**慢慢淡去**（opacity → ~.1，transition ~1.4s），略帶失落感，
  表達「機會成本」；**不要**俐落彈出/關閉式的 UI juice、不要 toast 彈跳。
- 動畫仍嚴格限 fadeIn / pulse / typewriter——不得引入 scale / bounce / 粒子。

### 可共用化清單
- `typeLine` util（不規則打字）。
- base overlay（vignette + scanlines，含慢速 pulse）。
- gold-focus token（焦點才上金、其餘冷灰白）。

---

## 變更三：全站文字放大（閱讀舒適）

目標：在版面允許範圍內把文字放大，提升手機閱讀舒適度。

### 建議字級（mobile）
| 用途 | 現況(約) | 建議 |
|---|---|---|
| 敘事 / 碎片正文 | ~14–15px | **17–18px** |
| 印象行 | — | **17–18px** |
| 場景選項 | — | **16–17px** |
| 標題 | — | 20–22px |
| 狀態列 / 次要提示（靈力、hint） | — | 13–14px（維持較小，屬 chrome） |
| 行高（正文 / 印象） | — | **≥ 1.8（建議 1.85–1.9）** |

### 實作方式
- 用**單一 base 變數**（如 `--pn-font-base: 18px;`）+ rem/倍數推導全站字級，日後可全域微調。
- （未來可選）PWA 設定頁提供「字級：小 / 中 / 大」，調整即改 `--pn-font-base`。

### 注意事項
- overlay 為 `fixed inset-0 z-[2000]`、600px max-width、含 safe-area-inset：
  放大後請確認**無裁切、無水平溢出**，必要時行內元素允許換行。
- 既有「每層 ~50–100 字」的指引不變；字放大代表每行字數變少、垂直空間增加，
  確認各頁版面能容納即可。
- 字放大不得破壞「文件 / 墨感」氣質——避免大到像系統 UI。

---

## 檔案落點與套用順序

> 路徑請依專案實際結構對應；以下為推測位置。

1. **變更一**：roster 選取 + 權重邏輯所在處（推測 `signals.js` v3 內的 roster/weighting 區塊）。
   - 新增/改名常數（`SEALED_FACTOR` 等）、加入 priority 組成步驟。
2. **變更二**：抽出 `typeLine` util 與 base overlay component；套回感知頁（及後續遭遇頁）。
3. **變更三**：建立 `--pn-font-base` 與字級 scale；逐頁替換寫死字級。
4. 更新 `CLAUDE.md`：記錄新常數與「同日同盤」性質變動、共用 util/overlay 的存在。

---

## 驗收清單
- [ ] 已封存(sealed)生物套用 `SEALED_FACTOR` 降權；未封存（含進行中）**不**降權。
- [ ] 差 ≤ `NEAR_COMPLETE_REMAINING` 片（未封存）的生物**保證進入**當日 roster。
- [ ] priority 最多佔 `PRIORITY_SLOTS` 格；其餘格仍由 date-seed 補位、無重複。
- [ ] 多個近完成生物時依「最接近完成」排序，平手以 date-seed 決定。
- [ ] condition weighting 維持 never-zero。
- [ ] 封存完成後，該生物退出 priority、轉入降權。
- [ ] `typeLine` 已抽成共用，感知頁印象行為不規則打字 + 行間錯開 + 浮現前留白。
- [ ] scanline/vignette 抽成共用 overlay，scanline 有慢速 pulse。
- [ ] 金色僅出現在焦點元素；其餘冷灰白。
- [ ] 未選印象慢速淡去（~1.4s），無彈跳式回饋。
- [ ] 動畫仍僅限 fadeIn / pulse / typewriter。
- [ ] 正文/印象字級提升至 ~17–18px、行高 ≥1.8。
- [ ] overlay 內放大後無裁切、無水平溢出（已驗 safe-area + 600px）。
