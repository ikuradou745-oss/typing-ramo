// =============================================================
//  Typekey - タイプキー  /  app.js
//  外部依存ゼロ。Firebase REST API（fetch）でDB操作。
//  全関数はグローバルスコープ → onclickから直接呼べる。
// =============================================================

// ── Firebase REST API ────────────────────────────────────────
var FB_URL = "https://typing-game-28ed0-default-rtdb.firebaseio.com";

function fbGet(path) {
  return fetch(FB_URL + "/" + path + ".json")
    .then(function(r){ return r.json(); })
    .catch(function(){ return null; });
}
function fbSet(path, data) {
  return fetch(FB_URL + "/" + path + ".json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).catch(function(){});
}
function fbPatch(path, data) {
  return fetch(FB_URL + "/" + path + ".json", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).catch(function(){});
}
function fbDelete(path) {
  return fetch(FB_URL + "/" + path + ".json", { method: "DELETE" })
    .catch(function(){});
}

// ── ユーティリティ ────────────────────────────────────────────
function $el(id) { return document.getElementById(id); }

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function safeEsc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

var LS = {
  get: function(k, d) {
    try {
      var v = localStorage.getItem("tk_" + k);
      return v !== null ? JSON.parse(v) : (d !== undefined ? d : null);
    } catch(e) { return d !== undefined ? d : null; }
  },
  set: function(k, v) {
    try { localStorage.setItem("tk_" + k, JSON.stringify(v)); } catch(e) {}
  }
};

// ── UID（ブラウザ・ドメインごとに固定） ──────────────────────
var MY_UID = (function() {
  var id = localStorage.getItem("tk_uid");
  if (!id) {
    id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("tk_uid", id);
  }
  return id;
})();

// ── 時間ユーティリティ（朝7時区切り） ────────────────────────
function todayKey() {
  var d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
}
function weekKey() {
  var d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  var dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
}

// ── ローマ字変換テーブル ───────────────────────────────────────
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
  ["てぃ","ti"], ["でぃ","di"],["つぁ","tsa"],
  ["うぃ","wi"], ["うぇ","we"],
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
    if (str[i] === "っ" && i + 1 < str.length) {
      var nxt = toRomaji(str[i+1]);
      if (nxt.length > 0) { res += nxt[0]; i++; continue; }
    }
    var hit = false;
    for (var t = 0; t < RTABLE.length; t++) {
      if (str.substr(i, RTABLE[t][0].length) === RTABLE[t][0]) {
        res += RTABLE[t][1]; i += RTABLE[t][0].length; hit = true; break;
      }
    }
    if (!hit) { res += str[i]; i++; }
  }
  return res;
}

// ── 単語データ ─────────────────────────────────────────────────
var WORDS_RAW = {
  easy:   ["猫","犬","空","海","山","花","木","水","火","風","雨","雪","星","月","鳥","魚","川","森","道","石","葉","虫","朝","夜","音"],
  normal: ["友達","学校","電車","飛行機","音楽","映画館","図書館","自転車","冒険","挑戦","スマホ","サッカー","プログラム","ゲーム","カメラ","ランニング","おにぎり","りんごジュース","チョコレート","バドミントン"],
  hard:   ["コンピュータプログラム","インターネット通信","スマートフォン操作","プログラミング言語","アドベンチャーゲーム","コミュニケーション","インフラストラクチャ","エンターテインメント","マルチプレイヤーゲーム","情報セキュリティシステム","人工知能技術","ビジュアルプログラミング","ネットワーク管理システム","コンテンツクリエイター","スーパーコンピュータ","データベース管理","クラウドコンピューティング","モバイルアプリ開発","デジタルトランスフォーメーション","インタラクティブデザイン"]
};
var WORDS = {};
(function(){
  var keys = Object.keys(WORDS_RAW);
  for (var i = 0; i < keys.length; i++) {
    var diff = keys[i];
    WORDS[diff] = WORDS_RAW[diff].map(function(ja){ return { ja:ja, romaji:toRomaji(ja).toLowerCase() }; });
  }
})();

