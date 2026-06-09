-- ================================================
-- 範例 SEED：夜班的那個人（normal）
-- 訊號清晰度版（signal_delta / result_text）的標準範例，取代舊的 example_fixed.sql
--
-- 本檔可直接在 Supabase SQL Editor 執行（需先跑過 005_signal_clarity.sql）。
-- 為求精簡，這裡放 3 basic + 1 lore；正式 normal 鬼怪請依規則放 4-6 basic、2-3 lore。
-- 封存邏輯只要求集齊「這隻鬼定義的所有 basic（或 basic+lore）」，故此精簡版也能完整測試封存。
--
-- 存在邏輯：他在交班時刻打卡上工，補貨、巡店、對著對講機覆誦清單，
--   年復一年輪同一個無人接替的班。只要不打斷他的例行流程，他不會發現你。
-- 訊號 delta 跟著「不要打擾他工作」這個情緒走：
--   靜止 / 順著動線 / 像接班一樣對待 = 正向；
--   出聲 / 搬動他的貨 / 擋路 / 強光 / 直視太久 = 負向。
-- ================================================

INSERT INTO stories
(id, title, difficulty, creature_type, creature_description, sealed_narrative, lore_narrative, image_slug)
VALUES (
  '7c0ffee0-0000-4000-8000-000000000001',
  '夜班的那個人', 'normal', '殘留意識',
  '一名在大夜班當班時猝逝的便利商店店員，死後沒意識到自己已經離開。他保留完整的工作習慣，照常打卡、補貨、巡店、對著對講機覆誦補貨清單，輪著同一個無人接替的班。他對顧客視而不見，除非有人打斷他的例行流程，才會察覺異常並消失。',
  '值班記錄。{多打的卡}。{補不完的貨}。{對講機的雜音}。沒有人告訴他，這個班早就不需要他了——但他還在，準時打卡，把永遠補不完的貨補下去。',
  '「夜班的那個人」是一名在大夜班當班時猝逝的便利商店店員，死後沒有意識到自己已經離開。他保留了完整的工作習慣：在交班時刻打卡上工，補貨、巡店、對著對講機覆誦補貨清單，年復一年輪著同一個無人接替的班。他對顧客視而不見，只專注於把班上完；唯有當有人打斷他的例行流程——搬動他正在補的貨、出聲攀談、擋住他的動線、強光直射——他才會察覺異常，隨即消失。他不具攻擊性，真正讓他停留的是「沒有人來接班」。據說只要有人安靜地承認他、像接班一樣對他點一下頭，他便會卸下值了太久的班，安心離開。他最常出現在凌晨兩點到四點的便利商店，穿著早已停用的舊款制服。',
  'night_shift'
);

-- ================================================
-- basic common：多打的卡
-- ================================================
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  '1a2b3c4d-0001-4001-8001-000000000001', '7c0ffee0-0000-4000-8000-000000000001',
  'basic', 'common', '多打的卡',
  '打卡機上多了一筆上班記錄，沒有對應的員工。',
  'night', NULL, NULL, ARRAY['多出來的一個人'], false
);

INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), '1a2b3c4d-0001-4001-8001-000000000001', v.txt
FROM (VALUES
  ('打烊的店裡，打卡機剛響了一聲…'),
  ('收銀台那台打卡機，自己跳了一筆上班卡…'),
  ('排班表是空的，卻有人準時上了大夜…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0001-4001-8001-000000000001', 1,
    '我走到收銀台後面。打卡機還在運作，最後一筆記錄是兩分鐘前。空氣裡有微波食品和清潔劑的味道，像剛有人在這裡忙過。', true)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('站在打卡機前，看它會不會再響', 0, '你站著等，機器安靜了幾秒，又輕輕跳了一格。'),
  ('沿著收銀台往裡走，看看後場', 0, '你往後場走，越裡面那股忙碌的氣味越清楚。'),
  ('低頭看那疊打卡記錄', 0, '你翻著記錄，上班時間一筆一筆都很準時，準時得不像活人。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0001-4001-8001-000000000001', 2,
    '後場的燈是亮的。今天到貨的箱子被排得整整齊齊，美工刀擱在最上面那箱，刀片還開著。補貨補到一半，人卻不在。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('不要碰那些箱子，安靜站著看他補到哪', 1, '你站著沒動，後場深處傳來紙箱被輕輕推開的聲音。'),
  ('順著箱子排列的方向，往他補貨的動線看過去', 1, '你的視線跟著貨的動線移，那股忙碌的氣息更清楚了。'),
  ('把開著的美工刀收起來', -1, '你一碰那把刀，後場的聲音停了一下。'),
  ('翻看箱子裡是什麼貨', -1, '你掀開箱蓋，補貨的節奏亂了，氣息淡了一些。'),
  ('對著後場喊一聲有沒有人', -2, '你的聲音在貨架間迴盪，那股忙碌瞬間沒了。'),
  ('搬開擋在走道上的箱子', -2, '你一移動他的貨，整個後場安靜下來，像你弄壞了什麼。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0001-4001-8001-000000000001', 3,
    '補貨的聲音就在下一排貨架後面——紙箱拆開、商品一件件上架，節奏穩定得像做了很多年。我繞過去就能看見他，但我知道一旦他發現被打斷，這一切就會停。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('停在貨架這頭，只用聽的，不繞過去', 1, '你站著聽，上架的節奏一件接一件，清楚得像在耳邊。'),
  ('放輕呼吸，順著聲音的節奏等', 1, '你跟著那節奏呼吸，補貨聲始終沒有停。'),
  ('探頭看貨架另一邊', -1, '你一探頭，上架聲頓了半拍，又勉強接上。'),
  ('拿出手機想錄下聲音', -1, '螢幕亮起，那節奏在光亮起時慢了下來。'),
  ('繞過貨架走向聲音', -2, '你一繞過去，那排貨架後面什麼都沒有，聲音也斷了。'),
  ('出聲問他在補什麼', -2, '你開口的瞬間，整間店只剩冷藏櫃的低鳴。')
) AS v(text, signal_delta, result_text);

-- ================================================
-- basic common：補不完的貨
-- ================================================
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  '1a2b3c4d-0002-4002-8002-000000000002', '7c0ffee0-0000-4000-8000-000000000001',
  'basic', 'common', '補不完的貨',
  '貨架在無人值班的深夜被補滿，標籤全部朝外對齊。',
  'night', NULL, NULL, ARRAY['永遠做不完的工作'], false
);

INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), '1a2b3c4d-0002-4002-8002-000000000002', v.txt
FROM (VALUES
  ('剛剛還空著的貨架，回頭已經補滿了…'),
  ('飲料的標籤全朝外對齊，太整齊了…'),
  ('某排貨架傳來商品被擺正的聲音，一件又一件…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0002-4002-8002-000000000002', 1,
    '我走到那排貨架前。商品排得異常整齊，每個標籤都朝著同一個方向。最前排有一瓶剛被推到定位，還在輕輕晃。', true)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('站著看那瓶還在晃的飲料停下來', 0, '那瓶飲料慢慢停穩，標籤恰好朝外。'),
  ('沿著貨架看商品對齊的方向', 0, '你順著看過去，每一排都對得一絲不苟，像有人剛調整過。'),
  ('蹲下來看下層的貨', 0, '下層也補得滿滿的，連最角落都沒有空位。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0002-4002-8002-000000000002', 2,
    '貨架中段空了一格，旁邊的紙箱裡剛好有那個商品。有人補貨補到這裡停下，像被什麼打斷，又像隨時會回來繼續。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('不要動那一格，站著等他回來補', 1, '你沒有伸手，過了一會兒，那個空格旁的商品輕輕移動了一下。'),
  ('退到走道另一頭，給那一格留出空間', 1, '你讓開位置，補貨的細微聲音又開始了。'),
  ('幫忙把那個商品放進空格', -1, '你一補上那格，周圍的聲音停了，像你做了不該做的事。'),
  ('把紙箱推到旁邊', -1, '你一移動紙箱，那股「正在補貨」的氣息散了。'),
  ('大聲問是誰在補貨', -2, '你的聲音蓋過一切，貨架瞬間只是貨架。'),
  ('把整排商品重新排一次', -2, '你一動手，所有對齊的標籤同時失去意義，店裡安靜得不對。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0002-4002-8002-000000000002', 3,
    '我聽見就在背後那排，商品一件件被擺正的聲音，貼著後頸近。轉身就能看見是誰在補，但那聲音穩定得讓我不敢轉。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('保持背對，讓他繼續補', 1, '你沒有轉身，背後的聲音一件接一件，從容得像永遠補不完。'),
  ('閉上眼，只聽那個節奏', 1, '你閉上眼，那節奏清楚地繞著整排貨架移動。'),
  ('用餘光瞄向背後', -1, '你眼角一瞥，那節奏遲疑了一下。'),
  ('後退離開那排貨架', -1, '你一退開，那個節奏遠了，像被你推走。'),
  ('猛然轉身', -2, '你一轉身，背後那排貨架空無一人，標籤歪了一個方向。'),
  ('出聲叫住他', -2, '你一出聲，補貨聲戛然而止，再也沒有回來。')
) AS v(text, signal_delta, result_text);

-- ================================================
-- basic common：對講機的雜音
-- ================================================
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  '1a2b3c4d-0003-4003-8003-000000000003', '7c0ffee0-0000-4000-8000-000000000001',
  'basic', 'common', '對講機的雜音',
  '店內對講機在深夜傳出有人緩慢覆誦補貨清單的聲音。',
  'night', NULL, NULL, ARRAY['唸不完的清單'], false
);

INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), '1a2b3c4d-0003-4003-8003-000000000003', v.txt
FROM (VALUES
  ('沒人用的對講機自己響了，有人在唸清單…'),
  ('對講機的雜音裡，夾著一個唸貨的男聲…'),
  ('我按了對講機，那個聲音沒理我，繼續唸…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0003-4003-8003-000000000003', 1,
    '我站在對講機旁。雜音裡那個聲音很穩，一條一條唸著補貨清單，語氣平得像唸了一輩子。它沒有要跟誰對話的意思。', true)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('站著聽他把這一條唸完', 0, '那個聲音不疾不徐唸完一條，接著是下一條。'),
  ('靠近對講機，聽清楚他在唸什麼', 0, '你湊近，品項和數量一字一字都很清楚，是這家店的貨。'),
  ('看看對講機的頻道有沒有異常', 0, '頻道顯示正常，但那個聲音不屬於任何一個頻道。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0003-4003-8003-000000000003', 2,
    '那個聲音唸到一半停了，像在等什麼回應。對講機另一端安靜下來，只剩底噪。我感覺它在等一個正確的接話。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('安靜等他自己接著唸下去', 1, '你沒有出聲，過了幾秒，那個聲音平靜地接了下一條。'),
  ('輕輕複誦他剛唸的最後一項，像在核對', 1, '你低聲跟著核對，對講機那頭的節奏穩住了。'),
  ('對著對講機問他是誰', -1, '你一發問，那個聲音停了，底噪變大。'),
  ('轉到別的頻道', -1, '你一轉頻道，那個聲音被切掉，雜音也跟著沒了。'),
  ('大聲叫他別唸了', -2, '你一喊，對講機徹底安靜，連底噪都消失了。'),
  ('把對講機關掉', -2, '你伸手關機，那個聲音在斷電前拉長了一個尾音。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0003-4003-8003-000000000003', 3,
    '那個聲音唸到清單最後一項，停頓，然後從頭開始——一字不差，同樣的品項、同樣的數量。我意識到這份清單永遠唸不完，他也永遠下不了班。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('安靜聽他重新開始，不打斷', 1, '你聽著清單再次從第一項展開，聲音裡有種說不出的安定。'),
  ('跟著他的節奏，在心裡默念', 1, '你在心裡跟著唸，那個聲音與你重疊，清楚得不可思議。'),
  ('出聲告訴他清單已經唸完了', -1, '你一說「唸完了」，那個聲音遲疑，雜音湧了上來。'),
  ('走開不再聽', -1, '你轉身離開，那個聲音在你背後變小，但沒有停。'),
  ('大聲說沒有人需要他了', -2, '你話一出口，對講機死寂，像被你關掉了某個一直亮著的東西。'),
  ('用力拍打對講機', -2, '你一拍，聲音碎成雜音，再也拼不回來。')
) AS v(text, signal_delta, result_text);

-- ================================================
-- lore rare：站在冷藏櫃前的人（所有層 is_skippable=false，起始 2 格）
-- ================================================
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  '1a2b3c4d-0004-4004-8004-000000000004', '7c0ffee0-0000-4000-8000-000000000001',
  'lore', 'rare', '站在冷藏櫃前的人',
  '冷藏櫃的反光裡有個穿舊制服的人在補貨，櫃子前卻空無一人。',
  'night', NULL, NULL, ARRAY['玻璃反光裡的人'], false
);

INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), '1a2b3c4d-0004-4004-8004-000000000004', v.txt
FROM (VALUES
  ('冷藏櫃的反光裡，有個穿舊制服的人在補貨…'),
  ('冷藏櫃前那個背影，穿著十年前的舊制服…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0004-4004-8004-000000000004', 1,
    '我站在冷藏櫃前。那個人影就在反光裡，背對著我補貨，動作很慢很穩。櫃子前的地板是空的，他只存在於那層玻璃的反光中。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('不要看櫃前，只透過反光默默觀察', 1, '你假裝在看商品，反光裡的他繼續補貨，沒有察覺。'),
  ('保持距離，讓他把這櫃補完', 1, '你站得遠遠的，他的動作一瓶接一瓶，從容不迫。'),
  ('直接轉頭看櫃子前面', -1, '你一回頭，櫃前空無一人，反光裡的他也淡了。'),
  ('走近冷藏櫃想看清楚', -1, '你一靠近，反光裡的身影退進更深的玻璃裡。'),
  ('敲玻璃想引起他注意', -2, '你指節一碰玻璃，那個人影在敲擊聲裡散開。'),
  ('出聲叫他', -2, '你一出聲，反光裡只剩你自己的臉。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0004-4004-8004-000000000004', 2,
    '反光裡的他補完一排，停下來，似乎察覺到玻璃裡多了一個影子——我的。他沒有轉身，但補貨的手停在半空，整間店的空氣繃緊了。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('保持靜止，不和反光裡的他對視', 1, '你垂下視線，他的手又動了起來，繼續補下一瓶。'),
  ('緩慢地把視線移回商品上', 1, '你把注意力移開，繃緊的空氣鬆了一點，他繼續工作。'),
  ('在反光裡迎上他的視線', -1, '你的影子和他在玻璃裡對上，他的動作頓住了。'),
  ('後退離開冷藏櫃', -1, '你一退，他在反光裡轉淡，像你抽走了他站著的理由。'),
  ('轉身想正面看他', -2, '你一轉身，冷藏櫃前只有嗡嗡作響的壓縮機。'),
  ('開口問他是不是這裡的員工', -2, '你話沒說完，反光裡的制服就褪成了空白。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable)
  VALUES (gen_random_uuid(), '1a2b3c4d-0004-4004-8004-000000000004', 3,
    '反光裡，他終於慢慢轉過來。穿著十年前的舊制服，臉在反光裡看不太清楚，但胸前的名牌還在。他看著反光裡的我，眼神不是惡意，是疑惑——像在問，這個班，是不是該換人了。', false)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('在反光裡平靜地與他對望，不移開', 1, '你穩穩看著反光裡的他，他的疑惑慢慢沉澱成一種釋然。'),
  ('對著反光，輕輕點一下頭', 1, '你微微頷首，像接下了他的班，他的肩膀鬆了下來。'),
  ('別開眼，不敢再看', -1, '你移開視線，反光裡的他也黯了一截。'),
  ('舉起手機拍下反光', -1, '螢幕的光打在玻璃上，反光裡只剩刺眼的白。'),
  ('轉身正面確認他的臉', -2, '你一轉身，玻璃前空蕩蕩，名牌的影子停在反光最深處。'),
  ('出聲念出他名牌上的字', -2, '你一唸出那個名字，反光劇烈晃動，他退進了再也照不到的地方。')
) AS v(text, signal_delta, result_text);
