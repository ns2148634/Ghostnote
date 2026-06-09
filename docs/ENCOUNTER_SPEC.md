# 靈異筆記 — 遭遇系統規格（兩條軸 + climax 手勢 + 取得閘）

定義一場「通靈深入」遭遇怎麼跑、碎片怎麼判定拿不拿得到。
Code 照此建引擎；內容生成照此寫選項與門檻。建立在現有「訊號格」之上。

---

## 0. 設計目標（為什麼這樣定）

- **碎片是賺來的,不是保證的。** 表現不夠 → 空手,不是「拿到低階碎片」。難度逼玩家認真讀她的反應。
- **難度不對稱**:`basic` 對用心的玩家大致拿得到(穩定進度、不嚇跑休閒玩家);**真正的難和稀有集中在 `lore`**(定義鬼怪的大獎)。
- **失敗要可讀**:輸是「我讀錯了」,不是「運氣差」。可重來,但每次感知扣 1 靈力作為節奏與賭注。

---

## 1. 兩條軸

| 軸 | 範圍 | 起始 | 意義 | 誰會動它 |
|----|------|------|------|----------|
| **訊號格 clarity** | 0–5 | basic 3 / lore 2 | 你和牠的接通穩不穩(生存) | `signal_delta`：突兀動作扣、貼當下守 |
| **信任 trust** | 0–5 | 0 | 牠願不願意對你敞開(進展) | `trust_delta`：問對(關於牠)升、貪心降 |

- **信任只用於「有 encounter_archetype 的鬼」的 `lore` 遭遇**。basic 遭遇與無原型的鬼:trust 不啟用(`trust_delta` 視為 0)。
- 兩軸做不同的事:clarity 管「別搞砸」,trust 管「牠願不願意讓你看見真相」。一個安全但敷衍的回應 clarity 不掉、trust 也不漲 → 原地耗層。

---

## 2. 選項模型

每個 `scene_options` 帶兩個增減值:

- `signal_delta` ∈ `{ -2, -1, 0, +1 }`（不對稱:最好 +1、最差 −2）
- `trust_delta` ∈ `{ -2, -1, 0, +1, +2 }`（僅 archetype lore 用;其餘填 0）

**回血稀有**:`signal_delta = +1` 每場遭遇最多出現一次,只給「神準的讀」(通常在最後一層)。其餘「對的讀」給 `0`（守住,不回血）。→ clarity 是消耗資源,起始格≈你的上限。

**每層抽 3 個選項(drawOptions)**:
- **basic（單軸）**:保證 **1 個 `signal_delta ≥ 0`（活路）+ 2 個 `signal_delta < 0`（壞）**。
- **archetype lore（雙軸）**:保證 **至少 1 個 `signal_delta < 0`（生存風險）** 且 **至少 1 個 `trust_delta > 0`（進展之路）**;其餘負向填滿。活路與進展可以是同一個選項,也可以分開(製造「守 clarity 還是搏 trust」的取捨)。
- `is_skippable = true` 的層:所有選項 `signal_delta = 0`、`trust_delta = 0`（純氛圍,不動軸;僅 basic 首層可用）。

---

## 3. 取得閘（核心:拿不拿得到碎片）

結算有三種出口:`faded`（散去）、`missed`（接通了但不夠,沒留下）、`fragment`（拿到,分 high/low）。**只有 `fragment` 會拿到碎片。**

**通用硬條件**
- 任何時候 `clarity` 歸 0 → **`faded`**,遭遇結束,**空手**。

**到最後一層、且 `clarity > 0` 時判定:**

### basic 碎片（單軸）
- `clarity ≥ BASIC_GET_MIN(=2)` → **`fragment`**
  - tier：`clarity ≥ HIGH_TIER_MIN(=4)` → `high`，否則 `low`
- `clarity < 2`（即 1）→ **`missed`**：「接通了,卻沒能留下痕跡。」空手。

