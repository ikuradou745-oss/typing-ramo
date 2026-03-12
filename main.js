// --- 1. Firebase SDKのインポート ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, remove, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- 2. Firebase 設定 ---
const firebaseConfig = {
apiKey: "AIzaSyBXnNXQ5khcR0EvRide4C0PjshJZpSF4oM",
authDomain: "typing-game-28ed0.firebaseapp.com",
databaseURL: "https://typing-game-28ed0-default-rtdb.firebaseio.com",
projectId: "typing-game-28ed0",
storageBucket: "typing-game-28ed0.firebasestorage.app",
messagingSenderId: "963797267101",
appId: "1:963797267101:web:0d5d700458fb1991021a74",
measurementId: "G-CL4B6ZK0SC"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAnalytics = getAnalytics(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDatabase = getDatabase(firebaseApp);

// --- 3. 過去プロジェクトの継承クラス (Legacy Services) ---
class GameDataManager {
constructor() {
this.data = {};
console.log("GameDataManager has been initialized.");
}
saveData(key, value) { this.data[key] = value; }
loadData(key) { return this.data[key]; }
}

class BrainrotCollectionService {
constructor() {
this.collections = [];
console.log("BrainrotCollectionService has been initialized.");
}
addCollection(item) { this.collections.push(item); }
}

class BrainrotCarryService {
constructor() {
this.carryCapacity = 100;
this.currentLoad = 0;
console.log("BrainrotCarryService has been initialized.");
}
carryItem(weight) {
if (this.currentLoad + weight <= this.carryCapacity) {
this.currentLoad += weight;
return true;
}
return false;
}
}

class MoneyDisplayController {
constructor(displayElementId) {
this.displayElementId = displayElementId;
console.log("MoneyDisplayController has been initialized.");
}
updateDisplay(amount) {
const element = document.getElementById(this.displayElementId);
if (element) { element.innerText = amount; }
}
}

const gameDataManager = new GameDataManager();
const collectionService = new BrainrotCollectionService();
const carryService = new BrainrotCarryService();
const moneyController = new MoneyDisplayController("coin-value");

// --- 4. ユーザー状態管理 (User System) ---
const UserState = {
uid: null,
displayName: "",
friendCode: "",
coins: 0,
level: 1,
experiencePoints: 0,
nameChangeCount: 0,
lastNameChangeDate: ""
};

// 通知表示関数
function showNotification(message) {
const area = document.getElementById("notification-area");
if (!area) return;
const notification = document.createElement("div");
notification.classList.add("notification");
notification.innerText = message;
area.appendChild(notification);
setTimeout(() => { notification.remove(); }, 4000);
}

// 7時リセットの日付取得
function getTodayJSTString() {
const date = new Date();
const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
if (jstDate.getUTCHours() < 7) {
jstDate.setUTCDate(jstDate.getUTCDate() - 1);
}
return ${jstDate.getUTCFullYear()}-${jstDate.getUTCMonth() + 1}-${jstDate.getUTCDate()};
}

function calculateRequiredXP(level) {
return 100 * Math.pow(2, level - 1);
}

function updateHUD() {
moneyController.updateDisplay(UserState.coins);

const levelEl = document.getElementById("current-level");
const xpEl = document.getElementById("current-xp");
const reqXpEl = document.getElementById("required-xp");
const xpBarEl = document.getElementById("xp-bar-fill");
const nameEl = document.getElementById("user-display-name");
const codeEl = document.getElementById("user-friend-code");
const leftEl = document.getElementById("name-change-left");

if (levelEl) levelEl.innerText = UserState.level;
if (xpEl) xpEl.innerText = UserState.experiencePoints;

const requiredXP = calculateRequiredXP(UserState.level);
if (reqXpEl) reqXpEl.innerText = requiredXP;
if (xpBarEl) xpBarEl.style.width = `${Math.min((UserState.experiencePoints / requiredXP) * 100, 100)}%`;

if (nameEl) nameEl.innerText = UserState.displayName;
if (codeEl) codeEl.innerText = UserState.friendCode;
if (leftEl) leftEl.innerText = (3 - UserState.nameChangeCount);
}

async function addExperienceAndCoins(gainedXP, gainedCoins) {
UserState.experiencePoints += gainedXP;
UserState.coins += gainedCoins;

let leveledUp = false;
let requiredXP = calculateRequiredXP(UserState.level);

while (UserState.experiencePoints >= requiredXP) {
    UserState.experiencePoints -= requiredXP;
    UserState.level += 1;
    leveledUp = true;
    requiredXP = calculateRequiredXP(UserState.level);
}

if (leveledUp) showNotification(`レベルアップ！現在のレベル ${UserState.level}`);

updateHUD();
if (UserState.uid) {
    await update(ref(firebaseDatabase, `users/${UserState.uid}`), {
        experiencePoints: UserState.experiencePoints,
        level: UserState.level,
        coins: UserState.coins
    });
}
}

// --- 5. フレンドシステム (Friend System) ---
function initializeFriendSystem() {
if (!UserState.uid) return;

// 申請監視
onValue(ref(firebaseDatabase, `friendRequests/${UserState.uid}`), (snapshot) => {
    const container = document.getElementById("friend-request-container");
    if (!container) return;
    container.innerHTML = "";
    let count = 0;
    if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([reqUid, reqData]) => {
            count++;
            const li = document.createElement("li");
            li.innerHTML = `<div>${reqData.fromName}さんから申請！</div>`;
            const btnDiv = document.createElement("div");
            const acc = document.createElement("button"); acc.innerText = "許可";
            acc.onclick = () => acceptFriendRequest(reqUid, reqData);
            const rej = document.createElement("button"); rej.innerText = "拒否";
            rej.onclick = () => remove(ref(firebaseDatabase, `friendRequests/${UserState.uid}/${reqUid}`));
            btnDiv.append(acc, rej);
            li.appendChild(btnDiv);
            container.appendChild(li);
        });
    }
    const badge = document.getElementById("request-badge");
    if (badge) badge.innerText = count;
});

// リスト監視
onValue(ref(firebaseDatabase, `friends/${UserState.uid}`), (snapshot) => {
    const container = document.getElementById("friend-list-container");
    if (!container) return;
    container.innerHTML = "";
    if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([fUid, fData]) => {
            const li = document.createElement("li");
            li.innerHTML = `<div><strong>${fData.friendName}</strong><span id="status-${fUid}" class="status-indicator status-offline"></span></div>`;
            const del = document.createElement("button"); del.innerText = "削除";
            del.onclick = async () => {
                await remove(ref(firebaseDatabase, `friends/${UserState.uid}/${fUid}`));
                await remove(ref(firebaseDatabase, `friends/${fUid}/${UserState.uid}`));
            };
            li.appendChild(del);
            container.appendChild(li);
            // ステータス監視
            onValue(ref(firebaseDatabase, `status/${fUid}`), (s) => {
                const el = document.getElementById(`status-${fUid}`);
                if (el) el.className = `status-indicator status-${s.val() === "online" ? "online" : "offline"}`;
            });
        });
    }
});
}

