# 靈異筆記 — CLAUDE.md

## 專案概述

推理型都市傳說收藏 PWA 手遊。玩家用「靈異收音機」調頻感知此地的異常訊號、收集鬼怪留下的痕跡碎片、組合封存，解鎖鬼怪筆記本。

碎片是玩家親身走過敘事場景後帶回來的文字片段。玩家從頭到尾都站在現場，收音機是把「已經和你共處一室、但隱形的存在」調進你能感知的頻段的工具，而不是遠端廣播。同一片碎片可以透過不同的敘事路徑取得，玩家靠記憶和感知判斷哪些碎片屬於同一個鬼怪，湊齊後封存。

探查不再有「正確答案」。每一步的選擇影響「訊號清晰度」（訊號格），靠讀當下的氛圍憑第六感判斷，撐住訊號就拿得到碎片，讓訊號散掉就空手。

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
- `005_signal_clarity.sql` — **探查改版**：`scene_options` 由 `is_correct`/`fail_text` 改為 `signal_delta`/`result_text`，並安全轉換現有資料

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
│   └── ui/            Modal、StaminaBar（改名為靈力條，見「本次改版待實作」）
├── hooks/
│   ├── usePlayer.js   玩家資料（fetch/create on login，含 isNew 旗標）
│   ├── useStamina.js  靈力計算（時間差，無後端排程）
│   └── useNotebooks.js 筆記本 + 碎片 CRUD + 封存邏輯
├── lib/
│   ├── supabase.js     Supabase client
│   ├── weather.js      Open-Meteo + 時辰/節日判斷（現在是調頻訊號的條件來源）
│   └── exploration.js  探查邏輯：載入層、抽選項、累加訊號格、結算（取代舊的對錯判定）
└── pages/
    ├── Auth.jsx        登入（Google OAuth + Email OTP 兩步驟）
    ├── SetupName.jsx   首次登入設定調查員名稱（一次性）
    ├── Map.jsx         感知主頁（收音機調頻盤，非地圖；檔名暫留 Map.jsx）
    ├── NotebookPage.jsx 筆記本管理（FragmentCard 預設折疊，點擊展開完整敘事）
    ├── BookshelfPage.jsx 封存書架
    └── ShopPage.jsx    協會（玩家資訊、補給站、帳號管理）
```

## UI 設計原則

- **手機優先**：`#root` `max-width: 600px` 居中，`width: 100%` 確保手機全寬；桌面/平板兩側填 `#000` 純黑
- **基礎字體**：`body font-size: 15px`；標籤用 `text-xs`(12px)，內文用 `text-sm`(14px)
- **Safe area**：`#root` 有 `padding-top: env(safe-area-inset-top)` 適配瀏海/動態島；BottomNav 有 `padding-bottom: env(safe-area-inset-bottom)` 適配 Home Bar
- **動畫原則**：極少、極慢；禁止彈跳；只用 fadeIn / pulse / typewriter
- **導航列配色**：BottomNav 未選中 `text-muted`，hover `text-ink`，選中 `text-accent`；TopBar 等級標籤 `text-muted`；靈力空格 `muted/40`

## 核心機制說明

### 靈力計算（useStamina.js）

靈力取代舊的體力，機制不變，純前端時間差，不跑後端排程：
```
current = min(10, stored + floor((now - updated_at) / 8分鐘))
```
消耗時把 recovered 先加回再扣，更新 `stamina` + `stamina_updated_at`（欄位名暫留 stamina，UI 顯示為「靈力」）。

**消耗規則**：一次探查只在玩家按〔通靈深入〕時扣 **1 格**。轉動調頻盤搜尋、對準訊號、看免費氛圍，全部免費。多層感知的選擇也不扣。

### 封存判斷（useNotebooks.js `seal()`）

1. 取出筆記本內所有碎片的 `story_fragment_id`
2. 逐一比對所有故事的兩個層次（basic / lore）
3. 若筆記本碎片完整包含某層次所有必要碎片 → 成功，解鎖 `creature_pages`，贈一本空白筆記本
4. 失敗回饋三種文案：
   - 碎片不足：「還有什麼沒被記下來」
   - 有異鬼怪碎片：「這裡裝了不該裝的東西」
   - 數量符合但組合錯：「似乎已經完整了，但有什麼不對」

**基礎版封存**：集齊所有 `layer='basic'` 碎片 → 玩家探查敘事填入 `sealed_narrative` 骨架 → 生成「調查員的目擊側寫」，每個玩家版本不同

