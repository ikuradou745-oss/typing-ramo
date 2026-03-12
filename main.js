// ==========================================
// 1. Firebase SDK インポート (ES Modules)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, remove, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 2. Firebase 設定
// ==========================================
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

// ==========================================
// 3. 過去プロジェクトの継承クラス (Legacy Services)
// ==========================================
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
        if (element) { element.innerText = amount.toLocaleString(); }
    }
}

const gameDataManager = new GameDataManager();
const collectionService = new BrainrotCollectionService();
const carryService = new BrainrotCarryService();
const moneyController = new MoneyDisplayController("coin-value");

// ==========================================
// 4. ユーザー状態管理 (User System)
// ==========================================
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

// 難易度ごとのレベル制限設定
const DifficultyUnlockLevels = {
    easy: 1,
    normal: 5,
    hard: 10
};

// 通知表示
function showNotification(message) {
    const area = document.getElementById("notification-area");
    if (!area) return;
    const notification = document.createElement("div");
    notification.className = "notification fade-in";
    notification.innerText = message;
    area.appendChild(notification);
    setTimeout(() => { notification.classList.add("fade-out"); setTimeout(() => notification.remove(), 500); }, 3500);
}

// 7時リセットの日付取得
function getTodayJSTString() {
    const date = new Date();
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    if (jstDate.getUTCHours() < 7) {
        jstDate.setUTCDate(jstDate.getUTCDate() - 1);
    }
    return `${jstDate.getUTCFullYear()}-${jstDate.getUTCMonth() + 1}-${jstDate.getUTCDate()}`;
}

function calculateRequiredXP(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// ボタンの状態（レベル制限）を更新する関数
function checkLevelLocks() {
    const buttons = document.querySelectorAll(".difficulty-button");
    buttons.forEach(btn => {
        const diff = btn.dataset.difficulty;
        const requiredLevel = DifficultyUnlockLevels[diff] || 1;
        
        // スタイルと操作性の制御
        if (UserState.level < requiredLevel) {
            btn.disabled = true;
            btn.classList.add("locked");
            btn.innerHTML = `<span class="lock-icon">🔒</span> Lv.${requiredLevel} で解放`;
            // インラインスタイルでグレーアウト（CSSがない場合でも対応）
            btn.style.opacity = "0.5";
            btn.style.filter = "grayscale(100%)";
            btn.style.cursor = "not-allowed";
            btn.style.pointerEvents = "none";
        } else {
            btn.disabled = false;
            btn.classList.remove("locked");
            btn.innerHTML = diff.toUpperCase(); // 元のテキストに戻す
            btn.style.opacity = "1";
            btn.style.filter = "none";
            btn.style.cursor = "pointer";
            btn.style.pointerEvents = "auto";
        }
    });
}

function updateHUD() {
    moneyController.updateDisplay(UserState.coins);
    
    const uiMap = {
        "current-level": UserState.level,
        "current-xp": UserState.experiencePoints,
        "user-display-name": UserState.displayName,
        "user-friend-code": UserState.friendCode,
        "name-change-left": (3 - UserState.nameChangeCount)
    };

    for (const [id, val] of Object.entries(uiMap)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    const requiredXP = calculateRequiredXP(UserState.level);
    const reqXpEl = document.getElementById("required-xp");
    if (reqXpEl) reqXpEl.innerText = requiredXP;

    const xpBar = document.getElementById("xp-bar-fill");
    if (xpBar) {
        const percent = Math.min((UserState.experiencePoints / requiredXP) * 100, 100);
        xpBar.style.width = `${percent}%`;
    }

    // レベルが上がった可能性があるのでロック確認
    checkLevelLocks();
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

    if (leveledUp) {
        showNotification(`レベルアップ！ Lv.${UserState.level} になりました！`);
    }

    updateHUD();
    
    if (UserState.uid) {
        await update(ref(firebaseDatabase, `users/${UserState.uid}`), {
            experiencePoints: UserState.experiencePoints,
            level: UserState.level,
            coins: UserState.coins
        });
    }
}

// ==========================================
// 5. ゲームロジック (Typing Game Logic)
// ==========================================
const WordDatabase = {
    easy: [ { text: "ねこ", romaji: "neko" }, { text: "いぬ", romaji: "inu" }, { text: "とり", romaji: "tori" } ],
    normal: [ { text: "にほんご", romaji: "nihongo" }, { text: "えいご", romaji: "eigo" }, { text: "がっこう", romaji: "gakkou" } ],
    hard: [ { text: "じんこうちのう", romaji: "jinkouchinou" }, { text: "うちゅうかいはつ", romaji: "uchuukaihatsu" } ]
};

let gameActive = false, score = 0, combo = 0, maxCombo = 0, timeLeft = 60;
let timer = null, currentWord = null, charIdx = 0, activeDifficulty = "easy";

function startTypingGame(diff) {
    if (UserState.level < DifficultyUnlockLevels[diff]) {
        showNotification("レベルが足りません！");
        return;
    }

    activeDifficulty = diff;
    document.getElementById("main-menu")?.classList.add("hidden");
    document.getElementById("game-screen")?.classList.remove("hidden");

    score = 0; combo = 0; maxCombo = 0; timeLeft = 60; gameActive = true;
    updateGameUI();
    nextWord();

    timer = setInterval(() => {
        timeLeft--;
        const timeEl = document.getElementById("time-left");
        if (timeEl) timeEl.innerText = timeLeft;
        if (timeLeft <= 0) endTypingGame();
    }, 1000);
}

function nextWord() {
    const list = WordDatabase[activeDifficulty];
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
            `<span class="${i < charIdx ? 'typed' : 'untyped'}">${c}</span>`
        ).join('');
    }
}

