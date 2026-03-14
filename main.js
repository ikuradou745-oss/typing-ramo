// ============================================================
//  Typekey — app.js
//  Firebase Realtime DB + ゲームロジック全実装
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, set, get, onValue, off, remove, serverTimestamp, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ── Firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyBXnNXQ5khcR0EvRide4C0PjshJZpSF4oM",
  authDomain: "typing-game-28ed0.firebaseapp.com",
  databaseURL: "https://typing-game-28ed0-default-rtdb.firebaseio.com",
  projectId: "typing-game-28ed0",
  storageBucket: "typing-game-28ed0.firebasestorage.app",
  messagingSenderId: "963797267101",
  appId: "1:963797267101:web:0d5d700458fb1991021a74",
};
const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// ============================================================
//  ユーザーID（ブラウザ×ドメイン単位で固定）
// ============================================================
function getUID() {
  let id = localStorage.getItem("tk_uid");
  if (!id) {
    id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("tk_uid", id);
  }
  return id;
}
const MY_UID = getUID();

// ============================================================
//  LS ユーティリティ
// ============================================================
const LS = {
  get(k, d = null) {
    try { const v = localStorage.getItem("tk_" + k); return v !== null ? JSON.parse(v) : d; } catch { return d; }
  },
  set(k, v) { localStorage.setItem("tk_" + k, JSON.stringify(v)); },
};

