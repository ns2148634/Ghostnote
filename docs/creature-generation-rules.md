# 靈異筆記 — 鬼怪內容生成規則（訊號清晰度 + 分層結局 + 出沒規律）

## 故事結構

每個鬼怪對應一筆 `stories`，底下有多片 `story_fragments`（碎片）。

### 鬼怪等級與碎片數量

| difficulty | basic 碎片 | lore 碎片 | 探查層數 |
|-----------|-----------|----------|---------|
| `normal`  | 4-6 片    | 2-3 片   | 3 層    |
| `rare`    | 7-9 片    | 4-5 片   | 4 層    |
| `legendary` | 10-13 片 | 5-6 片  | 5 層    |

---

## 三層內容結構（層層相關）

每隻鬼的故事由淺到深分三層，都在講同一隻鬼：
1. **異常點**（`fragment_atmosphere`）：感知頁浮現的**很短一句**提示，帶鬼怪味、留懸念，讓玩家感覺「這像不像我要找的那類」。
2. **碎片敘事**（`fragment_scenes`）：深入探查後親身走過的多層遭遇。
3. **鬼怪志**（`lore_narrative`）：集齊封存後揭曉的完整檔案。

異常點是碎片敘事的入口暗示，碎片敘事是鬼怪志的局部。三者要呼應。

---

## 探查模型：訊號清晰度

探查**沒有正確答案**。玩家深入探查後走過固定層數，每層選一次，選擇增減「訊號格」，靠讀當下氛圍憑第六感判斷。

- **訊號格** 0–5，clamp
- **起始格數**：basic 3 格、lore 2 格
- **層數**：normal 3 / rare 4 / legendary 5（由 fragment_scenes 的 layer_index 數量決定）
- **每層** 抽 3 個選項，每個帶一個 `signal_delta`
- **結算**：格數歸 0 → 存在散去（空手）；撐到最後一層且 ≥1 → 得到碎片
- 層數越多越難；lore 起始格少又全是判斷層，最易斷

設計時心裡記著：basic 容錯高（起手 3 格、可有氛圍層），lore 殘酷（起手 2 格、每層都扣得到）。

### 分層結局（最後一層）

撐到最後一層成功後，依「剩餘訊號格」顯示不同收尾文字：
- **ending_high**：剩 4–5 格（乾淨接通）——從容、清晰的收尾
- **ending_low**：剩 1–3 格（差點斷線）——驚險、勉強留住的收尾

**拿到的碎片完全一樣**，分層只換一句收尾氛圍，不是給更多獎勵（避免逼玩家追高分，跟低壓力定位衝突）。兩句都第一人稱、2-3 句，延續場景氛圍。只有每片碎片的**最後一層**要填這兩欄，其餘層 NULL。

---

## 出沒規律：time / weather / date 條件

碎片的 `time_condition` / `weather_condition` / `date_condition` 決定它在調頻時**訊號的強弱**，不是硬開關（程式用軟加權）：

- 條件 **NULL** → 常駐弱訊號，隨時可遇
- 條件**吻合當下環境** → 訊號增強，這個時機更容易掃到
- 條件**不吻合** → 訊號很弱，偶爾仍可能遇到（不會消失，收集不卡死）

用法是**營造「鬼的出沒規律」**，讓玩家學得會何時去找，而不是把鬼鎖死：

- **common 基礎碎片**：多數留 NULL（常駐）
- **想營造氣氛的鬼**：填 1 個條件（夜班的人 → `time='night'`）
- **稀有 / lore**：填 2–3 個條件做成「對的時機才強」（某鬼 `night` + `rain`，雨夜最強）

可用值：
- `time_condition`：`NULL` / `'dawn'` / `'day'` / `'dusk'` / `'night'`
- `weather_condition`：`NULL` / `'clear'` / `'cloudy'` / `'rain'` / `'fog'`
- `date_condition`：`NULL` / `'ghost_month'` / `'qingming'` / `'dongzhi'`

（每日輪替由程式用日期種子自動處理，決定今天哪幾隻在線上；內容端只要填好條件即可。）

---

## 碎片分類

| layer | rarity | 說明 | 探查體驗 | 封存用途 |
|-------|--------|------|----------|----------|
| basic | common | 一般遭遇，看到蹤跡與異常現象 | 起始 3 格，第 1 層可為氛圍層 | 基礎版筆記本 |
| basic | rare | 稀有遭遇，更強烈的異常現象 | 起始 3 格 | 基礎版筆記本 |
| lore | rare | 直接遭遇鬼怪本體，看清楚樣子 | 起始 2 格，所有層皆為判斷層 | 鬼怪志版筆記本（必要條件） |

**rarity 只能填 `'common'` 或 `'rare'`，layer 只能填 `'basic'` 或 `'lore'`。**

---

## 封存結果

| 條件 | 封存版本 | 內容 |
|------|---------|------|
| 集齊所有 basic 碎片 | 基礎版筆記本 | 玩家探查敘事填入 sealed_narrative 骨架，每人版本不同 |
| 集齊所有 basic + lore 碎片 | 鬼怪志版筆記本 | 固定的 lore_narrative，鬼怪的樣貌、起源、能力 |

