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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// ==================== ランダム生成関数 ====================

/**
 * 暗号的に強いランダムな数字を生成
 */
function generateCryptoRandomNumbers(length) {
    let result = '';
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += String(array[i] % 10);
        }
    } else {
        // フォールバック
        for (let i = 0; i < length; i++) {
            result += String(Math.floor(Math.random() * 10));
        }
    }
    return result;
}

/**
 * 暗号的に強いランダムな英字を生成
 */
function generateCryptoRandomLetters(length) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    const array = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += letters.charAt(array[i] % 26);
        }
    } else {
        // フォールバック
        for (let i = 0; i < length; i++) {
            result += letters.charAt(Math.floor(Math.random() * 26));
        }
    }
    return result;
}

/**
 * 完全にランダムなフレンドコード生成
 */
function generateFriendCode() {
    const nums = generateCryptoRandomNumbers(8);
    const letters = generateCryptoRandomLetters(3);
    const code = nums + letters;
    console.log('Generated Friend Code:', code);
    return code;
}

/**
 * ブラウザ・デバイス固有のハッシュを生成
 */
function generateBrowserHash() {
    const components = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 'unknown',
        vendor: navigator.vendor,
        platform: navigator.platform,
        plugins: Array.from(navigator.plugins).map(p => p.name).join('|'),
        doNotTrack: navigator.doNotTrack
    };
    
    console.log('Browser Components:', components);
    
    let hashInput = JSON.stringify(components);
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & 0xffffffff;
    }
    
    // ハッシュを英字に変換
    const hashStr = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
    console.log('Browser Hash:', hashStr);
    
    return hashStr;
}

/**
 * ブラウザ固有の匿名ユーザー名を生成
 */
function generateAnonymousName() {
    const browserHash = generateBrowserHash();
    const randomNums = generateCryptoRandomNumbers(6);
    const anonName = `匿名 (${browserHash}${randomNums})`;
    console.log('Generated Anonymous Name:', anonName);
    return anonName;
}

/**
 * 一意なフレンドコードをチェック
 */
async function generateUniqueFriendCode(maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const friendCode = generateFriendCode();
        
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            
            let isUnique = true;
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    if (childSnapshot.val().friendCode === friendCode) {
                        console.warn('Duplicate friend code found, retrying...');
                        isUnique = false;
                    }
                });
            }
            
            if (isUnique) {
                console.log('Unique friend code generated:', friendCode);
                return friendCode;
            }
        } catch (error) {
            console.error('Error checking friend code:', error);
        }
    }
    
    console.warn('Could not generate unique code after max attempts, using timestamp fallback');
    return generateFriendCode() + Date.now().toString().slice(-3);
}

// ==================== UI ユーティリティ ====================

/**
 * ステータスメッセージを表示
 */