**鬼怪志版封存**：集齊所有 `layer='basic'` + `layer='lore'` 碎片 → 直接存入 `lore_narrative` 固定文字 → 生成「鬼怪的完整檔案」（樣貌、起源、能力），固定內容

### 感知 / 調頻流程（Map.jsx + ExplorationOverlay.jsx）

```
轉動調頻盤搜尋（免費）
  ※ 環境（時辰/天氣/節日，來自 weather.js）決定此刻頻帶上有哪些訊號
  ※ 訊號 = 候選碎片，由 story_fragments 的條件對上目前環境篩出
→ 對準某個訊號（免費）→ 顯示氛圍描述（從 fragment_atmosphere 隨機抽）
  ※ 氛圍是玩家站在現場感知到的異常（看到/聽到/感覺到），不描述進入後的事
→ 玩家選擇：放掉（之後再找）或〔通靈深入〕(−1 靈力)
→ 通靈深入 → 進入多層感知（才是現場遭遇）
→ 每層：一個場景 + 抽 3 個選項 → 選擇 → 顯示 result_text + 調整訊號格
→ 結算：
   訊號格歸 0 → 存在散去（失敗，空手）
   撐到最後一層且格數 ≥ 1 → FragmentReveal 過渡（約 3.5s）→ NotebookSelectModal → 放入碎片
```

**關鍵設計決策**：
- 探查邏輯全部集中在 `lib/exploration.js`，ExplorationOverlay 只負責驅動與顯示（見下節）
- 沒有「事後 25% 什麼都沒有」的 RNG，風險全在訊號格
- 沒有收手鍵（成本是單筆固定一格，沒有越陷越深的問題）；可選擇保留純敘事的「停止」鈕，但不存不扣任何東西
- `loadInvestigation` 回傳 `layers.length === 0` 時當失敗處理（內容缺場景/選項），不給碎片
- Overlay 用 `fixed inset-0 z-[2000]`（全螢幕暗色）+ 內容 `max-w-[600px] mx-auto`，桌面版文字正確置中；z-2000 確保手機上不被任何元素壓住
- **FragmentReveal**（`z-[2100]`）：撐到最後一層成功後顯示的過渡畫面。黑底 `#080604`，依 rarity/layer 顯示不同顏色的 fragment_label 打字機效果（common=#c8c0b8、rare=#b8c8e0、lore=#c8a84a），lore 碎片中途額外暫停 600ms；打字完成後字跡抖動（opacity 1→0.3→1，80ms），再 +300ms 顯示 fragment_text，+1200ms 後進入 NotebookSelectModal
- 玩家可用右上角 `A-` / `A+` 調整探查文字字體大小（4 級：xs/sm/base/lg），存 `localStorage` key `ghostnote_font_size`；文字用 `break-words` + `overflow-y-auto` 確保大字不橫向溢出

### 探查邏輯（lib/exploration.js，訊號清晰度模型）

`scene_options` 不再有對錯，改為每個選項帶一個 `signal_delta`（訊號格增減）。模組提供三個函式：

```javascript
import { loadInvestigation, applyChoice, buildNarrative } from '../lib/exploration'

// 通靈深入時：載入一次探查的所有層
const inv = await loadInvestigation(fragment) // { startClarity, layers: [...] }
let clarity = inv.startClarity
let i = 0
const walked = []

// 玩家點某層某選項：
const r = applyChoice(
  { clarity, layerIndex: i, totalLayers: inv.layers.length },
  option
)
clarity = r.clarity
walked.push({ sceneText: inv.layers[i].sceneText, resultText: r.resultText })
// 顯示 r.resultText + 更新訊號格動畫
if (r.outcome === 'faded')    { /* 存在散去畫面 */ }
if (r.outcome === 'fragment') { /* FragmentReveal → NotebookSelectModal，存 buildNarrative(walked) */ }
if (r.outcome === 'continue') { i++ /* 顯示下一層 */ }
```

**訊號格（清晰度）規則**：

- **範圍** 0–5，clamp（不超過 `CLARITY_MAX`，不低於 0）
- **起始格數** 依碎片 layer：`START_CLARITY = { basic: 3, lore: 2 }`
- **層數** 由 `fragment_scenes` 的 `layer_index` 實際數量決定（內容上 normal=3、rare=4、legendary=5）
- **每個選項 signal_delta** 只有四種值：`+1 / 0 / −1 / −2`（刻意不對稱：最好 +1，最差 −2，容易斷、難回升）
- **每層抽 3 個選項**：判斷層保證「至少 1 個 delta ≥ 0（活路）+ 至少 1 個 delta < 0（錯步）」，其餘隨機，隨機排序
- **結算三出口**：`continue`（下一層）、`faded`（格數歸 0，存在散去）、`fragment`（撐到最後一層且 ≥1）。`faded` 優先——最後一層選到歸 0 也是散去，不是拿到碎片
- **每次探查重置**，格數不跨碎片累積

