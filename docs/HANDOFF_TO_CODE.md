# 交給 Code 的總說明 — 探查改版（訊號清晰度 + 筆記感知頁）

把「對錯探查 + 雷達掃描」改成「訊號清晰度探查 + 筆記感知頁」。
本說明列出：每個檔放哪、用什麼順序套用、要實作哪些事、驗收重點。**先讀本檔，再依序動作。**

---

## 一、這次改了什麼（一句話版）

- 探查從「選對/選錯」改成「**訊號格 0–5**」：選擇增減訊號格，撐到最後一層 ≥1 拿碎片，歸 0 散去。沒有正確答案。
- 感知入口從「雷達掃描 + 定位點」改成「**筆記感知頁**」：感知 → 紙上浮現 2–3 道墨痕印象 → 選一道深入、其餘淡掉。沒有錯覺，不可能失敗。
- GPS **只用於環境**（時辰/天氣/節日），不做地圖、不要玩家移動。
- 加「**每日輪替 + 條件加權**」決定此刻浮現誰；加「**分層結局**」依剩餘格數換收尾文字。
- 體力改名「**靈力**」；一次探查只在〔通靈深入〕扣 1 格。

---

## 二、檔案歸宿

| 檔案 | 放哪 | 性質 | 動作 |
|------|------|------|------|
| `Map.jsx` | `src/pages/Map.jsx` | 程式：筆記感知頁 | **覆蓋**舊版 |
| `exploration.js` | `src/lib/` | 程式：探查邏輯 | 新增/覆蓋 |
| `signals.js` | `src/lib/` | 程式：訊號可用性（輪替+加權+浮現多個） | 新增/覆蓋 |
| `005_signal_clarity.sql` | `supabase/migrations/` | DB 遷移 | 跑一次 |
| `006_tiered_ending.sql` | `supabase/migrations/` | DB 遷移 | 跑一次 |
| `example_night_shift.sql` | `supabase/migrations/` 或 `seeds/` | 範例內容 | 選跑 |
| `CLAUDE.md` | 專案根目錄 | 文件 | 覆蓋 |
| `content-generation-prompt.md` | `docs/` | 文件（生成內容用） | 新增/覆蓋 |
| `creature-generation-rules.md` | `docs/` | 文件（生成內容用） | 新增/覆蓋 |

分辨：`.jsx`/`.js` → `src/`；`.sql` → `migrations`；`.md` → 文件（不進遊戲執行）。

---

## 三、套用順序（照做，不要跳號）

### 1. 跑 DB 遷移（Supabase SQL Editor）
1. `005_signal_clarity.sql`：`scene_options` 把 `is_correct`/`fail_text` 換成 `signal_delta`/`result_text`，轉換現有資料。
2. `006_tiered_ending.sql`：`fragment_scenes` 加 `ending_high`/`ending_low`。
> ⚠️ 005 一定要在 006 之前；兩支都建立在現行 schema（layer/rarity/fragment_label）上。

### 2. 跑完補內容（資料，非結構）
- 005 把原本「正確/skippable」選項的 `result_text` 設成空字串——**補寫**這些 result_text。
- 006 後，為現有鬼怪**每片碎片最後一層**補 `ending_high` / `ending_low`（不補也能跑，`getEnding` 回空字串）。

### 3. 放程式檔
- `exploration.js`、`signals.js` 放 `src/lib/`。
- `Map.jsx` 覆蓋 `src/pages/Map.jsx`。

### 4. 接邏輯到 UI（主要工作）

**Map.jsx（筆記感知頁）** — props 驅動，父層（放 Map 的路由/App）要：
- 傳 `env`：用 `src/lib/weather.js` 算 `{ time, weather, date }`（date 可 null）。
- 傳 `playerId`：用 `usePlayer`。
- 接 `onDeepDive(fragment)`：按〔通靈深入〕時，用此 fragment 開 `ExplorationOverlay` 並扣 1 靈力。
- 用法：`<Map env={env} playerId={player.id} onDeepDive={(frag) => openExploration(frag)} />`
- Map.jsx 會 import `signals.js` 的 `fetchImpressions` / `fetchOwnedFragmentIds`（務必先放好 signals.js）。
- 行為：感知 → 浮現 2–3 道墨痕印象（各一句 atmosphere）→ 點一道、其餘淡掉 → 〔通靈深入〕/〔重新感知〕。視覺用 inline style，不依賴 Tailwind。
- 字典 `labelTime/Weather/Date` 在檔尾，對專案語系調整。