function showStatusMessage(message, type = 'success', duration = 3000) {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message show ${type}`;
    console.log(`[${type.toUpperCase()}]`, message);
    
    if (duration > 0) {
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, duration);
    }
}

/**
 * UIを更新
 */
function updateUI(userName, friendCode, nameChangesLeft) {
    const nameDisplay = document.getElementById('nameDisplay');
    const friendCodeDisplay = document.getElementById('friendCode');
    const changeNameInfo = document.getElementById('changeNameInfo');
    
    if (nameDisplay) nameDisplay.textContent = userName;
    if (friendCodeDisplay) friendCodeDisplay.textContent = friendCode;
    if (changeNameInfo) {
        const changesUsed = 5 - nameChangesLeft;
        changeNameInfo.textContent = `※本日の変更回数: ${changesUsed}/5 回`;
    }
    
    console.log('UI Updated:', { userName, friendCode, nameChangesLeft });
}

// ==================== グローバル状態 ====================

let currentUser = null;
let currentUserData = null;

// ==================== 認証処理 ====================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('User authenticated:', currentUser.uid);
        await loadUserData();
    } else {
        try {
            const result = await signInAnonymously(auth);
            console.log('Anonymous authentication successful');
        } catch (error) {
            console.error('Authentication error:', error);
        }
    }
});

/**
 * ユーザーデータを読み込み・作成
 */
async function loadUserData() {
    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            currentUserData = snapshot.val();
            console.log('Loaded existing user:', currentUserData);
        } else {
            // 新規ユーザー作成
            const anonymousName = generateAnonymousName();
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
            console.log('Created new user:', currentUserData);
        }

        // 日付チェック
        const today = new Date().toISOString().split('T')[0];
        if (currentUserData.lastNameChangeDate !== today) {
            await update(ref(database, `users/${currentUser.uid}`), {
                nameChanges: 0,
                lastNameChangeDate: today
            });
            currentUserData.nameChanges = 0;
            currentUserData.lastNameChangeDate = today;
            console.log('Reset name changes for new day');
        }

        const nameChangesLeft = 5 - (currentUserData.nameChanges || 0);
        updateUI(currentUserData.name, currentUserData.friendCode, nameChangesLeft);
        
        // フレンドデータ読み込み
        setTimeout(() => {
            loadFriendRequests();
            loadFriendsList();
        }, 300);

    } catch (error) {
        console.error('Error loading user data:', error);
        showStatusMessage('ユーザーデータ読み込みエラー', 'error');
    }
}

// ==================== UI イベント ====================

const friendBtn = document.getElementById('friendBtn');
const overlay = document.getElementById('overlay');
const sidePanel = document.getElementById('sidePanel');
const closePanel = document.getElementById('closePanel');

if (friendBtn) {
    friendBtn.addEventListener('click', () => {
        console.log('Friend button clicked');
        sidePanel.classList.add('active');
        overlay.classList.add('active');
    });
}

if (closePanel) {
    closePanel.addEventListener('click', closeSidePanel);
}

if (overlay) {
    overlay.addEventListener('click', closeSidePanel);
}

function closeSidePanel() {
    console.log('Closing side panel');
    sidePanel.classList.remove('active');
    overlay.classList.remove('active');
}

// ==================== タブ切り替え ====================

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        console.log('Tab clicked:', tabName);
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    });
});

// ==================== プロフィール・名前変更 ====================

const changeNameBtn = document.getElementById('changeName');
const nameChangeModal = document.getElementById('nameChangeModal');
const newNameInput = document.getElementById('newNameInput');
const confirmNameChangeBtn = document.getElementById('confirmNameChange');
const cancelNameChangeBtn = document.getElementById('cancelNameChange');
const charCountElement = document.getElementById('charCount');

if (changeNameBtn) {
    changeNameBtn.addEventListener('click', () => {
        console.log('Change name button clicked');
        if (!currentUserData) {
            showStatusMessage('ユーザーデータが読み込まれていません', 'error');
            return;
        }
        
        const nameChangesUsed = currentUserData.nameChanges || 0;
        console.log('Name changes used:', nameChangesUsed);
        
        if (nameChangesUsed >= 5) {
            showStatusMessage('本日の名前変更回数の上限に達しました', 'warning', 5000);
            return;
        }
        
        // モーダル内容をリセット
        if (newNameInput) {
            newNameInput.value = '';
        }
        if (charCountElement) {
            charCountElement.textContent = '0';
        }
        
        nameChangeModal.classList.add('active');
        if (newNameInput) {
            newNameInput.focus();
        }
    });
}

if (cancelNameChangeBtn) {
    cancelNameChangeBtn.addEventListener('click', () => {
        console.log('Cancel name change');
        nameChangeModal.classList.remove('active');
        if (newNameInput) newNameInput.value = '';
        if (charCountElement) charCountElement.textContent = '0';
    });
}

if (newNameInput) {
    newNameInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        if (charCountElement) {
            charCountElement.textContent = length;
        }
    });
}

if (confirmNameChangeBtn) {
    confirmNameChangeBtn.addEventListener('click', async () => {
        console.log('Confirm name change clicked');
        
        if (!currentUserData) {
            showStatusMessage('ユーザーデータが読み込まれていません', 'error');
            return;
        }
        
        const newName = newNameInput.value.trim();
        console.log('New name input:', newName);
        
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
            const userRef = ref(database, `users/${currentUser.uid}`);
            const newChangesCount = nameChangesUsed + 1;
            
            console.log('Updating name in database:', {
                newName: newName,
                newChangesCount: newChangesCount
            });
            
            // データベース更新
            await update(userRef, {
                name: newName,
                nameChanges: newChangesCount
            });

            // ローカル状態更新
            currentUserData.name = newName;
            currentUserData.nameChanges = newChangesCount;

            const nameChangesLeft = 5 - newChangesCount;
            updateUI(currentUserData.name, currentUserData.friendCode, nameChangesLeft);
            
            showStatusMessage(`名前を変更しました（残り: ${nameChangesLeft}回）`, 'success', 3000);
            
            // モーダルをクローズしてリセット
            nameChangeModal.classList.remove('active');
            if (newNameInput) newNameInput.value = '';
            if (charCountElement) charCountElement.textContent = '0';
            
            // フレンドリスト更新
            await updateFriendsWithNewName(newName);
            
        } catch (error) {
            console.error('Error changing name:', error);
            showStatusMessage('名前の変更に失敗しました: ' + error.message, 'error');
        }
    });
}

/**
 * フレンドリストのユーザー名を更新
 */
async function updateFriendsWithNewName(newName) {
    try {
        const friendsRef = ref(database, `friends/${currentUser.uid}`);
        const snapshot = await get(friendsRef);
        
        if (snapshot.exists()) {
            const friends = snapshot.val();
            const updatePromises = [];
            
            Object.keys(friends).forEach(friendId => {
                const theirFriendRef = ref(database, `friends/${friendId}/${currentUser.uid}`);
                updatePromises.push(
                    update(theirFriendRef, { name: newName })
                        .catch(err => console.error('Failed to update friend:', err))
                );
            });
            
            await Promise.all(updatePromises);
            console.log('Updated name in all friend lists');
        }
    } catch (error) {
        console.error('Error updating friends with new name:', error);
    }
}

// ==================== フレンドコード管理 ====================

const copyFriendCodeBtn = document.getElementById('copyFriendCode');

if (copyFriendCodeBtn) {
    copyFriendCodeBtn.addEventListener('click', () => {
        const friendCode = document.getElementById('friendCode').textContent;
        navigator.clipboard.writeText(friendCode).then(() => {
            showStatusMessage('フレンドコードをコピーしました', 'success', 2000);
        }).catch(() => {
            showStatusMessage('コピーに失敗しました', 'error');
        });
    });
}

// ==================== フレンド申請送信 ====================

const friendCodeInput = document.getElementById('friendCodeInput');
const sendFriendRequestBtn = document.getElementById('sendFriendRequest');

if (sendFriendRequestBtn) {
    sendFriendRequestBtn.addEventListener('click', async () => {
        const targetFriendCode = friendCodeInput.value.trim().toUpperCase();
        console.log('Sending friend request for code:', targetFriendCode);

        if (!targetFriendCode) {
            showStatusMessage('フレンドコードを入力してください', 'warning');
            return;
        }

        if (targetFriendCode.length !== 11) {
            showStatusMessage('フレンドコードは11文字です', 'warning');
            return;
        }

        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (!snapshot.exists()) {
                showStatusMessage('ユーザーが見つかりません', 'error');
                return;
            }

            let targetUserId = null;
            snapshot.forEach(childSnapshot => {
                if (childSnapshot.val().friendCode === targetFriendCode) {
                    targetUserId = childSnapshot.key;
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

            // 申請済みかチェック
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

            // 申請を送信
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
}

// ==================== フレンド申請受け取り ====================

function loadFriendRequests() {
    if (!currentUser) return;
    
    const requestsRef = ref(database, `friendRequests/${currentUser.uid}`);
    
    onValue(requestsRef, (snapshot) => {
        const requestsList = document.getElementById('friendRequestsList');
        if (!requestsList) return;
        
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

async function acceptFriendRequest(requestId, fromUserId, request) {
    try {
        const requestRef = ref(database, `friendRequests/${currentUser.uid}/${requestId}`);
        await update(requestRef, { status: 'accepted' });

        const targetUserFriendsRef = ref(database, `friends/${fromUserId}/${currentUser.uid}`);
        await set(targetUserFriendsRef, {
            uid: currentUser.uid,
            name: currentUserData.name,
            friendCode: currentUserData.friendCode,
            addedAt: new Date().toISOString(),
            online: currentUserData.online || true
        });

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

function loadFriendsList() {
    if (!currentUser) return;
    
    const friendsRef = ref(database, `friends/${currentUser.uid}`);
    
    onValue(friendsRef, (snapshot) => {
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;
        
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
    if (deleteConfirmModal) {
        deleteConfirmModal.classList.add('active');
        const messageEl = deleteConfirmModal.querySelector('p');
        if (messageEl) messageEl.textContent = `本当に${friendName}を削除しますか？`;
    }
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
        friendToDelete = null;
    });
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!friendToDelete) return;

        try {
            const myFriendRef = ref(database, `friends/${currentUser.uid}/${friendToDelete}`);
            await remove(myFriendRef);

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
}

// ==================== オンラインステータス ====================

function updateUserOnlineStatus(online) {
    if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        update(userRef, {
            online: online,
            lastSeen: new Date().toISOString()
        }).catch(error => console.error('Error updating online status:', error));
    }
}

window.addEventListener('beforeunload', () => {
    updateUserOnlineStatus(false);
});

document.addEventListener('visibilitychange', () => {
    updateUserOnlineStatus(!document.hidden);
});

updateUserOnlineStatus(true);

console.log('Script loaded successfully');
