// ============================================================
//  Typekey - タイプキー — app.js
//  通常スクリプト（モジュール不使用）
//  Firebase Compat SDK使用 → グローバルに firebase が存在
// ============================================================

// ─── 基本ユーティリティ ──────────────────────────────────────
function $(id) { return document.getElementById(id); }

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

var LS = {
  get: function(k, d) {
    if (d === undefined) d = null;
    try { var v = localStorage.getItem("tk_"+k); return v !== null ? JSON.parse(v) : d; } catch(e) { return d; }
  },
  set: function(k, v) { localStorage.setItem("tk_"+k, JSON.stringify(v)); }
};

// ─── Firebase 初期化（失敗しても続行） ──────────────────────
var db = null;

try {
  var firebaseConfig = {
    apiKey: "AIzaSyBXnNXQ5khcR0EvRide4C0PjshJZpSF4oM",
    authDomain: "typing-game-28ed0.firebaseapp.com",
    databaseURL: "https://typing-game-28ed0-default-rtdb.firebaseio.com",
    projectId: "typing-game-28ed0",
    storageBucket: "typing-game-28ed0.firebasestorage.app",
    messagingSenderId: "963797267101",
    appId: "1:963797267101:web:0d5d700458fb1991021a74",
  };
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }
} catch(e) {
  console.warn("Firebase初期化失敗（オフラインモードで続行）:", e);
}

// Firebase操作ラッパー（dbがnullでも安全）
function fbSet(path, data) {
  if (!db) return Promise.resolve();
  try { return db.ref(path).set(data); } catch(e) { return Promise.resolve(); }
}
function fbGet(path) {
  if (!db) return Promise.resolve(null);
  try { return db.ref(path).get(); } catch(e) { return Promise.resolve(null); }
}
function fbOnValue(path, cb) {
  if (!db) return function(){};
  try { var r = db.ref(path); r.on("value", cb); return function(){ r.off("value", cb); }; }
  catch(e) { return function(){}; }
}
function fbRemove(path) {
  if (!db) return Promise.resolve();
  try { return db.ref(path).remove(); } catch(e) { return Promise.resolve(); }
}

// ─── ユーザーID ──────────────────────────────────────────────
function getUID() {
  var id = localStorage.getItem("tk_uid");
  if (!id) {
    id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    localStorage.setItem("tk_uid", id);
  }
  return id;
}
var MY_UID = getUID();

// ─── 時間ユーティリティ ──────────────────────────────────────
function todayKey() {
  var d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate()-1);
  return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
}
function weekKey() {
  var d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate()-1);
  var dow = d.getDay();
  var mon = new Date(d);
  mon.setDate(d.getDate() - (dow===0?6:dow-1));
  return mon.getFullYear()+"-"+(mon.getMonth()+1)+"-"+mon.getDate();
}

