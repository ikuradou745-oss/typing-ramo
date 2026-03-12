// Firebase設定
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

// Firebase初期化
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const database = firebase.database();

// ユーザーID
let userId = localStorage.getItem('typingGameUserId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('typingGameUserId', userId);
}

// 状態管理
let currentUser = null;
let gameState = {
    isPlaying: false,
    difficulty: null,
    timer: null,
    timeLeft: 60,
    score: 0,
    combo: 0,
    currentWord: '',
    words: {
        easy: ['apple', 'book', 'cat', 'dog', 'fish', 'green', 'house', 'ice', 'jump', 'king', 'lion', 'moon', 'night', 'open', 'pen'],
        medium: ['mountain', 'ocean', 'planet', 'queen', 'rainbow', 'sunshine', 'thunder', 'umbrella', 'victory', 'window', 'yellow', 'garden', 'forest', 'silver', 'bridge'],
        hard: ['international', 'understanding', 'communication', 'development', 'environment', 'government', 'professional', 'significant', 'temperature', 'celebration', 'architecture', 'mathematics', 'philosophy', 'psychology', 'technology']
    }
};

// タスク状態
let dailyTasks = {
    playCount: { current: 0, target: 5, completed: false, claimed: false },
    score: { current: 0, target: 5000, completed: false, claimed: false },
    combo: { current: 0, target: 50, completed: false, claimed: false }
};

let weeklyTasks = {
    playCount: { current: 0, target: 150, completed: false, claimed: false },
    score: { current: 0, target: 5000, completed: false, claimed: false },
    combo: { current: 0, target: 50, completed: false, claimed: false }
};

// DOM要素
const gameArea = document.getElementById('gameArea');
const friendIcon = document.getElementById('friendIcon');
const taskIcon = document.getElementById('taskIcon');
const sidePanel = document.getElementById('sidePanel');
const taskPanel = document.getElementById('taskPanel');
const overlay = document.getElementById('overlay');
const closePanel = document.getElementById('closePanel');
const closeTaskPanel = document.getElementById('closeTaskPanel');
const levelDisplay = document.getElementById('levelDisplay');
const coinAmount = document.getElementById('coinAmount');
const xpBar = document.getElementById('xpBar');
const xpText = document.getElementById('xpText');
const playBtn = document.getElementById('playBtn');
const difficultySelect = document.getElementById('difficultySelect');
const typingGame = document.getElementById('typingGame');
const resultScreen = document.getElementById('resultScreen');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const wordDisplay = document.getElementById('wordDisplay');
const typingInput = document.getElementById('typingInput');
const timerSpan = document.getElementById('timer');
const scoreSpan = document.getElementById('score');
const comboSpan = document.getElementById('combo');
const endGameBtn = document.getElementById('endGameBtn');
const backToDifficultyBtn = document.getElementById('backToDifficultyBtn');
const finalScore = document.getElementById('finalScore');
const earnedXP = document.getElementById('earnedXP');
const earnedCoins = document.getElementById('earnedCoins');
const levelUpNotification = document.getElementById('levelUpNotification');
const newLevelSpan = document.getElementById('newLevel');
const closeLevelUp = document.getElementById('closeLevelUp');
const taskClearNotification = document.getElementById('taskClearNotification');
const taskClearMessage = document.getElementById('taskClearMessage');
const closeTaskClear = document.getElementById('closeTaskClear');

// プロフィール要素
const profileName = document.getElementById('profileName');
const friendCode = document.getElementById('friendCode');
const newNameInput = document.getElementById('newName');
const changeNameBtn = document.getElementById('changeNameBtn');
const remainingChanges = document.getElementById('remainingChanges');
const profileLevel = document.getElementById('profileLevel');
const profileXP = document.getElementById('profileXP');
const profileCoins = document.getElementById('profileCoins');

