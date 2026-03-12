import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- 1. Firebase 設定 ---
const firebaseConfig = {
    apiKey: "AIzaSyBXnNXQ5khcR0EvRide4C0PjshJZpSF4oM",
    authDomain: "typing-game-28ed0.firebaseapp.com",
    databaseURL: "https://typing-game-28ed0-default-rtdb.firebaseio.com",
    projectId: "typing-game-28ed0",
    storageBucket: "typing-game-28ed0.firebasestorage.app",
    messagingSenderId: "963797267101",
    appId: "1:963797267101:web:0d5d700458fb1991021a74",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- 2. グローバル状態 ---
const UserState = {
    uid: null, displayName: "Guest", coins: 0, level: 1, xp: 0, nameChangeCount: 0,
    friendCode: ""
};

let gameActive = false, score = 0, combo = 0, timeLeft = 60, timer = null;
let currentWord = null, charIdx = 0, activeDiff = "easy";

const WordDB = {
    easy: [{t:"ねこ", r:"neko"}, {t:"いぬ", r:"inu"}, {t:"とり", r:"tori"}],
    normal: [{t:"にほんご", r:"nihongo"}, {t:"がっこう", r:"gakkou"}, {t:"ともだち", r:"tomodachi"}],
    hard: [{t:"じんこうちのう", r:"jinkouchinou"}, {t:"ろじかるしんきんぐ", r:"rojikarushinkingu"}]
};

// --- 3. ユーティリティ & UI更新 ---
function showNotification(msg) {
    const area = document.getElementById("notification-area");
    const div = document.createElement("div");
    div.className = "notification";
    div.innerText = msg;
    area.appendChild(div);
    setTimeout(() => div.remove(), 3500);
}

function updateHUD() {
    document.getElementById("coin-value").innerText = UserState.coins.toLocaleString();
    document.getElementById("current-level").innerText = UserState.level;
    document.getElementById("current-xp").innerText = UserState.xp;
    
    const nextXP = 100 * Math.pow(1.5, UserState.level - 1);
    document.getElementById("required-xp").innerText = Math.floor(nextXP);
    document.getElementById("xp-bar-fill").style.width = `${Math.min((UserState.xp / nextXP) * 100, 100)}%`;
    
    document.getElementById("user-display-name").innerText = UserState.displayName;
    document.getElementById("user-friend-code").innerText = UserState.friendCode;
    document.getElementById("name-change-left").innerText = 3 - UserState.nameChangeCount;

    // レベルによるボタンのロック解除判定
    document.querySelectorAll("[data-min-level]").forEach(el => {
        const min = parseInt(el.dataset.minLevel);
        if (UserState.level < min) {
            el.disabled = true;
            if (!el.dataset.originalText) el.dataset.originalText = el.innerText;
            el.innerText = `🔒 Lv.${min} 解放`;
        } else {
            el.disabled = false;
            if (el.dataset.originalText) el.innerText = el.dataset.originalText;
        }
    });
}

async function addXPAndCoins(xpGain, coinGain) {
    UserState.xp += xpGain;
    UserState.coins += coinGain;
    let nextXP = 100 * Math.pow(1.5, UserState.level - 1);

    while (UserState.xp >= nextXP) {
        UserState.xp -= Math.floor(nextXP);
        UserState.level++;
        showNotification(`LEVEL UP! 現在 Lv.${UserState.level}`);
        nextXP = 100 * Math.pow(1.5, UserState.level - 1);
    }
    updateHUD();
    if (UserState.uid) {
        await update(ref(db, `users/${UserState.uid}`), { xp: UserState.xp, level: UserState.level, coins: UserState.coins });
    }
}

// --- 4. ゲームロジック ---
function startTyping(diff) {
    activeDiff = diff;
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    
    score = 0; combo = 0; timeLeft = 60; gameActive = true;
    updateGameUI();
    setNextWord();
    
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById("time-left").innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function setNextWord() {
    const list = WordDB[activeDiff];
    currentWord = list[Math.floor(Math.random() * list.length)];
    charIdx = 0;
    renderWord();
}

function renderWord() {
    document.getElementById("japanese-word").innerText = currentWord.t;
    document.getElementById("romaji-word").innerHTML = currentWord.r.split('').map((c, i) => 
        `<span class="${i < charIdx ? 'typed' : 'untyped'}">${c}</span>`
    ).join('');
}

function updateGameUI() {
    document.getElementById("current-score").innerText = score;
    document.getElementById("current-combo").innerText = combo;
}

function endGame() {
    gameActive = false;
    clearInterval(timer);
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
    
    const exp = Math.floor(score / 50) + 5;
    const coins = Math.floor(score / 10);
    document.getElementById("final-score").innerText = score;
    document.getElementById("earned-coins").innerText = coins;
    document.getElementById("earned-xp").innerText = exp;
    
    addXPAndCoins(exp, coins);
}

// --- 5. イベント初期化 ---
document.addEventListener("DOMContentLoaded", () => {
    // パネル開閉
    const toggle = (id, open) => {
        document.getElementById(id).classList.toggle("open", open);
        document.getElementById(id).classList.toggle("hidden", !open);
        document.getElementById("dark-overlay").classList.toggle("hidden", !open);
    };

    document.getElementById("profile-button").onclick = () => toggle("profile-panel", true);
    document.getElementById("close-profile-button").onclick = () => toggle("profile-panel", false);
    document.getElementById("task-button").onclick = () => toggle("task-panel", true);
    document.getElementById("close-task-button").onclick = () => toggle("task-panel", false);
    document.getElementById("inventory-button").onclick = () => toggle("inventory-panel", true);
    document.getElementById("close-inventory-button").onclick = () => toggle("inventory-panel", false);

    // メニュー操作
    document.getElementById("offline-menu-button").onclick = () => {
        document.getElementById("difficulty-selection").classList.remove("hidden");
    };
    document.getElementById("cancel-offline-button").onclick = () => {
        document.getElementById("difficulty-selection").classList.add("hidden");
    };
    document.querySelectorAll(".difficulty-button").forEach(btn => {
        btn.onclick = () => startTyping(btn.dataset.difficulty);
    });
    document.getElementById("return-to-menu-button").onclick = () => {
        document.getElementById("result-screen").classList.add("hidden");
        document.getElementById("main-menu").classList.remove("hidden");
    };

    // キー入力
    window.onkeydown = (e) => {
        if (!gameActive || e.repeat) return;
        const target = currentWord.r[charIdx].toLowerCase();
        if (e.key.toLowerCase() === target) {
            charIdx++;
            combo++;
            score += (10 * combo);
            if (charIdx >= currentWord.r.length) setNextWord();
            else renderWord();
            updateGameUI();
        } else if (e.key.length === 1) {
            combo = 0;
            updateGameUI();
        }
    };
});

// --- 6. Firebase 認証 ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        UserState.uid = user.uid;
        const snap = await get(ref(db, `users/${user.uid}`));
        if (snap.exists()) {
            Object.assign(UserState, snap.val());
        } else {
            UserState.friendCode = Math.random().toString(36).substring(2,8).toUpperCase();
            await set(ref(db, `users/${user.uid}`), UserState);
        }
        updateHUD();
    } else {
        signInAnonymously(auth);
    }
});