// ─── ローマ字テーブル ────────────────────────────────────────
var RTABLE = [
  ["きゃ","kya"],["きゅ","kyu"],["きょ","kyo"],
  ["しゃ","sha"],["しゅ","shu"],["しょ","sho"],
  ["ちゃ","cha"],["ちゅ","chu"],["ちょ","cho"],
  ["にゃ","nya"],["にゅ","nyu"],["にょ","nyo"],
  ["ひゃ","hya"],["ひゅ","hyu"],["ひょ","hyo"],
  ["みゃ","mya"],["みゅ","myu"],["みょ","myo"],
  ["りゃ","rya"],["りゅ","ryu"],["りょ","ryo"],
  ["ぎゃ","gya"],["ぎゅ","gyu"],["ぎょ","gyo"],
  ["じゃ","ja"], ["じゅ","ju"], ["じょ","jo"],
  ["びゃ","bya"],["びゅ","byu"],["びょ","byo"],
  ["ぴゃ","pya"],["ぴゅ","pyu"],["ぴょ","pyo"],
  ["ふぁ","fa"], ["ふぃ","fi"], ["ふぇ","fe"], ["ふぉ","fo"],
  ["てぃ","ti"], ["でぃ","di"],
  ["つぁ","tsa"],["うぃ","wi"], ["うぇ","we"],
  ["あ","a"],["い","i"],["う","u"],["え","e"],["お","o"],
  ["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"],
  ["さ","sa"],["し","shi"],["す","su"],["せ","se"],["そ","so"],
  ["た","ta"],["ち","chi"],["つ","tsu"],["て","te"],["と","to"],
  ["な","na"],["に","ni"],["ぬ","nu"],["ね","ne"],["の","no"],
  ["は","ha"],["ひ","hi"],["ふ","fu"],["へ","he"],["ほ","ho"],
  ["ま","ma"],["み","mi"],["む","mu"],["め","me"],["も","mo"],
  ["や","ya"],["ゆ","yu"],["よ","yo"],
  ["ら","ra"],["り","ri"],["る","ru"],["れ","re"],["ろ","ro"],
  ["わ","wa"],["を","wo"],["ん","n"],
  ["が","ga"],["ぎ","gi"],["ぐ","gu"],["げ","ge"],["ご","go"],
  ["ざ","za"],["じ","ji"],["ず","zu"],["ぜ","ze"],["ぞ","zo"],
  ["だ","da"],["ぢ","di"],["づ","du"],["で","de"],["ど","do"],
  ["ば","ba"],["び","bi"],["ぶ","bu"],["べ","be"],["ぼ","bo"],
  ["ぱ","pa"],["ぴ","pi"],["ぷ","pu"],["ぺ","pe"],["ぽ","po"],
  ["ぁ","xa"],["ぃ","xi"],["ぅ","xu"],["ぇ","xe"],["ぉ","xo"],
  ["ゃ","xya"],["ゅ","xyu"],["ょ","xyo"],["っ","xtu"]
];
RTABLE.sort(function(a,b){ return b[0].length - a[0].length; });

function toRomaji(str) {
  var res = "", i = 0;
  while (i < str.length) {
    if (str[i]==="っ" && i+1<str.length) {
      var nxt = toRomaji(str[i+1]);
      if (nxt) { res += nxt[0]; i++; continue; }
    }
    var hit = false;
    for (var t = 0; t < RTABLE.length; t++) {
      if (str.indexOf(RTABLE[t][0], i) === i) {
        res += RTABLE[t][1]; i += RTABLE[t][0].length; hit = true; break;
      }
    }
    if (!hit) { res += str[i++]; }
  }
  return res;
}

// ─── 単語データ ──────────────────────────────────────────────
var WORDS_RAW = {
  easy: ["猫","犬","空","海","山","花","木","水","火","風","雨","雪","星","月","鳥","魚","川","森","道","石","葉","虫","朝","夜","音"],
  normal: ["友達","学校","電車","飛行機","音楽","映画館","図書館","自転車","冒険","挑戦","スマホ","サッカー","プログラム","ゲーム","カメラ","ランニング","おにぎり","りんごジュース","チョコレート","バドミントン"],
  hard: ["コンピュータプログラム","インターネット通信","スマートフォン操作","プログラミング言語","アドベンチャーゲーム","コミュニケーション","インフラストラクチャ","エンターテインメント","マルチプレイヤーゲーム","情報セキュリティシステム","人工知能技術","ビジュアルプログラミング","ネットワーク管理システム","コンテンツクリエイター","スーパーコンピュータ","データベース管理","クラウドコンピューティング","モバイルアプリ開発","デジタルトランスフォーメーション","インタラクティブデザイン"]
};
var WORDS = {};
var diffs = Object.keys(WORDS_RAW);
for (var di = 0; di < diffs.length; di++) {
  var diff = diffs[di];
  WORDS[diff] = WORDS_RAW[diff].map(function(ja){ return { ja: ja, romaji: toRomaji(ja).toLowerCase() }; });
}

// ─── プレイヤー ──────────────────────────────────────────────
var player = { name:"", coins:0, level:1, xp:0, friendCode:"", nameChanges:{date:"",count:0} };

function xpNeeded(lv) { return Math.floor(100 * Math.pow(2, lv-1)); }