// フレンド要素
const friendCodeInput = document.getElementById('friendCodeInput');
const sendRequestBtn = document.getElementById('sendRequestBtn');
const requestsList = document.getElementById('requestsList');
const friendsList = document.getElementById('friendsList');

// タスク要素
const dailyPlayProgress = document.getElementById('dailyPlayProgress');
const dailyScoreProgress = document.getElementById('dailyScoreProgress');
const dailyComboProgress = document.getElementById('dailyComboProgress');
const dailyScoreTarget = document.getElementById('dailyScoreTarget');
const dailyComboTarget = document.getElementById('dailyComboTarget');
const weeklyPlayProgress = document.getElementById('weeklyPlayProgress');
const weeklyScoreProgress = document.getElementById('weeklyScoreProgress');
const weeklyComboProgress = document.getElementById('weeklyComboProgress');
const weeklyScoreTarget = document.getElementById('weeklyScoreTarget');
const weeklyComboTarget = document.getElementById('weeklyComboTarget');
const claimDailyPlay = document.getElementById('claimDailyPlay');
const claimDailyScore = document.getElementById('claimDailyScore');
const claimDailyCombo = document.getElementById('claimDailyCombo');
const claimWeeklyPlay = document.getElementById('claimWeeklyPlay');
const claimWeeklyScore = document.getElementById('claimWeeklyScore');
const claimWeeklyCombo = document.getElementById('claimWeeklyCombo');

// モーダル
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

// タブ切り替え
const tabs = document.querySelectorAll('.tab');
const profileTab = document.getElementById('profileTab');
const friendTab = document.getElementById('friendTab');
const taskTabs = document.querySelectorAll('[data-task-tab]');
const dailyTasksDiv = document.getElementById('dailyTasks');
const weeklyTasksDiv = document.getElementById('weeklyTasks');

// ==================== ユーザー初期化 ====================
function initializeUser() {
    const userRef = database.ref('users/' + userId);
    userRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // 新規ユーザー
            const newName = '匿名' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
            const newFriendCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0') + 
                                 Math.random().toString(36).substr(2, 3).toUpperCase();
            
            const userData = {
                name: newName,
                friendCode: newFriendCode,
                nameChanges: 0,
                lastReset: new Date().toISOString(),
                level: 1,
                xp: 0,
                coins: 0,
                friends: {},
                friendRequests: {},
                online: true,
                dailyTasks: dailyTasks,
                weeklyTasks: weeklyTasks,
                lastTaskReset: new Date().toISOString()
            };
            
            userRef.set(userData);
            currentUser = userData;
        } else {
            currentUser = snapshot.val();
            // タスクデータがない場合の初期化
            if (!currentUser.dailyTasks) currentUser.dailyTasks = dailyTasks;
            if (!currentUser.weeklyTasks) currentUser.weeklyTasks = weeklyTasks;
        }
        
        checkResets();
        updateAllUI();
        
        // オンライン状態
        userRef.update({ online: true });
        userRef.onDisconnect().update({ online: false });
    });
}

// リセットチェック
function checkResets() {
    const now = new Date();
    
    // 名前変更リセット
    if (currentUser.lastReset) {
        const lastReset = new Date(currentUser.lastReset);
        if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            if (now.getHours() >= 7) {
                database.ref('users/' + userId).update({
                    nameChanges: 0,
                    lastReset: now.toISOString()
                });
                currentUser.nameChanges = 0;
            }
        }
    }
    
    // デイリータスクリセット（朝7時）
    if (currentUser.lastTaskReset) {
        const lastReset = new Date(currentUser.lastTaskReset);
        if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            if (now.getHours() >= 7) {
                resetDailyTasks();
            }
        }
    }
    
    // ウィークリータスクリセット（月曜朝7時）
    const lastWeekReset = currentUser.lastWeekReset ? new Date(currentUser.lastWeekReset) : new Date(0);
    if (now.getDay() === 1 && now.getHours() >= 7) { // 月曜日
        if (now.getTime() - lastWeekReset.getTime() > 7 * 24 * 60 * 60 * 1000) {
            resetWeeklyTasks();
        }
    }
}