### lore 碎片（archetype，雙軸 + 手勢）
- 條件:`clarity ≥ 1`(撐到climax) **且** `trust ≥ TRUST_GATE(=3)`：
  - 觸發 climax 手勢:
    - 手勢成功 → **`fragment`**, tier `high`
    - 手勢失敗(打斷/手抖) → **`fragment`**, tier `low`（你瞥見了,但沒好好送她一程）
- `trust < 3`（撐到了但沒建立足夠信任）→ **`missed`**：「她始終沒對你敞開。」**拿不到 lore**,可重來。

> 設計重點:lore 真正的難關是「全程在更殘酷的判斷層裡(起始 clarity 2、層層判斷),一邊不讓 clarity 歸 0、一邊把 trust 拉到 3」。手勢只決定 high/low,不額外卡「拿不拿得到」（手勢偏手感,不該因手抖就全空)。

### lore 碎片（無 archetype，單軸退化）
- `clarity ≥ LORE_GET_MIN(=2)` → `fragment`（tier 同 basic 規則）;否則 `missed`。

---

## 4. climax 手勢

只出現在 **archetype lore 碎片的最後一層**,且 `trust ≥ climax_min_trust` 才觸發。

| climax_type | 對應原型 | 玩家動作 | 成功 / 失敗 |
|-------------|----------|----------|-------------|
| `hold_listen` | 正確回應型 | 按住〔傾聽〕,讓牠把自己的話說完(字跑完約 3–4s) | 撐住=成功 / 提早放開=打斷=失敗 |
| `look_away` | 別直視型 | 牠現身,往別處點/滑開視線 | 移開=成功 / 直視太久=失敗 |
| `stay_still` | 靜止節奏型 | 牠靠近時別動(一段時間不觸碰螢幕) | 不動=成功 / 亂動=失敗 |
| `tap_echo` | 正確回應型(替代) | 牠敲一段節奏,你照著敲回去 | 對=成功 / 錯=失敗 |

先實作 `hold_listen`（椅仔姑用),其餘原型沿用同一套「成功=high / 失敗=low」介面,之後再加。

---

## 5. 出現機率（availability，signals.js）

「能不能遇到」與「能不能拿到」分開。在現有的條件加權、已持有降權之外,**再乘一個稀有度權重**,讓 rare/lore 浮現得更少:

```
RARITY_WEIGHT = { common: 1, rare: 0.4, lore: 0.15 }
fragmentWeight *= RARITY_WEIGHT[fragment.rarity 或 layer 對應]
```

（lore 走 0.15;basic-rare 走 0.4;basic-common 走 1。）

---

## 6. 參數總表

```js
// exploration（取得/兩軸）
CLARITY_MAX    = 5
START_CLARITY  = { basic: 3, lore: 2 }
TRUST_MAX      = 5
START_TRUST    = 0
TRUST_GATE     = 3      // lore：climax 觸發 & 拿到 lore 的信任門檻
BASIC_GET_MIN  = 2      // basic：最後 clarity ≥ 2 才拿到（1 = missed）
LORE_GET_MIN   = 2      // 無原型 lore 的退化門檻
HIGH_TIER_MIN  = 4      // 成功時 clarity ≥ 4 = high（lore 由手勢決定 high/low）
// signal_delta ∈ {-2,-1,0,+1}（+1 每場 ≤1 次）；trust_delta ∈ {-2,-1,0,+1,+2}

// signals（出現機率）
RARITY_WEIGHT  = { common: 1, rare: 0.4, lore: 0.15 }
DAILY_ROSTER_SIZE = 6
IMPRESSION_COUNT  = 3
COND_FACTOR    = { match: 3, neutral: 1, mismatch: 0.25 }
OWNED_FACTOR   = 0.15
```

> 想更狠的旋鈕:`BASIC_GET_MIN` 3（basic 不容一次淨損)、`TRUST_GATE` 4（lore 更難敞開)、`RARITY_WEIGHT.lore` 0.08。先用上表測,再調。

---

## 7. Schema 追加

