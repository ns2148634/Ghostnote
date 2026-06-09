# 靈異筆記 — CLAUDE.md

## 專案概述

推理型都市傳說收藏 PWA 手遊。玩家翻開調查筆記「感知」此地，紙上滲出幾道異常印象，選一道深入、收集鬼怪留下的痕跡碎片，組合封存，解鎖鬼怪筆記本。

碎片是玩家親身走過敘事場景後帶回來的文字片段。玩家從頭到尾都站在現場，感知是把「已經和你共處一室、但隱形的存在」浮上紙面的能力。同一片碎片可以透過不同的敘事路徑取得，玩家靠記憶和感知判斷哪些碎片屬於同一個鬼怪，湊齊後封存。

**遊戲重心**：感知是氛圍入口（不是難關）；真正的玩法在碎片收集與筆記本封存（收集鬼怪）。探查的小張力來自「訊號清晰度」，長期目標是把同一隻鬼的碎片湊齊、封存成鬼怪志。

探查沒有「正確答案」。每一步選擇影響訊號清晰度（訊號格），靠讀當下氛圍憑第六感判斷，撐住訊號就拿得到碎片，讓訊號散掉就空手。

GDD 完整文件：`paranormal-notebook-gdd.md`

## 技術棧

- **前端**：React 18 + Vite + vite-plugin-pwa（PWA，`injectRegister: null`，改用 `main.jsx` 手動 `registerSW` 並加 `onRegisterError` 靜默捕捉 WebView 的 InvalidStateError）
- **樣式**：Tailwind CSS（深色靈異主題）
- **定位**：瀏覽器 Geolocation API（`navigator.geolocation`，不使用 Leaflet）。**GPS 只用來判斷環境因素**（時辰／天氣／節日），不做地圖定位，也不擺放異常點座標。
- **後端**：Supabase（PostgreSQL + Auth + RLS + Realtime）
- **天氣**：Open-Meteo（免費，無需 key）
- **部署**：Vercel + GitHub Actions CI/CD

## 本機開發

```bash
cp .env.example .env   # 填入 Supabase URL（不含路徑）和 anon key
npm install
npm run dev
```

## 環境變數

| 變數 | 說明 | 注意 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 專案 URL | 只填 `https://xxx.supabase.co`，**不加** `/rest/v1/` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key | |

## 資料庫

遷移檔案在 `supabase/migrations/`，依序在 Supabase SQL Editor 執行：
- `001_schema.sql` — 所有表格定義 + RLS 政策
- `002_seed.sql` — 舊版 seed（已由 004 取代，勿重複執行）
- `003_scene_pool.sql` — 場景池三個表格 + RLS
- `004_schema_v2.sql` — Schema v2：清除舊資料、欄位調整、屍鼠完整 seed
- `005_signal_clarity.sql` — **探查改版**：`scene_options` 由 `is_correct`/`fail_text` 改為 `signal_delta`/`result_text`
- `006_tiered_ending.sql` — **分層結局**：`fragment_scenes` 加 `ending_high`/`ending_low`（只有最後一層填值）
- `007_encounter.sql` — **遭遇系統 Phase 1**：加 `stories.encounter_archetype`、`scene_options.trust_delta`、`fragment_scenes.climax_type/text/min_trust`（Phase 1 全 NULL，Phase 2 再用）

**Seed 腳本**（`scripts/`）：
- `scripts/reset.ps1` — 刪除所有故事資料 + 玩家進度（先跑再 seed）
- `scripts/seed.ps1` — 完整 seed：屍鼠 + 夜班的那個人 + 椅仔姑
- 執行：`pwsh -File scripts/reset.ps1` → `pwsh -File scripts/seed.ps1`

## Supabase Auth 設定

- **Email OTP**：Authentication → Providers → Email 啟用
- **Google OAuth**：Authentication → Providers → Google 啟用，填入 Client ID / Secret
  - Google Cloud Console 需加 redirect URI：`https://xxx.supabase.co/auth/v1/callback`

## 目錄結構