// デイリータスクリセット
function resetDailyTasks() {
    dailyTasks = {
        playCount: { current: 0, target: 5, completed: false, claimed: false },
        score: { current: 0, target: Math.floor(Math.random() * (100000 - 5000 + 1) + 5000), completed: false, claimed: false },
        combo: { current: 0, target: Math.floor(Math.random() * (150 - 50 + 1) + 50), completed: false, claimed: false }
    };
    
    database.ref('users/' + userId).update({
        dailyTasks: dailyTasks,
        lastTaskReset: new Date().toISOString()
    });
    
    currentUser.dailyTasks = dailyTasks;
    updateTasksUI();
}

// ウィークリータスクリセット
function resetWeeklyTasks() {
    weeklyTasks = {
        playCount: { current: 0, target: 150, completed: false, claimed: false },
        score: { current: 0, target: Math.floor(Math.random() * (100000 - 5000 + 1) + 5000), completed: false, claimed: false },
        combo: { current: 0, target: Math.floor(Math.random() * (150 - 50 + 1) + 50), completed: false, claimed: false }
    };
    
    database.ref('users/' + userId).update({
        weeklyTasks: weeklyTasks,
        lastWeekReset: new Date().toISOString()
    });
    
    currentUser.weeklyTasks = weeklyTasks;
    updateTasksUI();
}

// ==================== UI更新 ====================
function updateAllUI() {
    if (!currentUser) return;
    
    // プロフィール
    profileName.textContent = currentUser.name;
    friendCode.textContent = currentUser.friendCode;
    const remaining = 3 - (currentUser.nameChanges || 0);
    remainingChanges.textContent = `残り${remaining}回（朝7時リセット）`;
    changeNameBtn.disabled = remaining <= 0;
    
    // レベル・コイン
    updateLevelAndCoinUI();
    
    // タスク
    if (currentUser.dailyTasks) {
        dailyTasks = currentUser.dailyTasks;
        weeklyTasks = currentUser.weeklyTasks;
        updateTasksUI();
    }
}

function updateLevelAndCoinUI() {
    const level = currentUser.level || 1;
    const xp = currentUser.xp || 0;
    const requiredXP = 100 * Math.pow(2, level - 1);
    const coins = currentUser.coins || 0;
    
    levelDisplay.textContent = `Lv.${level}`;
    coinAmount.textContent = coins;
    profileLevel.textContent = level;
    profileXP.textContent = `${xp}/${requiredXP}`;
    profileCoins.textContent = coins;
    
    const xpPercent = (xp / requiredXP) * 100;
    xpBar.style.width = `${Math.min(xpPercent, 100)}%`;
    xpText.textContent = `${xp}/${requiredXP} XP`;
}