async function acceptFriendRequest(requesterUid, requestData) {
await set(ref(firebaseDatabase, friends/${UserState.uid}/${requesterUid}), { friendName: requestData.fromName, friendCode: requestData.fromCode });
await set(ref(firebaseDatabase, friends/${requesterUid}/${UserState.uid}), { friendName: UserState.displayName, friendCode: UserState.friendCode });
await remove(ref(firebaseDatabase, friendRequests/${UserState.uid}/${requesterUid}));
showNotification("フレンドになりました！");
}

// --- 6. タスクシステム (Task System) ---
const DailyTasks = [
{ id: "daily_play_10", description: "10回タイピングをプレイ", target: 10, rewardXP: 50, rewardCoins: 1500 },
{ id: "daily_score_5000", description: "スコア5000以上を出す", target: 1, rewardXP: 50, rewardCoins: 1500 },
{ id: "daily_combo_50", description: "コンボ50以上を出す", target: 1, rewardXP: 50, rewardCoins: 1500 }
];

const WeeklyTasks = [
{ id: "weekly_play_100", description: "100回タイピングをプレイ", target: 100, rewardXP: 500, rewardCoins: 15000 },
{ id: "weekly_score_500", description: "スコア500以上を10回", target: 10, rewardXP: 500, rewardCoins: 15000 },
{ id: "weekly_combo_50", description: "コンボ50以上を10回", target: 10, rewardXP: 500, rewardCoins: 15000 }
];

