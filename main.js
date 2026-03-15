// ============================================================
//  Typekey - タイプキー  app.js
//  ・type="module" → import が使える
//  ・onclick から呼ぶ関数は window に登録
//  ・Firebase ESM CDN (参考コードと同じ方式)
// ============================================================

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, onDisconnect }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ── Firebase ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBXnNXQ5khcR0EvRide4C0PjshJZpSF4oM",
  authDomain:        "typing-game-28ed0.firebaseapp.com",
  databaseURL:       "https://typing-game-28ed0-default-rtdb.firebaseio.com",
  projectId:         "typing-game-28ed0",
  storageBucket:     "typing-game-28ed0.firebasestorage.app",
  messagingSenderId: "963797267101",
  appId:             "1:963797267101:web:0d5d700458fb1991021a74",
};
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch(e) { console.warn("Firebase init failed:", e); }

// ── 基本ヘルパー ──────────────────────────────────────────────
const el = id => document.getElementById(id);

const LS = {
  get(k, d = null) {
    try { const v = localStorage.getItem("tk_" + k); return v !== null ? JSON.parse(v) : d; }
    catch { return d; }
  },
  set(k, v) { try { localStorage.setItem("tk_" + k, JSON.stringify(v)); } catch {} }
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeEsc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── UID ───────────────────────────────────────────────────────
const MY_UID = (() => {
  let id = localStorage.getItem("tk_uid");
  if (!id) { id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); localStorage.setItem("tk_uid", id); }
  return id;
})();