function updateTasksUI() {
    // デイリー
    dailyPlayProgress.textContent = `${dailyTasks.playCount.current}/${dailyTasks.playCount.target}`;
    dailyScoreProgress.textContent = `${dailyTasks.score.current}/1`;
    dailyComboProgress.textContent = `${dailyTasks.combo.current}/1`;
    dailyScoreTarget.textContent = dailyTasks.score.target;
    dailyComboTarget.textContent = dailyTasks.combo.target;
    
    claimDailyPlay.disabled = !dailyTasks.playCount.completed || dailyTasks.playCount.claimed;
    claimDailyScore.disabled = !dailyTasks.score.completed || dailyTasks.score.claimed;
    claimDailyCombo.disabled = !dailyTasks.combo.completed || dailyTasks.combo.claimed;
    
    claimDailyPlay.textContent = dailyTasks.playCount.claimed ? '受取済み' : '受け取る';
    claimDailyScore.textContent = dailyTasks.score.claimed ? '受取済み' : '受け取る';
    claimDailyCombo.textContent = dailyTasks.combo.claimed ? '受取済み' : '受け取る';
    
    document.getElementById('dailyPlayCount').classList.toggle('completed', dailyTasks.playCount.completed);
    document.getElementById('dailyScore').classList.toggle('completed', dailyTasks.score.completed);
    document.getElementById('dailyCombo').classList.toggle('completed', dailyTasks.combo.completed);
    
    // ウィークリー
    weeklyPlayProgress.textContent = `${weeklyTasks.playCount.current}/${weeklyTasks.playCount.target}`;
    weeklyScoreProgress.textContent = `${weeklyTasks.score.current}/10`;
    weeklyComboProgress.textContent = `${weeklyTasks.combo.current}/10`;
    weeklyScoreTarget.textContent = weeklyTasks.score.target;
    weeklyComboTarget.textContent = weeklyTasks.combo.target;
    
    claimWeeklyPlay.disabled = !weeklyTasks.playCount.completed || weeklyTasks.playCount.claimed;
    claimWeeklyScore.disabled = !weeklyTasks.score.completed || weeklyTasks.score.claimed;
    claimWeeklyCombo.disabled = !weeklyTasks.combo.completed || weeklyTasks.combo.claimed;
    
    claimWeeklyPlay.textContent = weeklyTasks.playCount.claimed ? '受取済み' : '受け取る';
    claimWeeklyScore.textContent = weeklyTasks.score.claimed ? '受取済み' : '受け取る';
    claimWeeklyCombo.textContent = weeklyTasks.combo.claimed ? '受取済み' : '受け取る';
    
    document.getElementById('weeklyPlayCount').classList.toggle('completed', weeklyTasks.playCount.completed);
    document.getElementById('weeklyScore').classList.toggle('completed', weeklyTasks.score.completed);
    document.getElementById('weeklyCombo').classList.toggle('completed', weeklyTasks.combo.completed);
}

// ==================== レベルアップ ====================
function addXP(amount) {
    let xp = (currentUser.xp || 0) + amount;
    let level = currentUser.level || 1;
    let leveledUp = false;
    
    while (true) {
        const requiredXP = 100 * Math.pow(2, level - 1);
        if (xp >= requiredXP) {
            xp -= requiredXP;
            level++;
            leveledUp = true;
        } else {
            break;
        }
    }
    
    if (leveledUp) {
        newLevelSpan.textContent = level;
        levelUpNotification.classList.add('active');
    }
    
    currentUser.xp = xp;
    currentUser.level = level;
    
    database.ref('users/' + userId).update({
        xp: xp,
        level: level
    });
    
    updateLevelAndCoinUI();
}

function addCoins(amount) {
    currentUser.coins = (currentUser.coins || 0) + amount;
    
    database.ref('users/' + userId).update({
        coins: currentUser.coins
    });
    
    updateLevelAndCoinUI();
}

// ==================== ゲーム機能 ====================
playBtn.addEventListener('click', () => {
    difficultySelect.style.display = 'block';
    typingGame.style.display = 'none';
    resultScreen.style.display = 'none';
});

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const difficulty = e.target.dataset.difficulty;
        startGame(difficulty);
    });
});

function startGame(difficulty) {
    gameState.difficulty = difficulty;
    gameState.isPlaying = true;
    gameState.timeLeft = 60;
    gameState.score = 0;
    gameState.combo = 0;
    
    difficultySelect.style.display = 'none';
    typingGame.style.display = 'block';
    resultScreen.style.display = 'none';
    
    updateGameUI();
    nextWord();
    startTimer();
    
    typingInput.disabled = false;
    typingInput.focus();
}

function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        timerSpan.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function nextWord() {
    const words = gameState.words[gameState.difficulty];
    gameState.currentWord = words[Math.floor(Math.random() * words.length)];
    wordDisplay.textContent = gameState.currentWord;
    typingInput.value = '';
}

