# 靈異筆記 — 部署指南

## 一、Supabase 設定

1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 在 **SQL Editor** 依序執行：
   - `supabase/migrations/001_schema.sql`（建立所有表格 + RLS）
   - `supabase/migrations/002_seed.sql`（植入故事與探查節點）
3. 複製 **Project URL** 與 **anon public key**（Settings → API）

## 二、本機開發

```bash
cp .env.example .env
# 填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 三、GitHub 設定

1. 建立 GitHub repository，push 所有程式碼
2. 在 Repository → Settings → Secrets and variables → Actions 加入：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VERCEL_TOKEN`（從 Vercel 帳號取得）
   - `VERCEL_ORG_ID`（Vercel 專案設定）
   - `VERCEL_PROJECT_ID`（Vercel 專案設定）

## 四、Vercel 設定

1. 前往 [vercel.com](https://vercel.com)，Import GitHub repository
2. Framework Preset 選 **Vite**
3. Environment Variables 加入：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

之後每次 push 到 `main` 都會自動部署。

## 五、PWA 安裝圖示（選填）

在 `public/icons/` 放入：
- `icon-192.png`（192×192）
- `icon-512.png`（512×512）

目前使用 SVG placeholder，正式上線前建議換成實際圖示。

---

## 架構圖

```
玩家 (PWA)
  │
  ├─ React + Vite (Vercel 部署)
  │     ├─ 地圖頁：Leaflet + GPS + CartoDB Dark tiles
  │     ├─ 筆記本頁：碎片管理 + 標籤 + 封存
  │     ├─ 書架頁：封存筆記本 + 鬼怪筆記本
  │     └─ 商城頁：道具購買（示範）
  │
  └─ Supabase
        ├─ Auth：Email/Password
        ├─ PostgreSQL：所有遊戲資料
        ├─ RLS：每位玩家只能讀寫自己的資料
        └─ Realtime：（預留給聯靈筆記本）

外部 API（免費，無需 key）：
  ├─ Open-Meteo：天氣條件
  └─ 瀏覽器 Geolocation API：GPS 定位
```

## 資料庫表格總覽

| 表格 | 說明 |
|------|------|
| `stories` | 故事定義（系統資料）|
| `story_fragments` | 碎片定義（系統資料）|
| `exploration_nodes` | 探查節點與選項（系統資料）|
| `players` | 玩家資料與體力 |
| `notebooks` | 玩家筆記本 |
| `fragments` | 玩家持有的碎片（必定在某本筆記本中）|
| `creature_pages` | 已解鎖的鬼怪筆記本頁面 |
| `meta_horror_events` | Meta Horror 觸發記錄 |