let taskProgress = {
daily: { playCount: 0, highestScore: 0, highestCombo: 0, completed: {}, lastReset: "" },
weekly: { playCount: 0, score500Count: 0, combo50Count: 0, completed: {}, lastReset: "" }
};

async function updateTaskProgress(score, combo) {
taskProgress.daily.playCount++;
if (score > taskProgress.daily.highestScore) taskProgress.daily.highestScore = score;
if (combo > taskProgress.daily.highestCombo) taskProgress.daily.highestCombo = combo;

taskProgress.weekly.playCount++;
if (score >= 500) taskProgress.weekly.score500Count++;
if (combo >= 50) taskProgress.weekly.combo50Count++;

const check = async (tasks, type) => {
    for (let t of tasks) {
        if (!taskProgress[type].completed[t.id]) {
            let achieved = false;
            if (t.id.includes("play")) achieved = taskProgress[type].playCount >= t.target;
            else if (t.id.includes("score")) achieved = (type === "daily" ? taskProgress.daily.highestScore >= 5000 : taskProgress.weekly.score500Count >= 10);
            else if (t.id.includes("combo")) achieved = (type === "daily" ? taskProgress.daily.highestCombo >= 50 : taskProgress.weekly.combo50Count >= 10);

            if (achieved) {
                taskProgress[type].completed[t.id] = true;
                showNotification(`タスク完了: ${t.description}`);
                await addExperienceAndCoins(t.rewardXP, t.rewardCoins);
            }
        }
    }
};

await check(DailyTasks, "daily");
await check(WeeklyTasks, "weekly");
if (UserState.uid) {
    await set(ref(firebaseDatabase, `tasks/${UserState.uid}`), taskProgress);
}
}

// --- 7. ゲームロジック (Typing Game Logic) ---
const WordDatabase = {
easy: [
{ text: "ねこ", romaji: "neko" }, { text: "いぬ", romaji: "inu" }, { text: "とり", romaji: "tori" },
{ text: "さる", romaji: "saru" }, { text: "うみ", romaji: "umi" }, { text: "そら", romaji: "sora" },
{ text: "くも", romaji: "kumo" }, { text: "はな", romaji: "hana" }, { text: "あめ", romaji: "ame" },
{ text: "ゆき", romaji: "yuki" }, { text: "かぜ", romaji: "kaze" }, { text: "つき", romaji: "tsuki" },
{ text: "ほし", romaji: "hoshi" }, { text: "えん", romaji: "en" }, { text: "すし", romaji: "sushi" }
],
normal: [
{ text: "にほんご", romaji: "nihongo" }, { text: "えいご", romaji: "eigo" }, { text: "がっこう", romaji: "gakkou" },
{ text: "せんせい", romaji: "sensei" }, { text: "ともだち", romaji: "tomodachi" }, { text: "かぞく", romaji: "kazoku" },
{ text: "ごはん", romaji: "gohan" }, { text: "おちゃ", romaji: "ocha" }, { text: "おかし", romaji: "okashi" },
{ text: "でんわ", romaji: "denwa" }, { text: "てがみ", romaji: "tegami" }, { text: "ほんや", romaji: "honya" },
{ text: "きっさてん", romaji: "kissaten" }, { text: "えいがかん", romaji: "eigakan" }, { text: "こうえん", romaji: "kouen" }
],
hard: [
{ text: "しょうがいがくしゅう", romaji: "shougaigakushuu" }, { text: "じょうほうしょり", romaji: "jouhoushouri" },
{ text: "かんきょうもんだい", romaji: "kankyoumondai" }, { text: "こくさいこうりゅう", romaji: "kokusaikouryuu" },
{ text: "ぎじゅつかくしん", romaji: "gijutsukakushin" }, { text: "じんこうちのう", romaji: "jinkouchinou" },
{ text: "うちゅうかいはつ", romaji: "uchuukaihatsu" }, { text: "さいせいかのう", romaji: "saiseikanou" },
{ text: "けいざいせいちょう", romaji: "keizaiseichou" }, { text: "しゃかいふくし", romaji: "shakaifukushi" },
{ text: "ぶんかてきしげん", romaji: "bunkatekishigen" }, { text: "ちきゅうおんだんか", romaji: "chikyuuondanka" },
{ text: "せいじきようこう", romaji: "seijikiyoukou" }, { text: "ろんりてきしこう", romaji: "ronritekishikou" },
{ text: "じぞくかのうなかいはつ", romaji: "jizokukanounakaihatsu" }
]
};