function updateGameUI() {
    scoreSpan.textContent = gameState.score;
    comboSpan.textContent = gameState.combo;
    timerSpan.textContent = gameState.timeLeft;
}

typingInput.addEventListener('input', (e) => {
    if (!gameState.isPlaying) return;
    
    const input = e.target.value;
    const currentWord = gameState.currentWord;
    
    if (input === currentWord) {
        // 正解
        gameState.score += 5 * (gameState.combo + 1);
        gameState.combo++;
        nextWord();
        updateGameUI();
    } else if (currentWord.startsWith(input)) {
        // 部分一致（何もしない）
        return;
    } else {
        // ミス
        gameState.combo = 0;
        updateGameUI();
    }
});

endGameBtn.addEventListener('click', endGame);

function endGame() {
    clearInterval(gameState.timer);
    gameState.isPlaying = false;
    
    // XPとコインの計算
    const xpEarned = Math.floor(gameState.score / 1000);
    const coinsEarned = Math.floor(gameState.score / 100);
    
    // タスク更新
    updateTasksAfterGame(gameState.score, gameState.combo);
    
    // 報酬付与
    addXP(xpEarned);
    addCoins(coinsEarned);
    
    // リザルト表示
    finalScore.textContent = gameState.score;
    earnedXP.textContent = xpEarned;
    earnedCoins.textContent = coinsEarned;
    
    typingGame.style.display = 'none';
    resultScreen.style.display = 'block';
}

function updateTasksAfterGame(score, maxCombo) {
    const updates = {};
    
    // プレイ回数
    dailyTasks.playCount.current++;
    weeklyTasks.playCount.current++;
    
    // スコア達成
    if (score >= dailyTasks.score.target) {
        dailyTasks.score.current = 1;
    }
    if (score >= weeklyTasks.score.target) {
        weeklyTasks.score.current = Math.min(weeklyTasks.score.current + 1, 10);
    }
    
    // コンボ達成
    if (maxCombo >= dailyTasks.combo.target) {
        dailyTasks.combo.current = 1;
    }
    if (maxCombo >= weeklyTasks.combo.target) {
        weeklyTasks.combo.current = Math.min(weeklyTasks.combo.current + 1, 10);
    }
    
    // 完了チェック
    dailyTasks.playCount.completed = dailyTasks.playCount.current >= dailyTasks.playCount.target;
    dailyTasks.score.completed = dailyTasks.score.current >= 1;
    dailyTasks.combo.completed = dailyTasks.combo.current >= 1;
    
    weeklyTasks.playCount.completed = weeklyTasks.playCount.current >= weeklyTasks.playCount.target;
    weeklyTasks.score.completed = weeklyTasks.score.current >= 10;
    weeklyTasks.combo.completed = weeklyTasks.combo.current >= 10;
    
    updates['dailyTasks'] = dailyTasks;
    updates['weeklyTasks'] = weeklyTasks;
    
    database.ref('users/' + userId).update(updates);
    currentUser.dailyTasks = dailyTasks;
    currentUser.weeklyTasks = weeklyTasks;
    
    updateTasksUI();
}

backToDifficultyBtn.addEventListener('click', () => {
    resultScreen.style.display = 'none';
    difficultySelect.style.display = 'block';
});

// ==================== タスク報酬受取 ====================
function claimTaskReward(taskType, taskName, coinReward, xpReward) {
    if (taskType === 'daily') {
        dailyTasks[taskName].claimed = true;
    } else {
        weeklyTasks[taskName].claimed = true;
    }
    
    addCoins(coinReward);
    addXP(xpReward);
    
    // 通知表示
    taskClearMessage.textContent = `${coinReward}コインと${xpReward}XP獲得！`;
    taskClearNotification.classList.add('active');
    
    database.ref('users/' + userId).update({
        dailyTasks: dailyTasks,
        weeklyTasks: weeklyTasks
    });
    
    updateTasksUI();
}

