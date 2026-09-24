/* ============================================================
   data.js  —  数据层
   包含：PLAYER_TEMPLATE / ROOMMATES / COLOR_VAR / PRIORITY /
          EVENTS / ENDINGS / SAVE_KEY
   阶段 0：从原 <script> 抽离，结构零变化
   ============================================================ */
window.WXHXQ = window.WXHXQ || {};
window.WXHXQ.data = (function(){

/* ---------- 玩家模板（运行时实例由 game.js 的 initGame 深拷贝生成） ---------- */
const PLAYER_TEMPLATE = {
  name:"陈念", currentEventId:"event_01", currentState:"DORM", day:1,
  affection:{ linxiaoman:50, suwanqing:50, shenxinghe:50, guqinghuan:50 },
  keyChoices:[], triggeredRoommateEvent:null, endingId:null,
  /* 分段剧情推进：intro→choice→consequence→next */
  eventPhase:"intro", paraIndex:0, chosenOption:null, lastAffSnapshot:null, lastTransition:null
};

const ROOMMATES = [
  { id:"linxiaoman", name:"林小满", nickname:"干饭王 · 永远下次给你", affection:50, landmine:"说她胖 / 抢她最后一口" },
  { id:"suwanqing",  name:"苏晚晴", nickname:"卷王 · 凌晨拖地狂魔", affection:50, landmine:"打乱她计划 / 说她装" },
  { id:"shenxinghe", name:"沈星河", nickname:"玄学中二 · 半夜作法少女", affection:50, landmine:"不信她 / 嘲笑她法术" },
  { id:"guqinghuan", name:"顾清欢", nickname:"精致绿茶 · 脸盆洗脚仙女", affection:50, landmine:"说她不精致 / 当众揭穿" }
];

const COLOR_VAR = { linxiaoman:"lin", suwanqing:"su", shenxinghe:"shen", guqinghuan:"gu" };
const PRIORITY  = { linxiaoman:0, suwanqing:1, shenxinghe:2, guqinghuan:3 };

/* ============================================================
   LORE — 世界观与角色背景
   阶段 3.1 新增：供"世界观"/"角色档案"抽屉面板与新手引导引用
   字段说明：
     school   —— 学校与 404 寝室由来
     theme    —— 主题阐释（用于结局页与宣传语）
     roommates—— 4 室友深度设定，按 id 索引
     timeline —— 12 事件时间线（day / season / 标题 / 一句话概述）
   ============================================================ */
const LORE = {
  school:{
    name:"南城大学 · 文学院 6 号楼",
    dorm:"404 寝室",
    origin:`南城大学文学院 6 号楼 4 层最里头，门牌号 404。
据说这间寝室原本是杂物间改的，比别的寝室小半圈，窗户正对着一棵老槐树。
住进来的从来都是"凑不齐的四个人"——性格南辕北辙，谁都嫌弃谁，可一整届下来，没有一间寝室比 404 更齐整。
楼管阿姨说，404 是"互相嫌弃，但谁也离不开谁"的意思。这话没人当真，直到你住进来。`
  },
  theme:{
    oneLine:"我们可以互相嫌弃，但你不能。",
    core:`这是一个关于"寝室"的故事——不是英雄史诗，没有拯救世界。
四个性格南辕北岔的女生挤在一间小寝室里，互相嫌弃，互相试探，又互相兜底。
她们为一块肉饼吵架，为一瓶洗发水冷战，为凌晨的拖地板瞪眼；
但当外人真的欺负到自己人头上，她们会一起站出来。
"互相嫌弃"是日常的壳，"但你不能"是底线的核。
游戏想说的只是这一句：有些关系，烦得要死，却离不开。`
  },
  roommates:{
    linxiaoman:{
      hometown:"北方小城",
      family:`父母在菜市场开早餐摊，凌晨三点起来和面、剁馅、炸油条。
林小满从小蹲在摊子边上帮忙，剁肉馅是童子功，闭着眼都不会切到手。`,
      arc:`她习惯用食物表达一切：开心了塞你一嘴，心虚了多做一份，道歉了端来便当。
嘴上永远"下次给你"，但"今天给你"是她能给出的最重的承诺。
她的成长弧光：从"用请客换好感"到"不图回报地照顾你"。`,
      landmineOrigin:`说她胖 / 抢她最后一口——
早餐摊长大的孩子，"吃"是尊严，"最后一口"是底线。
你抢她的饭，等于否定了她从小到大的全部付出。`,
      bond:`与苏晚晴：互嫌但默契，一个嫌吵一个嫌懒，但都会默默替对方收尾。
与沈星河：把她当"有趣的疯子"，只有她会跟着念咒。
与顾清欢：最看不惯她的"精致"，但私下会偷偷学她护肤。`
    },
    suwanqing:{
      hometown:"南方沿海城市",
      family:`单亲家庭，母亲独自带大她，把所有期望压在她身上。
"你必须比谁都优秀"——这句话从小听到大。`,
      arc:`凌晨拖地不是洁癖，是焦虑的外化：白天太吵，夜里静不下来，只能靠"完成计划"获得掌控感。
她的笔记本记得密密麻麻，连别人"周三有早八"都记着。
她的成长弧光：从"控制一切"到"愿意为一个人破例"。`,
      landmineOrigin:`打乱她计划 / 说她装——
她的计划是她和母亲之间唯一的呼吸口，被打乱等于被否定。
"装"是她最怕听到的字：她真的在努力，只是没人信。`,
      bond:`与林小满：嫌她吵，但会替她把没洗的锅洗了。
与沈星河：表面无语，深夜失眠时却是唯一陪她说话的人。
与顾清欢：最看不惯她的"无所谓"，但承认她脸皮厚得让人羡慕。`
    },
    shenxinghe:{
      hometown:"西南山村",
      family:`奶奶是村里远近闻名的"神婆"，红白喜事都找她看日子。
沈星河从小蹲在奶奶的香案边，记下了一整套"玄学话术"。`,
      arc:`她其实不信鬼神，但她信"仪式感能让人安心"。
符咒、算卦、作法，都是她包装"我在意你"的方式。
"你的比较重要"是她唯一没包装过的真心话。
她的成长弧光：从"用玄学试探"到"敢直接说出口"。`,
      landmineOrigin:`不信她 / 嘲笑她法术——
她不是怕你不信鬼神，她怕你不信"她真的在乎"。
嘲笑她的法术，等于嘲笑她奶奶，等于嘲笑她唯一的温柔来源。`,
      bond:`与林小满：唯一会配合她念咒的人，她偷偷把林小满算成了"财运最旺"。
与苏晚晴：深夜是她俩的秘密时段，一个拖地一个作法。
与顾清欢：经常"算"她有血光之灾，其实是想引起她注意。`
    },
    guqinghuan:{
      hometown:"省会城市，家境优渥",
      family:`父母做生意常年在外，用钱代替陪伴。
她从小什么都有，唯独没有人认真听过她说话。`,
      arc:`"精致"是她的保护壳：只要她足够讲究、足够体面，就没人会发现她其实很怕被丢下。
她用别人的脸盆洗脚、用别人的洗发水，本质上是在试探"你会不会因此不要我"。
小票被划掉又保留的"未完"，是她破壳的痕迹。
她的成长弧光：从"试探性索取"到"笨拙地给予"。`,
      landmineOrigin:`说她不精致 / 当众揭穿——
精致是她搭了十八年的盔甲，被拆穿等于被扒光。
当众揭穿尤其致命：她宁可承认自私，也不愿承认孤独。`,
      bond:`与林小满：最常被怼，但林小满也是唯一会直接把饭塞她嘴里的人。
与苏晚晴：互相看不顺眼，但都偷偷觉得对方"活得比自己真"。
与沈星河：表面嫌弃她中二，其实最信她的符——只是死不承认。`
    }
  },
  timeline:[
    { day:1,  season:"秋·开学第一周", eventId:"event_01", title:"剁肉馅的清晨",      summary:"被林小满的肉饼吵醒，第一次见识 404 的吵闹。" },
    { day:3,  season:"秋·开学第一周", eventId:"event_02", title:"脸盆洗脚疑云",      summary:"顾清欢用你的脸盆洗脚，试探你的底线。" },
    { day:6,  season:"秋·开学第二周", eventId:"event_03", title:"吃饭又不AA",        summary:"林小满第 7 次说'下次给你'。" },
    { day:8,  season:"秋·开学第二周", eventId:"event_04", title:"第18次让我带饭",     summary:"账本累计 38 块 5，林小满还在加码。" },
    { day:12, season:"秋·开学第三周", eventId:"event_05", title:"凌晨3点拖地",        summary:"撞见苏晚晴的焦虑，第一次读懂她的控制欲。" },
    { day:15, season:"秋·开学第三周", eventId:"event_06", title:"我的洗发水去哪了",    summary:"299 限量款被顾清欢用光，火锅还是算了。" },
    { day:18, season:"秋·开学第三周", eventId:"event_07", title:"室友半夜宣布算命",   summary:"沈星河要给全寝室算卦，信还是不信。" },
    { day:22, season:"秋·开学第四周", eventId:"event_08", title:"玩家生病·温暖转折",  summary:"发烧那几天，四个烦人精各显神通。关键选择：察觉温柔。" },
    { day:25, season:"秋·开学第四周", eventId:"event_09", title:"专属关系事件",       summary:"好感度≥60 的室友，会递来属于她的那一份心意。" },
    { day:28, season:"秋·开学第五周", eventId:"event_10", title:"没有边界感的追求者", summary:"楼下那个男生，开始越界。关键选择：独自扛 / 求助室友。" },
    { day:31, season:"秋·开学第五周", eventId:"event_11", title:"骚扰升级",           summary:"他变本加厉。关键选择：想逃避 / 正面应对。" },
    { day:33, season:"秋·开学第五周", eventId:"event_12", title:"室友护短之夜",       summary:"喝醉的男生堵到楼下，404 全员站到你前面。" }
  ]
};

/* ---------- 12 个主线事件 + 事件 9 的 4 个专属分支 ---------- */
const EVENTS = [
  /* ===== 事件 1：剁肉馅的清晨 ===== */
  { id:"event_01", idx:1, stage:"前期 · 日常", title:"剁肉馅的清晨",
    intro:[
      `早上 7 点，一阵"咚咚咚"把你震醒。

林小满蹲在地上剁肉馅，做早餐肉饼。`,
      `<span class="speaker lin">林小满</span>：「起来啦？趁热吃！」
<span class="speaker">你</span>：「……才七点。」
<span class="speaker lin">林小满</span>：「肉饼不等人啊！」`,
      `苏晚晴已经在背单词；
沈星河在被子里骂骂咧咧；
顾清欢戴着眼罩装死。

整个寝室好像只有你被吵醒。`
    ],
    optionA:{
      text:"起来一起吃，夸手艺",
      hint:"接住她的好意——林小满会高兴，但苏晚晴会更烦。",
      effects:{ linxiaoman:+10, suwanqing:-5 },
      consequence:[
        `你揉着眼睛坐起来，接过她递来的肉饼。还烫，油纸袋上沁出一小块油渍。

「还挺好吃的。」

林小满明显愣了一下——她大概准备好被嫌弃了。随后她得意地抬起下巴，耳朵尖却悄悄红了一点。`,
        `<span class="speaker lin">林小满</span>：「那当然，也不看看是谁做的。」

她嘴上嫌弃，手却又偷偷往你碗里塞了一块。

<span class="speaker lin">林小满</span>：「多吃点，别说我没照顾你。」`,
        `旁边的苏晚晴从被窝里探出头，黑眼圈比昨天又深了一圈。

<span class="speaker su">苏晚晴</span>：「你们两个能不能小点声……」

她看了一眼你手里的肉饼，喉结动了动，又重新躺了回去。

<span class="speaker su">苏晚晴</span>：「算了。」`
      ],
      transition:`吃完肉饼，寝室又恢复了早晨的吵闹。林小满哼着歌收拾盘子。`
    },
    optionB:{
      text:"抢过菜刀让她别剁",
      hint:"立个规矩——苏晚晴会暗爽，但林小满会记仇。",
      effects:{ linxiaoman:-10, suwanqing:+5 },
      consequence:[
        `你一把夺过她手里的菜刀。

「别剁了！现在才七点！」

林小满愣了两秒。`,
        `<span class="speaker lin">林小满</span>：「……你抢我菜刀？」

她盯着你，明显不太高兴。

<span class="speaker lin">林小满</span>：「行，你厉害。」`,
        `她把肉馅往桌上一放，气呼呼地钻回被窝。

<span class="speaker lin">林小满</span>：「以后你自己吃饭去。」

你刚准备道歉，旁边的苏晚晴却从被窝里露出半张脸。`,
        `<span class="speaker su">苏晚晴</span>：「……干得漂亮。」

她翻了个身。

<span class="speaker su">苏晚晴</span>：「终于有人治她了。」`
      ],
      transition:`寝室安静下来——但林小满还在被窝里翻来覆去。`
    },
    nextEventId:"event_02" },

  /* ===== 事件 2：脸盆洗脚疑云 ===== */
  { id:"event_02", idx:2, stage:"前期 · 日常", title:"脸盆洗脚疑云",
    intro:[
      `你推门进厕所。

顾清欢正用你的脸盆泡脚。`,
      `<span class="speaker">你</span>：「……那是我的脸盆。」
<span class="speaker gu">顾清欢</span>：「借我洗个脚嘛。」`,
      `<span class="speaker">你</span>：「我用来洗脸的。」
<span class="speaker gu">顾清欢</span>：「所以呢？」
<span class="speaker">你</span>：「所以？」
<span class="speaker gu">顾清欢</span>：「人家就是借用一下嘛，你不会这么小气吧？」`
    ],
    optionA:{
      text:"当场翻脸，让她赔新的",
      hint:"硬气维权——顾清欢会肉疼，林小满和沈星河会看好你。",
      effects:{ guqinghuan:-10, linxiaoman:+5, shenxinghe:+5 },
      consequence:[
        `你当场沉下脸。

「赔。」

顾清欢愣了一下：「……啊？」`,
        `「一个新的。299，限量款。」

她嘴硬：「人家又不是故意的嘛。」

但你的脸色没松动，她终于不情不愿地掏出手机。`,
        `林小满在旁边看热闹：

<span class="speaker lin">林小满</span>：「哟～有骨气。」

沈星河探头：

<span class="speaker shen">沈星河</span>：「血光之灾应验了。」

<span class="speaker gu">顾清欢</span>瞪她一眼：「……闭嘴。」`
      ],
      transition:`顾清欢下单了一个新脸盆，明天到货。`
    },
    optionB:{
      text:"默默忍了，自己买新的",
      hint:"算了——顾清欢会心虚，但苏晚晴觉得你太软。",
      effects:{ guqinghuan:+5, suwanqing:-5 },
      consequence:[
        `你盯着那个脸盆看了三秒。

算了。`,
        `你转身下楼，自己买了一打新的。

苏晚晴路过，看了你一眼：

<span class="speaker su">苏晚晴</span>：「……你太软了。」`,
        `你没回答。

顾清欢从厕所探出头：

<span class="speaker gu">顾清欢</span>：「那个……谢啦。」

语气里难得有点心虚。`
      ],
      transition:`新脸盆到了，旧的扔了。谁都没再提。`
    },
    nextEventId:"event_03" },

  /* ===== 事件 3：吃饭又不AA ===== */
  { id:"event_03", idx:3, stage:"前期 · 日常", title:"吃饭又不AA",
    intro:[
      `食堂。

林小满端着两份饭大摇大摆坐过来，往你面前推了一份。`,
      `<span class="speaker lin">林小满</span>：「宝，快吃快吃！」
<span class="speaker">你</span>：「……多少钱？」
<span class="speaker lin">林小满</span>：「下次给你！」`,
      `<span class="speaker">你</span>：「你上次也这么说的。」
<span class="speaker lin">林小满</span>：「所以这次是真的下次啊！」`,
      `你看着她，她看着饭，眼神真诚得像在念课文。`
    ],
    optionA:{
      text:"算了，请她",
      hint:"再做一次冤大头——林小满会更黏你。",
      effects:{ linxiaoman:+10 },
      consequence:[
        `你叹了口气，把她那份也付了。

「下次记得还。」`,
        `<span class="speaker lin">林小满</span>：「宝你最好了！」

她扒拉两口，又抬头：「……下次下次。」`,
        `旁边的顾清欢翻了个白眼：

<span class="speaker gu">顾清欢</span>：「你这辈子是收不回了。」`
      ],
      transition:`吃完饭，林小满又溜了。账本上多了一行。`
    },
    optionB:{
      text:"当众翻账本要钱",
      hint:"当众讨债——林小满会恼，顾清欢会觉得该。",
      effects:{ linxiaoman:-10, guqinghuan:+5 },
      consequence:[
        `你掏出账本，啪地拍在桌上。

「第 7 次请客。累计 38 块 5。结一下。」

林小满噎住：「……你怎么还记账啊。」`,
        `她脸涨得通红，最后不情不愿地扫码。

<span class="speaker lin">林小满</span>：「你真小气。」

顾清欢在旁边偷笑：

<span class="speaker gu">顾清欢</span>：「该。」`
      ],
      transition:`林小满付了钱，嘴里还嘀嘀咕咕。`
    },
    nextEventId:"event_04" },

  /* ===== 事件 4：第18次让我带饭 ===== */
  { id:"event_04", idx:4, stage:"前期 · 日常", title:"第18次让我带饭",
    intro:[
      `中午。

林小满又凑过来。`,
      `<span class="speaker lin">林小满</span>：「宝，顺便帮我带份饭呗？」
<span class="speaker">你</span>：「这是第几次了？」
<span class="speaker lin">林小满</span>：「别在意细节嘛。」`,
      `<span class="speaker">你</span>掏出账本：「第 18 次。欠我 38 块 5。」
<span class="speaker lin">林小满</span>：「……你怎么还记账啊，真小气。」`
    ],
    optionA:{
      text:"算了，给她带",
      hint:"第18次妥协——林小满得逞，苏晚晴叹气。",
      effects:{ linxiaoman:+10 },
      consequence:[
        `你又叹了口气。

「这次算我请。」`,
        `<span class="speaker lin">林小满</span>：「宝你最好！」

她把饭盒塞给你：「要糖醋排骨，多饭少菜。」`,
        `苏晚晴路过：

<span class="speaker su">苏晚晴</span>：「……她又得逞了。」

你点头。`
      ],
      transition:`饭带回来了，林小满吃得很香。账本还是没还。`
    },
    optionB:{
      text:"拒绝，让她自己去",
      effects:{ linxiaoman:-5, suwanqing:+3 },
      consequence:[
        `你把账本合上。

「自己去。」`,
        `林小满愣住：「……啊？」

你：「第 18 次了。自己去。」`,
        `她撇嘴：「小气鬼。」

但她还是爬起来自己去了。

苏晚晴点头：「早该这样了。」`
      ],
      transition:`林小满自己出门带饭，回来时还板着脸。`
    },
    nextEventId:"event_05" },

  /* ===== 事件 5：凌晨3点拖地 ===== */
  { id:"event_05", idx:5, stage:"前期 · 日常", title:"凌晨3点拖地",
    intro:[
      `半夜。

你上厕所，撞见苏晚晴在拖地。`,
      `<span class="speaker">你</span>：「……现在凌晨 3 点。」
<span class="speaker su">苏晚晴</span>：「白天太吵，拖不干净。」
<span class="speaker">你</span>：「明天不行？」
<span class="speaker su">苏晚晴</span>：「计划上写着今晚。」`,
      `（她眼底有黑眼圈，手在抖。）`
    ],
    optionA:{
      text:"抢过拖把帮她拖，陪她聊两句",
      effects:{ suwanqing:+10, shenxinghe:+3 },
      consequence:[
        `你走过去，把拖把抢过来。

「我来。你坐下。」

苏晚晴愣住：「……我自己能行。」

你没理她，开始拖。`,
        `她坐在床边，安静了一会儿。

<span class="speaker su">苏晚晴</span>：「……其实是因为白天睡不着。」

你：「嗯。」

她没再说话，但也没回床上。`,
        `沈星河从被窝里探出头：

<span class="speaker shen">沈星河</span>：「……你们俩在干嘛？」

<span class="speaker su">苏晚晴</span>：「拖地。」

<span class="speaker shen">沈星河</span>：「这都几点了。」`
      ],
      transition:`地拖完了，苏晚晴终于肯回床上。`
    },
    optionB:{
      text:"强行把她按回床上",
      effects:{ suwanqing:-5, linxiaoman:+3 },
      consequence:[
        `你走过去，把拖把夺过来，靠在墙上。

「回去睡。」

苏晚晴皱眉：「我还没拖完——」

你把她按回床上：「明天再说。」`,
        `她倔了一会儿，最后躺下了。

林小满翻个身：

<span class="speaker lin">林小满</span>：「终于安静了。」`
      ],
      transition:`苏晚晴躺下了，但你知道她明天还会拖。`
    },
    nextEventId:"event_06" },

  /* ===== 事件 6：我的洗发水去哪了 ===== */
  { id:"event_06", idx:6, stage:"前期 · 日常", title:"我的洗发水去哪了",
    intro:[
      `早上。

你拿起洗发水，发现见底了。`,
      `<span class="speaker">你</span>：「顾清欢，我的洗发水呢？」
<span class="speaker gu">顾清欢</span>：「哎呀，我以为这是公共的呀。」
<span class="speaker">你</span>：「299 一瓶，限量款。」
<span class="speaker gu">顾清欢</span>：「……人家真的不是故意的嘛。」`
    ],
    optionA:{
      text:"罚她请火锅",
      hint:"算总账——顾清欢肉疼，林小满蹭到火锅。",
      effects:{ guqinghuan:-5, linxiaoman:+5 },
      consequence:[
        `你把空瓶往她面前一放。

「赔。火锅。」

顾清欢：「……至于吗？」

你：「至于。」`,
        `她翻了个白眼，但最后还是答应了。

林小满凑过来：

<span class="speaker lin">林小满</span>：「算我一个！」`
      ],
      transition:`晚上果然吃了火锅。顾清欢请的。`
    },
    optionB:{
      text:"大度说算了",
      hint:"放她一马——顾清欢意外，苏晚晴觉得你冤。",
      effects:{ guqinghuan:+10, suwanqing:-3 },
      consequence:[
        `你看了看瓶子。

「……算了。」

顾清欢愣住：「真算了？」

你：「嗯。」`,
        `她脸上闪过一丝意外，又赶紧掩饰：

<span class="speaker gu">顾清欢</span>：「那当然，反正也不贵。」

苏晚晴路过：

<span class="speaker su">苏晚晴</span>：「299 不贵？」

<span class="speaker gu">顾清欢</span>：「……闭嘴。」`
      ],
      transition:`你又买了一瓶新的。顾清欢没说话。`
    },
    nextEventId:"event_07" },

  /* ===== 事件 7：室友半夜宣布给全寝算命 ===== */
  { id:"event_07", idx:7, stage:"前期 · 日常", title:"室友半夜宣布给全寝算命",
    intro:[
      `凌晨。

沈星河突然坐起来。`,
      `<span class="speaker shen">沈星河</span>：「我感觉今晚有东西。」
<span class="speaker lin">林小满</span>：「你又来？」`,
      `<span class="speaker shen">沈星河</span>：「我要给全寝室算一卦。」
<span class="speaker gu">顾清欢</span>：「你上次说我破财，结果是我自己买奶茶。」
<span class="speaker shen">沈星河</span>：「那不是准了吗？」`
    ],
    optionA:{
      text:"郑重配合，一起念咒",
      hint:"陪她中二——沈星河会很高兴，顾清欢翻白眼。",
      effects:{ shenxinghe:+10, guqinghuan:-3 },
      consequence:[
        `你坐直身子，把手机放下。

「好，怎么配合？」

沈星河眼睛一亮，递给你一张符：

<span class="speaker shen">沈星河</span>：「拿着，跟我念。」`,
        `你跟着她念念有词。

顾清欢翻白眼：「两个神经病。」

林小满：「我觉得挺有意思的，让我也来。」`,
        `<span class="speaker shen">沈星河</span>：「……今晚你会有好事。」

你：「真的？」

<span class="speaker shen">沈星河</span>：「真的。」`
      ],
      transition:`符贴在床头了，沈星河终于肯睡。`
    },
    optionB:{
      text:"笑着说「别闹了」",
      hint:"打断她——沈星河会沉默，顾清欢觉得你清醒。",
      effects:{ shenxinghe:-10, guqinghuan:+3 },
      consequence:[
        `你笑着摆手：

「别闹了，快睡吧。」

沈星河愣住：「……你不信？」

你：「不是不信，是太晚了。」`,
        `她收回符，沉默地钻回被窝。

顾清欢：「干得漂亮。」

但你听见她小声嘟囔：

<span class="speaker shen">沈星河</span>：「……这次真的很准。」`
      ],
      transition:`寝室安静下来。沈星河一夜没说话。`
    },
    nextEventId:"event_08" },

  /* ===== 事件 8：玩家生病·温暖转折 ===== */
  { id:"event_08", idx:8, stage:"中期 · 温暖转折", title:"玩家生病·温暖转折",
    intro:[
      `你发烧了，窝在床上。

四个平时烦人的室友，反应各异——`,
      `<span class="speaker lin">林小满</span>嘴上：「__NAME__，你怎么这么弱啊？」

半小时后拎饭回来：「趁热吃。」`,
      `<span class="speaker su">苏晚晴</span>路过：「你昨天又熬夜？」

你发现她偷偷把你台灯调暗了。`,
      `<span class="speaker shen">沈星河</span>：「__NAME__，我昨晚算了一卦，你今天不宜出门。」

然后给你塞了一把伞。`,
      `<span class="speaker gu">顾清欢</span>：「哎呀，__NAME__，你洗发水我真的不是故意的……」

第二天，桌上一瓶新的 299 洗发水。`
    ],
    optionA:{
      text:"默默记下这些温柔",
      hint:"把温柔收好——这群烦人精，好像没那么讨厌了。",
      effects:{ all:+5 },
      keyChoice:"察觉温柔",
      consequence:[
        `你躺在床上，看着她们各自忙碌。

心里有点说不出的滋味。`,
        `林小满塞给你的饭还热着。
苏晚晴调过的台灯温柔多了。
沈星河的伞靠在床头。
顾清欢的洗发水摆在桌上。`,
        `你默默记下这些温柔。

这群烦人精，好像也不是那么讨厌。`
      ],
      transition:`病好了，寝室又恢复吵闹。但好像有什么不一样了。`
    },
    optionB:{
      text:"装作没发现",
      hint:"装睡——她们压低声音商量怎么照顾你。",
      effects:{ all:0 },
      consequence:[
        `你翻个身，背对着她们。

装睡。`,
        `<span class="speaker lin">林小满</span>嘀咕：「这么烫还不肯说话。」
<span class="speaker su">苏晚晴</span>：「让她睡。」`,
        `你听见她们压低声音商量怎么照顾你。

你没说话，但心里有点软。`
      ],
      transition:`病好了。寝室的吵闹没变，但你好像没原来那么烦她们了。`
    },
    nextEventId:"event_09" },

  /* ===== 事件 9：专属关系事件（4 分支） ===== */
  { id:"event_09", idx:9, stage:"中期 · 专属关系事件", title:"专属关系事件", branch:true,
    branches:{
      linxiaoman:{
        intro:[
          `她把一沓零钱拍在你桌上。`,
          `<span class="speaker lin">林小满</span>：「__NAME__，之前欠的，还你。」

你数了数——38 块 5，一分不差。`,
          `后来她又端来一个便当。

<span class="speaker lin">林小满</span>：「今天做多了。」

你打开盒子，发现——她只做了一份。`
        ],
        optionA:{
          text:"收下便当，没说话",
          hint:"收下——她会「明天还做」。",
          effects:{ linxiaoman:+10 },
          keyChoice:"林专属",
          consequence:[
            `你接过便当。盒子还温着，盖子上贴着一张便利贴——「今天给你」，没有「下次」了。`,
            `她也没说话，转身要走。走到门口又回头，假装在找拖鞋：`,
            `<span class="speaker lin">林小满</span>：「……明天还做。」

你点头。

她嘴角动了一下，没让自己笑出来。`,
            `你打开便当。米饭压得实实的，菜码得整整齐齐——她连摆盘都在意了。

那张「今天给你」的贴纸，你撕下来，夹进了课本里。`
          ],
          transition:`便当吃完了。第二天，她又端来一份。后来你才知道，她凌晨四点起来做的——和当年蹲在早餐摊边上一样。`
        },
        optionB:{
          text:"推回去说「不用」",
          hint:"推回去——她还是做了，只是不再端给你。",
          effects:{ linxiaoman:-10 },
          consequence:[
            `你把便当推回去。

「不用。」`,
            `林小满愣住：「……我做多了。」

你：「那就自己吃。」`,
            `她收回便当，没说话。那张「今天给你」的便利贴被她攥在手里，揉皱了。`,
            `但晚上你听见她在厨房又做了一份。菜刀声一下一下，比平时轻。厨房灯亮到很晚。`
          ],
          transition:`她还是做了一份。但没再端给你。那张揉皱的贴纸，第二天出现在垃圾桶里。`
        }
      },
      suwanqing:{
        intro:[
          `苏晚晴的笔记本掉在地上。

你弯腰帮她捡，瞥见最后一页写着——`,
          `「不吃香菜」
「周三有早八」
「下雨忘带伞」`,
          `她一把夺过去合上。

<span class="speaker su">苏晚晴</span>：「__NAME__，顺手记的，免得你拖后腿。」`
        ],
        optionA:{
          text:"没戳破，只是笑",
          hint:"看破不说破——她会多带一把伞。",
          effects:{ suwanqing:+10 },
          keyChoice:"苏专属",
          consequence:[
            `你只是笑了一下。

没戳破。`,
            `她脸上有点不自在：

<span class="speaker su">苏晚晴</span>：「……笑什么。」

你：「没什么。」`,
            `她合上本子，但你看她偷偷又翻了一页，写了一行新字。`,
            `后来你无意间瞥见那一行——你的名字旁边，画了一颗小小的星。

她记了那么多人，只有你的名字旁边有星。`
          ],
          transition:`后来下雨，你发现她多带了一把伞。伞柄上没贴名字，但你知道是给你的——因为只有你的那把，永远干干净净地放在门口。`
        },
        optionB:{
          text:"「你记我干嘛」",
          hint:"挑明——她会把那一页涂掉。",
          effects:{ suwanqing:-10 },
          consequence:[
            `你皱眉：

「……你记我干嘛？」`,
            `<span class="speaker su">苏晚晴</span>愣了一下：「……顺手。」

她把本子塞进抽屉，动作快得像藏证据。`,
            `之后几天，你发现那一页被她用修正带涂掉了。涂了好几层，纸都磨薄了。`,
            `但你对着光，还能隐隐看见修正带底下那颗星的形状。`
          ],
          transition:`笔记本再没出现在桌上。但下雨的时候，她还是会多带一把伞——只是不说是给谁的了。`
        }
      },
      shenxinghe:{
        intro:[
          `沈星河郑重地塞给你一张护身符。

你翻到背面，发现全寝只有你的背面写了名字。`,
          `<span class="speaker">你</span>：「为什么只有我的有名字？」

她沉默了几秒。`,
          `<span class="speaker shen">沈星河</span>：「__NAME__，因为……你的比较重要。」

然后她马上转移话题：「对了，明天有雨，记得带伞。」`
        ],
        optionA:{
          text:"收下，没追问",
          hint:"收下——「你的比较重要」是真心话。",
          effects:{ shenxinghe:+10 },
          keyChoice:"沈专属",
          consequence:[
            `你把符收进口袋。

没追问。`,
            `她松了口气，又装作不在乎：`,
            `<span class="speaker shen">沈星河</span>：「……记得带在身上。」

你点头。`,
            `后来你翻过背面再看——你的名字旁边，还有一行小字，被涂掉了。

你举到灯下，勉强认出三个字：「保你平安」。`
          ],
          transition:`那张符你一直收着。后来下雨天，你发现沈星河偷偷多带了一把伞，伞柄上刻着和符一样的字。`
        },
        optionB:{
          text:"「迷信」丢一边",
          hint:"丢一边——她不会再给你算卦。",
          effects:{ shenxinghe:-10 },
          consequence:[
            `你随手丢在桌上：

「迷信。」`,
            `<span class="speaker shen">沈星河</span>愣住，没说话。

她默默把符拿回去，攥在手心，指节发白。`,
            `第二天，她没再给你算卦。`,
            `但半夜你醒来，看见她床头的灯还亮着。她在重画一张符，画到一半，又揉掉了。`
          ],
          transition:`符不见了。她也没再提。但「你的比较重要」那句话，你后来想起过很多次。`
        }
      },
      guqinghuan:{
        intro:[
          `你桌上多了一瓶新的 299 洗发水。`,
          `<span class="speaker gu">顾清欢</span>：「__NAME__，我可没买啊，谁知道哪来的。」

话音刚落，小票从她口袋里滑出来，落在地上。`,
          `她脸红了。

<span class="speaker gu">顾清欢</span>：「……反正不是给你的。」`
        ],
        optionA:{
          text:"「谢谢」",
          hint:"说谢谢——她耳根会红。",
          effects:{ guqinghuan:+10 },
          keyChoice:"顾专属",
          consequence:[
            `你拿起洗发水。

「谢谢。」`,
            `顾清欢愣住：「……啊？」

你：「谢谢。」`,
            `她别开脸：

<span class="speaker gu">顾清欢</span>：「……不客气。」

但你看见她耳根红了。`,
            `你弯腰捡起地上那张小票，递给她。她接过去，又赶紧塞进口袋——和上次一样。

但这次，她没说「反正不是给你的」。`
          ],
          transition:`洗发水你用了。她再没说「不是给你的」。那张小票，后来你在她日记本的夹层里又见过一次。`
        },
        optionB:{
          text:"「我不要你的施舍」",
          hint:"推开——她会把洗发水放进公共区。",
          effects:{ guqinghuan:-10 },
          consequence:[
            `你把洗发水推回去。

「我不要你的施舍。」`,
            `<span class="speaker gu">顾清欢</span>脸僵住：「……我什么时候施舍了？」

她收回瓶子，没说话。`,
            `那天晚上，她把洗发水放在公共区。瓶口朝外，像在等人来用。`,
            `但谁都没用。小票还在她口袋里，她没扔，只是再没拿出来过。`
          ],
          transition:`洗发水在公共区放了很久。谁都没用。后来保洁阿姨收走了，她什么也没说。`
        }
      }
    },
    nextEventId:"event_10" },

  /* ===== 事件 10：没有边界感的追求者 ===== */
  { id:"event_10", idx:10, stage:"后期 · 没有边界感的追求者", title:"没有边界感的追求者",
    intro:[
      `晚上十点多。

你刚准备关灯。

突然——

楼下传来一个男生的声音：

「__NAME__——！」`,
      `林小满从床上坐起来：

<span class="speaker lin">林小满</span>：「谁啊？」

苏晚晴皱着眉：

<span class="speaker su">苏晚晴</span>：「吵死了。」

楼下又喊：

「__NAME__！我知道你在里面！」`,
      `寝室突然安静。

顾清欢掀开眼罩看向你：

<span class="speaker gu">顾清欢</span>：「__NAME__，是不是叫你呢？」

沈星河慢慢坐起来：

<span class="speaker shen">沈星河</span>：「我就说今晚不对劲。」`,
      `你这才想起白天的事——一个校外活动上认识的男生，要了你所有社交账号，给你的室友发消息打听你，已经纠缠了一周。`,
      `四个人都看着你。

林小满抱着饭勺：

<span class="speaker lin">林小满</span>：「宝，咋办？」

你犹豫着——`
    ],
    optionA:{
      text:"「我自己解决，不想麻烦你们。」",
      hint:"独自扛——她们会安静下来，但那种吵闹会少一截。",
      effects:{ all:-5 },
      keyChoice:"独自扛",
      consequence:[
        `你摇摇头，拿起手机想自己回绝。`,
        `<span class="speaker lin">林小满</span>撇撇嘴：「装什么独立啊。」

苏晚晴没说话，只是把眼镜戴上，盯着你。`,
        `<span class="speaker shen">沈星河</span>小声：「我算过了，今晚……不太行。」

<span class="speaker gu">顾清欢</span>靠在床头：「行吧，随你。」`,
        `她们没再说什么，但寝室里那种吵闹的气息，安静了一截。`
      ],
      transition:`你回绝了楼下。但你知道他明天还会来。`
    },
    optionB:{
      text:"「……我好像真的有点害怕。」",
      hint:"求助——四个人会立刻忙活起来。",
      effects:{ all:+5 },
      keyChoice:"求助室友",
      consequence:[
        `你咬着嘴唇，半天才挤出一句。`,
        `<span class="speaker lin">林小满</span>立刻掀开被子：「谁？哪个？在哪？我去找他。」

<span class="speaker su">苏晚晴</span>已经在记了：「聊天记录发我。」`,
        `<span class="speaker shen">沈星河</span>坐直：「我昨晚就算出来了，此人印堂发黑。」

<span class="speaker gu">顾清欢</span>掏出手机：「行了，这件事交给我。」`,
        `你看着她们忙活，第一次觉得——这群烦人精，好像也没那么讨厌。`
      ],
      transition:`楼下的人走了。但你总觉得，他不会善罢甘休。`
    },
    nextEventId:"event_11" },

  /* ===== 事件 11：骚扰升级 ===== */
  { id:"event_11", idx:11, stage:"后期 · 骚扰升级", title:"骚扰升级",
    intro:[
      `接下来的几天，那个男生变本加厉。

半夜在楼下喊「__NAME__」；
给你寄一些奇怪的东西；
还在你朋友圈下面留言造谣。

你开始失眠。`,
      `林小满端着饭进来：

<span class="speaker lin">林小满</span>：「宝，吃点。」

苏晚晴把一沓打印好的聊天记录放在你桌上：

<span class="speaker su">苏晚晴</span>：「证据我都整理好了。」`,
      `沈星河在你床头贴了一张符：

<span class="speaker shen">沈星河</span>：「保平安的，真的。」

顾清欢没说话，但她的朋友圈已经把那人挂了——措辞相当体面，又相当狠。`,
      `你看着这一切，心里发紧。

躲，还是不躲？`
    ],
    optionA:{
      text:"想搬出去躲一躲",
      hint:"逃——寝室会第一次这么安静。",
      effects:{ all:-3 },
      keyChoice:"想逃避",
      consequence:[
        `你跟室友说想搬出去。`,
        `<span class="speaker lin">林小满</span>愣了一下：「……哦。」

<span class="speaker su">苏晚晴</span>没看你：「也好。」`,
        `<span class="speaker shen">沈星河</span>低声：「逃避不是办法。」

<span class="speaker gu">顾清欢</span>只说了一句：「行李我帮你收。」`,
        `寝室第一次这么安静，安静得让你心里发慌。`
      ],
      transition:`你收拾了行李。但走到门口时，你停下了。`
    },
    optionB:{
      text:"不躲，正面应对",
      hint:"扛——她们会陪你把证据交给辅导员。",
      effects:{ all:+3 },
      keyChoice:"正面应对",
      consequence:[
        `你摇头：

「我不躲。」`,
        `<span class="speaker lin">林小满</span>咧嘴：「这才对嘛！」

<span class="speaker su">苏晚晴</span>点头：「证据齐全，明天就报辅导员。」`,
        `<span class="speaker shen">沈星河</span>把符又贴牢一点：「保你平安。」

<span class="speaker gu">顾清欢</span>翻了个白眼：「放心，外边那位的社死，我已经安排好了。」`
      ],
      transition:`你决定正面应对。但那个男生，似乎也快动手了。`
    },
    nextEventId:"event_12" },

  /* ===== 事件 12：室友护短之夜（高潮，无选项） ===== */
  { id:"event_12", idx:12, stage:"后期 · 护短之夜", title:"室友护短之夜",
    intro:[
      `那天晚上。

那个男生喝醉了，冲到寝室楼下堵你，扬言——

「__NAME__！今天必须跟我走！」

你正发怵。`,
      `突然——

四个平时又烦又离谱的室友，全部站到你前面。`,
      `<span class="speaker lin">林小满</span>拎着饭勺和一锅刚做好的麻辣烫：

「来啊，谁怕谁。」`,
      `<span class="speaker su">苏晚晴</span>掏出一沓整理好的聊天记录截图：

「我已经报警了。这是证据。」`,
      `<span class="speaker shen">沈星河</span>举着符念念有词：

「此人今日有血光之灾——」

林小满：「别说晦气的。」

沈星河：「……好，那我说此人今日必有报应。」`,
      `<span class="speaker gu">顾清欢</span>头也不抬，正在朋友圈挂人：

「已经发出去了。三分钟破千赞。」`,
      `那男生愣住了，半天才挤出一句：

「你们……你们这是什么意思？」

四个人齐声：

「我们是 404 寝室。__NAME__ 是我们的人。」`,
      `你站在她们身后，鼻子一酸。

平时我们怎么互相嫌弃都行——

但外人，不行。`
    ],
    noChoice:true, nextEventId:null },

  /* ===== 隐藏事件 1：阳台夜谈（事件 5 后 · 苏晚晴好感 ≥ 65） ===== */
  { id:"hidden_01", idx:"H1", stage:"隐藏 · 阳台夜谈", title:"阳台夜谈", hidden:true,
    triggerAfter:"event_05",
    condition:(p) => p.affection.suwanqing >= 65,
    intro:[
      `那天凌晨，你又醒了。

阳台上有个身影。`,
      `苏晚晴蹲在阳台角落，抱着膝盖，没在拖地。

你走过去，在她旁边蹲下。`,
      `<span class="speaker su">苏晚晴</span>：「……你怎么也醒了。」

你：「你不在拖地，有点不习惯。」

她没笑。`
    ],
    optionA:{
      text:"「为什么总是凌晨拖地？」",
      hint:"问下去——她会说真话。",
      effects:{ suwanqing:+5 },
      keyChoice:"读懂苏晚晴",
      consequence:[
        `她沉默了很久。`,
        `<span class="speaker su">苏晚晴</span>：「我妈……以前总说我不够好。」

她声音很轻。`,
        `<span class="speaker su">苏晚晴</span>：「凌晨拖完地，我才能觉得——今天至少有一件事做完了。」

你看着她的黑眼圈，没说话。

她靠过来一点点。`,
        `<span class="speaker su">苏晚晴</span>：「别告诉别人。」

你点头。`
      ],
      transition:`天快亮了。从那以后，她凌晨拖地的时候，偶尔会敲敲你的床板。`
    },
    optionB:{
      text:"什么都不问，陪她坐着",
      hint:"沉默地陪——她会记得你在这里。",
      effects:{ suwanqing:+8 },
      consequence:[
        `你什么都没问。在她旁边蹲下来。`,
        `她看了你一眼，没说话。

两个人就那么坐着，听风穿过槐树。`,
        `过了很久，她轻轻靠过来一点。

<span class="speaker su">苏晚晴</span>：「……谢谢。」`
      ],
      transition:`天亮了。从那以后，她凌晨拖地时，会少拖你床边那一块。`
    },
    nextEventId:"event_06" },

  /* ===== 隐藏事件 2：符的来历（事件 7 后 · 沈星河好感 ≥ 65） ===== */
  { id:"hidden_02", idx:"H2", stage:"隐藏 · 符的来历", title:"符的来历", hidden:true,
    triggerAfter:"event_07",
    condition:(p) => p.affection.shenxinghe >= 65,
    intro:[
      `第二天，你发现床头那张符的边角翘了。

你想找沈星河重新贴一下。`,
      `推开她的床帘，她正对着一张旧照片发呆。

照片上是一个老太太，坐在香案前。`,
      `<span class="speaker shen">沈星河</span>：「……我奶奶。」

她发现你，赶紧把照片塞进枕头底下。`
    ],
    optionA:{
      text:"「你奶奶教你的？」",
      hint:"问下去——符的背后是她的来处。",
      effects:{ shenxinghe:+5 },
      keyChoice:"读懂沈星河",
      consequence:[
        `她犹豫了一下，点头。`,
        `<span class="speaker shen">沈星河</span>：「她走之前，给我留了一沓空白的符。」

她声音有点哑。`,
        `<span class="speaker shen">沈星河</span>：「她说，符不是给鬼看的，是给人安心的。谁重要，就给谁写。」

她看着你。`,
        `<span class="speaker shen">沈星河</span>：「全寝室……我只给你写了名字。」`
      ],
      transition:`你帮她把符重新贴好。从那以后，她再不转移话题了。`
    },
    optionB:{
      text:"「别藏了，我看见了」",
      hint:"直接戳破——她会慌，但也会松一口气。",
      effects:{ shenxinghe:+8 },
      consequence:[
        `你蹲下来，和她平视。`,
        `<span class="speaker shen">沈星河</span>愣住，眼圈突然红了。`,
        `她把照片拿出来，放在膝盖上。

<span class="speaker shen">沈星河</span>：「她去年走的。我谁都没说。」

你接过照片，看了看那个慈祥的老太太。`,
        `<span class="speaker shen">沈星河</span>：「……谢谢你不觉得我中二。」`
      ],
      transition:`从那以后，她的床头多了一张旧照片，不再藏了。`
    },
    nextEventId:"event_08" },

  /* ===== 隐藏事件 3：小票的秘密（事件 6 后 · 顾清欢好感 ≥ 65） ===== */
  { id:"hidden_03", idx:"H3", stage:"隐藏 · 小票的秘密", title:"小票的秘密", hidden:true,
    triggerAfter:"event_06",
    condition:(p) => p.affection.guqinghuan >= 65,
    intro:[
      `那天晚上，你在书里夹着的那张 299 小票掉了出来。

顾清欢正好路过，看见了。`,
      `她愣住，然后蹲下来捡起来。

<span class="speaker gu">顾清欢</span>：「……你还留着？」`,
      `你没回答。她翻过小票，背面有一行字——你从来没注意过。`
    ],
    optionA:{
      text:"「上面写了什么？」",
      hint:"看那行字——她的壳裂了一道缝。",
      effects:{ guqinghuan:+5 },
      keyChoice:"读懂顾清欢",
      consequence:[
        `她把小票递给你。`,
        `背面用很细的笔写着——「对不起，还有，谢谢你没赶我走。」`,
        `<span class="speaker gu">顾清欢</span>：「……我写完不敢给你。又怕你看见。」

她别开脸。`,
        `<span class="speaker gu">顾清欢</span>：「我以前……在哪里都待不长。用坏别人的东西，别人就讨厌我了。」

她声音很轻：「你们是第一个没赶我走的。」`
      ],
      transition:`你把小票重新夹回书里。从那以后，她用你的东西前，会先问一句。`
    },
    optionB:{
      text:"把小票撕了",
      hint:"撕掉过去——她会愣住，但释然。",
      effects:{ guqinghuan:+8 },
      consequence:[
        `你接过小票，当着她的面撕成两半。`,
        `<span class="speaker gu">顾清欢</span>愣住：「你——」`,
        `你：「两清了。」

她看着碎片，半天没说话。`,
        `然后她笑了——不是平时那种精致的笑，是真的笑了。

<span class="speaker gu">顾清欢</span>：「……行，两清。」`
      ],
      transition:`碎片扫进了垃圾桶。从那以后，她的精致里多了一点真。`
    },
    nextEventId:"event_07" }
];

/* ---------- 5 类结局 ---------- */
const ENDINGS = {
  all_dorm:{ badge:"全员寝室结局", rating:"S", title:"我们可以互相嫌弃，但你不能",
    text:`那天晚上，你们四个人坐在寝室地板上，吃林小满做好的宵夜。沈星河给每个人算了一卦「今后平安」，顾清欢破天荒主动洗了你的脸盆。

你看着这群又烦又离谱的人，突然意识到——
她们烦得要死，但你好像真的离不开她们了。`,
    textParts:[
      `那天晚上，你们四个人坐在寝室地板上，吃林小满做好的宵夜。沈星河给每个人算了一卦「今后平安」，顾清欢破天荒主动洗了你的脸盆。

你看着这群又烦又离谱的人，突然意识到——她们烦得要死，但你好像真的离不开她们了。`,
      `毕业那天，你们在 404 门口拍合照。林小满带了最后一顿肉饼，苏晚晴的笔记本最后一页写着四个人的名字，沈星河给每人塞了一张「保你平安」的符，顾清欢破天荒说了句「想你们了」——然后立刻改口「想你们的饭」。`,
      `后来你们天各一方。但每年总有那么一天，群里会跳出一张照片：林小满的便当盒、苏晚晴的笔记本、沈星河的符、顾清欢的小票——谁都没扔。`
    ],
    quote:"我们可以互相嫌弃，但你不能。",
    easterEgg:"集齐四件道具——「今天给你」贴纸、星标笔记本、背面有名字的符、夹在书里的小票——你才是真正的 404 传人。" },
  special:{ badge:"特殊关系结局", rating:"A", perRoommate:{
    linxiaoman:{ title:"今天给你",
      text:`护短那晚后，她递给你一个便当盒。盒上没有「下次给你」，写着「今天给你」。

她说：「看什么？快吃。」
你没回答，只是笑了一下。`,
      textParts:[
        `护短那晚后，她递给你一个便当盒。盒上没有「下次给你」，写着「今天给你」。

她说：「看什么？快吃。」
你没回答，只是笑了一下。`,
        `后来你翻出那张「今天给你」的贴纸，它还夹在课本里。你问她要不要还，她别开脸：「扔了。」但你发现她偷偷又看了一眼。`,
        `从此以后，她的便当盒上再没写过「下次」。`
      ],
      quote:"今天给你。",
      easterEgg:"道具：「今天给你」贴纸——林小满能给出的最重的承诺。" },
    suwanqing:{ title:"最后一页",
      text:`她的笔记本最后一页，换成你的名字，旁边画了颗星。谁都没提。

有些事，不用说也都懂。`,
      textParts:[
        `她的笔记本最后一页，换成你的名字，旁边画了颗星。谁都没提。

有些事，不用说也都懂。`,
        `下雨天，门口总有一把干干净净的伞。她不说，你也不问。`,
        `后来你翻开她的本子，发现每一页都记得满满，只有最后一页——只有你的名字和那颗星。`
      ],
      quote:"顺手记的。",
      easterEgg:"道具：星标笔记本——她记了那么多人，只有你的名字旁边有星。" },
    shenxinghe:{ title:"保你平安，真的",
      text:`她给你刻了把新伞，伞柄上刻着「保你平安，真的」。这次她没有转移话题。

「我算过了，」她说，「这辈子，也是。」`,
      textParts:[
        `她给你刻了把新伞，伞柄上刻着「保你平安，真的」。这次她没有转移话题。

「我算过了，」她说，「这辈子，也是。」`,
        `你翻出那张旧符，背面被涂掉的字，对着灯还能看见——「保你平安」。`,
        `她不再用玄学包装在意了。她说「我在乎你」的时候，第一次没有念咒。`
      ],
      quote:"你的比较重要。",
      easterEgg:"道具：背面有名字的护身符——她唯一没包装过的真心话。" },
    guqinghuan:{ title:"未完",
      text:`她的账本最后一行写着「两清」。但你发现，后面还有一行被划掉的——「未完」。`,
      textParts:[
        `她的账本最后一行写着「两清」。但你发现，后面还有一行被划掉的——「未完」。`,
        `你问她划掉的是什么，她别开脸：「没什么。」但你看见她耳根又红了。`,
        `后来你在她日记本夹层里找到那张 299 的小票。背面有一行字，被修正带涂了——你举到灯下，认出两个字：「未完」。`
      ],
      quote:"反正不是给你的。",
      easterEgg:"道具：299 洗发水小票——她划掉的不是账，是说不出口的那句话。" }
  }},
  ambiguous:{ badge:"暧昧留白结局", rating:"B", perRoommate:{
    linxiaoman:{ title:"下次……再说吧",
      text:`她还是端来了便当，还是说「今天做多了」。你没拆穿，她也没多说。

你们之间好像有什么，又好像什么都没有。`,
      textParts:[
        `她还是端来了便当，还是说「今天做多了」。你没拆穿，她也没多说。

你们之间好像有什么，又好像什么都没有。`,
        `便利贴上写着「今天给你」，但这次没有贴在盒子上——她攥在手里，最后塞进了口袋。`,
        `你们谁都没迈出那一步。也许下次，也许下次的下次。`
      ],
      quote:"今天做多了。",
      easterEgg:"道具：没贴上的贴纸——「今天给你」在她口袋里揉皱了，又抚平了。" },
    suwanqing:{ title:"顺手记的",
      text:`她的笔记本最后一页，写着你的名字，旁边画了颗星。谁都没提。

「顺手记的，」她说，然后把本子合上了。`,
      textParts:[
        `她的笔记本最后一页，写着你的名字，旁边画了颗星。谁都没提。

「顺手记的，」她说，然后把本子合上了。`,
        `下雨天，她还是会多带一把伞。你问起，她说：「多带的。」`,
        `有些话，说一半就够了。另一半，谁都没敢说出口。`
      ],
      quote:"顺手记的。",
      easterEgg:"道具：修正带下的星——涂掉了，但对着光还在。" },
    shenxinghe:{ title:"你的比较重要",
      text:`那张护身符你一直收着。她没再问，你也没还。

有些话，说一半就够了。`,
      textParts:[
        `那张护身符你一直收着。她没再问，你也没还。

有些话，说一半就够了。`,
        `她还是会给你算卦，只是每次说到一半就停住了。`,
        `「你的比较重要」——这句话，你们谁都没再提，但谁都没忘。`
      ],
      quote:"你的比较重要。",
      easterEgg:"道具：未还的护身符——背面那行被涂掉的字，你一直没举到灯下看。" },
    guqinghuan:{ title:"反正不是给你的",
      text:`那瓶洗发水你用了很久。她嘴上还说「反正不是给你的」。

但小票，你一直夹在书里。`,
      textParts:[
        `那瓶洗发水你用了很久。她嘴上还说「反正不是给你的」。

但小票，你一直夹在书里。`,
        `她还是会用你的东西，你还是会翻白眼，但谁都没真的生气过。`,
        `那张小票背面的字，你一直没问她。也许答案不重要，重要的是她买过。`
      ],
      quote:"反正不是给你的。",
      easterEgg:"道具：夹在书里的小票——背面有没有字，你一直没看。" }
  }},
  bestfriend:{ badge:"挚友结局", rating:"A", perRoommate:{
    linxiaoman:{ title:"这辈子管饭",
      text:`「行了行了，」她挥挥饭勺，「这辈子你的饭，我管了。」
你笑她说话像欠债，她第一次没还嘴。`,
      textParts:[
        `「行了行了，」她挥挥饭勺，「这辈子你的饭，我管了。」
你笑她说话像欠债，她第一次没还嘴。`,
        `从此以后，你的桌上再没缺过饭。她说「下次给你」的次数，变成了零。`,
        `毕业那天，她塞给你一个饭勺：「以后自己做饭，别饿着。」你发现勺柄上刻着「今天给你」。`
      ],
      quote:"这辈子管饭。",
      easterEgg:"道具：刻着「今天给你」的饭勺——从「下次给你」到「这辈子」，她走了整整一学期。" },
    suwanqing:{ title:"顺手就好",
      text:`她把你的台灯调暗，又把你明天的早八记进本子。
「顺手，」她说，「别多想。」
你没多想，但你知道，她一直在。`,
      textParts:[
        `她把你的台灯调暗，又把你明天的早八记进本子。
「顺手，」她说，「别多想。」
你没多想，但你知道，她一直在。`,
        `她的笔记本里，你的那一页记得最满：早八、忌口、怕黑、讨厌香菜。`,
        `你问她为什么记这么细，她合上本子：「顺手。」但这次她没躲开你的目光。`
      ],
      quote:"顺手就好。",
      easterEgg:"道具：记得满满的那一页——她说「顺手」，但全寝室只有你有一整页。" },
    shenxinghe:{ title:"保你平安",
      text:`她给你刻了把新伞，「这辈子，保你平安。」
你笑她中二，她第一次没反驳。`,
      textParts:[
        `她给你刻了把新伞，「这辈子，保你平安。」
你笑她中二，她第一次没反驳。`,
        `伞柄上的字从「保你平安，真的」变成了「保你平安」。少了两个字，多了一份确定。`,
        `她不再念咒了。她说「我在乎你」的时候，第一次没有用玄学包装。`
      ],
      quote:"保你平安。",
      easterEgg:"道具：伞柄上的字——从「真的」到沉默，是她最确定的一次。" },
    guqinghuan:{ title:"两清",
      text:`她把账本翻到你那页，一笔一笔划掉。
「两清了，」她说，「以后别记了。」
你点点头，没告诉她你从来没记过。`,
      textParts:[
        `她把账本翻到你那页，一笔一笔划掉。
「两清了，」她说，「以后别记了。」
你点点头，没告诉她你从来没记过。`,
        `她把那瓶 299 洗发水放在你桌上。这次她没说「不是给你的」。`,
        `账本最后一页，被划掉的「未完」旁边，她补了一行小字：「现在，完。」`
      ],
      quote:"两清了。",
      easterEgg:"道具：被划掉的「未完」旁补的「现在，完」——精致了十八年的壳，终于裂了一道缝。" }
  }},
  lone:{ badge:"孤狼结局", rating:"C", title:"她们的烦，是另一种在场",
    text:`你一个人扛下了这件事，过程很难。
室友们没说什么，但那几天寝室格外安静——
林小满没再让你带饭，苏晚晴没再凌晨拖地，沈星河没再半夜作法，顾清欢没再用你的东西。

你才发现——原来她们的烦，是另一种「在场」。`,
    textParts:[
      `你一个人扛下了这件事，过程很难。
室友们没说什么，但那几天寝室格外安静——
林小满没再让你带饭，苏晚晴没再凌晨拖地，沈星河没再半夜作法，顾清欢没再用你的东西。`,
      `你躺在床上，听着安静得发慌的寝室。没有剁肉馅的声音，没有拖把的声音，没有念咒的声音，没有借东西的声音。`,
      `你才发现——原来她们的烦，是另一种「在场」。现在她们不烦你了，你反而睡不着了。`
    ],
    quote:"她们的烦，是另一种在场。",
    easterEgg:"这个结局没有专属道具——因为你没让她们走进来。" }
};

/* ---------- LocalStorage Key（保留原 v1 兼容读取） ---------- */
const SAVE_KEY = "wxhxq_save_v1";

return {
  PLAYER_TEMPLATE,
  ROOMMATES,
  COLOR_VAR,
  PRIORITY,
  LORE,
  EVENTS,
  ENDINGS,
  SAVE_KEY
};
})();
