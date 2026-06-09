-- ================================================
-- example_chair_ghost.sql — 椅仔姑（normal）Phase 1 新模型 seed
--
-- 模型：訊號清晰度（單軸）。正確回應型的「她問/你答」用敘事+選項表達，
--       Phase 1 引擎不啟用信任軸/手勢（encounter_archetype 留 NULL）。
-- 規則對齊：異常點=很短一句；result_text=純現場反應（無「訊號」字眼）；
--          每判斷層 1 個 0（對的讀）+ 多個負向，+1 只在最後一層出現一次；
--          basic 取得閘 clarity≥2，lore 走無原型退化 clarity≥2。
-- 跑序：005→006→007→(reset)→ 本檔。image_slug = chair_ghost。
--
-- Phase 2 要做時：UPDATE stories SET encounter_archetype='correct_response'；
--   並在 lore（椅背後的小女孩）最後一層 scene 補 climax_type='hold_listen'、
--   climax_text、climax_min_trust=3，選項補 trust_delta。
-- ================================================

-- ── 故事 ──
INSERT INTO stories
(id, title, difficulty, creature_type, creature_description, sealed_narrative, lore_narrative, image_slug)
VALUES (
  'a7c1e2b0-3d6f-4a82-9c1e-7b5d0f2a6c84',
  '椅仔姑', 'normal', '夭折女童',
  '「關椅仔姑」問卜遊戲請來的女童魂。被人請進矮凳、以磕地與搖晃回答是非。她有求必應，卻沒有人問過她想被問的那一句。',
  '調查員記錄：廟埕的角落，一張{磕地三下的板凳}。牆邊，一張{空著的小椅子}，沒人坐卻還溫著。桌下那張{寫滿問題的紙}，劃滿了正字，卻沒有一個答案。她有問必答，可是沒有人問過她想被問的那一句。',
  '椅仔姑是「關椅仔姑」這個古老問卜遊戲留下的存在。從前的女孩們在月光下，把矮凳披上手帕、焚香唸咒，把一個早夭女童的魂魄請進凳子裡，讓她以磕地、搖晃回答是非。被請來的，往往是某個沒能長大的小女孩。她有求必應，人們便一代代地請她：問姻緣、問功名、問失物、問生死。她替無數人問了無數個願望，卻從來沒有人想起要問她——妳願不願意被這樣一直留著？妳想不想回家？她不害人。她的執念輕得幾乎不像執念：只是想要有一個人，在請她回答之前，先問一句她自己的事。一旦有人問對了那句話，承認她也是個會累、會想家的孩子，她就會像被准許離席的學生，輕輕搖一下凳子，安心地散去。她的弱點，從來不是符咒，是被當成一個人對待。',
  'chair_ghost'
);

-- ============ basic common：磕地三下的板凳 ============
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  'b2d5f3c1-4e70-4b93-8d2f-6c4e1a3b7d95', 'a7c1e2b0-3d6f-4a82-9c1e-7b5d0f2a6c84',
  'basic', 'common', '磕地三下的板凳',
  '一張矮板凳，會自己磕地回答問題。', NULL, NULL, NULL, '{}', false
);
INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), 'b2d5f3c1-4e70-4b93-8d2f-6c4e1a3b7d95', v.txt
FROM (VALUES
  ('矮板凳自己磕了地板三下…'),
  ('沒人坐的板凳，腳邊傳來輕輕的叩、叩…'),
  ('孩子們圍著一張小凳，凳子在動…')
) AS v(txt);

-- 第1層（氛圍）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'b2d5f3c1-4e70-4b93-8d2f-6c4e1a3b7d95', 1,
    '幾個孩子蹲在廟埕角落，圍著一張矮板凳，凳上披著一條小手帕，閉著眼反覆唸著同一句話。沒有人注意到我站在後面。',
    true, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('在原地看著，先不出聲', 0, '你站著沒動，唸誦的聲音一句一句疊上來。'),
  ('繞到能看見板凳的那一側', 0, '你換了位置，手帕的一角正輕輕掀動。'),
  ('跟著默念那句話', 0, '你跟著唸，喉嚨發乾，板凳的影子拉長了。')
) AS v(text, signal_delta, result_text);

