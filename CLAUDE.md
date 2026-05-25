# 靈異筆記 — CLAUDE.md

## 專案概述

推理型都市傳說收藏 PWA 手遊。玩家探查地圖上的異常點、收集故事碎片、組合封存，解鎖鬼怪筆記本。

碎片是玩家親身走過敘事場景後帶回來的文字片段。同一片碎片可以透過不同的敘事路徑取得，玩家靠記憶和感知判斷哪些碎片屬於同一個鬼怪，湊齊後封存。

GDD 完整文件：`paranormal-notebook-gdd.md`

## 技術棧

- **前端**：React 18 + Vite + vite-plugin-pwa（PWA）
- **樣式**：Tailwind CSS（深色靈異主題）
- **定位**：瀏覽器 Geolocation API（`navigator.geolocation.watchPosition`，不使用 Leaflet）
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

## Supabase Auth 設定

- **Email OTP**：Authentication → Providers → Email 啟用
- **Google OAuth**：Authentication → Providers → Google 啟用，填入 Client ID / Secret
  - Google Cloud Console 需加 redirect URI：`https://xxx.supabase.co/auth/v1/callback`

## 目錄結構

```
src/
├── components/
│   ├── exploration/   探查流程 UI（ExplorationOverlay、NotebookSelectModal）
│   ├── layout/        TopBar、BottomNav
│   └── ui/            Modal、StaminaBar
├── hooks/
│   ├── usePlayer.js   玩家資料（fetch/create on login，含 isNew 旗標）
│   ├── useStamina.js  體力計算（時間差，無後端排程）
│   └── useNotebooks.js 筆記本 + 碎片 CRUD + 封存邏輯
├── lib/
│   ├── supabase.js    Supabase client
│   └── weather.js     Open-Meteo + 時辰/節日判斷
└── pages/
    ├── Auth.jsx        登入（Google OAuth + Email OTP 兩步驟）
    ├── SetupName.jsx   首次登入設定調查員名稱（一次性）
    ├── Map.jsx         地圖探查主頁
    ├── NotebookPage.jsx 筆記本管理
    ├── BookshelfPage.jsx 封存書架
    └── ShopPage.jsx    協會（玩家資訊、補給站、帳號管理）
```

## UI 設計原則

- **手機優先**：`#root` `max-width: 600px` 居中，`width: 100%` 確保手機全寬；桌面/平板兩側填 `#000` 純黑
- **基礎字體**：`body font-size: 15px`；標籤用 `text-xs`(12px)，內文用 `text-sm`(14px)
- **Safe area**：`#root` 有 `padding-top: env(safe-area-inset-top)` 適配瀏海/動態島；BottomNav 有 `padding-bottom: env(safe-area-inset-bottom)` 適配 Home Bar
- **動畫原則**：極少、極慢；禁止彈跳；只用 fadeIn / pulse / typewriter

## 核心機制說明

### 體力計算（useStamina.js）

不跑後端排程，純前端時間差：
```
current = min(10, stored + floor((now - updated_at) / 8分鐘))
```
消耗時把 recovered 先加回再扣，更新 `stamina` + `stamina_updated_at`。

### 封存判斷（useNotebooks.js `seal()`）

1. 取出筆記本內所有碎片的 `story_fragment_id`
2. 逐一比對所有故事的兩個層次（basic / lore）
3. 若筆記本碎片完整包含某層次所有必要碎片 → 成功，解鎖 `creature_pages`，贈一本空白筆記本
4. 失敗回饋三種文案：
   - 碎片不足：「還有什麼沒被記下來」
   - 有異鬼怪碎片：「這裡裝了不該裝的東西」
   - 數量符合但組合錯：「似乎已經完整了，但有什麼不對」

### 探查流程（Map.jsx + ExplorationOverlay.jsx）

```
點擊玩家定位點（-1體力）→ 異常點生成 → 點擊異常點（免費氛圍描述）
→ 深入探查（-1體力）→ 異常點立即消失 → 多層選擇題 → 成功/失敗
→ 成功：NotebookSelectModal 選擇目標筆記本 → 放入碎片
```

**關鍵設計決策**：
- 異常點在玩家點「深入探查」時立即移除（`handleDeepen` 內 setAnomalies filter），不可重複進入
- 掃描候選清單只含有 `fragment_scenes.layer_index >= 1` 的碎片，確保每個候選碎片都有選擇層
- `ExplorationOverlay` 的 `layers.length === 0` fallback 為失敗（「氣息已散去」），不給碎片
- Overlay 用 `fixed inset-0 z-[2000]`（全螢幕暗色）+ 內容 `max-w-[600px] mx-auto`，桌面版文字正確置中；z-2000 確保在手機上不被任何元素壓住
- 玩家可用右上角 `A-` / `A+` 調整探查文字字體大小（4 個等級：xs/sm/base/lg），存入 `localStorage` key `ghostnote_font_size`，重開維持；文字用 `break-words` + `overflow-y-auto` 確保大字不橫向溢出

