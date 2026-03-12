// ==================== Firebase 初期化 ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

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

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// ==================== ユーティリティ関数 ====================

/**
 * ランダムな数字を生成
 */
function generateRandomNumbers(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10).toString();
    }
    return result;
}

/**
 * ランダムな英数字を生成
 */
function generateRandomLetters(length) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
}

/**
 * フレンドコードを生成（数字8桁+英字3桁）
 */
function generateFriendCode() {
    return generateRandomNumbers(8) + generateRandomLetters(3);
}

/**
 * 一意なフレンドコードを生成
 */
async function generateUniqueFriendCode(maxAttempts = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const friendCode = generateFriendCode();
        const usersRef = ref(database, 'users');
        
        try {
            const snapshot = await get(usersRef);
            let isUnique = true;
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    if (childSnapshot.val().friendCode === friendCode) {
                        isUnique = false;
                    }
                });
            }
            
            if (isUnique) {
                return friendCode;
            }
        } catch (error) {
            console.error('Error checking friend code uniqueness:', error);
        }
    }
    
    // フォールバック: タイムスタンプを追加
    return generateFriendCode() + Date.now().toString().slice(-3);
}

/**
 * ブラウザ固有のIDを生成
 */
function generateBrowserSpecificId() {
    const userAgent = navigator.userAgent;
    const screen = window.screen.width + 'x' + window.screen.height;
    const timezone = new Date().getTimezoneOffset();
    const language = navigator.language;
    
    // シンプルなハッシュ関数
    let hash = 0;
    const str = userAgent + screen + timezone + language;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 12);
}

/**
 * ステータスメッセージを表示
 */
