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

// ユーザーID (簡易的にローカルストレージで固定)
let userId = localStorage.getItem('typingGameUserId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('typingGameUserId', userId);
}

// 状態管理
let currentUser = null;

// DOM要素
const gameArea = document.getElementById('gameArea');
const friendIcon = document.getElementById('friendIcon');
const sidePanel = document.getElementById('sidePanel');
const overlay = document.getElementById('overlay');
const closePanel = document.getElementById('closePanel');
const tabs = document.querySelectorAll('.tab');
const profileTab = document.getElementById('profileTab');
const friendTab = document.getElementById('friendTab');
const profileName = document.getElementById('profileName');
const friendCode = document.getElementById('friendCode');
const newNameInput = document.getElementById('newName');
const changeNameBtn = document.getElementById('changeNameBtn');
const remainingChanges = document.getElementById('remainingChanges');
const friendCodeInput = document.getElementById('friendCodeInput');
const sendRequestBtn = document.getElementById('sendRequestBtn');
const requestsList = document.getElementById('requestsList');
const friendsList = document.getElementById('friendsList');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

// ユーザー作成または取得
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
                friends: {},
                friendRequests: {},
                online: true
            };
            
            userRef.set(userData);
            currentUser = userData;
            updateProfileUI();
        } else {
            currentUser = snapshot.val();
            checkNameReset();
            updateProfileUI();
        }
        
        // オンライン状態の管理
        userRef.update({ online: true });
        userRef.onDisconnect().update({ online: false });
    });
}

// 名前変更リセットチェック
function checkNameReset() {
    if (currentUser.lastReset) {
        const lastReset = new Date(currentUser.lastReset);
        const now = new Date();
        const resetHour = 7; // 朝7時リセット
        
        if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            if (now.getHours() >= resetHour) {
                // リセット
                database.ref('users/' + userId).update({
                    nameChanges: 0,
                    lastReset: now.toISOString()
                });
                currentUser.nameChanges = 0;
            }
        }
    }
}

// UI更新
function updateProfileUI() {
    if (currentUser) {
        profileName.textContent = currentUser.name;
        friendCode.textContent = currentUser.friendCode;
        const remaining = 3 - (currentUser.nameChanges || 0);
        remainingChanges.textContent = `残り${remaining}回（朝7時リセット）`;
        changeNameBtn.disabled = remaining <= 0;
    }
}

// 名前変更
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
        updateProfileUI();
        newNameInput.value = '';
    });
});

// フレンド申請送信
sendRequestBtn.addEventListener('click', () => {
    const targetCode = friendCodeInput.value.trim().toUpperCase();
    if (!targetCode) return;
    
    // 自分のコードでないか確認
    if (targetCode === currentUser.friendCode) {
        alert('自分のコードには申請できません');
        return;
    }
    
    // 相手を検索
    database.ref('users').orderByChild('friendCode').equalTo(targetCode).once('value', (snapshot) => {
        let targetId = null;
        snapshot.forEach((childSnapshot) => {
            targetId = childSnapshot.key;
        });
        
        if (!targetId) {
            alert('該当するフレンドコードが見つかりません');
            return;
        }
        
        // 既にフレンドかチェック
        if (currentUser.friends && currentUser.friends[targetId]) {
            alert('既にフレンドです');
            return;
        }
        
        // 申請送信
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

// 申請リスト表示
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
        
        // 許可ボタン
        document.querySelectorAll('.accept-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.target.dataset.id;
                acceptFriend(reqId);
            });
        });
        
        // 拒否ボタン
        document.querySelectorAll('.reject-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reqId = e.target.dataset.id;
                rejectFriend(reqId);
            });
        });
    });
}

// フレンドリスト表示
function loadFriends() {
    database.ref('users/' + userId + '/friends').on('value', async (snapshot) => {
        const friends = snapshot.val() || {};
        if (Object.keys(friends).length === 0) {
            friendsList.innerHTML = '<p style="color: #888;">フレンドはいません</p>';
            return;
        }
        
        let html = '';
        for (let [friendId, friendData] of Object.entries(friends)) {
            // オンライン状態取得
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
        
        // 削除ボタン
        document.querySelectorAll('.delete-friend').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendId = e.target.dataset.id;
                const friendName = e.target.dataset.name;
                showDeleteConfirm(friendId, friendName);
            });
        });
    });
}

// フレンド許可
function acceptFriend(reqId) {
    database.ref('users/' + reqId).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (!userData) return;
        
        // 相互にフレンド追加
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

// フレンド拒否
function rejectFriend(reqId) {
    database.ref('users/' + userId + '/friendRequests/' + reqId).remove();
}

// 削除確認モーダル
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
        // 相互に削除
        const updates = {};
        updates['users/' + userId + '/friends/' + friendId] = null;
        updates['users/' + friendId + '/friends/' + userId] = null;
        database.ref().update(updates);
        modal.classList.remove('active');
    });
}

// タブ切り替え
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

// パネル開閉
function openPanel() {
    sidePanel.classList.add('open');
    overlay.classList.add('active');
    gameArea.classList.add('blur');
}

function closePanelFunc() {
    sidePanel.classList.remove('open');
    overlay.classList.remove('active');
    gameArea.classList.remove('blur');
}

friendIcon.addEventListener('click', openPanel);
closePanel.addEventListener('click', closePanelFunc);
overlay.addEventListener('click', closePanelFunc);

// 初期化
initializeUser();
loadRequests();
loadFriends();

// 定期的にオンライン状態更新
setInterval(() => {
    database.ref('users/' + userId).update({ online: true });
}, 30000);