// ============================================================
//  時間ユーティリティ（朝7時区切り）
// ============================================================
function todayKey() {
  const d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function weekKey() {
  const d = new Date();
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return `${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`;
}

// ============================================================
//  ローマ字変換テーブル（長い順優先）
// ============================================================
const RTABLE = [
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
  ["てぃ","ti"], ["でぃ","di"], ["でゅ","du"],
  ["つぁ","tsa"],["うぃ","wi"], ["うぇ","we"],
  ["ヴぁ","va"], ["ヴぃ","vi"], ["ヴぇ","ve"], ["ヴぉ","vo"],
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
  ["ゃ","xya"],["ゅ","xyu"],["ょ","xyo"],
  ["っ","xtu"],
];
// 長さ降順ソート
RTABLE.sort((a, b) => b[0].length - a[0].length);

function toRomaji(str) {
  let res = "", i = 0;
  while (i < str.length) {
    // っ → 次の子音を2回
    if (str[i] === "っ" && i + 1 < str.length) {
      const next = toRomaji(str[i + 1]);
      if (next) { res += next[0]; i++; continue; }
    }
    let hit = false;
    for (const [k, r] of RTABLE) {
      if (str.startsWith(k, i)) { res += r; i += k.length; hit = true; break; }
    }
    if (!hit) { res += str[i++]; }
  }
  return res;
}

// ============================================================
//  単語データ
// ============================================================
const WORDS_RAW = {
  easy: [
    "猫","犬","空","海","山","花","木","水","火","風",
    "雨","雪","星","月","鳥","魚","川","森","道","石",
    "葉","虫","朝","夜","音",
  ],
  normal: [
    "友達","学校","電車","飛行機","音楽","映画館","図書館",
    "自転車","冒険","挑戦","スマホ","サッカー","プログラム",
    "ゲーム","カメラ","ランニング","おにぎり","りんごジュース",
    "チョコレート","バドミントン",
  ],
  hard: [
    "コンピュータプログラム","インターネット通信","スマートフォン操作",
    "プログラミング言語","デジタルトランスフォーム","アドベンチャーゲーム",
    "コミュニケーション","インフラストラクチャ","エンターテインメント",
    "マルチプレイヤーゲーム","情報セキュリティシステム","人工知能技術",
    "ビジュアルプログラミング","ネットワーク管理システム","コンテンツクリエイター",
    "インタラクティブデザイン","スーパーコンピュータ","データベース管理",
    "クラウドコンピューティング","モバイルアプリ開発",
  ],
};

const WORDS = {};
for (const [diff, list] of Object.entries(WORDS_RAW)) {
  WORDS[diff] = list.map(ja => ({ ja, romaji: toRomaji(ja).toLowerCase() }));
}

// ============================================================
//  プレイヤーデータ
// ============================================================
let player = { name: "", coins: 0, level: 1, xp: 0, friendCode: "", nameChanges: { date: "", count: 0 } };

function xpNeeded(lv) { return Math.floor(100 * Math.pow(2, lv - 1)); }

function genFriendCode() {
  const n = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = [0, 0, 0].map(() => alpha[Math.floor(Math.random() * 26)]).join("");
  return n + a;
}

function loadPlayer() {
  const saved = LS.get("player");
  if (saved) { player = { ...player, ...saved }; }
  else {
    player.name = "匿名" + String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
    player.friendCode = genFriendCode();
    savePlayer();
  }
}

function savePlayer() {
  LS.set("player", player);
  // Firebase同期
  set(ref(db, `users/${MY_UID}`), {
    name: player.name, friendCode: player.friendCode,
    level: player.level, xp: player.xp, coins: player.coins,
    uid: MY_UID, lastSeen: serverTimestamp(),
  }).catch(() => {});
}

// ── コイン・XP ──
function addCoins(n) { player.coins += n; savePlayer(); refreshHUD(); }
function addXP(n) {
  player.xp += n;
  let leveled = false;
  while (player.xp >= xpNeeded(player.level)) {
    player.xp -= xpNeeded(player.level);
    player.level++;
    leveled = true;
  }
  savePlayer(); refreshHUD();
  if (leveled) showToast("toast-lv", () => { $("toast-lv-n").textContent = player.level; });
}

function refreshHUD() {
  $("coin-val").textContent = player.coins.toLocaleString();
  $("lv-num").textContent = player.level;
  const need = xpNeeded(player.level);
  $("xp-cur").textContent = player.xp;
  $("xp-max").textContent = need;
  $("xp-fill").style.width = (player.xp / need * 100) + "%";
}

// ============================================================
//  トースト
// ============================================================
function showToast(id, setup, ms = 2600) {
  const el = $(id);
  if (setup) setup();
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

// ============================================================
//  スクリーン切り替え
// ============================================================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id)?.classList.add("active");
}

// ============================================================
//  パネル開閉
// ============================================================
let openPanelId = null;

function openPanel(id) {
  if (openPanelId) { closePanel(openPanelId, false); }
  const el = $(id);
  el.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
  $("dim").classList.remove("hidden");
  openPanelId = id;
}
function closePanel(id, reset = true) {
  $(id).classList.remove("open");
  $("dim").classList.add("hidden");
  setTimeout(() => $(id).classList.add("hidden"), 300);
  if (reset) openPanelId = null;
}

// ============================================================
//  プロフィール描画
// ============================================================
function renderProfile() {
  $("p-name").textContent = player.name;
  $("my-fc").textContent = fmtCode(player.friendCode);
  const tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = { date: tk, count: 0 };
  $("name-change-left").textContent = `本日あと ${Math.max(0, 3 - player.nameChanges.count)} 回変更できます`;
}

function fmtCode(fc) { return fc ? `${fc.slice(0,3)}-${fc.slice(3,6)}-${fc.slice(6)}` : "------"; }

// ── 名前変更 ──
$("btn-edit-name").addEventListener("click", () => {
  const tk = todayKey();
  if (player.nameChanges.date !== tk) player.nameChanges = { date: tk, count: 0 };
  if (player.nameChanges.count >= 3) {
    $("name-change-left").textContent = "本日の変更回数を使い切りました";
    return;
  }
  $("name-edit-area").classList.remove("hidden");
  $("name-input").value = player.name;
  $("name-input").focus();
});
$("btn-save-name").addEventListener("click", saveName);
$("name-input").addEventListener("keydown", e => { if (e.key === "Enter") saveName(); });

function saveName() {
  const v = $("name-input").value.trim();
  if (!v || v.length > 20) return;
  player.nameChanges.count++;
  player.name = v;
  savePlayer();
  $("name-edit-area").classList.add("hidden");
  renderProfile();
}

// ============================================================
//  フレンドシステム
// ============================================================
async function findByCode(fc) {
  const raw = fc.replace(/-/g, "").toUpperCase();
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return null;
  let found = null;
  snap.forEach(c => {
    const d = c.val();
    if ((d.friendCode || "").replace(/-/g, "") === raw) found = { uid: c.key, ...d };
  });
  return found;
}

$("btn-add-friend").addEventListener("click", async () => {
  const raw = $("fc-input").value.replace(/-/g, "").toUpperCase().trim();
  const msg = $("add-msg");
  if (!raw) { setMsg(msg, "コードを入力してください", "err"); return; }
  if (raw === player.friendCode) { setMsg(msg, "自分のコードは追加できません", "err"); return; }

  const myFriends = LS.get("f_" + MY_UID, {});
  if (Object.values(myFriends).some(f => (f.friendCode || "").replace(/-/g, "") === raw)) {
    setMsg(msg, "すでにフレンドです", "err"); return;
  }

  setMsg(msg, "検索中…", "");
  const target = await findByCode(raw);
  if (!target) { setMsg(msg, "ユーザーが見つかりません", "err"); return; }

  await set(ref(db, `friend_requests/${target.uid}/${MY_UID}`), {
    fromUid: MY_UID, fromName: player.name, fromCode: player.friendCode, ts: Date.now(),
  });
  setMsg(msg, `${esc(target.name)} さんに申請しました`, "ok");
  $("fc-input").value = "";
});

function setMsg(el, txt, cls) { el.textContent = txt; el.className = "msg " + cls; }

// ── 申請リスト監視 ──
let reqRef = null;
function listenRequests() {
  if (reqRef) { off(reqRef); }
  reqRef = ref(db, `friend_requests/${MY_UID}`);
  onValue(reqRef, snap => {
    const data = snap.exists() ? snap.val() : {};
    renderRequests(data);
    const cnt = Object.keys(data).length;
    const badge = $("req-badge");
    if (cnt > 0) { badge.textContent = cnt; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  });
}

function renderRequests(data) {
  const el = $("req-list");
  el.innerHTML = "";
  const keys = Object.keys(data);
  if (!keys.length) { el.innerHTML = `<div class="empty-note">申請はありません</div>`; return; }
  keys.forEach(uid => {
    const r = data[uid];
    const d = document.createElement("div");
    d.className = "r-card";
    d.innerHTML = `
      <div class="f-info">
        <div class="f-name">${esc(r.fromName)}</div>
        <div class="f-code">${fmtCode(r.fromCode)}</div>
      </div>
      <div class="r-btns">
        <button class="r-btn r-accept" data-uid="${uid}" data-name="${esc(r.fromName)}" data-code="${r.fromCode}">許可</button>
        <button class="r-btn r-deny" data-uid="${uid}">拒否</button>
      </div>`;
    el.appendChild(d);
  });
  el.querySelectorAll(".r-accept").forEach(b => b.addEventListener("click", () =>
    acceptFriend(b.dataset.uid, b.dataset.name, b.dataset.code)));
  el.querySelectorAll(".r-deny").forEach(b => b.addEventListener("click", () =>
    remove(ref(db, `friend_requests/${MY_UID}/${b.dataset.uid}`))));
}

async function acceptFriend(uid, name, code) {
  const ts = Date.now();
  await set(ref(db, `friends/${MY_UID}/${uid}`), { name, friendCode: code, since: ts });
  await set(ref(db, `friends/${uid}/${MY_UID}`), { name: player.name, friendCode: player.friendCode, since: ts });
  await remove(ref(db, `friend_requests/${MY_UID}/${uid}`));
}

// ── フレンドリスト監視 ──
let flistRef = null;
const onlineListeners = {};

function listenFriends() {
  if (flistRef) { off(flistRef); }
  flistRef = ref(db, `friends/${MY_UID}`);
  onValue(flistRef, snap => {
    const data = snap.exists() ? snap.val() : {};
    LS.set("f_" + MY_UID, data);
    renderFriends(data);
  });
}

function renderFriends(data) {
  const el = $("friend-list");
  // 既存のオンラインリスナーを解除
  Object.keys(onlineListeners).forEach(uid => { off(onlineListeners[uid]); delete onlineListeners[uid]; });
  el.innerHTML = "";
  const uids = Object.keys(data);
  if (!uids.length) { el.innerHTML = `<div class="empty-note">フレンドはいません</div>`; return; }
  uids.forEach(uid => {
    const f = data[uid];
    const d = document.createElement("div");
    d.className = "f-card";
    d.innerHTML = `
      <div class="online-dot off" id="dot_${uid}"></div>
      <div class="f-info">
        <div class="f-name" id="fn_${uid}">${esc(f.name || "不明")}</div>
        <div class="f-code">${fmtCode(f.friendCode)}</div>
      </div>
      <button class="del-btn" data-uid="${uid}">削除</button>`;
    el.appendChild(d);

    // オンライン監視
    const lsRef = ref(db, `users/${uid}/lastSeen`);
    onlineListeners[uid] = lsRef;
    onValue(lsRef, s => {
      const dot = $(`dot_${uid}`);
      if (!dot) return;
      const ts = s.exists() ? s.val() : 0;
      const online = typeof ts === "number" && ts > 0 && Date.now() - ts < 30000;
      dot.className = "online-dot " + (online ? "on" : "off");
    });
    // 名前リアルタイム
    onValue(ref(db, `users/${uid}/name`), s => {
      const ne = $(`fn_${uid}`);
      if (ne && s.exists()) ne.textContent = s.val();
    });
  });

  el.querySelectorAll(".del-btn").forEach(b => b.addEventListener("click", async () => {
    const uid = b.dataset.uid;
    if (!confirm("フレンドを削除しますか？")) return;
    await remove(ref(db, `friends/${MY_UID}/${uid}`));
    await remove(ref(db, `friends/${uid}/${MY_UID}`));
  }));
}

// ── ハートビート ──
function startHeartbeat() {
  const r = ref(db, `users/${MY_UID}/lastSeen`);
  const beat = () => set(r, serverTimestamp());
  beat();
  setInterval(beat, 14000);
  onDisconnect(r).set(0);
}

// ============================================================
//  タスク
// ============================================================
const DAILY_DEF = [
  { id:"d1", label:"10回プレイする",              type:"play",  goal:10 },
  { id:"d2", label:"スコア 5,000〜50,000 を出す", type:"score_range", min:5000,  max:50000, goal:1 },
  { id:"d3", label:"コンボ 50〜150 を出す",        type:"combo_range", min:50,    max:150,   goal:1 },
];
const WEEKLY_DEF = [
  { id:"w1", label:"100回プレイする",                        type:"play",  goal:100 },
  { id:"w2", label:"スコア 500〜50,000 を10回出す",           type:"score_range", min:500,   max:50000, goal:10 },
  { id:"w3", label:"コンボ 50〜150 を10回出す",               type:"combo_range", min:50,    max:150,   goal:10 },
];

function loadTasks() {
  const tk = todayKey(), wk = weekKey();
  let dt = LS.get("dt");
  let wt = LS.get("wt");
  if (!dt || dt.key !== tk)  { dt = { key: tk,  prog: {}, cleared: false }; LS.set("dt", dt); }
  if (!wt || wt.key !== wk)  { wt = { key: wk,  prog: {}, cleared: false }; LS.set("wt", wt); }
  return { dt, wt };
}

function renderTasks() {
  const { dt, wt } = loadTasks();
  buildTaskUI("daily-tasks",  DAILY_DEF,  dt.prog);
  buildTaskUI("weekly-tasks", WEEKLY_DEF, wt.prog);
}

function buildTaskUI(containerId, defs, prog) {
  const el = $(containerId);
  el.innerHTML = "";
  defs.forEach(def => {
    const cur = Math.min(prog[def.id] || 0, def.goal);
    const done = cur >= def.goal;
    const pct = (cur / def.goal) * 100;
    const d = document.createElement("div");
    d.className = "task-item" + (done ? " done" : "");
    d.innerHTML = `
      <div class="task-name">${done ? "✓ " : ""}${def.label}</div>
      <div class="task-bar-outer"><div class="task-bar-inner" style="width:${pct}%"></div></div>
      <div class="task-prog">${cur} / ${def.goal}</div>`;
    el.appendChild(d);
  });
}

function updateTasksAfterGame(score, maxCombo) {
  const { dt, wt } = loadTasks();

  // 毎日
  if (!dt.cleared) {
    dt.prog.d1 = (dt.prog.d1 || 0) + 1;
    if (score >= 5000 && score <= 50000) dt.prog.d2 = Math.min((dt.prog.d2 || 0) + 1, 1);
    if (maxCombo >= 50 && maxCombo <= 150) dt.prog.d3 = Math.min((dt.prog.d3 || 0) + 1, 1);
    if (DAILY_DEF.every(d => (dt.prog[d.id] || 0) >= d.goal)) {
      dt.cleared = true;
      addCoins(1500); addXP(50);
      setTimeout(() => showToast("toast-task", () => { $("toast-task-body").textContent = "+50 XP · +1,500 ¤"; }), 400);
    }
    LS.set("dt", dt);
  }

  // 週間
  if (!wt.cleared) {
    wt.prog.w1 = (wt.prog.w1 || 0) + 1;
    if (score >= 500 && score <= 50000) wt.prog.w2 = Math.min((wt.prog.w2 || 0) + 1, 10);
    if (maxCombo >= 50 && maxCombo <= 150) wt.prog.w3 = Math.min((wt.prog.w3 || 0) + 1, 10);
    if (WEEKLY_DEF.every(d => (wt.prog[d.id] || 0) >= d.goal)) {
      wt.cleared = true;
      addCoins(15000); addXP(500);
      setTimeout(() => showToast("toast-task", () => { $("toast-task-body").textContent = "+500 XP · +15,000 ¤"; }), 1600);
    }
    LS.set("wt", wt);
  }

  renderTasks();
}

// ============================================================
//  ゲームエンジン
// ============================================================
const G = {
  active: false, diff: "easy",
  pool: [], idx: 0, word: null, romaji: "", pos: 0,
  score: 0, combo: 0, maxCombo: 0, timeLeft: 60, timer: null,
};

function startGame(diff) {
  G.active = true; G.diff = diff;
  G.pool = shuffle([...WORDS[diff], ...WORDS[diff]]); // ループ用に2倍
  G.idx = 0; G.score = 0; G.combo = 0; G.maxCombo = 0; G.timeLeft = 60;

  $("g-score").textContent = "0";
  $("g-combo").textContent = "0";
  $("g-time").textContent = "60";
  $("g-time").classList.remove("danger");

  showScreen("screen-game");
  nextWord();
  G.timer = setInterval(tick, 1000);
  document.addEventListener("keydown", onKey);
}

function tick() {
  G.timeLeft--;
  $("g-time").textContent = G.timeLeft;
  if (G.timeLeft <= 10) $("g-time").classList.add("danger");
  if (G.timeLeft <= 0) endGame();
}

function nextWord() {
  if (G.idx >= G.pool.length) G.pool.push(...shuffle([...WORDS[G.diff]]));
  G.word = G.pool[G.idx++];
  G.romaji = G.word.romaji.toLowerCase();
  G.pos = 0;
  $("g-ja").textContent = G.word.ja;
  $("g-hint").textContent = G.romaji;
  updateInput();
}

function updateInput() {
  $("g-ok").textContent   = G.romaji.slice(0, G.pos);
  $("g-rest").textContent = G.romaji.slice(G.pos);
}

function onKey(e) {
  if (!G.active || e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
  e.preventDefault();
  if (e.key === G.romaji[G.pos]) {
    G.pos++;
    G.combo++;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    G.score += 5 * G.combo;
    $("g-score").textContent = G.score.toLocaleString();
    $("g-combo").textContent = G.combo;
    if (G.pos >= G.romaji.length) { nextWord(); }
    else updateInput();
  } else {
    G.combo = 0;
    $("g-combo").textContent = "0";
    flashMiss();
  }
}

function flashMiss() {
  const el = $("miss-flash");
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 110);
}

function endGame() {
  clearInterval(G.timer);
  G.active = false;
  document.removeEventListener("keydown", onKey);

  const coins = Math.floor(G.score / 10);
  const xp    = Math.floor(G.score / 100);
  addCoins(coins); addXP(xp);
  updateTasksAfterGame(G.score, G.maxCombo);

  $("r-score").textContent  = G.score.toLocaleString();
  $("r-combo").textContent  = G.maxCombo;
  $("r-coins").textContent  = coins.toLocaleString() + " ¤";
  $("r-xp").textContent     = xp + " XP";
  showScreen("screen-result");
}

// ============================================================
//  ユーティリティ
// ============================================================
function $(id) { return document.getElementById(id); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ============================================================
//  UIイベント設定
// ============================================================
// ── ナビゲーション ──
$("btn-play").addEventListener("click", () => showScreen("screen-diff"));
$("diff-back").addEventListener("click", () => showScreen("screen-main"));
$("btn-retry").addEventListener("click", () => showScreen("screen-diff"));
$("btn-end").addEventListener("click",   () => showScreen("screen-main"));

// ── 難易度選択 ──
document.querySelectorAll(".diff-row").forEach(btn => {
  btn.addEventListener("click", () => {
    startGame(btn.dataset.diff);
  });
});

// ── フレンドパネル ──
$("friend-btn").addEventListener("click", () => {
  renderProfile();
  openPanel("panel-friend");
  listenRequests();
  listenFriends();
});
$("friend-close").addEventListener("click", () => closePanel("panel-friend"));

// ── タスクパネル ──
$("task-btn").addEventListener("click", () => {
  renderTasks();
  openPanel("panel-task");
});
$("task-close").addEventListener("click", () => closePanel("panel-task"));

// ── 暗転クリックで閉じる ──
$("dim").addEventListener("click", () => { if (openPanelId) closePanel(openPanelId); });

// ── パネルタブ切り替え（フレンド） ──
document.querySelectorAll(".ptab[data-ptab]").forEach(tab => {
  tab.addEventListener("click", () => {
    const t = tab.dataset.ptab;
    tab.closest(".panel-head").querySelectorAll(".ptab").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".pane").forEach(x => x.classList.remove("active"));
    $("pane-" + t)?.classList.add("active");
  });
});

// ── パネルタブ切り替え（タスク） ──
document.querySelectorAll(".ptab[data-ttab]").forEach(tab => {
  tab.addEventListener("click", () => {
    const t = tab.dataset.ttab;
    tab.closest(".panel-head").querySelectorAll(".ptab").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tpane").forEach(x => x.classList.remove("active"));
    $("tp-" + t)?.classList.add("active");
  });
});

// ── サブタブ切り替え ──
document.querySelectorAll(".stab").forEach(tab => {
  tab.addEventListener("click", () => {
    const t = tab.dataset.stab;
    tab.closest(".subtabs").querySelectorAll(".stab").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".sp").forEach(x => x.classList.remove("active"));
    $("sp-" + t)?.classList.add("active");
  });
});

// ============================================================
//  起動
// ============================================================
loadPlayer();
refreshHUD();
startHeartbeat();
showScreen("screen-main");