function genFriendCode() {
  var n = Math.floor(Math.random()*1000000).toString().padStart(6,"0");
  var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var a = L[Math.floor(Math.random()*26)] + L[Math.floor(Math.random()*26)] + L[Math.floor(Math.random()*26)];
  return n + a;
}

function loadPlayer() {
  var saved = LS.get("player");
  if (saved) {
    player.name = saved.name || player.name;
    player.coins = saved.coins || 0;
    player.level = saved.level || 1;
    player.xp = saved.xp || 0;
    player.friendCode = saved.friendCode || "";
    player.nameChanges = saved.nameChanges || {date:"",count:0};
    if (!player.friendCode) { player.friendCode = genFriendCode(); }
  } else {
    var n = Math.floor(Math.random()*1000000000000);
    player.name = "匿名" + String(n).padStart(12,"0");
    player.friendCode = genFriendCode();
    savePlayer();
  }
}

function savePlayer() {
  LS.set("player", player);
  fbSet("users/"+MY_UID, {
    name: player.name, friendCode: player.friendCode,
    level: player.level, xp: player.xp, coins: player.coins,
    uid: MY_UID, lastSeen: Date.now()
  });
}

function addCoins(n) { player.coins += n; savePlayer(); refreshHUD(); }

function addXP(n) {
  player.xp += n;
  var leveled = false;
  while (player.xp >= xpNeeded(player.level)) {
    player.xp -= xpNeeded(player.level);
    player.level++;
    leveled = true;
  }
  savePlayer(); refreshHUD();
  if (leveled) { $("toast-lv-n").textContent = player.level; showToast("toast-lv"); }
}

function refreshHUD() {
  $("coin-val").textContent = player.coins.toLocaleString();
  $("lv-num").textContent = player.level;
  var need = xpNeeded(player.level);
  $("xp-cur").textContent = player.xp;
  $("xp-max").textContent = need;
  $("xp-fill").style.width = (player.xp / need * 100) + "%";
}

// ─── トースト ────────────────────────────────────────────────
function showToast(id, ms) {
  if (!ms) ms = 2600;
  var el = $(id);
  el.classList.add("show");
  setTimeout(function(){ el.classList.remove("show"); }, ms);
}

// ─── スクリーン切り替え ──────────────────────────────────────
function showScreen(id) {
  var all = document.querySelectorAll(".screen");
  for (var i=0; i<all.length; i++) all[i].classList.remove("active");
  var el = $(id);
  if (el) el.classList.add("active");
}

// ─── パネル開閉 ──────────────────────────────────────────────
var openPanelId = null;

function openPanel(id) {
  if (openPanelId && openPanelId !== id) closePanel(openPanelId, false);
  var el = $(id);
  if (!el) return;
  el.classList.remove("hidden");
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ el.classList.add("open"); });
  });
  $("dim").classList.remove("hidden");
  openPanelId = id;
}

function closePanel(id, reset) {
  if (reset === undefined) reset = true;
  var el = $(id);
  if (!el) return;
  el.classList.remove("open");
  $("dim").classList.add("hidden");
  setTimeout(function(){ el.classList.add("hidden"); }, 310);
  if (reset) openPanelId = null;
}

// ─── プロフィール ────────────────────────────────────────────
function fmtCode(fc) {
  return fc ? fc.slice(0,3)+"-"+fc.slice(3,6)+"-"+fc.slice(6) : "------";
}

function renderProfile() {
  $("p-name").textContent = player.name;
  $("my-fc").textContent = fmtCode(player.friendCode);
  var tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = {date:tk, count:0};
  $("name-change-left").textContent = "本日あと " + Math.max(0, 3-player.nameChanges.count) + " 回変更できます";
}

function saveName() {
  var v = $("name-input").value.trim();
  if (!v) return;
  if (v.length > 20) { $("name-change-left").textContent="20文字以内で入力してください"; return; }
  var tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = {date:tk, count:0};
  if (player.nameChanges.count >= 3) { $("name-change-left").textContent="本日の変更回数を使い切りました"; return; }
  player.nameChanges.count++;
  player.name = v;
  savePlayer();
  $("name-edit-area").classList.add("hidden");
  renderProfile();
}