// ── プレイヤーデータ ───────────────────────────────────────────
var player = { name:"", coins:0, level:1, xp:0, friendCode:"", nameChanges:{date:"",count:0} };

function xpNeeded(lv) { return Math.floor(100 * Math.pow(2, lv - 1)); }

function genFriendCode() {
  var n = Math.floor(Math.random() * 1000000).toString();
  while (n.length < 6) n = "0" + n;
  var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return n + L[Math.floor(Math.random()*26)] + L[Math.floor(Math.random()*26)] + L[Math.floor(Math.random()*26)];
}

function loadPlayer() {
  var saved = LS.get("player");
  if (saved && saved.name) {
    player.name        = saved.name;
    player.coins       = saved.coins || 0;
    player.level       = saved.level || 1;
    player.xp          = saved.xp || 0;
    player.friendCode  = saved.friendCode || genFriendCode();
    player.nameChanges = saved.nameChanges || { date:"", count:0 };
  } else {
    var n = Math.floor(Math.random() * 1e12);
    var s = String(n);
    while (s.length < 12) s = "0" + s;
    player.name       = "匿名" + s;
    player.friendCode = genFriendCode();
    savePlayer();
  }
}

function savePlayer() {
  LS.set("player", player);
  // Firebase に同期（失敗しても無視）
  fbSet("users/" + MY_UID, {
    name: player.name,
    friendCode: player.friendCode,
    level: player.level,
    xp: player.xp,
    coins: player.coins,
    uid: MY_UID,
    lastSeen: Date.now()
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
  savePlayer();
  refreshHUD();
  if (leveled) {
    $el("toast-lv-n").textContent = player.level;
    showToast("toast-lv");
  }
}

function refreshHUD() {
  $el("coin-val").textContent = player.coins.toLocaleString();
  $el("lv-num").textContent   = player.level;
  var need = xpNeeded(player.level);
  $el("xp-cur").textContent  = player.xp;
  $el("xp-max").textContent  = need;
  $el("xp-fill").style.width = Math.min(100, player.xp / need * 100) + "%";
}

// ── トースト ──────────────────────────────────────────────────
function showToast(id, ms) {
  var el = $el(id);
  if (!el) return;
  el.classList.add("show");
  setTimeout(function(){ el.classList.remove("show"); }, ms || 2600);
}

// ── スクリーン切り替え ─────────────────────────────────────────
function showScreen(id) {
  var screens = document.querySelectorAll(".screen");
  for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
  var el = $el(id);
  if (el) el.classList.add("active");
}

// ── パネル開閉 ─────────────────────────────────────────────────
var _openPanelId = null;

function _openPanel(id) {
  var el = $el(id);
  if (!el) return;
  if (_openPanelId && _openPanelId !== id) _closePanel(_openPanelId);
  el.style.display = "flex";
  setTimeout(function(){ el.classList.add("open"); }, 10);
  $el("dim").style.display = "block";
  _openPanelId = id;
}

function _closePanel(id) {
  var el = $el(id);
  if (!el) return;
  el.classList.remove("open");
  setTimeout(function(){ el.style.display = "none"; }, 330);
  $el("dim").style.display = "none";
  _openPanelId = null;
}

function closeAnyPanel() {
  if (_openPanelId) _closePanel(_openPanelId);
}

// ── フレンドパネルを開く ──────────────────────────────────────
function openFriendPanel() {
  renderProfile();
  _openPanel("panel-friend");
  loadFriendRequests();
  loadFriendList();
  // 5秒ごとにリフレッシュ（リアルタイム擬似）
  clearInterval(_friendPollTimer);
  _friendPollTimer = setInterval(function(){
    if (_openPanelId === "panel-friend") {
      loadFriendRequests();
      loadFriendList();
    }
  }, 5000);
}

// ── タスクパネルを開く ────────────────────────────────────────
function openTaskPanel() {
  renderTasks();
  _openPanel("panel-task");
}

// ── プロフィール ──────────────────────────────────────────────
function fmtCode(fc) {
  if (!fc || fc.length < 9) return "------";
  return fc.slice(0,3) + "-" + fc.slice(3,6) + "-" + fc.slice(6);
}

function renderProfile() {
  $el("p-name").textContent = player.name;
  $el("my-fc").textContent  = fmtCode(player.friendCode);
  var tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = { date:tk, count:0 };
  $el("name-change-left").textContent = "本日あと " + Math.max(0, 3 - player.nameChanges.count) + " 回変更できます";
}

function toggleNameEdit() {
  var area = $el("name-edit-area");
  var tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = { date:tk, count:0 };
  if (player.nameChanges.count >= 3) {
    $el("name-change-left").textContent = "本日の変更回数を使い切りました";
    return;
  }
  area.style.display = area.style.display === "none" ? "block" : "none";
  if (area.style.display === "block") {
    $el("name-input").value = player.name;
    $el("name-input").focus();
  }
}

function saveNameEdit() {
  var v = $el("name-input").value.trim();
  if (!v) return;
  if (v.length > 20) { $el("name-change-left").textContent = "20文字以内で入力してください"; return; }
  var tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = { date:tk, count:0 };
  if (player.nameChanges.count >= 3) { $el("name-change-left").textContent = "本日の変更回数を使い切りました"; return; }
  player.nameChanges.count++;
  player.name = v;
  savePlayer();
  $el("name-edit-area").style.display = "none";
  renderProfile();
}

// ── タブ切り替え ──────────────────────────────────────────────
function switchFriendTab(tab) {
  var tabs   = ["profile", "friends"];
  var panes  = ["pane-profile", "pane-friends"];
  var btnIds = ["ptab-profile", "ptab-friends"];
  for (var i = 0; i < tabs.length; i++) {
    var isActive = tabs[i] === tab;
    $el(btnIds[i]).classList.toggle("active", isActive);
    $el(panes[i]).classList.toggle("active", isActive);
  }
}

function switchFriendSubTab(tab) {
  var tabs  = ["add", "req", "list"];
  var spIds = ["sp-add", "sp-req", "sp-list"];
  var btnIds= ["stab-add","stab-req","stab-list"];
  for (var i = 0; i < tabs.length; i++) {
    var isActive = tabs[i] === tab;
    $el(btnIds[i]).classList.toggle("active", isActive);
    $el(spIds[i]).classList.toggle("active", isActive);
  }
}

function switchTaskTab(tab) {
  var tabs   = ["daily", "weekly"];
  var paneIds= ["tp-daily", "tp-weekly"];
  var btnIds = ["ttab-daily", "ttab-weekly"];
  for (var i = 0; i < tabs.length; i++) {
    var isActive = tabs[i] === tab;
    $el(btnIds[i]).classList.toggle("active", isActive);
    $el(paneIds[i]).classList.toggle("active", isActive);
  }
}

// ── フレンドシステム ───────────────────────────────────────────
var _friendPollTimer = null;

function sendFriendRequest() {
  var raw = $el("fc-input").value.replace(/-/g,"").toUpperCase().trim();
  var msgEl = $el("add-msg");

  if (!raw) { setMsg(msgEl,"コードを入力してください","err"); return; }
  if (raw === player.friendCode.replace(/-/g,"")) { setMsg(msgEl,"自分のコードは追加できません","err"); return; }

  setMsg(msgEl,"検索中…","");

  fbGet("users").then(function(data) {
    if (!data) { setMsg(msgEl,"ユーザーが見つかりません（オフライン）","err"); return; }
    var found = null;
    var uids = Object.keys(data);
    for (var i = 0; i < uids.length; i++) {
      var d = data[uids[i]];
      if ((d.friendCode || "").replace(/-/g,"") === raw) { found = { uid:uids[i], name:d.name, friendCode:d.friendCode }; break; }
    }
    if (!found) { setMsg(msgEl,"ユーザーが見つかりません","err"); return; }

    // すでにフレンドか確認
    fbGet("friends/" + MY_UID + "/" + found.uid).then(function(existing) {
      if (existing) { setMsg(msgEl,"すでにフレンドです","err"); return; }
      // 申請を送る
      fbSet("friend_requests/" + found.uid + "/" + MY_UID, {
        fromUid:  MY_UID,
        fromName: player.name,
        fromCode: player.friendCode,
        ts:       Date.now()
      }).then(function(){
        setMsg(msgEl, safeEsc(found.name) + " さんに申請しました", "ok");
        $el("fc-input").value = "";
      });
    });
  });
}

function setMsg(el, txt, cls) {
  el.textContent = txt;
  el.className   = "msg" + (cls ? " " + cls : "");
}

function loadFriendRequests() {
  fbGet("friend_requests/" + MY_UID).then(function(data) {
    data = data || {};
    var keys = Object.keys(data);
    var badge = $el("req-badge");
    if (keys.length > 0) { badge.textContent = keys.length; badge.style.display = "inline"; }
    else badge.style.display = "none";
    renderRequests(data);
  });
}

function renderRequests(data) {
  var el = $el("req-list");
  el.innerHTML = "";
  var keys = Object.keys(data);
  if (!keys.length) { el.innerHTML = '<div class="empty-note">申請はありません</div>'; return; }
  for (var i = 0; i < keys.length; i++) {
    (function(uid, r) {
      var div = document.createElement("div");
      div.className = "r-card";
      div.innerHTML =
        '<div class="f-info">' +
          '<div class="f-name">' + safeEsc(r.fromName) + '</div>' +
          '<div class="f-code">' + fmtCode(r.fromCode) + '</div>' +
        '</div>' +
        '<div class="r-btns">' +
          '<button class="r-btn r-accept">許可</button>' +
          '<button class="r-btn r-deny">拒否</button>' +
        '</div>';
      div.querySelector(".r-accept").onclick = function() { acceptFriend(uid, r.fromName, r.fromCode); };
      div.querySelector(".r-deny").onclick   = function() { denyFriend(uid); };
      el.appendChild(div);
    })(keys[i], data[keys[i]]);
  }
}

function acceptFriend(uid, name, code) {
  var ts = Date.now();
  fbSet("friends/" + MY_UID + "/" + uid, { name:name, friendCode:code, since:ts });
  fbSet("friends/" + uid + "/" + MY_UID, { name:player.name, friendCode:player.friendCode, since:ts });
  fbDelete("friend_requests/" + MY_UID + "/" + uid);
  setTimeout(loadFriendRequests, 500);
  setTimeout(loadFriendList, 500);
}

function denyFriend(uid) {
  fbDelete("friend_requests/" + MY_UID + "/" + uid);
  setTimeout(loadFriendRequests, 500);
}

function loadFriendList() {
  fbGet("friends/" + MY_UID).then(function(data) {
    data = data || {};
    renderFriends(data);
    LS.set("f_" + MY_UID, data);
  });
}

function renderFriends(data) {
  var el = $el("friend-list");
  el.innerHTML = "";
  var uids = Object.keys(data);
  if (!uids.length) { el.innerHTML = '<div class="empty-note">フレンドはいません</div>'; return; }
  for (var i = 0; i < uids.length; i++) {
    (function(uid, f) {
      var div = document.createElement("div");
      div.className = "f-card";
      div.innerHTML =
        '<div class="online-dot off" id="dot_' + uid + '"></div>' +
        '<div class="f-info">' +
          '<div class="f-name">' + safeEsc(f.name || "不明") + '</div>' +
          '<div class="f-code">' + fmtCode(f.friendCode) + '</div>' +
        '</div>' +
        '<button class="del-btn">✕</button>';
      div.querySelector(".del-btn").onclick = function() {
        if (!confirm("フレンドを削除しますか？")) return;
        fbDelete("friends/" + MY_UID + "/" + uid);
        fbDelete("friends/" + uid + "/" + MY_UID);
        setTimeout(loadFriendList, 500);
      };
      el.appendChild(div);

      // オンライン状況（lastSeen を取得）
      fbGet("users/" + uid + "/lastSeen").then(function(ts) {
        var dot = $el("dot_" + uid);
        if (!dot) return;
        var online = typeof ts === "number" && ts > 0 && Date.now() - ts < 30000;
        dot.className = "online-dot " + (online ? "on" : "off");
      });
    })(uids[i], data[uids[i]]);
  }
}

// ハートビート（自分のオンライン状態を更新）
function startHeartbeat() {
  function beat() { fbPatch("users/" + MY_UID, { lastSeen: Date.now() }); }
  beat();
  setInterval(beat, 14000);
}

// ── タスク ─────────────────────────────────────────────────────
var DAILY_DEF = [
  { id:"d1", label:"10回プレイする",               goal:10 },
  { id:"d2", label:"スコア 5,000〜50,000 を出す",  goal:1  },
  { id:"d3", label:"コンボ 50〜150 を出す",         goal:1  }
];
var WEEKLY_DEF = [
  { id:"w1", label:"100回プレイする",               goal:100 },
  { id:"w2", label:"スコア 500〜50,000 を10回出す", goal:10  },
  { id:"w3", label:"コンボ 50〜150 を10回出す",     goal:10  }
];

function loadTasks() {
  var tk = todayKey(), wk = weekKey();
  var dt = LS.get("dt");
  var wt = LS.get("wt");
  if (!dt || dt.key !== tk) { dt = { key:tk, prog:{}, cleared:false }; LS.set("dt", dt); }
  if (!wt || wt.key !== wk) { wt = { key:wk, prog:{}, cleared:false }; LS.set("wt", wt); }
  return { dt:dt, wt:wt };
}

function renderTasks() {
  var t = loadTasks();
  buildTaskUI("daily-tasks",  DAILY_DEF,  t.dt.prog);
  buildTaskUI("weekly-tasks", WEEKLY_DEF, t.wt.prog);
}

function buildTaskUI(cid, defs, prog) {
  var el = $el(cid);
  if (!el) return;
  el.innerHTML = "";
  for (var i = 0; i < defs.length; i++) {
    var def  = defs[i];
    var cur  = Math.min(prog[def.id] || 0, def.goal);
    var done = cur >= def.goal;
    var pct  = (cur / def.goal) * 100;
    var d    = document.createElement("div");
    d.className = "task-item" + (done ? " done" : "");
    d.innerHTML =
      '<div class="task-name">' + (done ? "✓ " : "") + def.label + '</div>' +
      '<div class="task-bar-outer"><div class="task-bar-inner" style="width:' + pct + '%"></div></div>' +
      '<div class="task-prog">' + cur + ' / ' + def.goal + '</div>';
    el.appendChild(d);
  }
}

function updateTasksAfterGame(score, maxCombo) {
  var t  = loadTasks();
  var dt = t.dt, wt = t.wt;

  if (!dt.cleared) {
    dt.prog.d1 = (dt.prog.d1 || 0) + 1;
    if (score >= 5000  && score <= 50000)    dt.prog.d2 = Math.min((dt.prog.d2||0)+1, 1);
    if (maxCombo >= 50 && maxCombo <= 150)   dt.prog.d3 = Math.min((dt.prog.d3||0)+1, 1);
    var dDone = DAILY_DEF.every(function(d){ return (dt.prog[d.id]||0) >= d.goal; });
    if (dDone) {
      dt.cleared = true;
      addCoins(1500); addXP(50);
      setTimeout(function(){ $el("toast-task-body").textContent = "+50 XP · +1,500 ¤"; showToast("toast-task"); }, 400);
    }
    LS.set("dt", dt);
  }

  if (!wt.cleared) {
    wt.prog.w1 = (wt.prog.w1 || 0) + 1;
    if (score >= 500   && score <= 50000)    wt.prog.w2 = Math.min((wt.prog.w2||0)+1, 10);
    if (maxCombo >= 50 && maxCombo <= 150)   wt.prog.w3 = Math.min((wt.prog.w3||0)+1, 10);
    var wDone = WEEKLY_DEF.every(function(d){ return (wt.prog[d.id]||0) >= d.goal; });
    if (wDone) {
      wt.cleared = true;
      addCoins(15000); addXP(500);
      setTimeout(function(){ $el("toast-task-body").textContent = "+500 XP · +15,000 ¤"; showToast("toast-task"); }, 1600);
    }
    LS.set("wt", wt);
  }
  renderTasks();
}

// ── ゲームエンジン ─────────────────────────────────────────────
var G = {
  active:false, diff:"easy", pool:[], idx:0, word:null, romaji:"", pos:0,
  score:0, combo:0, maxCombo:0, timeLeft:60, timer:null
};

function startGame(diff) {
  G.active   = true;
  G.diff     = diff;
  G.pool     = shuffle(WORDS[diff].concat(WORDS[diff]));
  G.idx      = 0;
  G.score    = 0;
  G.combo    = 0;
  G.maxCombo = 0;
  G.timeLeft = 60;

  $el("g-score").textContent = "0";
  $el("g-combo").textContent = "0";
  $el("g-time").textContent  = "60";
  $el("g-time").classList.remove("danger");

  showScreen("screen-game");
  nextWord();
  clearInterval(G.timer);
  G.timer = setInterval(tick, 1000);
  document.removeEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey);
}

function tick() {
  G.timeLeft--;
  $el("g-time").textContent = G.timeLeft;
  if (G.timeLeft <= 10) $el("g-time").classList.add("danger");
  if (G.timeLeft <= 0)  endGame();
}

function nextWord() {
  if (G.idx >= G.pool.length) {
    G.pool = G.pool.concat(shuffle(WORDS[G.diff].slice()));
  }
  G.word   = G.pool[G.idx++];
  G.romaji = G.word.romaji;
  G.pos    = 0;
  $el("g-ja").textContent   = G.word.ja;
  $el("g-hint").textContent = G.romaji;
  updateTyped();
}

function updateTyped() {
  $el("g-ok").textContent   = G.romaji.slice(0, G.pos);
  $el("g-rest").textContent = G.romaji.slice(G.pos);
}

function onKey(e) {
  if (!G.active) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key.length !== 1) return;
  e.preventDefault();

  if (e.key === G.romaji[G.pos]) {
    G.pos++;
    G.combo++;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    G.score += 5 * G.combo;
    $el("g-score").textContent = G.score.toLocaleString();
    $el("g-combo").textContent = G.combo;
    if (G.pos >= G.romaji.length) nextWord();
    else updateTyped();
  } else {
    G.combo = 0;
    $el("g-combo").textContent = "0";
    var mf = $el("miss-flash");
    mf.classList.remove("on"); void mf.offsetWidth; mf.classList.add("on");
    setTimeout(function(){ mf.classList.remove("on"); }, 110);
  }
}

function endGame() {
  clearInterval(G.timer);
  G.active = false;
  document.removeEventListener("keydown", onKey);

  var coins = Math.floor(G.score / 10);
  var xp    = Math.floor(G.score / 100);
  addCoins(coins);
  addXP(xp);
  updateTasksAfterGame(G.score, G.maxCombo);

  $el("r-score").textContent = G.score.toLocaleString();
  $el("r-combo").textContent = G.maxCombo;
  $el("r-coins").textContent = coins.toLocaleString() + " ¤";
  $el("r-xp").textContent    = xp + " XP";
  showScreen("screen-result");
}

// ── 起動 ──────────────────────────────────────────────────────
loadPlayer();
refreshHUD();
startHeartbeat();
showScreen("screen-main");

// Firebase rules に以下を設定してください:
// { "rules": { ".read": true, ".write": true } }