地圖頁 UI 層次（由下至上）：
1. 恐怖 Scanner 背景（`#080604` + CRT scanlines + 5 層雷達環 + 十字準線）
2. radial-gradient 暗角 vignette
3. 異常點（`anomaly-dot` CSS 脈動，`toScreen()` 依 GPS 偏移轉換為 % 座標）
4. 玩家點（畫面正中心，點擊 = 掃描，44px 觸控區）
5. 頂部狀態欄（時辰 + 偵測訊息 + GPS 座標）
6. 掃描中：三層擴散光環動畫

**已移除 react-leaflet**：改用 `navigator.geolocation.watchPosition`，Map chunk 從 165 kB → 11 kB。
`toScreen(playerPos, anomaly)` 用 GPS 偏移（約 1 km = ±28%）計算螢幕 % 座標，x/y clamp 為 12%–88% 以防止異常點被截到邊緣外。

### 探查隨機邏輯（新架構，取代固定 exploration_nodes）

每片碎片有三層獨立的內容池，探查時動態隨機抽取：

```javascript
// 1. 免費氛圍描述：從 fragment_atmosphere 隨機抽一條
// 2. 每層選擇題：取該層唯一場景，依 is_skippable 決定選項組合

// is_skippable=true（氛圍通過層）：顯示全部選項（都是 is_correct=true），任選都過
if (scene.is_skippable) {
  const opts = (allOptions || []).map(o => ({ text: o.text, isCorrect: true, failText: '' }))
  layers.push({ sceneText: scene.atmosphere_text, options: shuffle(opts) })
}
// is_skippable=false（判斷層）：1 個隨機正確 + 2 個隨機錯誤
else {
  const correct = randomPick(allOptions.filter(o => o.is_correct))
  const wrongs = pickN(allOptions.filter(o => !o.is_correct), 2)
  layers.push({ sceneText, options: shuffle([correct, ...wrongs]) })
}
```

**規則**：
- **每片碎片每層只能有 1 個場景**（若同層有多個場景，隨機 pick 到無選項的場景會使該層被跳過，導致 layers=[] → 失敗）
- `is_skippable=true` 層顯示所有正確選項（全部 is_correct=true），玩家選任何一個都前進
- `is_skippable=false` 層顯示 1 正確 + 2 隨機錯誤，選錯直接結束
- 選項隨機排序，玩家不知道哪個對
- 選錯任何一層直接結束，異常點已消失（深入探查時就移除了）

> ⚠️ **CTE 遷移陷阱**：PostgreSQL CTE snapshot 機制導致同一語句內 CTE 寫入的列對其他查詢不可見，必須透過 `RETURNING` 引用。每個場景必須用獨立的 CTE 寫法：
> ```sql
> WITH inserted_scene AS (
>   INSERT INTO fragment_scenes (story_fragment_id, layer_index, atmosphere_text)
>   VALUES ('uuid', 1, '場景文字')
>   RETURNING id
> )
> INSERT INTO scene_options (scene_id, text, is_correct, fail_text)
> SELECT id, opt.text, opt.is_correct, opt.fail_text
> FROM inserted_scene
> CROSS JOIN (VALUES
>   ('選項文字', true, ''),
>   ('錯誤選項', false, '失敗敘述')
> ) AS opt(text, is_correct, fail_text);
> ```

### 鬼怪等級與探查層數

| stories.difficulty | 基礎版碎片 | 鬼怪志碎片 | 探查層數 |
|-------------------|-----------|-----------|---------|
| `normal`          | 4-6 片    | +2-3 片   | 3 層    |
| `rare`            | 7-9 片    | +4-5 片   | 4 層    |
| `legendary`       | 10-13 片  | +5-6 片   | 5 層    |

> ⚠️ 探查層數由 `fragment_scenes.layer_index` 的實際數量決定（目前固定 3 層）。`ExplorationOverlay` 依 `stories.difficulty` 決定要走幾層尚未實作，見「尚未實作」節。

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

### 地圖定位點互動

玩家自身定位 Marker 可點擊即觸發掃描（消耗 1 格體力），這是唯一的掃描入口。
定位點為 28px 圓形觸控區，中心 10px 金點，掃描中外圈光暈加強。
右下角 `⊕` 按鈕可重新將地圖置中至玩家目前位置（不消耗體力）。

### 新增故事內容（新架構）

使用 `content-generation-prompt.md` 模板給 AI 生成 SQL，依序插入：

1. `stories` — 含 `sealed_narrative`（基礎版骨架，`{fragment_label}` 佔位符）和 `lore_narrative`（鬼怪志固定文字）
2. `story_fragments` — 含 `fragment_label`（痕跡標籤）+ `fragment_text`（痕跡描述）+ `rarity`（common/rare）
3. `fragment_atmosphere` — 每片碎片 3-5 條氛圍描述
4. `fragment_scenes` — 每片碎片**每層恰好 1 個場景**，含 `is_skippable`（basic 第一層可為 true；lore 全部 false）
5. `scene_options` — is_skippable=false：2-3 正確 + 4-6 錯誤；is_skippable=true：全部 is_correct=true（顯示全部選項）