**is_skippable 的新意義**：該層所有選項 `signal_delta` 都是 0（純氛圍鋪陳，不動格數）。basic 碎片第 1 層可設 true；**lore 碎片所有層必須 false**。

> ℹ️ `loadInvestigation` 會挑該層「有選項的場景」，所以即使同層放多個場景也不會壞（修掉了舊版隨機抽到無選項場景就整個失敗的雷）。若要恢復 GDD 原本的多場景池（防記答案），直接多加場景即可。

### 鬼怪等級與探查層數

| stories.difficulty | 基礎版碎片 | 鬼怪志碎片 | 探查層數 | 起始訊號格（依碎片 layer） |
|-------------------|-----------|-----------|---------|--------------------------|
| `normal`          | 4-6 片    | +2-3 片   | 3 層    | basic 3 / lore 2 |
| `rare`            | 7-9 片    | +4-5 片   | 4 層    | basic 3 / lore 2 |
| `legendary`       | 10-13 片  | +5-6 片   | 5 層    | basic 3 / lore 2 |

層數越多越難（要連續更多層不斷線）；嚴格度由碎片 layer 決定（lore 起始格少、每層都是判斷層）。

### 碎片分類

| layer | rarity | 說明 | 探查體驗 | 封存用途 |
|-------|--------|------|----------|----------|
| basic | common | 一般遭遇，看到蹤跡與異常現象 | 起始 3 格，第 1 層可為氛圍層 | 基礎版筆記本 |
| basic | rare | 稀有遭遇，更強烈的異常現象 | 起始 3 格 | 基礎版筆記本 |
| lore | rare | 直接遭遇鬼怪本體，看清楚樣子 | 起始 2 格，所有層皆為判斷層，最易斷線 | 鬼怪志版筆記本（必要條件） |

### Auth 流程

- **Google**：`signInWithOAuth({ provider: 'google' })` → 跳轉回 `window.location.origin`
- **Email OTP**：`signInWithOtp({ email })` → 寄送 6 位驗證碼 → `verifyOtp({ email, token, type:'email' })`

### 首次登入名稱設定（SetupName.jsx）

`usePlayer` 建立新玩家時 `display_name` 預設為空字串 `''`，並設 `isNew = true`。
`App.jsx` 在 player 存在但 `isNew` 為 true 時，攔截路由顯示 `SetupName` 頁面。
玩家輸入名稱 → `updateName()` 寫入 DB → `setIsNew(false)` → 進入遊戲。

> Supabase `players.display_name` 欄位需允許空字串：
> ```sql
> ALTER TABLE players ALTER COLUMN display_name SET DEFAULT '';
> ```

### 調頻盤互動（Map.jsx）

收音機調頻是唯一的感知入口，取代舊的雷達掃描與定位點。

- **調頻盤**：一條頻帶 + 可拖動指針（手機左右拖）。掃過多數頻率是雜訊；接近訊號時雜訊變薄、波形浮現、收訊強度上升（「越來越近」的第六感回饋）。訊號有「吸附寬度」，不必對到像素級，靠近即高亮——調頻是氛圍與發現，不是難關。
- **自動掃描鈕（可選）**：慢慢掃、碰到訊號自停。**和手動同樣免費**（差別是節奏，不收靈力）。
- **頻帶上的訊號數**：由環境（時辰/天氣/節日，weather.js）對上 `story_fragments` 條件決定。整條都雜訊 = 此刻沒有接通得了的東西，換時間/天氣再來（符合低壓力）。
- **訊號穩定**：環境不變時頻帶上是同一批訊號，重掃不重骰，沒有 reroll 漏洞。若要主動換一批，做一個明講的〔重新感知〕鈕（−1 靈力），這才是唯一該收費的搜尋動作。
- **頂部狀態欄**：顯示此地環境（時辰 + 天氣 + 節日）與 GPS 座標（純調味）。
- **視覺**：沿用 CRT scanlines + 深黑底 `#080604` + 暖金 `#c9b99a`；收訊強度的格/波形與探查時的訊號格是同一套 UI 語言。