// ─── フレンドシステム ────────────────────────────────────────
function sendFriendRequest() {
  var raw = $("fc-input").value.replace(/-/g,"").toUpperCase().trim();
  var msgEl = $("add-msg");
  if (!raw) { setMsg(msgEl,"コードを入力してください","err"); return; }
  if (raw === player.friendCode) { setMsg(msgEl,"自分のコードは追加できません","err"); return; }
  var myFriends = LS.get("f_"+MY_UID, {});
  var vals = Object.keys(myFriends).map(function(k){ return myFriends[k]; });
  for (var i=0; i<vals.length; i++) {
    if ((vals[i].friendCode||"").replace(/-/g,"") === raw) { setMsg(msgEl,"すでにフレンドです","err"); return; }
  }
  setMsg(msgEl,"検索中…","");
  fbGet("users").then(function(snap){
    if (!snap || !snap.exists()) { setMsg(msgEl,"ユーザーが見つかりません","err"); return; }
    var found = null;
    snap.forEach(function(child){
      var d = child.val();
      if ((d.friendCode||"").replace(/-/g,"") === raw) found = {uid:child.key, name:d.name, friendCode:d.friendCode};
    });
    if (!found) { setMsg(msgEl,"ユーザーが見つかりません","err"); return; }
    fbSet("friend_requests/"+found.uid+"/"+MY_UID, {
      fromUid:MY_UID, fromName:player.name, fromCode:player.friendCode, ts:Date.now()
    }).then(function(){
      setMsg(msgEl, esc(found.name)+" さんに申請しました", "ok");
      $("fc-input").value = "";
    });
  }).catch(function(){ setMsg(msgEl,"エラーが発生しました","err"); });
}

function setMsg(el, txt, cls) { el.textContent=txt; el.className="msg"+(cls?" "+cls:""); }