function showStatusMessage(message, type = 'success', duration = 3000) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message show ${type}`;
    
    if (duration) {
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, duration);
    }
}

/**
 * UIを更新
 */
function updateUI(userName, friendCode, nameChangesLeft) {
    document.getElementById('nameDisplay').textContent = userName;
    document.getElementById('friendCode').textContent = friendCode;
    
    const changesUsed = 5 - nameChangesLeft;
    document.getElementById('changeNameInfo').textContent = 
        `※本日の変更回数: ${changesUsed}/5 回`;
}

// ==================== 初期化とユーザー認証 ====================

let currentUser = null;
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
    } else {
        // 匿名ログイン
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error('Authentication error:', error);
        }
    }
});

/**
 * ユーザーデータを読み込み
 */
async function loadUserData() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            currentUserData = snapshot.val();
        } else {
            // 新規ユーザー作成
            const browserSpecificId = generateBrowserSpecificId();
            const randomNumbers = generateRandomNumbers(6);
            const anonymousName = `匿名 (${browserSpecificId.substring(0, 6).toUpperCase()}${randomNumbers})`;
            const friendCode = await generateUniqueFriendCode();
            
            const today = new Date().toISOString().split('T')[0];
            
            currentUserData = {
                uid: currentUser.uid,
                name: anonymousName,
                friendCode: friendCode,
                nameChanges: 0,
                lastNameChangeDate: today,
                createdAt: new Date().toISOString(),
                online: true,
                lastSeen: new Date().toISOString()
            };

            await set(userRef, currentUserData);
        }

        // 日付が変わった場合はカウンターをリセット
        const today = new Date().toISOString().split('T')[0];
        if (currentUserData.lastNameChangeDate !== today) {
            const userRef = ref(database, `users/${currentUser.uid}`);
            await update(userRef, {
                nameChanges: 0,
                lastNameChangeDate: today
            });
            currentUserData.nameChanges = 0;
            currentUserData.lastNameChangeDate = today;
        }

        const nameChangesLeft = 5 - (currentUserData.nameChanges || 0);
        updateUI(currentUserData.name, currentUserData.friendCode, nameChangesLeft);
        loadFriendRequests();
        loadFriendsList();
    } catch (error) {
        console.error('Error loading user data:', error);
        showStatusMessage('ユーザーデータの読み込みに失敗しました', 'error');
    }
}

// ==================== UI イベント ====================

const friendBtn = document.getElementById('friendBtn');
const overlay = document.getElementById('overlay');
const sidePanel = document.getElementById('sidePanel');
const closePanel = document.getElementById('closePanel');

// パネルを開く
friendBtn.addEventListener('click', () => {
    sidePanel.classList.add('active');
    overlay.classList.add('active');
});

// パネルを閉じる
closePanel.addEventListener('click', closeSidePanel);
overlay.addEventListener('click', closeSidePanel);

function closeSidePanel() {
    sidePanel.classList.remove('active');
    overlay.classList.remove('active');
}

// ==================== タブ切り替え ====================

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // タブボタンのアクティブ状態を更新
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // タブコンテンツのアクティブ状態を更新
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// ==================== プロフィール管理 ====================

const changeNameBtn = document.getElementById('changeName');
const nameChangeModal = document.getElementById('nameChangeModal');
const newNameInput = document.getElementById('newNameInput');
const confirmNameChangeBtn = document.getElementById('confirmNameChange');
const cancelNameChangeBtn = document.getElementById('cancelNameChange');
const charCountElement = document.getElementById('charCount');

changeNameBtn.addEventListener('click', () => {
    const nameChangesUsed = currentUserData.nameChanges || 0;
    if (nameChangesUsed >= 5) {
        showStatusMessage('本日の名前変更回数の上限に達しました', 'warning', 5000);
        return;
    }
    
    // モーダルをリセット
    newNameInput.value = '';
    charCountElement.textContent = '0';
    
    nameChangeModal.classList.add('active');
    newNameInput.focus();
});

cancelNameChangeBtn.addEventListener('click', () => {
    nameChangeModal.classList.remove('active');
    newNameInput.value = '';
    charCountElement.textContent = '0';
});

newNameInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    charCountElement.textContent = length;
});

confirmNameChangeBtn.addEventListener('click', async () => {
    const newName = newNameInput.value.trim();
    
    if (!newName) {
        showStatusMessage('名前を入力してください', 'warning');
        return;
    }

    if (newName.length > 20) {
        showStatusMessage('名前は20文字以内にしてください', 'warning');
        return;
    }

    const nameChangesUsed = currentUserData.nameChanges || 0;
    if (nameChangesUsed >= 5) {
        showStatusMessage('本日の名前変更回数の上限に達しました', 'warning', 5000);
        nameChangeModal.classList.remove('active');
        return;
    }

    try {
        // データベースに更新
        const userRef = ref(database, `users/${currentUser.uid}`);
        const newChangesCount = nameChangesUsed + 1;
        
        await update(userRef, {
            name: newName,
            nameChanges: newChangesCount
        });

        currentUserData.name = newName;
        currentUserData.nameChanges = newChangesCount;

        const nameChangesLeft = 5 - newChangesCount;
        updateUI(currentUserData.name, currentUserData.friendCode, nameChangesLeft);
        
        showStatusMessage(`名前を変更しました（残り: ${nameChangesLeft}回）`, 'success');
        
        // モーダルをリセットして閉じる
        nameChangeModal.classList.remove('active');
        newNameInput.value = '';
        charCountElement.textContent = '0';
        
        // フレンドリストのユーザー名も更新
        updateFriendsWithNewName(newName);
    } catch (error) {
        console.error('Error changing name:', error);
        showStatusMessage('名前の変更に失敗しました', 'error');
    }
});

/**
 * フレンドリストのユーザー名を更新
 */
async function updateFriendsWithNewName(newName) {
    try {
        const friendsRef = ref(database, `friends/${currentUser.uid}`);
        const snapshot = await get(friendsRef);
        
        if (snapshot.exists()) {
            const friends = snapshot.val();
            Object.keys(friends).forEach(friendId => {
                // 相手のフレンドリストにも自分の新しい名前を反映
                const theirFriendRef = ref(database, `friends/${friendId}/${currentUser.uid}`);
                update(theirFriendRef, {
                    name: newName
                }).catch(error => console.error('Error updating friend name:', error));
            });
        }
    } catch (error) {
        console.error('Error updating friends with new name:', error);
    }
}

// ==================== フレンドコード管理 ====================

const copyFriendCodeBtn = document.getElementById('copyFriendCode');

copyFriendCodeBtn.addEventListener('click', () => {
    const friendCode = document.getElementById('friendCode').textContent;
    navigator.clipboard.writeText(friendCode).then(() => {
        showStatusMessage('フレンドコードをコピーしました', 'success');
    }).catch(() => {
        showStatusMessage('コピーに失敗しました', 'error');
    });
});

// ==================== フレンド申請 ====================

const friendCodeInput = document.getElementById('friendCodeInput');
const sendFriendRequestBtn = document.getElementById('sendFriendRequest');

sendFriendRequestBtn.addEventListener('click', async () => {
    const targetFriendCode = friendCodeInput.value.trim().toUpperCase();

    if (!targetFriendCode) {
        showStatusMessage('フレンドコードを入力してください', 'warning');
        return;
    }

    if (targetFriendCode.length !== 11) {
        showStatusMessage('フレンドコードは11文字です', 'warning');
        return;
    }

    try {
        // フレンドコードからユーザーIDを検索
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            showStatusMessage('ユーザーが見つかりません', 'error');
            return;
        }

        let targetUserId = null;
        let targetUserData = null;
        
        snapshot.forEach(childSnapshot => {
            if (childSnapshot.val().friendCode === targetFriendCode) {
                targetUserId = childSnapshot.key;
                targetUserData = childSnapshot.val();
            }
        });

        if (!targetUserId) {
            showStatusMessage('フレンドコードが見つかりません', 'error');
            return;
        }

        if (targetUserId === currentUser.uid) {
            showStatusMessage('自分自身をフレンドに追加できません', 'warning');
            return;
        }

        // 既にフレンドかチェック
        const friendsRef = ref(database, `friends/${currentUser.uid}/${targetUserId}`);
        const friendSnapshot = await get(friendsRef);
        if (friendSnapshot.exists()) {
            showStatusMessage('既にこのユーザーはフレンドです', 'warning');
            return;
        }

        // 既にフレンド申請済みかチェック
        const existingRequestRef = ref(database, `friendRequests/${targetUserId}`);
        const existingSnapshot = await get(existingRequestRef);
        
        if (existingSnapshot.exists()) {
            const requests = existingSnapshot.val();
            for (const requestId in requests) {
                if (requests[requestId].fromUserId === currentUser.uid && requests[requestId].status === 'pending') {
                    showStatusMessage('既にこのユーザーに申請済みです', 'warning');
                    return;
                }
            }
        }

        // フレンド申請を送信
        const requestId = `${currentUser.uid}_${Date.now()}`;
        const requestRef = ref(database, `friendRequests/${targetUserId}/${requestId}`);

        await set(requestRef, {
            fromUserId: currentUser.uid,
            fromUserName: currentUserData.name,
            fromUserCode: currentUserData.friendCode,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });

        showStatusMessage('フレンド申請を送信しました', 'success');
        friendCodeInput.value = '';
    } catch (error) {
        console.error('Error sending friend request:', error);
        showStatusMessage('フレンド申請の送信に失敗しました', 'error');
    }
});

// ==================== フレンド申請受け取り ====================

/**
 * フレンド申請を読み込み
 */
function loadFriendRequests() {
    const requestsRef = ref(database, `friendRequests/${currentUser.uid}`);
    
    onValue(requestsRef, (snapshot) => {
        const requestsList = document.getElementById('friendRequestsList');
        requestsList.innerHTML = '';

        if (!snapshot.exists()) {
            requestsList.innerHTML = '<p class="empty-message">申請はありません</p>';
            return;
        }

        const requests = snapshot.val();
        let pendingCount = 0;
        
        Object.keys(requests).forEach(requestId => {
            const request = requests[requestId];
            if (request.status === 'pending') {
                pendingCount++;
                const requestElement = createFriendRequestElement(requestId, request);
                requestsList.appendChild(requestElement);
            }
        });

        if (pendingCount === 0) {
            requestsList.innerHTML = '<p class="empty-message">申請はありません</p>';
        }
    });
}

/**
 * フレンド申請要素を作成
 */
function createFriendRequestElement(requestId, request) {
    const div = document.createElement('div');
    div.className = 'friend-request-item';
    
    const info = document.createElement('div');
    info.className = 'friend-info';
    
    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = request.fromUserName;
    
    const code = document.createElement('div');
    code.className = 'friend-code';
    code.textContent = request.fromUserCode;
    
    info.appendChild(name);
    info.appendChild(code);
    
    const actions = document.createElement('div');
    actions.className = 'friend-actions';
    
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'friend-btn-small friend-btn-accept';
    acceptBtn.textContent = '承認';
    acceptBtn.addEventListener('click', () => acceptFriendRequest(requestId, request.fromUserId, request));
    
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'friend-btn-small friend-btn-reject';
    rejectBtn.textContent = '拒否';
    rejectBtn.addEventListener('click', () => rejectFriendRequest(requestId));
    
    actions.appendChild(acceptBtn);
    actions.appendChild(rejectBtn);
    
    div.appendChild(info);
    div.appendChild(actions);
    
    return div;
}

/**
 * フレンド申請を承認
 */
async function acceptFriendRequest(requestId, fromUserId, request) {
    try {
        // リクエストのステータスを更新
        const requestRef = ref(database, `friendRequests/${currentUser.uid}/${requestId}`);
        await update(requestRef, { status: 'accepted' });

        // 相手にフレンドを追加
        const targetUserFriendsRef = ref(database, `friends/${fromUserId}/${currentUser.uid}`);
        await set(targetUserFriendsRef, {
            uid: currentUser.uid,
            name: currentUserData.name,
            friendCode: currentUserData.friendCode,
            addedAt: new Date().toISOString(),
            online: currentUserData.online || true
        });

        // 自分にフレンドを追加
        const myFriendsRef = ref(database, `friends/${currentUser.uid}/${fromUserId}`);
        await set(myFriendsRef, {
            uid: fromUserId,
            name: request.fromUserName,
            friendCode: request.fromUserCode,
            addedAt: new Date().toISOString(),
            online: true
        });

        showStatusMessage('フレンド申請を承認しました', 'success');
        loadFriendRequests();
        loadFriendsList();
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showStatusMessage('承認に失敗しました', 'error');
    }
}

/**
 * フレンド申請を拒否
 */
async function rejectFriendRequest(requestId) {
    try {
        const requestRef = ref(database, `friendRequests/${currentUser.uid}/${requestId}`);
        await remove(requestRef);
        showStatusMessage('フレンド申請を拒否しました', 'success');
        loadFriendRequests();
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showStatusMessage('拒否に失敗しました', 'error');
    }
}

// ==================== フレンドリスト ====================

/**
 * フレンドリストを読み込み
 */
function loadFriendsList() {
    const friendsRef = ref(database, `friends/${currentUser.uid}`);
    
    onValue(friendsRef, (snapshot) => {
        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';

        if (!snapshot.exists()) {
            friendsList.innerHTML = '<p class="empty-message">フレンドがいません</p>';
            return;
        }

        const friends = snapshot.val();
        Object.keys(friends).forEach(friendId => {
            const friend = friends[friendId];
            const friendElement = createFriendElement(friendId, friend);
            friendsList.appendChild(friendElement);
        });
    });
}

/**
 * フレンド���素を作成
 */
function createFriendElement(friendId, friend) {
    const div = document.createElement('div');
    div.className = 'friend-item';
    
    const info = document.createElement('div');
    info.className = 'friend-info';
    
    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = friend.name;
    
    const code = document.createElement('div');
    code.className = 'friend-code';
    code.textContent = friend.friendCode;
    
    info.appendChild(name);
    info.appendChild(code);
    
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.alignItems = 'center';
    statusContainer.style.gap = '8px';
    
    const status = document.createElement('div');
    status.className = 'friend-status';
    
    const indicator = document.createElement('div');
    indicator.className = `status-indicator ${friend.online ? 'online' : 'offline'}`;
    
    const statusText = document.createElement('span');
    statusText.textContent = friend.online ? 'オンライン' : 'オフライン';
    
    status.appendChild(indicator);
    status.appendChild(statusText);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'friend-btn-small btn-danger';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => showDeleteConfirmModal(friendId, friend.name));
    
    statusContainer.appendChild(status);
    
    div.appendChild(info);
    div.appendChild(statusContainer);
    div.appendChild(deleteBtn);
    
    return div;
}

// ==================== フレンド削除 ====================

const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');

let friendToDelete = null;

function showDeleteConfirmModal(friendId, friendName) {
    friendToDelete = friendId;
    deleteConfirmModal.classList.add('active');
    deleteConfirmModal.querySelector('p').textContent = `本当に${friendName}を削除しますか？`;
}

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('active');
    friendToDelete = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!friendToDelete) return;

    try {
        // 自分のフレンドリストから削除
        const myFriendRef = ref(database, `friends/${currentUser.uid}/${friendToDelete}`);
        await remove(myFriendRef);

        // 相手のフレンドリストからも削除
        const theirFriendRef = ref(database, `friends/${friendToDelete}/${currentUser.uid}`);
        await remove(theirFriendRef);

        showStatusMessage('フレンドを削除しました', 'success');
        deleteConfirmModal.classList.remove('active');
        friendToDelete = null;
        loadFriendsList();
    } catch (error) {
        console.error('Error deleting friend:', error);
        showStatusMessage('削除に失敗しました', 'error');
    }
});

// ==================== オンラインステータス管理 ====================

/**
 * ユーザーのオンラインステータスを更新
 */
function updateUserOnlineStatus(online) {
    if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        update(userRef, {
            online: online,
            lastSeen: new Date().toISOString()
        }).catch(error => console.error('Error updating online status:', error));
    }
}

// ページを離れるときはオフラインに
window.addEventListener('beforeunload', () => {
    updateUserOnlineStatus(false);
});

// ページが見える場合はオンラインに
document.addEventListener('visibilitychange', () => {
    updateUserOnlineStatus(!document.hidden);
});

// 初期状態をオンラインに
updateUserOnlineStatus(true);