-- 第2層（判斷）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'b2d5f3c1-4e70-4b93-8d2f-6c4e1a3b7d95', 2,
    '孩子們停了。板凳忽然叩地磕了一下，接著兩下、三下。一個女孩怯怯地問：明天考試會過嗎？板凳沒有動，空氣等在那裡，像在等一個對的人開口。',
    false, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('輕聲問她：妳在這裡很久了嗎？', 0, '板凳輕輕磕了一下，像點頭。那一下很慢，像終於有人問對了方向。'),
  ('跟著問：那我的姻緣呢？', -1, '板凳沉默。孩子們的臉色沉了下來，空氣涼了一截。'),
  ('催它快點回答', -2, '你一急，板凳猛地朝後退開半尺，手帕滑落在地。'),
  ('伸手去扶那張板凳', -2, '你的手才碰到凳腳，那股有人坐著的重量就散了。'),
  ('問它今晚的明牌', -1, '板凳一動也不動，像對這個問題失望。'),
  ('掀開手帕看底下', -1, '你掀開手帕，底下什麼都沒有，涼意爬上手腕。')
) AS v(text, signal_delta, result_text);

-- 第3層（判斷·最終·分層結局）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'b2d5f3c1-4e70-4b93-8d2f-6c4e1a3b7d95', 3,
    '板凳又開始磕地，這次是一長串，有節奏，像在回答一個沒有人問出口的問題。我聽出那不是會不會考過，是更久以前的事——她在等人問她，想不想回家。',
    false,
    '我問對了。板凳搖得很輕很輕，像一個孩子終於被准許離席。手帕安穩地疊著，我把這張磕地的小凳，完整地記進了筆記。',
    '我幾乎要漏掉那串敲擊的意思。在它整個靜下去之前，我勉強抓住了那個節奏的形狀——夠了，但只是剛好夠。')
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('輕聲問：妳是不是想回家了？', 1, '磕地聲停了。板凳極輕地搖了一下，像鬆了一口氣，手帕安靜地覆回原位。'),
  ('問它今晚的明牌', -2, '敲擊停在半途，像被你問熄了。'),
  ('叫其他孩子別怕', -1, '你一出聲打圓場，那節奏就亂了、淡了。'),
  ('把板凳翻過來看', -2, '你一翻，凳底刻著一個褪色的名字，還沒看清就散進了暗處。'),
  ('伸手按住板凳不讓它動', -2, '你一壓，那股重量從你掌心底下溜走了。')
) AS v(text, signal_delta, result_text);