function updateGameUI() {
    const sEl = document.getElementById("current-score");
    const cEl = document.getElementById("current-combo");
    if (sEl) sEl.innerText = score;
    if (cEl) cEl.innerText = combo;
}

async function endTypingGame() {
    gameActive = false;
    clearInterval(timer);
    
    document.getElementById("game-screen")?.classList.add("hidden");
    document.getElementById("result-screen")?.classList.remove("hidden");

    const eCoins = Math.floor(score / 10);
    const eXP = Math.floor(score / 100) + 10;
    
    document.getElementById("final-score").innerText = score;
    document.getElementById("earned-coins").innerText = eCoins;
    document.getElementById("earned-xp").innerText = eXP;

    await addExperienceAndCoins(eXP, eCoins);
}

// ==========================================
// 6. UI制御 & 初期化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // ボタンのクリックイベント紐付け
    const startOfflineBtn = document.getElementById("start-offline-play-button");
    if (startOfflineBtn) {
        startOfflineBtn.onclick = () => {
            startOfflineBtn.style.display = "none";
            document.getElementById("difficulty-selection")?.classList.remove("hidden");
        };
    }

    document.querySelectorAll(".difficulty-button").forEach(btn => {
        btn.onclick = () => startTypingGame(btn.dataset.difficulty);
    });

    document.getElementById("return-to-menu-button").onclick = () => {
        document.getElementById("result-screen")?.classList.add("hidden");
        document.getElementById("main-menu")?.classList.remove("hidden");
        if (startOfflineBtn) startOfflineBtn.style.display = "block";
        document.getElementById("difficulty-selection")?.classList.add("hidden");
    };

    // タイピング入力
    window.addEventListener("keydown", (e) => {
        if (!gameActive || e.repeat || !currentWord) return;
        
        const target = currentWord.romaji[charIdx].toLowerCase();
        if (e.key.toLowerCase() === target) {
            charIdx++;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            score += 10 * combo;
            renderWord();
            updateGameUI();
            if (charIdx >= currentWord.romaji.length) nextWord();
        } else if (e.key.length === 1) { // 記号や文字キーのみ判定
            combo = 0;
            updateGameUI();
        }
    });

    // パネル切り替え
    const setupToggle = (btnId, panelId, isOpen) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.onclick = () => {
            const panel = document.getElementById(panelId);
            const overlay = document.getElementById("dark-overlay");
            if (isOpen) {
                panel?.classList.add("open");
                panel?.classList.remove("hidden");
                overlay?.classList.remove("hidden");
            } else {
                panel?.classList.remove("open");
                setTimeout(() => panel?.classList.add("hidden"), 300);
                overlay?.classList.add("hidden");
            }
        };
    };

    setupToggle("profile-button", "profile-panel", true);
    setupToggle("close-profile-button", "profile-panel", false);
    setupToggle("task-button", "task-panel", true);
    setupToggle("close-task-button", "task-panel", false);
});

// ==========================================
// 7. Firebase 認証 & データ同期
// ==========================================
onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
        UserState.uid = user.uid;
        const snap = await get(ref(firebaseDatabase, `users/${user.uid}`));
        const date = getTodayJSTString();

        if (snap.exists()) {
            Object.assign(UserState, snap.val());
            if (UserState.lastNameChangeDate !== date) {
                UserState.nameChangeCount = 0;
                UserState.lastNameChangeDate = date;
                await update(ref(firebaseDatabase, `users/${user.uid}`), { nameChangeCount: 0, lastNameChangeDate: date });
            }
        } else {
            // 新規ユーザー初期化
            UserState.displayName = `Player_${Math.floor(Math.random() * 10000)}`;
            UserState.friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            UserState.lastNameChangeDate = date;
            await set(ref(firebaseDatabase, `users/${user.uid}`), UserState);
        }

        // オンライン状態管理
        const statusRef = ref(firebaseDatabase, `status/${user.uid}`);
        onDisconnect(statusRef).set("offline").then(() => set(statusRef, "online"));

        updateHUD();
    } else {
        signInAnonymously(firebaseAuth);
    }
});