> ⚠️ 沒有 `fragment_scenes.layer_index >= 1` 記錄的碎片**不會出現在掃描候選清單**中。
> ⚠️ 同一層若有多個場景，隨機 pick 到無選項的場景會使該層被跳過（`correct` undefined → `continue`），最終 `layers=[]` 導致探查永遠失敗。**每層固定 1 個場景。**

## 資料庫 Schema（關鍵表格）

### stories
```sql
id UUID, title TEXT,
difficulty TEXT,          -- 'normal'|'rare'|'legendary'
creature_type TEXT,
creature_description TEXT,
sealed_narrative TEXT,    -- 基礎版故事骨架，含 {fragment_label} 佔位符
lore_narrative TEXT       -- 鬼怪志版固定故事（樣貌、起源、能力）
```

### story_fragments
```sql
id UUID, story_id UUID,
layer TEXT,               -- 'basic'|'lore'
rarity TEXT,              -- 'common'|'rare'
fragment_label TEXT,      -- 痕跡標籤（短，幾個字）→ sealed_narrative 佔位符對應
fragment_text TEXT,       -- 痕跡描述（一句話）
time_condition TEXT, weather_condition TEXT, date_condition TEXT,
motif_tags TEXT[] DEFAULT '{}', is_user_submitted BOOLEAN DEFAULT false
```

### fragment_atmosphere
```sql
id UUID, story_fragment_id UUID,
atmosphere_text TEXT      -- 第一人稱，3-5句，只描述異常不說原因
```

### fragment_scenes
```sql
id UUID, story_fragment_id UUID,
layer_index INTEGER,      -- 1開始
atmosphere_text TEXT,     -- 場景敘事推進文字（構成 exploration_narrative）
is_skippable BOOLEAN      -- true=氛圍層選什麼都過；false=有對錯
```

### scene_options
```sql
id UUID, scene_id UUID,
text TEXT, is_correct BOOLEAN,
fail_text TEXT            -- 正確選項填 ''；is_skippable 層全填 ''
```

### fragments（玩家持有）
```sql
id UUID, player_id UUID, story_fragment_id UUID,
notebook_id UUID,
player_tag TEXT,
exploration_narrative TEXT,  -- 玩家走過的場景敘事串聯
obtained_at TIMESTAMPTZ
```

### notebooks
```sql
id UUID, player_id UUID, name TEXT,
capacity INTEGER DEFAULT 15,
type TEXT DEFAULT 'personal',
status TEXT DEFAULT 'active',  -- 'active'|'sealed'
sealed_at TIMESTAMPTZ, story_id UUID,
sealed_story TEXT              -- 封存後生成的完整故事（sealed_narrative 填入探查敘事）
```

### creature_pages
```sql
id UUID, player_id UUID, story_id UUID,
unlocked_layer TEXT,      -- 'basic'|'lore'
obtained_at TIMESTAMPTZ
```

## AI 生成故事 SQL 的鐵則

使用 `content-generation-prompt.md` 作為模板（v4）。關鍵規則：

1. **所有 id 必須是合法 UUID 格式**，每個不同；UUID 只能含 `[0-9a-f]`，`l`、`o`、`g` 等非 hex 字元會導致 INSERT 靜默失敗
2. **stories.difficulty** 只能填 `'normal'`、`'rare'`、`'legendary'`
3. **story_fragments.layer** 只能填 `'basic'`、`'lore'`
4. **story_fragments.rarity** 只能填 `'common'`、`'rare'`
5. **story_fragments 不再有 `difficulty` 或 `text` 欄位**，改為 `fragment_label` + `fragment_text`
6. **fragment_scenes 必須包含 `is_skippable`**（basic 第一層可 true；lore 全部 false）
7. **sealed_narrative 的 `{佔位符}` 必須和 `fragment_label` 完全一致**
8. **lore_narrative 是固定文字，不含佔位符**
9. **單引號用 `''` 跳脫**，不使用反斜線

## 尚未實作

- **鬼怪等級層數**：ExplorationOverlay 依 `stories.difficulty` 決定探查層數（normal=3、rare=4、legendary=5）
- 聯靈筆記本（多人協作，DB schema 已預留 `shared_notebooks` 等表）
- Meta Horror 隨機事件（DB 表 `meta_horror_events` 已建）
- Web Push 推播通知（體力回滿提醒）
- 天氣/時辰條件篩選（`weather.js` 已寫好，Map.jsx 查詢時尚未套用）
- 付費金流
- 玩家投稿流程
- 鬼怪筆記本 UI（`creature_pages` 已在 DB 解鎖，書架頁待設計入口）
- 協會等級加權計算（普通×1、稀有×2、傳說×3；鬼怪志版額外×1.5）
- 完整帳號刪除（目前刪除 players 記錄 + signOut，auth.users 記錄留存在 Supabase）
- 筆記本改名後 NotebookView 的 nameVal state 透過 useEffect 同步，若多人/多頁同時操作可能有短暫延遲
