// script.js (plain JS, no jQuery)
// Handles: side panel open/close, tab switching, name change modal, friend code copy, initial user data.

function generateAnonymousName() {
    const sessionRandom = Math.random().toString(36).substr(2, 5);
    const timestamp = Date.now().toString(36);
    const salt = localStorage.getItem('nameSalt') || 'salt';
    return `匿名-${sessionRandom}-${timestamp}-${salt}`;
}

function generateFriendCode() {
    // produce a short, readable friend code (11 chars, alphanumeric)
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const str = Array.from(array, b => ('0' + (b & 0xff).toString(36)).slice(-2)).join('');
    return str.replace(/[^a-z0-9]/g, '').substr(0, 11).toUpperCase();
}

// Simple status message helper
function showStatus(message, type = 'success', timeout = 3000) {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message;
    el.className = 'status-message show ' + (type || '');
    setTimeout(() => {
        el.classList.remove('show', 'success', 'error', 'warning');
        el.textContent = '';
    }, timeout);
}

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const friendBtn = document.getElementById('friendBtn');
    const overlay = document.getElementById('overlay');
    const sidePanel = document.getElementById('sidePanel');
    const closePanel = document.getElementById('closePanel');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const nameDisplay = document.getElementById('nameDisplay');
    const friendCodeEl = document.getElementById('friendCode');
    const copyFriendCodeBtn = document.getElementById('copyFriendCode');

    const changeNameBtn = document.getElementById('changeName');
    const nameChangeModal = document.getElementById('nameChangeModal');
    const cancelNameChange = document.getElementById('cancelNameChange');
    const confirmNameChange = document.getElementById('confirmNameChange');
    const newNameInput = document.getElementById('newNameInput');
    const charCount = document.getElementById('charCount');

    // Load or create user data
    let currentUserData = null;
    try {
        currentUserData = JSON.parse(localStorage.getItem('currentUserData') || 'null');
    } catch (e) {
        currentUserData = null;
    }
    if (!currentUserData) {
        currentUserData = {
            name: generateAnonymousName(),
            friendCode: generateFriendCode()
        };
        localStorage.setItem('currentUserData', JSON.stringify(currentUserData));
    }

    // Initialize UI
    function refreshUserUI() {
        if (nameDisplay) nameDisplay.textContent = currentUserData.name;
        if (friendCodeEl) friendCodeEl.textContent = currentUserData.friendCode;
    }
    refreshUserUI();

    // Side panel controls
    function openPanel(tab = 'profile') {
        overlay.classList.add('active');
        sidePanel.classList.add('active');
        setActiveTab(tab);
    }
    function closePanelFn() {
        overlay.classList.remove('active');
        sidePanel.classList.remove('active');
    }

    if (friendBtn) {
        friendBtn.addEventListener('click', () => {
            // toggle
            if (sidePanel.classList.contains('active')) {
                closePanelFn();
            } else {
                openPanel('profile');
            }
        });
    }
    if (overlay) overlay.addEventListener('click', closePanelFn);
    if (closePanel) closePanel.addEventListener('click', closePanelFn);

    // Tabs
    function setActiveTab(tabName) {
        tabButtons.forEach(btn => {
            const name = btn.getAttribute('data-tab');
            if (name === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) content.classList.add('active');
            else content.classList.remove('active');
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            setActiveTab(tab);
        });
    });

    // Name change modal
    function showNameModal() {
        nameChangeModal.classList.add('active');
        newNameInput.value = '';
        charCount.textContent = '0';
        newNameInput.focus();
    }
    function hideNameModal() {
        nameChangeModal.classList.remove('active');
    }

    if (changeNameBtn) changeNameBtn.addEventListener('click', showNameModal);
    if (cancelNameChange) cancelNameChange.addEventListener('click', hideNameModal);

    if (newNameInput) {
        newNameInput.addEventListener('input', () => {
            charCount.textContent = newNameInput.value.length;
        });
        newNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmNameChange && confirmNameChange.click();
            }
        });
    }

    if (confirmNameChange) {
        confirmNameChange.addEventListener('click', () => {
            const newName = (newNameInput.value || '').trim();
            if (!newName) {
                showStatus('名前を入力してください。', 'error');
                return;
            }
            if (newName.length > 20) {
                showStatus('名前は20文字以内で入力してください。', 'error');
                return;
            }
            currentUserData.name = newName;
            localStorage.setItem('currentUserData', JSON.stringify(currentUserData));
            refreshUserUI();
            hideNameModal();
            showStatus('ユーザー名を変更しました。', 'success');
        });
    }

    // Copy friend code
    if (copyFriendCodeBtn) {
        copyFriendCodeBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(currentUserData.friendCode);
                showStatus('フレンドコードをコピーしました。', 'success');
            } catch (e) {
                showStatus('コピーに失敗しました。', 'error');
            }
        });
    }

    // Basic friend request UI behavior (non-networked placeholder)
    const sendFriendRequestBtn = document.getElementById('sendFriendRequest');
    const friendCodeInput = document.getElementById('friendCodeInput');
    const friendRequestsList = document.getElementById('friendRequestsList');
    const friendsList = document.getElementById('friendsList');

    function addFriendRequestItem(code) {
        if (!friendRequestsList) return;
        const item = document.createElement('div');
        item.className = 'friend-request-item';
        item.innerHTML = `
            <div class="friend-info">
                <div class="friend-name">From: ${code}</div>
                <div class="friend-code">${code}</div>
            </div>
            <div class="friend-actions">
                <button class="friend-btn-small friend-btn-accept">承認</button>
                <button class="friend-btn-small friend-btn-reject">拒否</button>
            </div>
        `;
        friendRequestsList.querySelectorAll('.empty-message').forEach(n => n.remove());
        friendRequestsList.prepend(item);

        const accept = item.querySelector('.friend-btn-accept');
        const reject = item.querySelector('.friend-btn-reject');

        accept.addEventListener('click', () => {
            // move to friends list
            const fitem = document.createElement('div');
            fitem.className = 'friend-item';
            fitem.innerHTML = `
                <div class="friend-info">
                    <div class="friend-name">${code}</div>
                    <div class="friend-code">${code}</div>
                </div>
                <div class="friend-actions">
                    <button class="friend-btn-small friend-btn-delete">削除</button>
                </div>
            `;
            friendsList.querySelectorAll('.empty-message').forEach(n => n.remove());
            friendsList.prepend(fitem);
            item.remove();
            showStatus('フレンドを追加しました。', 'success');

            const del = fitem.querySelector('.friend-btn-delete');
            del.addEventListener('click', () => {
                // show simple confirm modal (use existing deleteConfirmModal if present)
                const deleteConfirmModal = document.getElementById('deleteConfirmModal');
                if (deleteConfirmModal) {
                    // toggle modal
                    deleteConfirmModal.classList.add('active');
                    const confirmDelete = document.getElementById('confirmDelete');
                    const cancelDelete = document.getElementById('cancelDelete');
                    const cleanup = () => {
                        deleteConfirmModal.classList.remove('active');
                        confirmDelete && confirmDelete.removeEventListener('click', onConfirm);
                        cancelDelete && cancelDelete.removeEventListener('click', onCancel);
                    };
                    const onConfirm = () => {
                        fitem.remove();
                        cleanup();
                        showStatus('フレンドを削除しました。', 'success');
                    };
                    const onCancel = () => cleanup();

                    confirmDelete && confirmDelete.addEventListener('click', onConfirm);
                    cancelDelete && cancelDelete.addEventListener('click', onCancel);
                } else {
                    // fallback
                    if (confirm('本当に削除しますか？')) {
                        fitem.remove();
                        showStatus('フレンドを削除しました。', 'success');
                    }
                }
            });
        });

        reject.addEventListener('click', () => {
            item.remove();
            showStatus('申請を拒否しました。', 'warning');
        });
    }

    if (sendFriendRequestBtn && friendCodeInput) {
        sendFriendRequestBtn.addEventListener('click', () => {
            const code = (friendCodeInput.value || '').trim();
            if (!code) {
                showStatus('フレンドコードを入力してください。', 'error');
                return;
            }
            addFriendRequestItem(code);
            friendCodeInput.value = '';
            showStatus('フレンド申請を送信しました（UI上のみ）。', 'success');
        });
    }
});