var reqUnsubscribe = null;
function listenRequests() {
  if (reqUnsubscribe) { reqUnsubscribe(); reqUnsubscribe=null; }
  reqUnsubscribe = fbOnValue("friend_requests/"+MY_UID, function(snap){
    var data = (snap && snap.exists()) ? snap.val() : {};
    renderRequests(data);
    var cnt = Object.keys(data).length;
    var badge = $("req-badge");
    if (cnt>0) { badge.textContent=cnt; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  });
}

function renderRequests(data) {
  var el = $("req-list");
  el.innerHTML = "";
  var keys = Object.keys(data);
  if (!keys.length) { el.innerHTML='<div class="empty-note">申請はありません</div>'; return; }
  keys.forEach(function(uid){
    var r = data[uid];
    var div = document.createElement("div");
    div.className = "r-card";
    div.innerHTML =
      '<div class="f-info">'+
        '<div class="f-name">'+esc(r.fromName)+'</div>'+
        '<div class="f-code">'+fmtCode(r.fromCode)+'</div>'+
      '</div>'+
      '<div class="r-btns">'+
        '<button class="r-btn r-accept">許可</button>'+
        '<button class="r-btn r-deny">拒否</button>'+
      '</div>';
    div.querySelector(".r-accept").addEventListener("click", function(){ acceptFriend(uid, r.fromName, r.fromCode); });
    div.querySelector(".r-deny").addEventListener("click", function(){ fbRemove("friend_requests/"+MY_UID+"/"+uid); });
    el.appendChild(div);
  });
}

function acceptFriend(uid, name, code) {
  var ts = Date.now();
  fbSet("friends/"+MY_UID+"/"+uid, {name:name, friendCode:code, since:ts});
  fbSet("friends/"+uid+"/"+MY_UID, {name:player.name, friendCode:player.friendCode, since:ts});
  fbRemove("friend_requests/"+MY_UID+"/"+uid);
}

var onlineSubs = {};
var fListUnsubscribe = null;
function listenFriends() {
  if (fListUnsubscribe) { fListUnsubscribe(); fListUnsubscribe=null; }
  fListUnsubscribe = fbOnValue("friends/"+MY_UID, function(snap){
    var data = (snap && snap.exists()) ? snap.val() : {};
    LS.set("f_"+MY_UID, data);
    renderFriends(data);
  });
}

function renderFriends(data) {
  Object.keys(onlineSubs).forEach(function(uid){ onlineSubs[uid](); delete onlineSubs[uid]; });
  var el = $("friend-list");
  el.innerHTML = "";
  var uids = Object.keys(data);
  if (!uids.length) { el.innerHTML='<div class="empty-note">フレンドはいません</div>'; return; }
  uids.forEach(function(uid){
    var f = data[uid];
    var div = document.createElement("div");
    div.className = "f-card";
    div.innerHTML =
      '<div class="online-dot off" id="dot_'+uid+'"></div>'+
      '<div class="f-info">'+
        '<div class="f-name" id="fn_'+uid+'">'+esc(f.name||"不明")+'</div>'+
        '<div class="f-code">'+fmtCode(f.friendCode)+'</div>'+
      '</div>'+
      '<button class="del-btn" title="削除">✕</button>';
    div.querySelector(".del-btn").addEventListener("click", function(){
      if (!confirm("フレンドを削除しますか？")) return;
      fbRemove("friends/"+MY_UID+"/"+uid);
      fbRemove("friends/"+uid+"/"+MY_UID);
    });
    el.appendChild(div);

    onlineSubs[uid] = fbOnValue("users/"+uid+"/lastSeen", function(s){
      var dot = $("dot_"+uid);
      if (!dot) return;
      var ts = (s && s.exists()) ? s.val() : 0;
      dot.className = "online-dot " + (typeof ts==="number" && ts>0 && Date.now()-ts<30000 ? "on" : "off");
    });
    fbOnValue("users/"+uid+"/name", function(s){
      var ne = $("fn_"+uid);
      if (ne && s && s.exists()) ne.textContent = s.val();
    });
  });
}

function startHeartbeat() {
  function beat() { fbSet("users/"+MY_UID+"/lastSeen", Date.now()); }
  beat();
  setInterval(beat, 14000);
}

// ─── タスク ──────────────────────────────────────────────────
var DAILY_DEF = [
  { id:"d1", label:"10回プレイする",              goal:10 },
  { id:"d2", label:"スコア 5,000〜50,000 を出す", goal:1  },
  { id:"d3", label:"コンボ 50〜150 を出す",        goal:1  }
];
var WEEKLY_DEF = [
  { id:"w1", label:"100回プレイする",              goal:100 },
  { id:"w2", label:"スコア 500〜50,000 を10回出す", goal:10  },
  { id:"w3", label:"コンボ 50〜150 を10回出す",     goal:10  }
];

function loadTasks() {
  var tk=todayKey(), wk=weekKey();
  var dt=LS.get("dt"), wt=LS.get("wt");
  if (!dt||dt.key!==tk) { dt={key:tk, prog:{}, cleared:false}; LS.set("dt",dt); }
  if (!wt||wt.key!==wk) { wt={key:wk, prog:{}, cleared:false}; LS.set("wt",wt); }
  return {dt:dt, wt:wt};
}

function renderTasks() {
  var tasks = loadTasks();
  buildTaskUI("daily-tasks",  DAILY_DEF,  tasks.dt.prog);
  buildTaskUI("weekly-tasks", WEEKLY_DEF, tasks.wt.prog);
}

function buildTaskUI(cid, defs, prog) {
  var el = $(cid);
  if (!el) return;
  el.innerHTML = "";
  defs.forEach(function(def){
    var cur  = Math.min(prog[def.id]||0, def.goal);
    var done = cur >= def.goal;
    var pct  = (cur/def.goal)*100;
    var d = document.createElement("div");
    d.className = "task-item" + (done?" done":"");
    d.innerHTML =
      '<div class="task-name">'+(done?"✓ ":"")+def.label+'</div>'+
      '<div class="task-bar-outer"><div class="task-bar-inner" style="width:'+pct+'%"></div></div>'+
      '<div class="task-prog">'+cur+' / '+def.goal+'</div>';
    el.appendChild(d);
  });
}

function updateTasksAfterGame(score, maxCombo) {
  var tasks = loadTasks();
  var dt = tasks.dt, wt = tasks.wt;

  if (!dt.cleared) {
    dt.prog.d1 = (dt.prog.d1||0)+1;
    if (score>=5000&&score<=50000)   dt.prog.d2 = Math.min((dt.prog.d2||0)+1, 1);
    if (maxCombo>=50&&maxCombo<=150) dt.prog.d3 = Math.min((dt.prog.d3||0)+1, 1);
    var dailyDone = DAILY_DEF.every(function(d){ return (dt.prog[d.id]||0)>=d.goal; });
    if (dailyDone) {
      dt.cleared=true; addCoins(1500); addXP(50);
      setTimeout(function(){ $("toast-task-body").textContent="+50 XP · +1,500 ¤"; showToast("toast-task"); },400);
    }
    LS.set("dt",dt);
  }
  if (!wt.cleared) {
    wt.prog.w1 = (wt.prog.w1||0)+1;
    if (score>=500&&score<=50000)    wt.prog.w2 = Math.min((wt.prog.w2||0)+1, 10);
    if (maxCombo>=50&&maxCombo<=150) wt.prog.w3 = Math.min((wt.prog.w3||0)+1, 10);
    var weeklyDone = WEEKLY_DEF.every(function(d){ return (wt.prog[d.id]||0)>=d.goal; });
    if (weeklyDone) {
      wt.cleared=true; addCoins(15000); addXP(500);
      setTimeout(function(){ $("toast-task-body").textContent="+500 XP · +15,000 ¤"; showToast("toast-task"); },1600);
    }
    LS.set("wt",wt);
  }
  renderTasks();
}

// ─── ゲームエンジン ──────────────────────────────────────────
var G = { active:false, diff:"easy", pool:[], idx:0, word:null, romaji:"", pos:0,
          score:0, combo:0, maxCombo:0, timeLeft:60, timer:null };

function startGame(diff) {
  G.active=true; G.diff=diff;
  G.pool = shuffle(WORDS[diff].concat(WORDS[diff]));
  G.idx=0; G.score=0; G.combo=0; G.maxCombo=0; G.timeLeft=60;
  $("g-score").textContent="0"; $("g-combo").textContent="0";
  $("g-time").textContent="60"; $("g-time").classList.remove("danger");
  showScreen("screen-game");
  nextWord();
  clearInterval(G.timer);
  G.timer = setInterval(tick, 1000);
  document.removeEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey);
}