```
src/
├── components/
│   ├── exploration/   探查流程 UI（ExplorationOverlay、NotebookSelectModal、FragmentReveal）
│   ├── layout/        TopBar、BottomNav
│   └── ui/            Modal、StaminaBar（靈力條，DB 欄位 stamina 暫留）
├── hooks/
│   ├── usePlayer.js   玩家資料（fetch/create on login，含 isNew 旗標）
│   ├── useStamina.js  靈力計算（時間差，無後端排程）
│   └── useNotebooks.js 筆記本 + 碎片 CRUD + 封存邏輯
├── lib/
│   ├── supabase.js     Supabase client
│   ├── weather.js      Open-Meteo + 時辰/節日判斷（感知印象的出沒條件來源）
│   ├── signals.js      訊號可用性：每日輪替 + 條件加權，決定此刻感知能浮現哪幾個印象
│   └── exploration.js  探查邏輯：載入層、抽選項、累加訊號格、結算、分層結局
└── pages/
    ├── Auth.jsx        登入（Google OAuth + Email OTP 兩步驟）
    ├── SetupName.jsx   首次登入設定調查員名稱（一次性）
    ├── Map.jsx         感知主頁（筆記感知頁，非地圖；檔名暫留 Map.jsx）
    ├── NotebookPage.jsx 筆記本管理（FragmentCard 預設折疊，點擊展開完整敘事）
    ├── BookshelfPage.jsx 封存書架
    └── ShopPage.jsx    協會（玩家資訊、補給站、帳號管理）
```

## UI 設計原則

- **手機優先**：`#root` `max-width: 600px` 居中，`width: 100%` 確保手機全寬；桌面/平板兩側填 `#000` 純黑
- **基礎字體**：`body font-size: 15px`；標籤用 `text-xs`(12px)，內文用 `text-sm`(14px)
- **Safe area**：`#root` 有 `padding-top: env(safe-area-inset-top)`；BottomNav 有 `padding-bottom: env(safe-area-inset-bottom)`
- **動畫原則**：極少、極慢；禁止彈跳；只用 fadeIn / pulse / typewriter（感知頁墨痕用 blur→clear 的滲出）
- **靈異主題色**：深黑底 `#080604`、暖金 `#c9b99a`、CRT scanlines、灰白冷光

## 核心機制說明

### 靈力計算（useStamina.js）

靈力取代舊的體力，純前端時間差，不跑後端排程：
```
current = min(10, stored + floor((now - updated_at) / 8分鐘))
```
消耗時把 recovered 先加回再扣，更新 `stamina` + `stamina_updated_at`（DB 欄位名暫留 stamina，UI 顯示為「靈力」）。

**消耗規則**：**感知（掃描）時扣 1 格靈力**；浮現印象、預覽、通靈深入、多層選擇全部免費。成本放在感知（而非深入），既擋住無限重刷，一次嘗試也只花 1 格。靈力不足時不能感知。

### 感知頁互動（Map.jsx，筆記感知頁）

感知是唯一入口，取代舊的雷達/調頻。**氛圍導向，不是難關，沒有錯覺、不可能失敗。**選擇的重量來自「只能挑一個，其餘消失」。

- **畫面**：翻開的筆記頁（深黑 `#080604` + 紙面漸層 + 暖金）。頂端顯示環境（時辰 + 天氣 + 節日）。
- **待機**：頁面中央一顆「感知」按鈕（呼吸光暈）。進頁面不自動感知、不扣靈力。
- **感知（−1 靈力）**：按下中央按鈕才觸發——扣 1 靈力後墨色滲開，紙上浮現 **2–3 道墨痕印象**，各一句 `fragment_atmosphere`（現場感知到的異常，如「暗巷裡似乎有人影」）。墨痕用 blur→clear 滲出、交錯延遲出現。
- **選一道深入**：點一道墨痕 → **其餘墨痕淡掉（散回紙裡）** → 顯示〔通靈深入〕（免費）/〔重新感知（＝再感知一次，−1 靈力）〕。
- **一次一個**：深入或放掉後 → 再感知，浮現新的一批。
- **空頁**：環境沒有可浮現的印象時，顯示「今晚很安靜，紙上沒有浮現任何痕跡」。不懲罰，換時機再來。
- **沒有錯覺**：浮現的都是真的碎片；選擇的張力來自機會成本（挑一個、放掉其餘），不是「白工」。
- 視覺用 inline style，不依賴 Tailwind 設定。
- **Map props**：`env`（weather.js 結果）、`playerId`、`stamina`（顯示/停用用）、`onSense()` → 父層同步扣靈力、回傳 bool、`onDeepDive(fragment)`。MapRoute 以 `{!overlay && <Map/>}` 條件渲染（overlay 開著時 Map 不存在），overlay 關閉後 Map 自然重掛為 idle。

### 訊號出沒規律與每日輪替（signals.js）

決定「此刻感知能浮現哪幾個印象」。**全程不需移動**，GPS 只用於環境。