---

## 每片碎片的三層內容

### 1. fragment_atmosphere（異常點）

感知頁上浮現的短提示池。

- 每片碎片 3-5 條，第一人稱，**每條只有很短的一句**（約 10-25 字），結尾用「…」留懸念
- 帶這隻鬼的味道，讓玩家一眼感覺到「類別」，但不講破
- 不是長段落（長的遭遇敘事寫在 fragment_scenes）；它只是讓玩家決定「要不要深入這個」的那一瞥

#### 寫法：短、帶味、留懸念

✅ 正確（短、有鬼怪味、留「…」）：
- 屍鼠：「陰暗的角落似乎有個影子…」「床腳邊好像蜷著什麼…」
- 夜班的那個人：「打烊的店裡，打卡機剛響了一聲…」
- lore（壓迫感更強，距離更近）：「走廊盡頭那個白影，正轉過頭來…」

❌ 錯誤：
- 「那棟公寓四樓有一間房間的燈還亮著。管理員說那間空置兩年了，我數了數，窗裡的燈光在緩慢地移動。」（太長，像段落，感知頁變考卷）
- 「走廊裡站著一個穿婚紗的女人，她轉過頭來。」（講破了，沒懸念）

---

### 2. fragment_scenes（場景池）

- 每片碎片每層**恰好 1 個場景**（不能多）
- 場景內容是**進入現場後的遭遇敘事**，串起來構成玩家的探查記錄
- `is_skippable`：
  - `true`：氛圍鋪陳層，**此層所有選項 signal_delta 都是 0**；**僅用於 basic**
  - `false`：判斷層，選擇增減訊號格；**lore 碎片所有層必須 false**
- **最後一層**填 `ending_high` / `ending_low`（分層結局）；非最後一層填 `NULL`

#### is_skippable 建議配置

**basic（3 層）**：層1 `true`、層2 `false`、層3 `false`
**basic（4 層 rare）**：層1 `true`、層2–4 `false`
**lore（所有等級）**：所有層 `false`，沒有例外

#### 場景深度原則

- 第 1 層：進入現場，建立環境，壓力低
- 第 2 層：發現異常細節，開始需要判斷
- 最後一層：最接近鬼怪核心，壓力最大（deltas 最狠），並附 ending_high / ending_low

---

### 3. scene_options（選項池）

每個選項帶一個 `signal_delta`，值只能是 `+1 / 0 / −1 / −2`：

| delta | 意義 |
|-------|------|
| `+1` | 最貼當下氣氛的讀法，穩住接通 |
| `0` | 中性 |
| `−1` | 偏離 |
| `−2` | 最突兀、最糟的誤讀，掉很快 |

**沒有「全域正確」的選項**——delta 相對於「這個場景的氣氛」。同一個動作在這個場景可能 +1，在別的場景可能 −1。想的是「在這個當下，這個反應對不對味」，不是邏輯對錯。

**選項池配置**：
- 判斷層：放 **2-3 個正向（+1 / 0）+ 4-6 個負向（−1 / −2）**，必須同時有 delta≥0 與 delta<0
- 氛圍層（is_skippable=true）：所有選項 signal_delta = 0
- 遊戲每層隨機抽 1 活路 + 1 錯步 + 1 隨機，隨機排序

**result_text（每個選項都要有）**：
- 寫「選了這個之後，現場發生什麼」——**純粹的現場反應**
- **絕對不要出現「訊號」「清晰度」「接通」這類系統詞，也不要寫「+1／減弱」**。好壞讓玩家從畫面和格數自己感覺，不要系統明說（會打斷閱讀）
- 不要寫「結束」「永遠消失」這種終局字眼（終局與分層收尾由系統處理）

✅ 正向：「它沒有退開，反而更靠近了一點。」
✅ 負向：「你的聲音讓走廊的感應燈全滅，只剩門縫透著光。」
❌ 不要：「訊號穩住了。」「訊號開始散。」「接通了。」（系統口吻，出戲）
❌ 不要：「你選錯了，異常消失了。」（直白終局）

---

## SQL 生成規則

### 插入順序

1. `stories`（含 sealed_narrative + lore_narrative + image_slug）
2. `story_fragments`（含 layer、rarity、fragment_label、fragment_text、**出沒條件**）
3. `fragment_atmosphere`（每片 3-5 條）
4. `fragment_scenes` + `scene_options`（每層 1 場景，CTE 接選項；**最後一層帶 ending_high/ending_low**）

### UUID 規則

- 合法 UUID，只能含 `[0-9a-f]`；`g`/`l`/`o`/`s`/`w`/`h` 等非 hex 會 INSERT 失敗
- **只有 `stories` 和 `story_fragments` 的 id 用固定 UUID**；其餘表一律 `gen_random_uuid()`
- 建議 Python `str(uuid.uuid4())` 批次產生固定 UUID