-- ============ basic common：空著的小椅子 ============
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  'c3e6a4d2-5f81-4ca4-9e3a-7d5f2b4c8e06', 'a7c1e2b0-3d6f-4a82-9c1e-7b5d0f2a6c84',
  'basic', 'common', '空著的小椅子',
  '一張沒人坐、卻自己輕輕搖的小竹椅。', NULL, NULL, NULL, '{}', false
);
INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), 'c3e6a4d2-5f81-4ca4-9e3a-7d5f2b4c8e06', v.txt
FROM (VALUES
  ('牆邊那張小椅子，沒人坐卻在輕輕搖…'),
  ('家裡多了一張矮椅，誰都說不是自己搬的…'),
  ('小椅子上有個淺淺的凹痕，像剛有人坐過…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'c3e6a4d2-5f81-4ca4-9e3a-7d5f2b4c8e06', 1,
    '客廳牆角多了一張我沒見過的小竹椅，椅面有個淺淺的、剛坐過的凹痕。沒有人記得它什麼時候出現的。',
    true, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('蹲下來平視那張椅子', 0, '你蹲下，椅面的凹痕還是溫的。'),
  ('在椅子對面坐下', 0, '你坐下，像隔著什麼東西和它相對。'),
  ('先不靠近，繞著看', 0, '你繞了一圈，椅腳在地板上留下細細的拖痕。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'c3e6a4d2-5f81-4ca4-9e3a-7d5f2b4c8e06', 2,
    '椅子自己輕輕搖了起來，前後，前後，像有個孩子坐在上面打發時間。它不急著要什麼，只是在那裡——除非你先做了什麼。',
    false, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('安靜地陪它坐一會', 0, '你坐著沒動，搖晃的節奏慢慢和你的呼吸對上了。'),
  ('問它是誰、為什麼在這', -1, '搖晃停了，像被問得不知所措，涼意漫開。'),
  ('想把椅子搬走', -2, '你才碰到椅背，那股坐著的重量就頂了回來，椅子紋風不動。'),
  ('對著空椅叫一聲', -2, '你一喊，屋裡的光暗了一格，椅子停在傾斜的角度。'),
  ('拿手機拍下來', -1, '快門一響，椅面的凹痕不見了，只剩冷掉的木頭。'),
  ('伸手摸椅面的凹痕', -1, '你的指尖剛貼上，那點溫度就退開了。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'c3e6a4d2-5f81-4ca4-9e3a-7d5f2b4c8e06', 3,
    '搖晃慢下來。我忽然懂了，它不是要嚇我，是想要有人坐在旁邊，像以前有人會坐在它旁邊那樣。它在等的不是答案，是陪伴。',
    false,
    '我就只是坐著。兩張椅子一起搖，很久很久，直到那股重量像滿足了似的輕下去。我把這張空著的小椅子，安穩地記進了筆記。',
    '我差點坐不住那份安靜。在它停下來之前，我勉強跟上了那個搖晃的節奏——剛好趕上，沒讓它走。')
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('在它旁邊坐下，輕聲說：我陪妳坐一下。', 1, '你說完，兩張椅子一起，輕輕地搖，那股氣息安穩了下來。'),
  ('終於忍不住問它是誰', -1, '你一開口，那份安穩就裂了，搖晃亂了拍子。'),
  ('起身想離開', -2, '你一站起來，椅子猛地停住，屋裡只剩你自己的心跳。'),
  ('把另一張椅子也搬過來湊', -2, '你動作太大，那股陪坐的氣息散了，只剩兩張空椅。'),
  ('拍拍椅面要它停', -1, '你一拍，搖晃停了，但那點溫度也跟著走了。')
) AS v(text, signal_delta, result_text);

-- ============ basic common：寫滿問題的紙 ============
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  'd4f7b5e3-6a92-4db5-8f4b-8e6a3c5d9f17', 'a7c1e2b0-3d6f-4a82-9c1e-7b5d0f2a6c84',
  'basic', 'common', '寫滿問題的紙',
  '一張劃滿正字記號、全是別人願望的問卜紙。', NULL, NULL, NULL, '{}', false
);
INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), 'd4f7b5e3-6a92-4db5-8f4b-8e6a3c5d9f17', v.txt
FROM (VALUES
  ('一張紙寫滿了問題，卻沒有一個答案…'),
  ('廟桌底下塞著張紙，劃滿了正字記號…'),
  ('字條上全是問運勢的話，墨色一行比一行急…')
) AS v(txt);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'd4f7b5e3-6a92-4db5-8f4b-8e6a3c5d9f17', 1,
    '廟桌下塞著一張對折的紙。攤開，上面密密麻麻全是問題：會中嗎、會好嗎、他會回來嗎……每一條後面都劃著正字記號。沒有一條寫著答案。',
    true, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('從頭把問題讀一遍', 0, '你一行行讀下去，墨色一行比一行潦草、一行比一行急。'),
  ('數那些正字記號', 0, '你數著，有的問題被問了上百次。'),
  ('把紙翻到背面', 0, '背面是空白的，但角落有一個很小、很淡的名字。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'd4f7b5e3-6a92-4db5-8f4b-8e6a3c5d9f17', 2,
    '紙上的字開始滲出潮氣，像有人正趴在你看不見的地方，又要寫下一個問題。你感覺得到，她不在乎這些問題的答案——她在乎的是，有沒有人問過她想被問的那一句。',
    false, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('不照著問，改問：換妳想問我什麼？', 0, '滲出的潮氣停住了，像第一次有人反過來問她。'),
  ('照著紙上問一題運勢', -1, '墨色又往下滲了一行，失望得很安靜。'),
  ('把紙收進口袋', -2, '紙一離地，潮氣猛地竄上你的手臂，字全糊掉了。'),
  ('唸出那個淡淡的名字', -2, '你一唸，整張紙的字同時抖了一下，燈影晃動。'),
  ('再添一條自己的問題上去', -1, '你的字才落下，就被底下滲上來的潮氣暈開了。'),
  ('把紙湊到燈下細看', -1, '你一湊近，紙面的潮氣黏上了指腹，涼得發麻。')
) AS v(text, signal_delta, result_text);

WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'd4f7b5e3-6a92-4db5-8f4b-8e6a3c5d9f17', 3,
    '紙的最下方，慢慢浮出一行新的字，不是問運勢的——是：妳們什麼時候，要問我累不累？我這才明白，這一整張紙，是她聽了無數個願望、卻從沒被回問一句的記錄。',
    false,
    '我問了那句沒有人問過的話。潮氣退得乾乾淨淨，那行字安靜地留在紙上。我把這張寫滿問題的紙，連同它底下的那句話，一起記進了筆記。',
    '我差一點又把話題繞回自己身上。在那行字被潮氣蓋掉之前，我勉強把它記了下來——抓住了，只是手心還在冒汗。')
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('輕聲回她：妳累了吧？', 1, '浮出的字停了，潮氣退去，紙面乾爽下來，像一直繃著的什麼終於鬆了。'),
  ('還是忍不住問了自己的事', -2, '那行字立刻被新的潮氣蓋過，像你又錯過了。'),
  ('把紙折好放回原位就走', -1, '你一轉身，背後傳來紙張被翻動的細響，像在挽留。'),
  ('想撕下那行字帶走', -2, '紙一受力，所有的字同時化開，只剩一片濕。'),
  ('問她那個名字是不是她', -1, '你一問，那行字遲疑地頓住，沒再寫下去。')
) AS v(text, signal_delta, result_text);

-- ============ lore rare：椅背後的小女孩 ============
INSERT INTO story_fragments
(id, story_id, layer, rarity, fragment_label, fragment_text,
 time_condition, weather_condition, date_condition, motif_tags, is_user_submitted)
VALUES (
  'e5a8c6f4-7b03-4ec6-9a5c-9f7b4d6e0a28', 'a7c1e2b0-3d6f-4a82-9c1e-7b5d0f2a6c84',
  'lore', 'rare', '椅背後的小女孩',
  '蹲在板凳後、替所有人問願望，卻沒有自己願望的女童。', 'night', NULL, NULL, '{}', false
);
INSERT INTO fragment_atmosphere (id, story_fragment_id, atmosphere_text)
SELECT gen_random_uuid(), 'e5a8c6f4-7b03-4ec6-9a5c-9f7b4d6e0a28', v.txt
FROM (VALUES
  ('小椅子的椅背後面，露出半截衣角…'),
  ('板凳的影子裡，多了一個蹲著的小小身影…')
) AS v(txt);