- **每日輪替**：當天本地日期當種子，決定今天哪幾隻鬼在線上放送（一整天固定，學得會「今天有誰」；隔天換一批）。種子是確定性的，**同一天每個玩家 roster 相同**，不需伺服器。
- **條件加權（軟）**：玩家當下 time/weather/date（weather.js）對 `story_fragments` 的條件 → 吻合 ×3、NULL ×1、不吻合 ×0.25。不歸零，錯的時機仍可能浮現，收集不卡死。
- **已持有降權**：玩家已有的碎片 ×0.15，新碎片自然壓過重複的。
- **稀有度權重**（Phase 1 新增）：`RARITY_WEIGHT = { common:1, rare:0.4, lore:0.15 }`，乘在條件加權之後，讓 lore 真正稀有。
- **浮現多個**：`pickSignals` 加權抽 2–3 個不重複碎片（盡量來自不同鬼）；`fetchImpressions` 一次回傳 `[{ fragment, atmosphere }]` 給感知頁。

### 探查邏輯（lib/exploration.js，訊號清晰度模型）

`scene_options` 不再有對錯，改為每個選項帶一個 `signal_delta`（訊號格增減）。模組函式：

```javascript
import { loadInvestigation, applyChoice, getEnding, buildNarrative } from '../lib/exploration'

const inv = await loadInvestigation(fragment) // { startClarity, layers: [...] }
let clarity = inv.startClarity, i = 0
const walked = []

const r = applyChoice({ clarity, layerIndex: i, totalLayers: inv.layers.length }, option)
clarity = r.clarity
walked.push({ sceneText: inv.layers[i].sceneText, resultText: r.resultText })
if (r.outcome === 'faded')    { /* 存在散去畫面 */ }
if (r.outcome === 'fragment') {
  const ending = getEnding(inv.layers[i], r.tier)
  /* 顯示 ending → FragmentReveal → NotebookSelectModal，存 buildNarrative(walked) */
}
if (r.outcome === 'continue') { i++ }
```

**訊號格（清晰度）規則（Phase 1）**：

- **範圍** 0–5，clamp（不超過 `CLARITY_MAX`，不低於 0）
- **起始格數** 依碎片 layer：`START_CLARITY = { basic: 3, lore: 2 }`
- **層數** 由 `fragment_scenes` 的 `layer_index` 數量決定（normal 3 / rare 4 / legendary 5）
- **每個選項 signal_delta** 只有 `+1 / 0 / −1 / −2`；**`+1` 每場最多出現一次**（`loadInvestigation` 跨層追蹤 `plusOneUsed`）
- **每層抽 3 個選項**：判斷層保證 **1 個 delta≥0（活路）+ 2 個 delta<0（壞路）**，隨機排序；`plusOneUsed` 後活路池限縮為 delta=0
- **結算四出口**：`continue` / `faded`（歸 0 散去）/ `missed`（撐到最後但 clarity<`BASIC_GET_MIN` → 沒留下痕跡）/ `fragment`（拿到碎片）
  - basic：最後一層 `clarity ≥ BASIC_GET_MIN(=2)` → fragment；= 1 → missed；= 0 → faded
  - lore 無 archetype：最後一層 `clarity ≥ LORE_GET_MIN(=2)` → fragment；否則 missed
- **每次探查重置**，格數不跨碎片累積

**分層結局**：最後一層成功後依剩餘格數顯示收尾，`tier='high'`（≥`HIGH_TIER_MIN`=4 格）/ `'low'`（2–3 格）。`applyChoice` 在 `fragment` 時回傳 `tier`；`getEnding(lastLayer, tier)` 取 `ending_high`/`ending_low`。**碎片本身與 tier 無關**，只換收尾氛圍。

**is_skippable**：該層所有選項 `signal_delta` 都是 0（純氛圍鋪陳）。basic 第 1 層可 true；**lore 碎片所有層必須 false**。

> ℹ️ `loadInvestigation` 會挑該層「有選項的場景」，同層多場景也不會壞。

### 感知 / 探查完整流程

```
感知（−1 靈力）
  ※ signals.js：每日輪替 + 環境加權 + RARITY_WEIGHT → fetchImpressions 回傳 2-3 個 { fragment, atmosphere }
  ※ RARITY_WEIGHT = { common:1, rare:0.4, lore:0.15 } — lore 出現機率大幅壓低
→ 紙上浮現 2-3 道墨痕印象（各一句現場感知）
→ 選一道深入：點一道 → 其餘淡掉 → 〔通靈深入〕（免費）或〔重新感知（−1 靈力）〕
→ 通靈深入 → 進入多層感知（現場遭遇）
→ 每層：一個場景 + 抽 3 個選項（1 活路+2 壞路）→ 選擇 → result_text + 調整訊號格
→ 結算（Phase 1）：
   clarity 歸 0 → faded（訊號散去，空手）
   最後一層 clarity = 1 → missed（接通了卻沒留下痕跡，空手）
   最後一層 clarity ≥ 2 → getEnding 收尾 → FragmentReveal → NotebookSelectModal → 放入碎片
```