claimDailyPlay.addEventListener('click', () => claimTaskReward('daily', 'playCount', 3000, 500));
claimDailyScore.addEventListener('click', () => claimTaskReward('daily', 'score', 3000, 500));
claimDailyCombo.addEventListener('click', () => claimTaskReward('daily', 'combo', 3000, 500));
claimWeeklyPlay.addEventListener('click', () => claimTaskReward('weekly', 'playCount', 15000, 2000));
claimWeeklyScore.addEventListener('click', () => claimTaskReward('weekly', 'score', 15000, 2000));
claimWeeklyCombo.addEventListener('click', () => claimTaskReward('weekly', 'combo', 15000, 2000));

// ==================== 名前変更 ====================
changeNameBtn.addEventListener('click', () => {
    const newName = newNameInput.value.trim();
    if (!newName) return;
    
    const remaining = 3 - (currentUser.nameChanges || 0);
    if (remaining <= 0) {
        alert('本日の名前変更回数が上限に達しました');
        return;
    }
    
    database.ref('users/' + userId).update({
        name: newName,
        nameChanges: (currentUser.nameChanges || 0) + 1
    }).then(() => {
        currentUser.name = newName;
        currentUser.nameChanges = (currentUser.nameChanges || 0) + 1;
        updateAllUI();
        newNameInput.value = '';
    });
});

// ==================== フレンド機能 ====================
sendRequestBtn.addEventListener('click', () => {
    const targetCode = friendCodeInput.value.trim().toUpperCase();
    if (!targetCode) return;
    
    if (targetCode === currentUser.friendCode) {
        alert('自分のコードには申請できません');
        return;
    }
    
    database.ref('users').orderByChild('friendCode').equalTo(targetCode).once('value', (snapshot) => {
        let targetId = null;
        snapshot.forEach((childSnapshot) => {
            targetId = childSnapshot.key;
        });
        
        if (!targetId) {
            alert('該当するフレンドコードが見つかりません');
            return;
        }
        
        if (currentUser.friends && currentUser.friends[targetId]) {
            alert('既にフレンドです');
            return;
        }
        
        database.ref('users/' + targetId + '/friendRequests/' + userId).set({
            name: currentUser.name,
            friendCode: currentUser.friendCode,
            timestamp: Date.now()
        }).then(() => {
            alert('申請を送信しました');
            friendCodeInput.value = '';
        });
    });
});

function loadRequests() {
    database.ref('users/' + userId + '/friendRequests').on('value', (snapshot) => {
        const requests = snapshot.val() || {};
        if (Object.keys(requests).length === 0) {
            requestsList.innerHTML = '<p style="color: #888;">申請はありません</p>';
            return;
        }
        
        let html = '';
        for (let [reqId, req] of Object.entries(requests)) {
            html += `
                <div class="request-item" data-reqid="${reqId}">
                    <div class="request-name">${req.name}</div>
                    <div class="request-code">${req.friendCode}</div>
                    <div class="request-actions">
                        <button class="btn-small btn accept-request" data-id="${reqId}">許可</button>
                        <button class="btn-small delete-btn reject-request" data-id="${reqId}">拒否</button>
                    </div>
                </div>
            `;
        }
        requestsList.innerHTML = html;
        
        document.querySelectorAll('.accept-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.target.dataset.id;
                acceptFriend(reqId);
            });
        });
        
        document.querySelectorAll('.reject-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.target.dataset.id;
                rejectFriend(reqId);
            });
        });
    });
}