function tick() {
  G.timeLeft--;
  $("g-time").textContent = G.timeLeft;
  if (G.timeLeft <= 10) $("g-time").classList.add("danger");
  if (G.timeLeft <= 0)  endGame();
}

function nextWord() {
  if (G.idx >= G.pool.length) G.pool = G.pool.concat(shuffle(WORDS[G.diff].slice()));
  G.word = G.pool[G.idx++];
  G.romaji = G.word.romaji.toLowerCase();
  G.pos = 0;
  $("g-ja").textContent   = G.word.ja;
  $("g-hint").textContent = G.romaji;
  updateInput();
}

function updateInput() {
  $("g-ok").textContent   = G.romaji.slice(0, G.pos);
  $("g-rest").textContent = G.romaji.slice(G.pos);
}

function onKey(e) {
  if (!G.active) return;
  if (e.ctrlKey||e.altKey||e.metaKey) return;
  if (e.key.length !== 1) return;
  e.preventDefault();
  if (e.key === G.romaji[G.pos]) {
    G.pos++; G.combo++;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    G.score += 5 * G.combo;
    $("g-score").textContent = G.score.toLocaleString();
    $("g-combo").textContent = G.combo;
    if (G.pos >= G.romaji.length) nextWord(); else updateInput();
  } else {
    G.combo = 0; $("g-combo").textContent = "0"; flashMiss();
  }
}

function flashMiss() {
  var el = $("miss-flash");
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  setTimeout(function(){ el.classList.remove("on"); }, 110);
}