**Overlay / 過渡技術細節**：
- Overlay `fixed inset-0 z-[2000]` + 內容 `max-w-[600px] mx-auto`
- **探查不顯示訊號數字/「±」說明**：每步只顯示 result_text（純現場反應，不含「訊號」字眼），訊號格只用視覺增減，不打文字說明，以免打斷閱讀
- **FragmentReveal**（`z-[2100]`）：成功後過渡。黑底 `#080604`，依 rarity 顯示不同顏色 fragment_label 打字機（common=#c8c0b8、rare=#b8c8e0、lore=#c8a84a），lore 中途暫停 600ms；打完抖動（opacity 1→0.3→1，80ms），+300ms 顯示 fragment_text，+1200ms 進 NotebookSelectModal
- 右上角 `A-` / `A+` 調探查字級（4 級），存 `localStorage` key `ghostnote_font_size`

### 封存判斷（useNotebooks.js `seal()`）

1. 取筆記本內所有碎片的 `story_fragment_id`
2. 逐一比對所有故事的 basic / lore 兩層次
3. 完整包含某層次所有必要碎片 → 成功，解鎖 `creature_pages`，贈空白筆記本
4. 失敗回饋：碎片不足／含異鬼怪碎片／數量符合但組合錯

**基礎版**：集齊所有 `layer='basic'` → 玩家探查敘事填入 `sealed_narrative` 骨架（每人不同）
**鬼怪志版**：集齊 `basic` + `lore` → 存入 `lore_narrative` 固定文字

### 鬼怪等級與探查層數

| difficulty | 基礎版碎片 | 鬼怪志碎片 | 探查層數 | 起始訊號格 |
|-----------|-----------|-----------|---------|-----------|
| `normal`  | 4-6 片    | +2-3 片   | 3 層    | basic 3 / lore 2 |
| `rare`    | 7-9 片    | +4-5 片   | 4 層    | basic 3 / lore 2 |
| `legendary` | 10-13 片 | +5-6 片   | 5 層    | basic 3 / lore 2 |

### 碎片分類

| layer | rarity | 說明 | 探查體驗 | 封存用途 |
|-------|--------|------|----------|----------|
| basic | common | 蹤跡與異常現象 | 起始 3 格，第 1 層可為氛圍層 | 基礎版筆記本 |
| basic | rare | 更強烈的異常現象 | 起始 3 格 | 基礎版筆記本 |
| lore | rare | 直接遭遇鬼怪本體 | 起始 2 格，所有層皆判斷層，最易斷線 | 鬼怪志版（必要） |

### Auth 流程
- **Google**：`signInWithOAuth({ provider:'google' })` → 跳轉回 origin
- **Email OTP**：`signInWithOtp({email})` → 6 位碼 → `verifyOtp({email,token,type:'email'})`

### 首次登入名稱（SetupName.jsx）
新玩家 `display_name` 預設 `''`、`isNew=true`；App.jsx 攔截顯示 SetupName → `updateName()` → `setIsNew(false)`。
> `ALTER TABLE players ALTER COLUMN display_name SET DEFAULT '';`

### 新增故事內容
用 `content-generation-prompt.md` 模板，依序：stories → story_fragments（含**出沒條件**）→ fragment_atmosphere（現場感知）→ fragment_scenes（每層 1 場景、含 is_skippable，**最後一層填 ending_high/ending_low**）→ scene_options（signal_delta + result_text，判斷層保證有 delta≥0 與 <0）。

## 資料庫 Schema（關鍵表格）

### stories
```sql
id UUID, title TEXT, difficulty TEXT, creature_type TEXT, creature_description TEXT,
sealed_narrative TEXT,  -- 含 {fragment_label} 佔位符
lore_narrative TEXT, image_slug TEXT
```

### story_fragments
```sql
id UUID, story_id UUID, layer TEXT, rarity TEXT,
fragment_label TEXT, fragment_text TEXT,
time_condition TEXT, weather_condition TEXT, date_condition TEXT,  -- 出沒規律（軟加權）
motif_tags TEXT[] DEFAULT '{}', is_user_submitted BOOLEAN DEFAULT false
```

### fragment_atmosphere
```sql
id UUID, story_fragment_id UUID, atmosphere_text TEXT  -- 異常點：現場感知到的異常，很短一句（約10-25字），結尾用…
```

