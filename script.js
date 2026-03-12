// DOM要素
const serviceEndScreen = document.getElementById('serviceEndScreen');
const levelDisplay = document.getElementById('levelDisplay');
const coinAmount = document.getElementById('coinAmount');
const xpBar = document.getElementById('xpBar');
const xpText = document.getElementById('xpText');
const profileName = document.getElementById('profileName');
const friendCode = document.getElementById('friendCode');
const profileLevel = document.getElementById('profileLevel');
const profileXP = document.getElementById('profileXP');
const profileCoins = document.getElementById('profileCoins');

// サービス終了表示
serviceEndScreen.style.display = 'flex';

// ダミーデータ表示
levelDisplay.textContent = 'Lv.--';
coinAmount.textContent = '0';
xpBar.style.width = '0%';
xpText.textContent = '0/0 XP';

profileName.textContent = 'サービス終了';
friendCode.textContent = '----';
profileLevel.textContent = '--';
profileXP.textContent = '--/--';
profileCoins.textContent = '0';

// ボタン類を無効化
document.querySelectorAll('button').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
});

// パネル開閉（実際には機能しないがエラー防止）
const friendIcon = document.getElementById('friendIcon');
const taskIcon = document.getElementById('taskIcon');
const sidePanel = document.getElementById('sidePanel');
const taskPanel = document.getElementById('taskPanel');
const overlay = document.getElementById('overlay');
const closePanel = document.getElementById('closePanel');
const closeTaskPanel = document.getElementById('closeTaskPanel');

function closeAllPanels() {
    sidePanel.classList.remove('open');
    taskPanel.classList.remove('open');
    overlay.classList.remove('active');
}

friendIcon.addEventListener('click', closeAllPanels);
taskIcon.addEventListener('click', closeAllPanels);
closePanel.addEventListener('click', closeAllPanels);
closeTaskPanel.addEventListener('click', closeAllPanels);
overlay.addEventListener('click', closeAllPanels);

// コンソールにメッセージ
console.log('サービス終了です。ばいばい。');