```sql
-- 鬼的遭遇原型（NULL = 純訊號格、不啟用信任/手勢）
ALTER TABLE stories ADD COLUMN IF NOT EXISTS encounter_archetype TEXT;
-- 'correct_response' | 'avoid_notice' | 'be_remembered' | 'avoid_gaze' | 'stay_still' | NULL

-- 選項的第二軸
ALTER TABLE scene_options ADD COLUMN IF NOT EXISTS trust_delta SMALLINT DEFAULT 0;

-- climax 手勢（只在 archetype lore 的最後一層填）
ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_type TEXT;        -- 如 'hold_listen'
ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_text TEXT;        -- 手勢中跑的字
ALTER TABLE fragment_scenes ADD COLUMN IF NOT EXISTS climax_min_trust SMALLINT; -- 通常 = TRUST_GATE
```

---

## 8. 引擎邏輯（applyChoice 結算,虛擬碼）

```
state = { clarity: START_CLARITY[layer], trust: START_TRUST, layerIndex: 0 }
useTrust = (story.encounter_archetype != null) && (fragment.layer == 'lore')

onChoice(option):
  clarity = clamp(clarity + option.signal_delta, 0, CLARITY_MAX)
  if useTrust: trust = clamp(trust + option.trust_delta, 0, TRUST_MAX)

  if clarity == 0: return { outcome: 'faded' }          // 散去，空手
  if not lastLayer: { layerIndex++; return { outcome:'continue', clarity, trust } }

  // ---- 最後一層、clarity > 0 ----
  if fragment.layer == 'basic':
     if clarity >= BASIC_GET_MIN:
        return { outcome:'fragment', tier: clarity>=HIGH_TIER_MIN ? 'high':'low' }
     else:
        return { outcome:'missed' }                      // 沒留下痕跡，空手

  if fragment.layer == 'lore':
     if useTrust && scene.climax_type:
        if trust >= scene.climax_min_trust:
           runClimax(scene.climax_type, scene.climax_text):
              success -> return { outcome:'fragment', tier:'high' }
              fail    -> return { outcome:'fragment', tier:'low'  }
        else:
           return { outcome:'missed' }                   // 她沒敞開，拿不到 lore
     else: // 無原型 lore
        return clarity>=LORE_GET_MIN ? { outcome:'fragment', tier: clarity>=HIGH_TIER_MIN?'high':'low' }
                                     : { outcome:'missed' }
```

`outcome`:`continue` / `faded`（clarity 歸 0,散去）/ `missed`（撐到了但不夠,空手）/ `fragment`（拿到,tier high|low）。**只有 `fragment` 進 FragmentReveal。** `faded` 與 `missed` 用不同的氛圍收尾文字（散去 vs 沒敞開/沒留下）。

---

## 9. 遭遇原型：正確回應型（範例,完整定義）

- `encounter_archetype = 'correct_response'`
- **第二軸 = 信任**:牠問問題/敲擊回答;你的回應「關於牠、有耐心」→ +trust;貪心問運勢 → −trust;突兀(抓、吼、湊近) → −clarity。
- **climax = `hold_listen`**:trust 到門檻,牠第一次要問自己的事 → 按住傾聽,別打斷。
- **椅仔姑** 即用此原型。

其餘原型(別被注意 / 被記得 / 別直視 / 靜止節奏)沿用同一骨架:換「第二軸的意義」+「climax_type」,引擎不變。先做正確回應型驗證,再擴。

---

## 10. 實作分期（建議,降風險）

- **Phase 1（先上、便宜驗證）**:做「取得閘 + 選項調硬 + 出現機率」——即 §3 的 basic 門檻、§2 的 1 活路+2 壞與回血稀有、§5 的稀有度權重。**先不做信任/手勢**,lore 暫走「無原型退化」(單軸 clarity ≥ 2)。這就能解決「太容易、隨便都拿得到」。
- **Phase 2（驗證後再投資）**:加 `trust` 第二軸 + `climax` 手勢到 archetype 的 lore(椅仔姑先行)。Schema 欄位可在 Phase 1 一起加好（NULL 不影響),邏輯 Phase 2 再開。