### CTE 寫法（必須遵守）

```sql
-- 最後一層（含分層結局）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'fragment-uuid', 3, '最終層場景', false,
          '剩4-5格的乾淨收尾。', '剩1-3格的驚險收尾。')
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('貼當下的選擇', 1, '它沒有退開，反而更靠近了一點。'),
  ('偏離的選擇', -1, '那股氣息退遠了一些。'),
  ('突兀的選擇', -2, '你的動作讓它縮回了黑暗裡。')
) AS v(text, signal_delta, result_text);

-- 非最後一層：ending_high / ending_low 填 NULL
```

> ⚠️ **CTE snapshot 陷阱**：同語句內 CTE 寫入的列對其他查詢不可見，必須透過 `RETURNING` 引用。每個場景用獨立 CTE，不要把多個 INSERT 串成共用一個 CTE。

fragment_atmosphere 寫法：
```sql
INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), 'fragment-uuid', v.txt
FROM (VALUES ('氛圍1'), ('氛圍2'), ('氛圍3')) AS v(txt);
```

### 其他欄位規則

- `difficulty`：`'normal'`/`'rare'`/`'legendary'`
- `layer`：`'basic'`/`'lore'`；`rarity`：`'common'`/`'rare'`
- `time_condition`：`NULL`/`'dawn'`/`'day'`/`'dusk'`/`'night'`
- `weather_condition`：`NULL`/`'clear'`/`'cloudy'`/`'rain'`/`'fog'`
- `date_condition`：`NULL`/`'ghost_month'`/`'qingming'`/`'dongzhi'`
- `signal_delta`：`-2`/`-1`/`0`/`1`
- 判斷層選項池必須同時有 delta≥0 與 delta<0；is_skippable=true 層全 delta=0
- 每個選項都要有 result_text
- **最後一層必須有 ending_high + ending_low；非最後一層 NULL**
- 出沒條件依「出沒規律」原則填，多數 common 留 NULL
- `sealed_narrative` 佔位符與 `fragment_label` 完全一致；`lore_narrative` 不含佔位符
- 單引號用 `''` 跳脫，不使用反斜線

---

## 鬼怪圖片規格

- 欄位 `stories.image_slug`（英文小寫 + 底線，不含副檔名）
- 位置 `public/creatures/{image_slug}.webp`；600 × 800 px 直式；WebP < 120 KB（備一張 PNG）
- 畫風：水墨插畫，深黑背景 #080604，灰白冷光 + 暖金線條 #c9b99a，汙漬老化感，CRT 噪點

### 已知鬼怪 image_slug

| 鬼怪 | image_slug | 鬼怪 | image_slug |
|------|-----------|------|-----------|
| 屍鼠 | shushi | 夜班的那個人 | night_shift |
| 廁所花子 | hanako | 最後一班的乘客 | last_passenger |
| 新娘電梯 | elevator_bride | 三點十七分的同事 | 317_coworker |
| 隔壁的鄰居 | neighbor | 對面的那個人 | metro_stranger |
| 三樓的轉學生 | transfer_student | | |

---

## 內容品質要求

### 碎片品質

- basic 碎片：蹤跡與異常，**不直接看到鬼怪本體**
- lore 碎片：直接遭遇本體，壓迫感遠強於 basic，每層都是判斷層
- 碎片之間有隱性關聯，但不太明顯
- result_text 純現場反應，不出現「訊號/清晰度」等系統詞，不說「錯了」也不說「結束」
- 異常點（fragment_atmosphere）每條只有很短一句、帶鬼怪味、留「…」
- 越深層越恐怖；最後一層 deltas 最狠，並寫好兩段分層收尾

### 鬼怪設計原則

**避免的公式**：「人形站著等人」「看見玩家就追」「不看它就沒事」

**好的鬼怪**：有自己的存在邏輯，在做自己的事，玩家只是碰巧出現。
- 它還在趕一份三年前沒完成的工作（故障廁所隔間）
- 它以為自己還在等末班車，不知道過了二十三年
- 它在等有人記得它的名字
- 它的存在範圍固定，只要不打擾就沒事

**存在邏輯三問**：1. 它在做什麼？（不是「等待玩家」）2. 為什麼還在這裡？（具體原因）3. 什麼情況下會反應？（明確觸發）

### 選項設計原則

三個選項都要**極度合理**，靠感知和直覺，不是靠邏輯排除——在訊號模型下更重要，因為沒有「正確答案」，全靠對味。

好：「保持靜止」vs「慢慢靠近」vs「退後一步」→ 三個都合理
壞：「保持靜止」vs「大聲喊叫」vs「拿手電筒照」→「大聲喊叫」明顯該排除

delta 靠「對不對味」分配：在它正在等待、不願被打擾的場景，靜止/緩慢=正向，出聲/強光/突然移動=負向；換一個它想被看見的場景，移開視線反而可能是負向。**讓 delta 跟著場景情緒走，不要每個場景都用同一套答案**，玩家才無法靠記憶通關。