-- lore 第1層（判斷，起始 clarity 2）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'e5a8c6f4-7b03-4ec6-9a5c-9f7b4d6e0a28', 1,
    '這一次板凳沒有自己敲。它後面，蹲著一個小女孩，低著頭，額前的瀏海垂下來，看不清臉。她穿著很舊式的碎花衣裳，把手輕輕擱在凳面上。',
    false, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('也在她對面蹲下，不靠太近', 0, '你蹲下，和她隔著那張板凳。她的手指在凳面上輕輕點了一下，像知道你來了。'),
  ('想看清她的臉，湊近一點', -2, '你一靠近，她的瀏海後面是空的，涼意直衝上來。'),
  ('開口問她的名字', -1, '她的肩膀縮了一下，像這個問題問得太快。'),
  ('伸手想摸她的頭', -2, '你的手穿過去，只碰到冷掉的空氣，她淡了一層。'),
  ('叫她抬起頭來', -1, '你一出聲，她反而把頭埋得更低。')
) AS v(text, signal_delta, result_text);

-- lore 第2層（判斷）
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'e5a8c6f4-7b03-4ec6-9a5c-9f7b4d6e0a28', 2,
    '她終於抬起一點頭。我看見她的嘴唇在動，卻聽不見聲音——她在問問題，一個接一個，全是別人託她問的願望。她替所有人問，卻沒有一個願望是她自己的。',
    false, NULL, NULL)
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('對她說：這些都不是妳想問的吧？', 0, '她的動作停了，第一次，她像是看見了我。'),
  ('跟著她唸那些願望', -1, '你一附和，她又低下頭，繼續替別人問下去。'),
  ('催她說大聲一點', -2, '你一急，她整個人退進椅背的陰影裡。'),
  ('轉頭找有沒有別人在場', -1, '你一分神，她的身影淡了，像怕被你忘記。'),
  ('問她願望能不能成真', -2, '你一問，她的臉沉下來，像又被當成了工具。')
) AS v(text, signal_delta, result_text);

-- lore 第3層（判斷·最終·分層結局）
-- Phase 2：此 scene 補 climax_type='hold_listen'、climax_text、climax_min_trust=3；選項補 trust_delta。
WITH sc AS (
  INSERT INTO fragment_scenes (id, story_fragment_id, layer_index, atmosphere_text, is_skippable, ending_high, ending_low)
  VALUES (gen_random_uuid(), 'e5a8c6f4-7b03-4ec6-9a5c-9f7b4d6e0a28', 3,
    '她抬起頭，瀏海分開了一條縫。那後面不是恐怖的東西——是一張很疲倦的、很小的臉。她看著我，嘴唇動了一下，這次我聽見了：……我可以，問我自己的事嗎？',
    false,
    '我替她問了那句，她等了太久的話。她笑著，化進一片很暖的光裡——不是消失，是終於可以離席。我把椅仔姑完整的樣子，清清楚楚記進了筆記。',
    '她的臉剛要亮起來，光就開始晃。在她散成碎光之前，我勉強記住了那張疲倦的小臉——抓住了，卻沒能好好送她一程。')
  RETURNING id
)
INSERT INTO scene_options (id, scene_id, text, signal_delta, result_text)
SELECT gen_random_uuid(), sc.id, v.text, v.signal_delta, v.result_text FROM sc
CROSS JOIN (VALUES
  ('輕聲說：可以。妳想回家了，對不對？', 1, '她笑了，很淡很淡的一下。畫面慢慢亮起來，板凳、衣裳、她，都安靜地化進那道光裡，我看清了她完整的樣子。'),
  ('反而問她我的事', -2, '她臉上剛亮起的東西，一下子又熄了。'),
  ('想抱抱她', -2, '你一伸手，她像受驚似地退開，身影散成碎光。'),
  ('叫她別怕', -1, '你一出聲安慰，反而打斷了她要說的話，她遲疑了。'),
  ('追問她的名字', -1, '你急著要名字，她又把那句話吞了回去。')
) AS v(text, signal_delta, result_text);