let gameActive = false, score = 0, combo = 0, maxCombo = 0, timeLeft = 60, timer = null, currentWord = null, charIdx = 0, currentDifficulty = "easy";

function startTypingGame(diff) {
currentDifficulty = diff;
const menu = document.getElementById("main-menu");
const screen = document.getElementById("game-screen");
if (menu) menu.classList.add("hidden");
if (screen) screen.classList.remove("hidden");

score = 0; combo = 0; maxCombo = 0; timeLeft = 60; gameActive = true;
updateGameUI();
nextWord(diff);
timer = setInterval(() => {
    timeLeft--;
    const timeEl = document.getElementById("time-left");
    if (timeEl) timeEl.innerText = timeLeft;
    if (timeLeft <= 0) endTypingGame();
}, 1000);
}

function nextWord(diff) {
const list = WordDatabase[diff];
currentWord = list[Math.floor(Math.random() * list.length)];
charIdx = 0;
renderWord();
}

function renderWord() {
const jWordEl = document.getElementById("japanese-word");
const rWordEl = document.getElementById("romaji-word");
if (jWordEl) jWordEl.innerText = currentWord.text;
if (rWordEl) {
rWordEl.innerHTML = currentWord.romaji.split('').map((c, i) =>
<span class="${i < charIdx ? 'typed-char' : 'untyped-char'}">${c}</span>
).join('');
}
}

function updateGameUI() {
const scoreEl = document.getElementById("current-score");
const comboEl = document.getElementById("current-combo");
if (scoreEl) scoreEl.innerText = score;
if (comboEl) comboEl.innerText = combo;
}

async function endTypingGame() {
gameActive = false;
clearInterval(timer);

const screen = document.getElementById("game-screen");
const result = document.getElementById("result-screen");
if (screen) screen.classList.add("hidden");
if (result) result.classList.remove("hidden");

const eCoins = Math.floor(score / 10);
const eXP = Math.floor(score / 100);

const fScoreEl = document.getElementById("final-score");
const eCoinsEl = document.getElementById("earned-coins");
const eXpEl = document.getElementById("earned-xp");

if (fScoreEl) fScoreEl.innerText = score;
if (eCoinsEl) eCoinsEl.innerText = eCoins;
if (eXpEl) eXpEl.innerText = eXP;

await addExperienceAndCoins(eXP, eCoins);
await updateTaskProgress(score, maxCombo);
}

