# 靈異筆記 — CLAUDE.md

## 專案概述

推理型都市傳說收藏 PWA 手遊。玩家探查地圖上的異常點、收集故事碎片、組合封存，解鎖鬼怪筆記本。

GDD 原始文件：`c:\Users\ewnut\Downloads\paranormal-notebook-gdd (1).md`

## 技術棧

- **前端**：React 18 + Vite + vite-plugin-pwa（PWA）
- **樣式**：Tailwind CSS（深色靈異主題）
- **地圖**：react-leaflet + CartoDB Dark tiles + 瀏覽器 Geolocation API
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
    ├── BookshelfPage.jsx 封存書架（純書架，無鬼怪筆記本頁）
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
2. 逐一比對所有故事的各層次（basic / detail / lore）
3. 若筆記本碎片完整包含某層次所有必要碎片 → 成功，解鎖 `creature_pages`，贈一本空白筆記本
4. 失敗回饋三種文案：碎片不足、有異 story 碎片、數量符合但組合錯

### 探查流程（Map.jsx + ExplorationOverlay.jsx）

```
點擊玩家定位點（-1體力）→ 異常點生成 → 點擊異常點（免費氛圍描述）
→ 深入探查（-1體力）→ 多層選擇題（打字機效果）→ 成功/失敗
→ 成功：NotebookSelectModal 選擇目標筆記本 → 放入碎片 → 異常點消失
```

`pendingFrag` 狀態結構為 `{ frag, anomalyId }`，保留 anomalyId 以便選完筆記本後正確清除異常點。

地圖頁 UI 層次（由下至上）：
1. Leaflet 地圖（CartoDB Dark）
2. radial-gradient 暗角 vignette
3. 頂部狀態欄（時辰 + 異常數量 + GPS 座標）
4. 掃描中：全畫面置中三層擴散光環動畫
5. 右下角「⊕」定位按鈕（z-1100，高於 Leaflet 控制層 z-1000）

### Auth 流程

- **Google**：`signInWithOAuth({ provider: 'google' })` → 跳轉回 `window.location.origin`
- **Email OTP**：`signInWithOtp({ email })` → 寄送 6 位驗證碼 → `verifyOtp({ email, token, type:'email' })`

### 首次登入名稱設定（SetupName.jsx）

`usePlayer` 建立新玩家時 `display_name` 預設為空字串 `''`，並設 `isNew = true`。
`App.jsx` 在 player 存在但 `isNew` 為 true 時，攔截路由顯示 `SetupName` 頁面。
玩家輸入名稱 → `updateName()` 寫入 DB → `setIsNew(false)` → 進入遊戲。

> Supabase `players.display_name` 欄位需允許空字串（預設值改為 `''`）：
> ```sql
> ALTER TABLE players ALTER COLUMN display_name SET DEFAULT '';
> ```

### 地圖定位點互動

玩家自身定位 Marker 可點擊即觸發掃描（消耗 1 格體力），這是唯一的掃描入口（已移除底部圓形掃描按鈕）。
定位點為 28px 圓形觸控區，中心 10px 金點，掃描中外圈光暈加強。
右下角 `⊕` 按鈕可重新將地圖置中至玩家目前位置（不消耗體力）。

### 新增故事內容

在 `story_fragments` 和 `exploration_nodes` 表格插入資料即可。
每片碎片需要：
- `layer_index=0` 的節點（免費氛圍描述，`options` 為 null）
- `layer_index=1+` 的節點（普通碎片 2 層 / 困難碎片 3 層）
- 每層 3 個選項，各有 `is_correct` 和 `fail_text`

## 尚未實作

- 聯靈筆記本（多人協作，DB schema 已預留 `shared_notebooks` 等表）
- Meta Horror 隨機事件（DB 表 `meta_horror_events` 已建）
- Web Push 推播通知（體力回滿提醒）
- 天氣/時辰條件篩選（`weather.js` 已寫好，Map.jsx 查詢時尚未套用）
- 付費金流
- 玩家投稿流程
- 鬼怪筆記本 UI（`creature_pages` 已在 DB 解鎖，但書架頁已拿掉該 tab，待另行設計入口）
- 協會等級系統（目前稱號依封存本數判斷，無 XP 計算）
- 完整帳號刪除（目前刪除 players 記錄 + signOut，auth.users 記錄留存在 Supabase）
- 筆記本改名後 NotebookView 的 nameVal state 透過 useEffect 同步，若多人/多頁同時操作可能有短暫延遲
