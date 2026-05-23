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

遷移檔案在 `supabase/migrations/`：
- `001_schema.sql` — 所有表格定義 + RLS 政策
- `002_seed.sql` — 故事內容（屍鼠、三樓的轉學生）
- `003_scene_pool.sql` — 新增場景池三個表格（待建立）

在 Supabase SQL Editor 依序執行即可。

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

地圖頁 UI 層次（由下至上）：
1. 恐怖 Scanner 背景（`#080604` + CRT scanlines + 5 層雷達環 + 十字準線）
2. radial-gradient 暗角 vignette
3. 異常點（`anomaly-dot` CSS 脈動，`toScreen()` 依 GPS 偏移轉換為 % 座標）
4. 玩家點（畫面正中心，點擊 = 掃描，44px 觸控區）
5. 頂部狀態欄（時辰 + 偵測訊息 + GPS 座標）
6. 掃描中：三層擴散光環動畫

**已移除 react-leaflet**：改用 `navigator.geolocation.watchPosition`，Map chunk 從 165 kB → 11 kB。
`toScreen(playerPos, anomaly)` 用 GPS 偏移（約 1 km = ±28%）計算螢幕 % 座標。

### 探查隨機邏輯（新架構，取代固定 exploration_nodes）

每片碎片有三層獨立的內容池，探查時動態隨機抽取：

```javascript
// 1. 免費氛圍描述：從 fragment_atmosphere 隨機抽一條
async function getAtmosphere(fragmentId) {
  const { data } = await supabase
    .from('fragment_atmosphere')
    .select('*')
    .eq('story_fragment_id', fragmentId)
  return randomPick(data)
}

// 2. 每層選擇題：從場景池抽場景，再從選項池抽三個
async function getLayerContent(fragmentId, layerIndex) {
  // 隨機抽一個場景
  const { data: scenes } = await supabase
    .from('fragment_scenes')
    .select('*')
    .eq('story_fragment_id', fragmentId)
    .eq('layer_index', layerIndex)
  const scene = randomPick(scenes)

  // 從選項池抽三個（必須含一個正確）
  const { data: allOptions } = await supabase
    .from('scene_options')
    .select('*')
    .eq('scene_id', scene.id)

  const correct = randomPick(allOptions.filter(o => o.is_correct))
  const wrongs = randomPick2(allOptions.filter(o => !o.is_correct))
  return { scene, options: shuffle([correct, ...wrongs]) }
}
```

**規則**：
- 每層必須有一個正確選項出現，其餘兩個從錯誤池隨機抽
- 三個選項隨機排序，玩家不知道哪個對
- 選錯任何一層直接結束，異常點已消失（深入探查時就移除了）

### 鬼怪等級與探查層數

| 等級 | 基礎版碎片 | 鬼怪志額外碎片 | 探查層數 |
|------|-----------|--------------|----------|
| 普通（normal） | 4-6 片 | +3-4 片 | 3 層 |
| 稀有（rare） | 7-9 片 | +4-5 片 | 4 層 |
| 傳說（legendary） | 10-13 片 | +5-6 片 | 5 層 |

探查層數由 `stories.difficulty` 決定，`ExplorationOverlay` 依此決定要走幾層。

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

依序在以下表格插入資料：

1. `stories` — 鬼怪基本資料
2. `story_fragments` — 碎片定義（layer: 'basic' 或 'lore'）
3. `fragment_atmosphere` — 每片碎片的免費氛圍描述（建議 3-5 條）
4. `fragment_scenes` — 每片碎片每層的場景（建議每層 3-5 個，layer_index 從 1 開始）
5. `scene_options` — 每個場景的選項（建議 2-3 個正確、4-6 個錯誤）

> ⚠️ 沒有 `fragment_scenes.layer_index >= 1` 記錄的碎片**不會出現在掃描候選清單**中。

## 資料庫 Schema（關鍵表格）

### stories
```sql
id UUID, title TEXT,
difficulty TEXT,          -- 'normal'|'rare'|'legendary'
creature_type TEXT,
creature_description TEXT,
created_at TIMESTAMPTZ
```

### story_fragments
```sql
id UUID, story_id UUID,
layer TEXT,               -- 'basic'|'lore'
text TEXT,                -- 碎片正文（玩家放入筆記本看到的文字）
time_condition TEXT,      -- NULL|'dawn'|'day'|'dusk'|'night'
weather_condition TEXT,   -- NULL|'clear'|'cloudy'|'rain'|'fog'
date_condition TEXT,      -- NULL|'ghost_month'|'qingming'|'dongzhi'
motif_tags TEXT[] DEFAULT '{}',
is_user_submitted BOOLEAN DEFAULT false
```

### fragment_atmosphere（新表）
```sql
id UUID, story_fragment_id UUID,
atmosphere_text TEXT      -- 第一人稱，3-5句，只描述異常不說原因
```

### fragment_scenes（新表）
```sql
id UUID, story_fragment_id UUID,
layer_index INTEGER,      -- 1開始，對應探查層數
atmosphere_text TEXT      -- 這個場景的敘事推進文字
```

### scene_options（新表）
```sql
id UUID, scene_id UUID,
text TEXT,                -- 選項文字
is_correct BOOLEAN,
fail_text TEXT            -- 正確選項填 ''，錯誤選項填選錯後的氛圍敘述
```

### fragments（玩家持有）
```sql
id UUID, player_id UUID, story_fragment_id UUID,
notebook_id UUID,         -- 必定在某一本筆記本中，沒有背包
player_tag TEXT,          -- 玩家自己加的便利貼標籤
obtained_at TIMESTAMPTZ
```

### notebooks
```sql
id UUID, player_id UUID, name TEXT,
capacity INTEGER DEFAULT 15,
type TEXT DEFAULT 'personal',   -- 'personal'|'shared'
status TEXT DEFAULT 'active',   -- 'active'|'sealed'
sealed_at TIMESTAMPTZ, story_id UUID
```

### creature_pages
```sql
id UUID, player_id UUID, story_id UUID,
unlocked_layer TEXT,      -- 'basic'|'lore'
obtained_at TIMESTAMPTZ
```

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