// --- 8. 全体初期化とイベントリスナー ---
onAuthStateChanged(firebaseAuth, async (user) => {
if (user) {
UserState.uid = user.uid;
const snap = await get(ref(firebaseDatabase, users/${user.uid}));
const date = getTodayJSTString();
if (snap.exists()) {
Object.assign(UserState, snap.val());
if (UserState.lastNameChangeDate !== date) {
UserState.nameChangeCount = 0; UserState.lastNameChangeDate = date;
await update(ref(firebaseDatabase, users/${user.uid}), { nameChangeCount: 0, lastNameChangeDate: date });
}
} else {
UserState.displayName = String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
UserState.friendCode = String(Math.floor(Math.random() * 1e6)).padStart(6, '0') + "ABC";
UserState.lastNameChangeDate = date;
await set(ref(firebaseDatabase, users/${user.uid}), UserState);
await set(ref(firebaseDatabase, friendCodes/${UserState.friendCode}), user.uid);
}

    // オンライン管理
    const statusRef = ref(firebaseDatabase, `status/${user.uid}`);
    onDisconnect(statusRef).set("offline").then(() => set(statusRef, "online"));

    // タスク読み込み
    const tSnap = await get(ref(firebaseDatabase, `tasks/${user.uid}`));
    if (tSnap.exists()) taskProgress = tSnap.val();

    updateHUD();
    initializeFriendSystem();
} else {
    signInAnonymously(firebaseAuth);
}
});

// UI制御
const togglePanel = (id, open) => {
const p = document.getElementById(id);
const ov = document.getElementById("dark-overlay");
if (!p) return;
if (open) {
p.classList.remove("hidden");
p.classList.add("open");
if (ov) ov.classList.remove("hidden");
}
else {
p.classList.remove("open");
setTimeout(() => p.classList.add("hidden"), 400);
if (ov) ov.classList.add("hidden");
}
};

const profileBtn = document.getElementById("profile-button");
const closeProfileBtn = document.getElementById("close-profile-button");
const taskBtn = document.getElementById("task-button");
const closeTaskBtn = document.getElementById("close-task-button");

if (profileBtn) profileBtn.onclick = () => togglePanel("profile-panel", true);
if (closeProfileBtn) closeProfileBtn.onclick = () => togglePanel("profile-panel", false);
if (taskBtn) taskBtn.onclick = () => togglePanel("task-panel", true);
if (closeTaskBtn) closeTaskBtn.onclick = () => togglePanel("task-panel", false);

// 名前変更
const changeNameBtn = document.getElementById("change-name-button");
if (changeNameBtn) {
changeNameBtn.onclick = async () => {
const input = document.getElementById("new-name-input");
const val = input ? input.value.trim() : "";
if (val && val.length <= 20 && UserState.nameChangeCount < 3) {
UserState.displayName = val; UserState.nameChangeCount++;
await update(ref(firebaseDatabase, users/${UserState.uid}), { displayName: val, nameChangeCount: UserState.nameChangeCount });
updateHUD();
}
};
}

// ゲーム開始
const startOfflineBtn = document.getElementById("start-offline-play-button");
if (startOfflineBtn) {
startOfflineBtn.onclick = () => {
startOfflineBtn.classList.add("hidden");
const diffSel = document.getElementById("difficulty-selection");
if (diffSel) diffSel.classList.remove("hidden");
};
}

document.querySelectorAll(".difficulty-button").forEach(b => {
b.onclick = () => startTypingGame(b.dataset.difficulty);
});

const returnMenuBtn = document.getElementById("return-to-menu-button");
if (returnMenuBtn) {
returnMenuBtn.onclick = () => {
const result = document.getElementById("result-screen");
const menu = document.getElementById("main-menu");
if (result) result.classList.add("hidden");
if (menu) menu.classList.remove("hidden");
};
}

// タイピング入力
window.addEventListener("keydown", (e) => {
if (!gameActive || e.repeat || !currentWord) return;
const target = currentWord.romaji[charIdx].toLowerCase();
if (e.key.toLowerCase() === target) {
charIdx++; combo++; if (combo > maxCombo) maxCombo = combo;
score += 5 * combo;
renderWord();
updateGameUI();
if (charIdx >= currentWord.romaji.length) nextWord(currentDifficulty);
} else {
if (e.key !== "Shift" && e.key !== "Alt" && e.key !== "Control") {
combo = 0;
updateGameUI();
}
}
});