### fragment_scenes（含分層結局欄位）
```sql
id UUID, story_fragment_id UUID, layer_index INTEGER,
atmosphere_text TEXT, is_skippable BOOLEAN,
ending_high TEXT,  -- 分層結局：≥4 格成功的收尾（只有最後一層填）
ending_low TEXT    -- 分層結局：1–3 格成功的收尾（只有最後一層填）
```

### scene_options（訊號清晰度版）
```sql
id UUID, scene_id UUID, text TEXT,
signal_delta SMALLINT,  -- -2 ~ +1
result_text TEXT        -- 選後一句氛圍（局部變化，非終局）
```

### fragments / notebooks / creature_pages
```sql
fragments(id, player_id, story_fragment_id, notebook_id, player_tag, exploration_narrative, obtained_at)
notebooks(id, player_id, name, capacity=15, type='personal', status='active'|'sealed', sealed_at, story_id, sealed_layer, sealed_story)
creature_pages(id, player_id, story_id, unlocked_layer, obtained_at)
```

### 鬼怪圖片規格
`public/creatures/{image_slug}.webp`；600×800 直式；WebP < 120 KB；水墨深黑底 #080604 + 暖金線條 #c9b99a。basic 加深色遮罩、lore 較清晰。

## AI 生成故事 SQL 的鐵則
1. 合法 UUID（只含 `[0-9a-f]`，`g/l/o/s/w` 等非 hex 會 INSERT 失敗）；**只有 stories / story_fragments 用固定 UUID**，其餘 `gen_random_uuid()`
2. difficulty/layer/rarity 用合法列舉；signal_delta 只 `-2~1`
3. fragment_atmosphere 只描述現場感知；遭遇寫在 fragment_scenes
4. 判斷層選項池同時有 delta≥0 與 <0；is_skippable 層全 0；每選項都有 result_text
5. **最後一層填 ending_high/ending_low；非最後一層 NULL**
6. 想要出沒規律就填 time/weather/date 條件（多數 common 留 NULL）
7. sealed_narrative 佔位符對齊 fragment_label；lore_narrative 不含佔位符；單引號用 `''` 跳脫

> ⚠️ CTE 陷阱：每個場景用獨立 CTE + `RETURNING`。最後一層帶 ending 欄位範例：
> ```sql
> WITH sc AS (
>   INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
>   VALUES (gen_random_uuid(), 'fragment-uuid', 3, '最終層場景', false, '乾淨收尾', '驚險收尾')
>   RETURNING id
> )
> INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
> SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
> CROSS JOIN (VALUES ('貼當下的選擇',1,'它沒有退開，反而更靠近了一點。'),('突兀的選擇',-2,'它在你動作的瞬間退進牆裡。')) AS v(text,signal_delta,result_text);
> ```

### 已知鬼怪 image_slug
屍鼠 shushi｜廁所花子 hanako｜新娘電梯 elevator_bride｜隔壁的鄰居 neighbor｜三樓的轉學生 transfer_student｜夜班的那個人 night_shift｜最後一班的乘客 last_passenger｜三點十七分的同事 317_coworker｜對面的那個人 metro_stranger｜**椅仔姑 chair_ghost**

### 參數（程式內，playtest 可調）
- `exploration.js`：`CLARITY_MAX=5`、`START_CLARITY={basic:3,lore:2}`、`HIGH_TIER_MIN=4`、`BASIC_GET_MIN=2`、`LORE_GET_MIN=2`
- `signals.js`：`DAILY_ROSTER_SIZE=6`、`IMPRESSION_COUNT=3`、`COND_FACTOR{match:3,neutral:1,mismatch:0.25}`、`OWNED_FACTOR=0.15`、`RARITY_WEIGHT={common:1,rare:0.4,lore:0.15}`

## Phase 2（尚未實作）

信任軸（trust 0–5）+ climax 手勢（hold_listen / look_away / stay_still / tap_echo）給有 `encounter_archetype` 的 lore。DB Schema 欄位（`stories.encounter_archetype`、`scene_options.trust_delta`、`fragment_scenes.climax_*`）已在 007_encounter.sql 加好，Phase 1 全 NULL。椅仔姑預計用 `correct_response` + `hold_listen`。

## 其他尚未實作
聯靈筆記本、Meta Horror 事件、Web Push、金流、玩家投稿、鬼怪筆記本 UI 入口、協會等級加權、完整帳號刪除、（未來）全域「今日出沒」featured 輪替（用日期種子即可，不撈光）。