function endGame() {
  clearInterval(G.timer); G.active=false;
  document.removeEventListener("keydown", onKey);
  var coins=Math.floor(G.score/10), xp=Math.floor(G.score/100);
  addCoins(coins); addXP(xp);
  updateTasksAfterGame(G.score, G.maxCombo);
  $("r-score").textContent = G.score.toLocaleString();
  $("r-combo").textContent = G.maxCombo;
  $("r-coins").textContent = coins.toLocaleString()+" ¤";
  $("r-xp").textContent    = xp+" XP";
  showScreen("screen-result");
}

// ─── タブ切り替えヘルパー ────────────────────────────────────
function setupTabGroup(tabs, panes, getKey) {
  tabs.forEach(function(tab){
    tab.addEventListener("click", function(){
      tabs.forEach(function(t){ t.classList.remove("active"); });
      tab.classList.add("active");
      var key = getKey(tab);
      panes.forEach(function(p){ p.classList.remove("active"); });
      var target = $(key);
      if (target) target.classList.add("active");
    });
  });
}

// ─── 起動 ────────────────────────────────────────────────────
loadPlayer();
refreshHUD();
startHeartbeat();
showScreen("screen-main");

// ─── イベントリスナー（全てここで登録） ─────────────────────

// ナビゲーション
$("btn-play") .addEventListener("click", function(){ showScreen("screen-diff"); });
$("diff-back").addEventListener("click", function(){ showScreen("screen-main"); });
$("btn-retry").addEventListener("click", function(){ showScreen("screen-diff"); });
$("btn-end")  .addEventListener("click", function(){ showScreen("screen-main"); });

// 難易度ボタン
var diffRows = document.querySelectorAll(".diff-row");
for (var i=0; i<diffRows.length; i++) {
  (function(btn){
    btn.addEventListener("click", function(){ startGame(btn.getAttribute("data-diff")); });
  })(diffRows[i]);
}

// フレンドパネル開閉
$("friend-btn").addEventListener("click", function(){
  renderProfile();
  openPanel("panel-friend");
  listenRequests();
  listenFriends();
});
$("friend-close").addEventListener("click", function(){ closePanel("panel-friend"); });

// タスクパネル開閉
$("task-btn").addEventListener("click", function(){
  renderTasks();
  openPanel("panel-task");
});
$("task-close").addEventListener("click", function(){ closePanel("panel-task"); });

// 暗転クリックで閉じる
$("dim").addEventListener("click", function(){ if (openPanelId) closePanel(openPanelId); });

// プロフィール名前編集
$("btn-edit-name").addEventListener("click", function(){
  var tk = todayKey();
  if (player.nameChanges.date!==tk) player.nameChanges={date:tk,count:0};
  if (player.nameChanges.count>=3) { $("name-change-left").textContent="本日の変更回数を使い切りました"; return; }
  $("name-edit-area").classList.remove("hidden");
  $("name-input").value = player.name;
  $("name-input").focus();
});
$("btn-save-name").addEventListener("click", saveName);
$("name-input").addEventListener("keydown", function(e){ if(e.key==="Enter") saveName(); });

// フレンド追加
$("btn-add-friend").addEventListener("click", sendFriendRequest);
$("fc-input").addEventListener("keydown", function(e){ if(e.key==="Enter") sendFriendRequest(); });

// フレンドパネルタブ（プロフィール/フレンド）
var ptabsFriend = Array.prototype.slice.call(document.querySelectorAll(".ptab[data-ptab]"));
setupTabGroup(ptabsFriend, Array.prototype.slice.call(document.querySelectorAll(".pane")), function(tab){
  return "pane-"+tab.getAttribute("data-ptab");
});

// タスクパネルタブ（毎日/週間）
var ptabsTask = Array.prototype.slice.call(document.querySelectorAll(".ptab[data-ttab]"));
setupTabGroup(ptabsTask, Array.prototype.slice.call(document.querySelectorAll(".tpane")), function(tab){
  return "tp-"+tab.getAttribute("data-ttab");
});

// フレンドサブタブ（追加/申請/リスト）
var stabs = Array.prototype.slice.call(document.querySelectorAll(".stab"));
setupTabGroup(stabs, Array.prototype.slice.call(document.querySelectorAll(".sp")), function(tab){
  return "sp-"+tab.getAttribute("data-stab");
});