// ── 時間 (朝7時区切り) ──────────────────────────────────────
function todayKey() {
  const d = new Date(); if (d.getHours() < 7) d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function weekKey() {
  const d = new Date(); if (d.getHours() < 7) d.setDate(d.getDate()-1);
  const dow = d.getDay(); d.setDate(d.getDate() - (dow===0?6:dow-1));
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// ── ローマ字テーブル ──────────────────────────────────────────
const RTABLE = [
  ["きゃ","kya"],["きゅ","kyu"],["きょ","kyo"],["しゃ","sha"],["しゅ","shu"],["しょ","sho"],
  ["ちゃ","cha"],["ちゅ","chu"],["ちょ","cho"],["にゃ","nya"],["にゅ","nyu"],["にょ","nyo"],
  ["ひゃ","hya"],["ひゅ","hyu"],["ひょ","hyo"],["みゃ","mya"],["みゅ","myu"],["みょ","myo"],
  ["りゃ","rya"],["りゅ","ryu"],["りょ","ryo"],["ぎゃ","gya"],["ぎゅ","gyu"],["ぎょ","gyo"],
  ["じゃ","ja"], ["じゅ","ju"], ["じょ","jo"], ["びゃ","bya"],["びゅ","byu"],["びょ","byo"],
  ["ぴゃ","pya"],["ぴゅ","pyu"],["ぴょ","pyo"],["ふぁ","fa"], ["ふぃ","fi"], ["ふぇ","fe"],
  ["ふぉ","fo"], ["てぃ","ti"], ["うぃ","wi"], ["うぇ","we"],
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
  ["ゃ","xya"],["ゅ","xyu"],["ょ","xyo"],["っ","xtu"],
].sort((a,b) => b[0].length - a[0].length);

function toRomaji(str) {
  let res = "", i = 0;
  while (i < str.length) {
    if (str[i]==="っ" && i+1 < str.length) {
      const nxt = toRomaji(str[i+1]); if (nxt) { res += nxt[0]; i++; continue; }
    }
    let hit = false;
    for (const [k,r] of RTABLE) {
      if (str.startsWith(k,i)) { res+=r; i+=k.length; hit=true; break; }
    }
    if (!hit) { res+=str[i++]; }
  }
  return res;
}

// ── 単語データ ────────────────────────────────────────────────
const WORDS = {
  easy:   ["猫","犬","空","海","山","花","木","水","火","風","雨","雪","星","月","鳥","魚","川","森","道","石","葉","虫","朝","夜","音"]
           .map(ja=>({ja, romaji:toRomaji(ja).toLowerCase()})),
  normal: ["友達","学校","電車","飛行機","音楽","映画館","図書館","自転車","冒険","挑戦","スマホ","サッカー","プログラム","ゲーム","カメラ","ランニング","おにぎり","りんごジュース","チョコレート","バドミントン"]
           .map(ja=>({ja, romaji:toRomaji(ja).toLowerCase()})),
  hard:   ["コンピュータプログラム","インターネット通信","スマートフォン操作","プログラミング言語","アドベンチャーゲーム","コミュニケーション","インフラストラクチャ","エンターテインメント","マルチプレイヤーゲーム","情報セキュリティシステム","人工知能技術","ビジュアルプログラミング","ネットワーク管理システム","コンテンツクリエイター","スーパーコンピュータ","データベース管理","クラウドコンピューティング","モバイルアプリ開発","デジタルトランスフォーメーション","インタラクティブデザイン"]
           .map(ja=>({ja, romaji:toRomaji(ja).toLowerCase()})),
};

// ── プレイヤー ────────────────────────────────────────────────
let player = { name:"", coins:0, level:1, xp:0, friendCode:"", nameChanges:{date:"",count:0} };

const xpNeeded = lv => Math.floor(100 * Math.pow(2, lv-1));

function genFriendCode() {
  const n = Math.floor(Math.random()*1e6).toString().padStart(6,"0");
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return n + [0,0,0].map(()=>L[Math.floor(Math.random()*26)]).join("");
}

function loadPlayer() {
  const s = LS.get("player");
  if (s?.name) { Object.assign(player, s); if (!player.friendCode) player.friendCode = genFriendCode(); }
  else {
    player.name = "匿名" + String(Math.floor(Math.random()*1e12)).padStart(12,"0");
    player.friendCode = genFriendCode();
    savePlayer();
  }
}

function savePlayer() {
  LS.set("player", player);
  if (!db) return;
  set(ref(db,`users/${MY_UID}`), {
    name:player.name, friendCode:player.friendCode, level:player.level,
    xp:player.xp, coins:player.coins, uid:MY_UID, lastSeen:Date.now()
  }).catch(()=>{});
}

function addCoins(n) { player.coins+=n; savePlayer(); refreshHUD(); }

function addXP(n) {
  player.xp += n;
  let leveled = false;
  while (player.xp >= xpNeeded(player.level)) { player.xp -= xpNeeded(player.level); player.level++; leveled=true; }
  savePlayer(); refreshHUD();
  if (leveled) { el("toast-lv-n").textContent = player.level; showToast("toast-lv"); }
}

function refreshHUD() {
  el("coin-val").textContent = player.coins.toLocaleString();
  el("lv-num").textContent   = player.level;
  const need = xpNeeded(player.level);
  el("xp-cur").textContent  = player.xp;
  el("xp-max").textContent  = need;
  el("xp-fill").style.width = Math.min(100, player.xp/need*100) + "%";
}

// ── トースト ──────────────────────────────────────────────────
function showToast(id, ms=2600) {
  const e = el(id); e.classList.add("show");
  setTimeout(()=>e.classList.remove("show"), ms);
}

// ── スクリーン ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  el(id)?.classList.add("active");
}

// ── パネル ────────────────────────────────────────────────────
let _panel = null;

function openPanel(id) {
  if (_panel && _panel !== id) closePanel(_panel, false);
  const p = el(id); if (!p) return;
  el("dim").style.display = "block";
  p.style.display = "flex";
  requestAnimationFrame(()=>requestAnimationFrame(()=>p.classList.add("open")));
  _panel = id;
}

function closePanel(id, reset=true) {
  const p = el(id); if (!p) return;
  p.classList.remove("open");
  el("dim").style.display = "none";
  setTimeout(()=>p.style.display="none", 330);
  if (reset) _panel = null;
}

// ── プロフィール ──────────────────────────────────────────────
const fmtCode = fc => fc ? `${fc.slice(0,3)}-${fc.slice(3,6)}-${fc.slice(6)}` : "------";

function renderProfile() {
  el("p-name").textContent = player.name;
  el("my-fc").textContent  = fmtCode(player.friendCode);
  const tk = todayKey();
  if (player.nameChanges.date!==tk) player.nameChanges = {date:tk,count:0};
  el("name-change-left").textContent = `本日あと ${Math.max(0,3-player.nameChanges.count)} 回変更できます`;
}

function saveName() {
  const v = el("name-input").value.trim(); if (!v) return;
  if (v.length>20) { el("name-change-left").textContent="20文字以内で入力してください"; return; }
  const tk=todayKey();
  if (player.nameChanges.date!==tk) player.nameChanges={date:tk,count:0};
  if (player.nameChanges.count>=3) { el("name-change-left").textContent="本日の変更回数を使い切りました"; return; }
  player.nameChanges.count++; player.name=v; savePlayer();
  el("name-edit-area").classList.add("hidden"); renderProfile();
}

// ── フレンドシステム ──────────────────────────────────────────
async function sendFriendRequest() {
  const raw = el("fc-input").value.replace(/-/g,"").toUpperCase().trim();
  const msgEl = el("add-msg");
  if (!raw) { setMsg(msgEl,"コードを入力してください","err"); return; }
  if (raw===player.friendCode) { setMsg(msgEl,"自分のコードは追加できません","err"); return; }
  if (!db) { setMsg(msgEl,"オフラインのため送信不可","err"); return; }

  const myFriends = LS.get("f_"+MY_UID, {});
  if (Object.values(myFriends).some(f=>(f.friendCode||"").replace(/-/g,"")=== raw)) {
    setMsg(msgEl,"すでにフレンドです","err"); return;
  }
  setMsg(msgEl,"検索中…","");
  try {
    const snap = await get(ref(db,"users"));
    if (!snap.exists()) { setMsg(msgEl,"ユーザーが見つかりません","err"); return; }
    let found = null;
    snap.forEach(c=>{ const d=c.val(); if((d.friendCode||"").replace(/-/g,"")=== raw) found={uid:c.key,...d}; });
    if (!found) { setMsg(msgEl,"ユーザーが見つかりません","err"); return; }
    await set(ref(db,`friend_requests/${found.uid}/${MY_UID}`),{fromUid:MY_UID,fromName:player.name,fromCode:player.friendCode,ts:Date.now()});
    setMsg(msgEl,`${safeEsc(found.name)} さんに申請しました`,"ok");
    el("fc-input").value="";
  } catch(e) { setMsg(msgEl,"エラーが発生しました","err"); }
}

function setMsg(e,t,c) { e.textContent=t; e.className="msg"+(c?" "+c:""); }

let _reqUnsub = null;
function listenRequests() {
  if (!db) return;
  if (_reqUnsub) { _reqUnsub(); _reqUnsub=null; }
  _reqUnsub = onValue(ref(db,`friend_requests/${MY_UID}`), snap=>{
    const data = snap.exists() ? snap.val() : {};
    renderRequests(data);
    const cnt = Object.keys(data).length;
    const badge = el("req-badge");
    if (cnt>0) { badge.textContent=cnt; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  });
}

function renderRequests(data) {
  const e = el("req-list"); e.innerHTML="";
  const keys = Object.keys(data);
  if (!keys.length) { e.innerHTML='<div class="empty-note">申請はありません</div>'; return; }
  keys.forEach(uid=>{
    const r = data[uid];
    const d = document.createElement("div"); d.className="r-card";
    d.innerHTML=`<div class="f-info"><div class="f-name">${safeEsc(r.fromName)}</div><div class="f-code">${fmtCode(r.fromCode)}</div></div><div class="r-btns"><button class="r-btn r-accept">許可</button><button class="r-btn r-deny">拒否</button></div>`;
    d.querySelector(".r-accept").addEventListener("click",()=>acceptFriend(uid,r.fromName,r.fromCode));
    d.querySelector(".r-deny").addEventListener("click",()=>{ if(db) remove(ref(db,`friend_requests/${MY_UID}/${uid}`)); });
    e.appendChild(d);
  });
}

async function acceptFriend(uid,name,code) {
  if (!db) return;
  const ts=Date.now();
  await set(ref(db,`friends/${MY_UID}/${uid}`),{name,friendCode:code,since:ts});
  await set(ref(db,`friends/${uid}/${MY_UID}`),{name:player.name,friendCode:player.friendCode,since:ts});
  await remove(ref(db,`friend_requests/${MY_UID}/${uid}`));
}

let _flistUnsub = null;
const _onlineSubs = {};
function listenFriends() {
  if (!db) return;
  if (_flistUnsub) { _flistUnsub(); _flistUnsub=null; }
  _flistUnsub = onValue(ref(db,`friends/${MY_UID}`), snap=>{
    const data = snap.exists() ? snap.val() : {};
    LS.set("f_"+MY_UID, data); renderFriends(data);
  });
}

function renderFriends(data) {
  Object.keys(_onlineSubs).forEach(uid=>{ _onlineSubs[uid](); delete _onlineSubs[uid]; });
  const e = el("friend-list"); e.innerHTML="";
  const uids = Object.keys(data);
  if (!uids.length) { e.innerHTML='<div class="empty-note">フレンドはいません</div>'; return; }
  uids.forEach(uid=>{
    const f=data[uid];
    const d=document.createElement("div"); d.className="f-card";
    d.innerHTML=`<div class="online-dot off" id="dot_${uid}"></div><div class="f-info"><div class="f-name" id="fn_${uid}">${safeEsc(f.name||"不明")}</div><div class="f-code">${fmtCode(f.friendCode)}</div></div><button class="del-btn" title="削除">✕</button>`;
    d.querySelector(".del-btn").addEventListener("click",async()=>{
      if (!confirm("フレンドを削除しますか？")) return;
      if(db){await remove(ref(db,`friends/${MY_UID}/${uid}`));await remove(ref(db,`friends/${uid}/${MY_UID}`));}
    });
    e.appendChild(d);
    if (!db) return;
    _onlineSubs[uid] = onValue(ref(db,`users/${uid}/lastSeen`), s=>{
      const dot=el(`dot_${uid}`); if(!dot) return;
      const ts=s.exists()?s.val():0;
      dot.className="online-dot "+(typeof ts==="number"&&ts>0&&Date.now()-ts<30000?"on":"off");
    });
    onValue(ref(db,`users/${uid}/name`),s=>{ const ne=el(`fn_${uid}`); if(ne&&s.exists()) ne.textContent=s.val(); });
  });
}

function startHeartbeat() {
  if (!db) return;
  const r = ref(db,`users/${MY_UID}/lastSeen`);
  const beat = ()=>set(r,Date.now()).catch(()=>{});
  beat(); setInterval(beat,14000); onDisconnect(r).set(0);
}

// ── タスク ────────────────────────────────────────────────────
const DAILY_DEF  = [{id:"d1",label:"10回プレイする",goal:10},{id:"d2",label:"スコア 5,000〜50,000 を出す",goal:1},{id:"d3",label:"コンボ 50〜150 を出す",goal:1}];
const WEEKLY_DEF = [{id:"w1",label:"100回プレイする",goal:100},{id:"w2",label:"スコア 500〜50,000 を10回出す",goal:10},{id:"w3",label:"コンボ 50〜150 を10回出す",goal:10}];

function loadTasks() {
  const tk=todayKey(), wk=weekKey();
  let dt=LS.get("dt"), wt=LS.get("wt");
  if(!dt||dt.key!==tk){dt={key:tk,prog:{},cleared:false};LS.set("dt",dt);}
  if(!wt||wt.key!==wk){wt={key:wk,prog:{},cleared:false};LS.set("wt",wt);}
  return {dt,wt};
}
function renderTasks() {
  const {dt,wt}=loadTasks();
  buildTaskUI("daily-tasks",DAILY_DEF,dt.prog);
  buildTaskUI("weekly-tasks",WEEKLY_DEF,wt.prog);
}
function buildTaskUI(cid,defs,prog) {
  const e=el(cid); if(!e) return; e.innerHTML="";
  defs.forEach(def=>{
    const cur=Math.min(prog[def.id]||0,def.goal), done=cur>=def.goal, pct=(cur/def.goal)*100;
    const d=document.createElement("div"); d.className="task-item"+(done?" done":"");
    d.innerHTML=`<div class="task-name">${done?"✓ ":""}${def.label}</div><div class="task-bar-outer"><div class="task-bar-inner" style="width:${pct}%"></div></div><div class="task-prog">${cur} / ${def.goal}</div>`;
    e.appendChild(d);
  });
}
function updateTasksAfterGame(score,maxCombo) {
  const {dt,wt}=loadTasks();
  if(!dt.cleared){
    dt.prog.d1=(dt.prog.d1||0)+1;
    if(score>=5000&&score<=50000) dt.prog.d2=Math.min((dt.prog.d2||0)+1,1);
    if(maxCombo>=50&&maxCombo<=150) dt.prog.d3=Math.min((dt.prog.d3||0)+1,1);
    if(DAILY_DEF.every(d=>(dt.prog[d.id]||0)>=d.goal)){dt.cleared=true;addCoins(1500);addXP(50);setTimeout(()=>{el("toast-task-body").textContent="+50 XP · +1,500 ¤";showToast("toast-task");},400);}
    LS.set("dt",dt);
  }
  if(!wt.cleared){
    wt.prog.w1=(wt.prog.w1||0)+1;
    if(score>=500&&score<=50000) wt.prog.w2=Math.min((wt.prog.w2||0)+1,10);
    if(maxCombo>=50&&maxCombo<=150) wt.prog.w3=Math.min((wt.prog.w3||0)+1,10);
    if(WEEKLY_DEF.every(d=>(wt.prog[d.id]||0)>=d.goal)){wt.cleared=true;addCoins(15000);addXP(500);setTimeout(()=>{el("toast-task-body").textContent="+500 XP · +15,000 ¤";showToast("toast-task");},1600);}
    LS.set("wt",wt);
  }
  renderTasks();
}

// ── ゲーム ────────────────────────────────────────────────────
const G={active:false,diff:"easy",pool:[],idx:0,word:null,romaji:"",pos:0,score:0,combo:0,maxCombo:0,timeLeft:60,timer:null};

function startGame(diff) {
  G.active=true; G.diff=diff;
  G.pool=shuffle([...WORDS[diff],...WORDS[diff]]);
  G.idx=0;G.score=0;G.combo=0;G.maxCombo=0;G.timeLeft=60;
  el("g-score").textContent="0"; el("g-combo").textContent="0";
  el("g-time").textContent="60"; el("g-time").classList.remove("danger");
  showScreen("screen-game"); nextWord();
  clearInterval(G.timer);
  G.timer=setInterval(()=>{
    G.timeLeft--; el("g-time").textContent=G.timeLeft;
    if(G.timeLeft<=10) el("g-time").classList.add("danger");
    if(G.timeLeft<=0) endGame();
  },1000);
  document.removeEventListener("keydown",onKey);
  document.addEventListener("keydown",onKey);
}

function nextWord() {
  if(G.idx>=G.pool.length) G.pool.push(...shuffle([...WORDS[G.diff]]));
  G.word=G.pool[G.idx++]; G.romaji=G.word.romaji.toLowerCase(); G.pos=0;
  el("g-ja").textContent=G.word.ja; el("g-hint").textContent=G.romaji; updateTyped();
}
function updateTyped() {
  el("g-ok").textContent=G.romaji.slice(0,G.pos);
  el("g-rest").textContent=G.romaji.slice(G.pos);
}

function onKey(e) {
  if(!G.active||e.ctrlKey||e.altKey||e.metaKey||e.key.length!==1) return;
  e.preventDefault();
  if(e.key===G.romaji[G.pos]){
    G.pos++;G.combo++;if(G.combo>G.maxCombo)G.maxCombo=G.combo;
    G.score+=5*G.combo;
    el("g-score").textContent=G.score.toLocaleString();
    el("g-combo").textContent=G.combo;
    if(G.pos>=G.romaji.length) nextWord(); else updateTyped();
  } else {
    G.combo=0; el("g-combo").textContent="0";
    const mf=el("miss-flash");mf.classList.remove("on");void mf.offsetWidth;mf.classList.add("on");
    setTimeout(()=>mf.classList.remove("on"),110);
  }
}

function endGame() {
  clearInterval(G.timer);G.active=false;
  document.removeEventListener("keydown",onKey);
  const coins=Math.floor(G.score/10),xp=Math.floor(G.score/100);
  addCoins(coins);addXP(xp);
  updateTasksAfterGame(G.score,G.maxCombo);
  el("r-score").textContent=G.score.toLocaleString();
  el("r-combo").textContent=G.maxCombo;
  el("r-coins").textContent=coins.toLocaleString()+" ¤";
  el("r-xp").textContent=xp+" XP";
  showScreen("screen-result");
}

// ── タブ切り替え ──────────────────────────────────────────────
function switchTab(tabs, panes, activeId) {
  tabs.forEach(t=>t.classList.toggle("active", t.id===activeId));
  panes.forEach(p=>p.classList.toggle("active", p.id==="pane-"+activeId.replace("ptab-","") || p.id==="sp-"+activeId.replace("stab-","") || p.id==="tp-"+activeId.replace("ttab-","")));
}

// ============================================================
//  イベント登録（DOM構築後に実行 = module は defer 相当）
// ============================================================

// ナビ
el("btn-play")      .addEventListener("click", ()=>showScreen("screen-diff"));
el("btn-diff-back") .addEventListener("click", ()=>showScreen("screen-main"));
el("btn-retry")     .addEventListener("click", ()=>showScreen("screen-diff"));
el("btn-end")       .addEventListener("click", ()=>showScreen("screen-main"));

// 難易度
el("btn-easy")  .addEventListener("click", ()=>startGame("easy"));
el("btn-normal").addEventListener("click", ()=>startGame("normal"));
el("btn-hard")  .addEventListener("click", ()=>startGame("hard"));

// フレンドパネル
el("btn-friend").addEventListener("click", ()=>{
  renderProfile(); openPanel("panel-friend"); listenRequests(); listenFriends();
});
el("btn-friend-close").addEventListener("click", ()=>closePanel("panel-friend"));

// タスクパネル
el("btn-task")      .addEventListener("click", ()=>{ renderTasks(); openPanel("panel-task"); });
el("btn-task-close").addEventListener("click", ()=>closePanel("panel-task"));

// 暗転
el("dim").addEventListener("click", ()=>{ if(_panel) closePanel(_panel); });

// プロフィール編集
el("btn-edit-name").addEventListener("click", ()=>{
  const tk=todayKey();
  if(player.nameChanges.date!==tk) player.nameChanges={date:tk,count:0};
  if(player.nameChanges.count>=3){el("name-change-left").textContent="本日の変更回数を使い切りました";return;}
  el("name-edit-area").classList.remove("hidden");
  el("name-input").value=player.name; el("name-input").focus();
});
el("btn-save-name").addEventListener("click", saveName);
el("name-input")   .addEventListener("keydown", e=>{ if(e.key==="Enter") saveName(); });

// フレンド追加
el("btn-add-friend").addEventListener("click", sendFriendRequest);
el("fc-input")     .addEventListener("keydown", e=>{ if(e.key==="Enter") sendFriendRequest(); });

// フレンドパネルタブ
el("ptab-profile").addEventListener("click", ()=>{
  el("ptab-profile").classList.add("active"); el("ptab-friends").classList.remove("active");
  el("pane-profile").classList.add("active"); el("pane-friends").classList.remove("active");
});
el("ptab-friends").addEventListener("click", ()=>{
  el("ptab-friends").classList.add("active"); el("ptab-profile").classList.remove("active");
  el("pane-friends").classList.add("active"); el("pane-profile").classList.remove("active");
});

// タスクタブ
el("ttab-daily").addEventListener("click", ()=>{
  el("ttab-daily").classList.add("active"); el("ttab-weekly").classList.remove("active");
  el("tp-daily").classList.add("active"); el("tp-weekly").classList.remove("active");
});
el("ttab-weekly").addEventListener("click", ()=>{
  el("ttab-weekly").classList.add("active"); el("ttab-daily").classList.remove("active");
  el("tp-weekly").classList.add("active"); el("tp-daily").classList.remove("active");
});

// フレンドサブタブ
["add","req","list"].forEach(tab=>{
  el("stab-"+tab).addEventListener("click", ()=>{
    ["add","req","list"].forEach(t=>{
      el("stab-"+t).classList.toggle("active", t===tab);
      el("sp-"+t).classList.toggle("active", t===tab);
    });
  });
});

// ── 起動 ─────────────────────────────────────────────────────
loadPlayer();
refreshHUD();
startHeartbeat();
showScreen("screen-main");