### 新增故事內容

使用 `content-generation-prompt.md` 模板給 AI 生成 SQL，依序插入：

1. `stories` — 含 `sealed_narrative`（基礎版骨架，`{fragment_label}` 佔位符）、`lore_narrative`（鬼怪志固定文字）、`image_slug`
2. `story_fragments` — 含 `fragment_label`、`fragment_text`、`layer`、`rarity`、環境條件
3. `fragment_atmosphere` — 每片碎片 3-5 條；**玩家站在現場感知到的異常，不描述進入後的事**
4. `fragment_scenes` — 每片碎片**每層恰好 1 個場景**，含 `is_skippable`；場景內容是進入後的遭遇
5. `scene_options` — 每個選項給 `signal_delta`（判斷層保證有 delta≥0 與 delta<0 的選項）+ `result_text`（選後顯示的氛圍）

> ⚠️ 沒有 `fragment_scenes.layer_index >= 1` 記錄的碎片不會出現在訊號候選中。
> ⚠️ `is_skippable=true` 層的所有選項 `signal_delta` 必須是 0。lore 碎片所有層必須 `is_skippable=false`。

## 資料庫 Schema（關鍵表格）

### stories
```sql
id UUID, title TEXT,
difficulty TEXT,          -- 'normal'|'rare'|'legendary'
creature_type TEXT,
creature_description TEXT,
sealed_narrative TEXT,    -- 基礎版故事骨架，含 {fragment_label} 佔位符
lore_narrative TEXT,      -- 鬼怪志版固定故事（樣貌、起源、能力）
image_slug TEXT           -- 鬼怪圖片短名，對應 public/creatures/{image_slug}.webp
```

### 鬼怪圖片規格
- 位置：`public/creatures/{image_slug}.webp`
- 尺寸：600 × 800 px（直式）
- 格式：WebP，< 120 KB
- 畫風：水墨插畫風，深黑背景（#080604），灰白冷光主體 + 暖金線條，帶汙漬老化感
- basic 層顯示時加深色遮罩（opacity-50 + 黑色 40% overlay）；lore 層較清晰（opacity-90）
- 底部漸層淡出至 `#1e1e1e`（card 背景色），自然融入內容

### story_fragments
```sql
id UUID, story_id UUID,
layer TEXT,               -- 'basic'|'lore'
rarity TEXT,              -- 'common'|'rare'
fragment_label TEXT,      -- 痕跡標籤（短）→ sealed_narrative 佔位符對應
fragment_text TEXT,       -- 痕跡描述（一句話）
time_condition TEXT, weather_condition TEXT, date_condition TEXT,  -- 調頻訊號的篩選條件
motif_tags TEXT[] DEFAULT '{}', is_user_submitted BOOLEAN DEFAULT false
```

### fragment_atmosphere
```sql
id UUID, story_fragment_id UUID,
atmosphere_text TEXT
-- 玩家站在現場感知到的異常，第一人稱，2-3句
-- 例：「廢棄大樓五樓透著燈光，但這棟樓停電三年了」
-- 玩家據此決定要不要通靈深入，不描述進入後的事
```

### fragment_scenes
```sql
id UUID, story_fragment_id UUID,
layer_index INTEGER,      -- 1開始，每層恰好 1 個場景
atmosphere_text TEXT,     -- 進入現場後的遭遇敘事（構成 exploration_narrative）
is_skippable BOOLEAN      -- true=該層所有選項 delta=0（僅 basic）；false=判斷層（lore 全部 false）
```

### scene_options（已改版）
```sql
id UUID, scene_id UUID,
text TEXT,
signal_delta SMALLINT,    -- -2 ~ +1，選後對訊號格的增減
result_text TEXT          -- 選後顯示的一句氛圍（訊號穩住 / 開始散 / 它退了一步…）
```

### fragments（玩家持有）
```sql
id UUID, player_id UUID, story_fragment_id UUID,
notebook_id UUID,
player_tag TEXT,
exploration_narrative TEXT,  -- 玩家走過的場景敘事串聯（buildNarrative）
obtained_at TIMESTAMPTZ
```

### notebooks
```sql
id UUID, player_id UUID, name TEXT,
capacity INTEGER DEFAULT 15,
type TEXT DEFAULT 'personal',
status TEXT DEFAULT 'active',  -- 'active'|'sealed'
sealed_at TIMESTAMPTZ, story_id UUID,
sealed_layer TEXT,             -- 'basic'|'lore'
sealed_story TEXT              -- 封存後生成的完整故事
```