function loadFriends() {
    database.ref('users/' + userId + '/friends').on('value', async (snapshot) => {
        const friends = snapshot.val() || {};
        if (Object.keys(friends).length === 0) {
            friendsList.innerHTML = '<p style="color: #888;">フレンドはいません</p>';
            return;
        }
        
        let html = '';
        for (let [friendId, friendData] of Object.entries(friends)) {
            const onlineSnap = await database.ref('users/' + friendId + '/online').once('value');
            const online = onlineSnap.val() || false;
            
            html += `
                <div class="friend-item" data-friendid="${friendId}">
                    <div class="friend-name">
                        <span class="online-status ${online ? 'online' : 'offline'}"></span>
                        ${friendData.name}
                    </div>
                    <div class="friend-code-small">${friendData.friendCode}</div>
                    <button class="delete-btn delete-friend" data-id="${friendId}" data-name="${friendData.name}">フレンド削除</button>
                </div>
            `;
        }
        friendsList.innerHTML = html;
        
        document.querySelectorAll('.delete-friend').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendId = e.target.dataset.id;
                const friendName = e.target.dataset.name;
                showDeleteConfirm(friendId, friendName);
            });
        });
    });
}

function acceptFriend(reqId) {
    database.ref('users/' + reqId).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (!userData) return;
        
        const updates = {};
        updates['users/' + userId + '/friends/' + reqId] = {
            name: userData.name,
            friendCode: userData.friendCode
        };
        updates['users/' + reqId + '/friends/' + userId] = {
            name: currentUser.name,
            friendCode: currentUser.friendCode
        };
        updates['users/' + userId + '/friendRequests/' + reqId] = null;
        
        database.ref().update(updates);
    });
}

function rejectFriend(reqId) {
    database.ref('users/' + userId + '/friendRequests/' + reqId).remove();
}

function showDeleteConfirm(friendId, friendName) {
    modalContent.innerHTML = `
        <h3>フレンド削除</h3>
        <p>「${friendName}」をフレンドから削除しますか？</p>
        <div class="modal-buttons">
            <button class="btn" id="cancelDelete">キャンセル</button>
            <button class="btn delete-btn" id="confirmDelete">削除</button>
        </div>
    `;
    modal.classList.add('active');
    
    document.getElementById('cancelDelete').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.getElementById('confirmDelete').addEventListener('click', () => {
        const updates = {};
        updates['users/' + userId + '/friends/' + friendId] = null;
        updates['users/' + friendId + '/friends/' + userId] = null;
        database.ref().update(updates);
        modal.classList.remove('active');
    });
}

// ==================== タブ切り替え ====================
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.tab === 'profile') {
            profileTab.classList.add('active');
            friendTab.classList.remove('active');
        } else {
            profileTab.classList.remove('active');
            friendTab.classList.add('active');
        }
    });
});

taskTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        taskTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.taskTab === 'daily') {
            dailyTasksDiv.classList.add('active');
            weeklyTasksDiv.classList.remove('active');
        } else {
            dailyTasksDiv.classList.remove('active');
            weeklyTasksDiv.classList.add('active');
        }
    });
});

// ==================== パネル開閉 ====================
function openPanel(panel) {
    panel.classList.add('open');
    overlay.classList.add('active');
    gameArea.classList.add('blur');
}

function closeAllPanels() {
    sidePanel.classList.remove('open');
    taskPanel.classList.remove('open');
    overlay.classList.remove('active');
    gameArea.classList.remove('blur');
}

friendIcon.addEventListener('click', () => {
    closeAllPanels();
    openPanel(sidePanel);
});

taskIcon.addEventListener('click', () => {
    closeAllPanels();
    openPanel(taskPanel);
});

closePanel.addEventListener('click', closeAllPanels);
closeTaskPanel.addEventListener('click', closeAllPanels);
overlay.addEventListener('click', closeAllPanels);

// 通知閉じる
closeLevelUp.addEventListener('click', () => {
    levelUpNotification.classList.remove('active');
});

closeTaskClear.addEventListener('click', () => {
    taskClearNotification.classList.remove('active');
});

// ==================== 初期化 ====================
initializeUser();
loadRequests();
loadFriends();

// 定期オンライン更新
setInterval(() => {
    database.ref('users/' + userId).update({ online: true });
}, 30000);