**ExplorationOverlay** — 改用 `loadInvestigation` / `applyChoice` / `getEnding` / `buildNarrative`（見 exploration.js 檔頭）。移除舊的 `is_correct` / `fail_text` / 25% 誤判。
- 新增訊號格 UI（0–5，隨 delta 增減動畫）。
- `outcome==='faded'` → 存在散去畫面；`outcome==='fragment'` → `getEnding(lastLayer, tier)` 收尾 → FragmentReveal → NotebookSelectModal，存 `buildNarrative(walked)`。

**探查文字** — 每步只顯示 result_text（純現場反應），訊號格變化只走視覺，**不要顯示「訊號 +1 / 減弱」之類的文字說明**（會打斷閱讀）。

**體力 → 靈力** — 全專案文案 + StaminaBar 改名。DB 欄位 `stamina` / `stamina_updated_at` **暫留**，只改 UI 文字。消耗點只剩〔通靈深入〕−1。

### 5. 參數（程式內，playtest 可調）
- `exploration.js`：`CLARITY_MAX=5`、`START_CLARITY={basic:3, lore:2}`、`HIGH_TIER_MIN=4`
- `signals.js`：`DAILY_ROSTER_SIZE=6`、`IMPRESSION_COUNT=3`、`COND_FACTOR{match:3, neutral:1, mismatch:0.25}`、`OWNED_FACTOR=0.15`

---

## 四、模型規則速查

**訊號格**：0–5 clamp。起始 basic 3 / lore 2。層數 = layer_index 數（normal 3 / rare 4 / legendary 5）。
**選項**：每個帶 `signal_delta`（+1/0/−1/−2）+ `result_text`。判斷層顯示 3 個，保證 ≥1 個 ≥0、1 個 <0。is_skippable 層全 0。
**結算**：歸 0 → `faded`；最後一層 ≥1 → `fragment`（回 `tier`：≥4 'high' / 否則 'low'）。faded 優先。
**分層結局**：`fragment` 時依 tier 取 `ending_high`/`ending_low`。碎片本身與 tier 無關。
**感知**：父層給 env + playerId → `fetchOwnedFragmentIds` → `fetchImpressions(env,{ownedIds})` 取 2-3 個 `{fragment, atmosphere}` → 玩家選一道 → `onDeepDive(fragment)`。
**訊號可用性**：每日輪替（日期種子挑 roster，全玩家同一天相同）為硬門檻；time/weather/date 軟加權（×3 / ×1 / ×0.25）；已持有 ×0.15。`pickSignals` 盡量挑不同鬼。

---

## 五、驗收重點（容易踩的雷）

1. **遷移順序**：005 先於 006。跑前確認現行 schema 是 v2（layer/rarity/fragment_label）。
2. **result_text 不可全空**：005 轉換後正確/skippable 選項要補 result_text，否則探查每步沒反應文字。
3. **ending 只在最後一層**：非最後一層必須 NULL；最後一層沒填 → `getEnding` 回空字串、UI 省略收尾（不報錯）。
4. **Map 依賴 signals.js**：先放好 `src/lib/signals.js`，否則 Map import 不到、頁面空白。
5. **Map 三個 props 必接**：env、playerId、onDeepDive 任一沒接，感知浮不出印象或通靈深入沒反應。
6. **drawOptions 依賴內容**：判斷層選項池要同時有 delta≥0 與 <0，否則抽不出「活路+錯步」。
7. **GPS 只給 env**：不要重新引入地圖/定位點/移動需求。
8. **靈力消耗點唯一**：只有〔通靈深入〕扣 1；感知、浮現、預覽全免費。

---

## 六、之後再做（不在本次範圍）

聯靈筆記本、Meta Horror 事件、Web Push、金流、玩家投稿、鬼怪筆記本 UI 入口、協會等級加權、完整帳號刪除、
**（未來）全域「今日出沒」featured 輪替**：用日期種子即可（不需伺服器、不撈光）；不要做會被全世界撈光的有限池，以免新/休閒玩家湊不齊封存。細節見 CLAUDE.md。