### creature_pages
```sql
id UUID, player_id UUID, story_id UUID,
unlocked_layer TEXT,      -- 'basic'|'lore'
obtained_at TIMESTAMPTZ
```

## AI 生成故事 SQL 的鐵則

使用 `content-generation-prompt.md` 作為模板。關鍵規則：

1. **所有 id 必須是合法 UUID 格式**，每個不同；UUID 只能含 `[0-9a-f]`，`l`、`o`、`g` 等非 hex 字元會導致 INSERT 靜默失敗
2. **stories.difficulty** 只能填 `'normal'`、`'rare'`、`'legendary'`
3. **story_fragments.layer** 只能填 `'basic'`、`'lore'`；**rarity** 只能填 `'common'`、`'rare'`
4. **story_fragments 用 `fragment_label` + `fragment_text`**（不是舊的 `difficulty` / `text`）
5. **fragment_scenes 必須包含 `is_skippable`**（basic 第一層可 true；lore 全部 false）
6. **fragment_atmosphere 只描述現場感知到的異常**，不描述進入後的事；進入後的遭遇寫在 fragment_scenes
7. **scene_options 每個選項給 `signal_delta`（−2~+1）+ `result_text`**；判斷層要同時有 delta≥0 與 delta<0 的選項；is_skippable 層所有選項 delta=0
8. **三個選項都要極度合理**，靠感知判斷，不能有明顯該排除的
9. **stories 必須包含 `image_slug`**（英文小寫+底線，不含副檔名）
10. **sealed_narrative 的 `{佔位符}` 必須和 `fragment_label` 完全一致**；**lore_narrative 是固定文字**，不含佔位符
11. **單引號用 `''` 跳脫**，不使用反斜線

> ⚠️ **CTE 遷移陷阱**：PostgreSQL CTE snapshot 機制導致同一語句內 CTE 寫入的列對其他查詢不可見，必須透過 `RETURNING` 引用。每個場景用獨立 CTE：
> ```sql
> WITH sc AS (
>   INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
>   VALUES (gen_random_uuid(), 'fragment-uuid', 1, '場景文字', false)
>   RETURNING id
> )
> INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
> SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
> CROSS JOIN (VALUES
>   ('貼當下的選擇', 1, '訊號穩住了'),
>   ('突兀的選擇', -2, '訊號在你動作的瞬間散掉。')
> ) AS v(text, signal_delta, result_text);
> ```

### 已知鬼怪 image_slug 對照
| 鬼怪 | image_slug |
|------|-----------|
| 屍鼠 | shushi |
| 廁所花子 | hanako |
| 新娘電梯 | elevator_bride |
| 隔壁的鄰居 | neighbor |
| 三樓的轉學生 | transfer_student |
| 夜班的那個人 | night_shift |

## 本次改版待實作（交給 Code）

✅ 全部完成（2026-06-02）：

1. **`005_signal_clarity.sql`**：已套用，`scene_options` 欄位為 `signal_delta` / `result_text`。
2. **`lib/exploration.js`**：`loadInvestigation` / `applyChoice` / `buildNarrative` 全部實作，ExplorationOverlay 已接上。
3. **體力 → 靈力**：StaminaBar label、ExplorationOverlay 按鈕文案（靈力不足、通靈深入）全部更新。DB 欄位暫留 `stamina`。
4. **Map.jsx 調頻盤**：頻帶 + 拖動指針，`fragPos()` 依 fragment id hash 給定穩定頻率位置，SNAP 9% / LOCK 4% 判斷。
5. **weather.js 條件篩選**：`time_condition` / `weather_condition` / `date_condition` 客戶端過濾已實作。
6. **〔重新感知〕鈕**：−1 靈力，強制重載訊號（同時清空 usedIds）。

## 其他尚未實作

- 聯靈筆記本（多人協作，DB schema 已預留 `shared_notebooks` 等表）
- Meta Horror 隨機事件（DB 表 `meta_horror_events` 已建）
- Web Push 推播通知（靈力回滿提醒）
- 付費金流
- 玩家投稿流程
- 鬼怪筆記本 UI（`creature_pages` 已在 DB 解鎖，書架頁待設計入口）
- 協會等級加權計算（普通×1、稀有×2、傳說×3；鬼怪志版額外×1.5）
- 完整帳號刪除（目前刪除 players 記錄 + signOut，auth.users 記錄留存在 Supabase）
