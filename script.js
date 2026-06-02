const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const proposalScreen = document.getElementById('proposal-screen');
const gameWrap = document.getElementById('game-wrap');
const warpFlash = document.getElementById('warp-flash');

const scoreVal = document.getElementById('score-val');
const bestVal = document.getElementById('best-val');
const goScore = document.getElementById('go-score');
const goBest = document.getElementById('go-best');

// Game State
let isGameActive = false;
let isGameOver = false;
let score = 0;
let bestScore = localStorage.getItem('surprisewalk_best') || 0;
bestVal.innerText = bestScore;

let gameSpeed = 6;
let gameSpeedIncrement = 0.002;
let frames = 0;

// Resize Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- ENTITIES ---

const bgParallax = {
    starsX: 0,
    mountainsX: 0,
    groundX: 0,
    draw() {
        // Sky Gradient
        let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, '#1a103c');
        grd.addColorStop(1, '#05050b');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '#0d0614';
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
        
        // Ground Neon Line
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 100);
        ctx.lineTo(canvas.width, canvas.height - 100);
        ctx.stroke();

        // Moving ground grid
        this.groundX -= gameSpeed;
        if (this.groundX <= -40) this.groundX = 0;
        ctx.fillStyle = '#1a0c29';
        for (let i = 0; i < canvas.width / 40 + 2; i++) {
            if (i % 2 === 0) {
                ctx.fillRect(this.groundX + i * 40, canvas.height - 100, 40, 100);
            }
        }
    }
};

const player = {
    x: 50,
    y: 0,
    width: 40,
    height: 40,
    dy: 0,
    gravity: 0.8,
    jumpForce: -14,
    groundY: 0, // Hesaplanacak
    isJumping: false,

    update() {
        this.groundY = canvas.height - 100 - this.height;
        
        // Zıplama Fiziği
        this.y += this.dy;
        if (this.y < this.groundY) {
            this.dy += this.gravity;
            this.isJumping = true;
        } else {
            this.y = this.groundY;
            this.dy = 0;
            this.isJumping = false;
        }
    },

    jump() {
        if (!this.isJumping && isGameActive) {
            this.dy = this.jumpForce;
            this.isJumping = true;
        }
    },

    draw() {
        // Neon Küp
        ctx.fillStyle = '#00d2ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00d2ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // İç Parlama
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);
        ctx.shadowBlur = 0; // Reset
    }
};

let obstacles = [];
let obstacleTimer = 0;

function spawnObstacle() {
    let size = 40;
    obstacles.push({
        x: canvas.width,
        y: canvas.height - 100 - size,
        width: size,
        height: size
    });
}

// --- GAME LOOP ---

let animationId;
const SURVIVE_FRAMES = 60 * 15; // 15 saniye (60 fps)

function update() {
    if (!isGameActive) return;

    frames++;
    gameSpeed += gameSpeedIncrement;

    // Arka plan çiz
    bgParallax.draw();

    // Oyuncu
    player.update();
    player.draw();

    // Engeller
    obstacleTimer++;
    // Rasgele zaman aralığında engel oluştur (Hız arttıkça daha sık)
    let spawnRate = Math.max(40, 100 - Math.floor(gameSpeed * 2));
    if (obstacleTimer >= spawnRate) {
        if (Math.random() > 0.3) { // Biraz boşluk bırakma şansı
            spawnObstacle();
        }
        obstacleTimer = 0;
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Diken Çizimi (Kırmızı Üçgen)
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y); // Tepe
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height); // Sağ alt
        ctx.lineTo(obs.x, obs.y + obs.height); // Sol alt
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Çarpışma Kontrolü (Hitbox'ı biraz daraltıyoruz ki adil olsun)
        if (
            player.x < obs.x + obs.width - 10 &&
            player.x + player.width > obs.x + 10 &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y + 10
        ) {
            gameOver();
            return;
        }
    }

    // Ekrandan çıkan engelleri sil
    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

    // Skor
    if (frames % 5 === 0) {
        score++;
        scoreVal.innerText = score;
    }

    // 15 Saniye Sürpriz Kontrolü
    if (frames >= SURVIVE_FRAMES) {
        triggerSurprise();
        return;
    }

    animationId = requestAnimationFrame(update);
}

// --- CONTROLS ---

function handleJump(e) {
    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.target.tagName === 'BUTTON') return;
    
    // Sayfa kaymasını engelle
    if (e.type === 'keydown') e.preventDefault();

    player.jump();
}

window.addEventListener('keydown', handleJump);
window.addEventListener('touchstart', handleJump, {passive: false});
window.addEventListener('mousedown', handleJump);

// --- GAME STATE MANAGEMENT ---

function initGame() {
    isGameActive = true;
    isGameOver = false;
    score = 0;
    frames = 0;
    gameSpeed = 6;
    obstacles = [];
    obstacleTimer = 0;
    scoreVal.innerText = score;
    
    player.y = canvas.height - 100 - player.height;
    player.dy = 0;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');

    cancelAnimationFrame(animationId);
    update();
}

function gameOver() {
    isGameActive = false;
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('surprisewalk_best', bestScore);
        bestVal.innerText = bestScore;
    }

    goScore.innerText = score;
    goBest.innerText = bestScore;
    gameoverScreen.classList.remove('hidden');
}

document.getElementById('btn-start').addEventListener('click', initGame);
document.getElementById('btn-restart').addEventListener('click', initGame);

// Başlangıç çizimi (sabit)
bgParallax.draw();
player.y = canvas.height - 100 - player.height;
player.draw();

// --- SÜRPRİZ TEKLİF MANTIĞI ---

const loveMessages = [
    "Rabia...",
    "Hayatıma girdiğin günden beri her şey çok farklı...",
    "Gülüşün, bakışın, bana seslenişin...",
    "Seninle geçen her an, zamanın durmasını istediğim eşsiz bir büyüye dönüşüyor.",
    "Benim için sadece bir ihtimal değil, tek gerçeğimsin."
];

let msgIndex = 0;
const msgText = document.getElementById('msg-text');
const finalQ = document.getElementById('final-q');
const tapHint = document.getElementById('tap-hint');
const btnNo = document.getElementById('btn-no');
const btnYes = document.getElementById('btn-yes');

const funnyTexts = [
    "Olamazz! 😂", "Kabul etmelisin! 😤", "Beni seçemezsin! 🙅",
    "Sadece EVET! ❤️", "Yakalayamazsın! 🏃", "İmkansız! 🚫",
    "Hayır diyemezsin! 😏"
];

let dodgeInterval = null;
let hasStartedDodging = false;
let isTransitioning = false;

function triggerSurprise() {
    isGameActive = false;
    cancelAnimationFrame(animationId);

    // Rekoru kaydet
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('surprisewalk_best', bestScore);
        bestVal.innerText = bestScore;
    }

    // Beyaz parlama efekti
    warpFlash.classList.remove('hidden');
    
    setTimeout(() => {
        // Ekranları değiştir
        gameWrap.classList.add('hidden');
        proposalScreen.classList.remove('hidden');
        
        startProposalSequence();
    }, 600); // Parlamanın zirvesinde geçiş
}

function startProposalSequence() {
    createFloatingHearts();
    
    // Reset states
    msgIndex = 0;
    msgText.innerText = loveMessages[msgIndex];
    msgText.classList.remove('hidden');
    msgText.classList.remove('fade-out');
    tapHint.classList.remove('hidden');
    
    finalQ.classList.add('hidden');
    document.getElementById('success-msg').classList.add('hidden');

    // Reset No Button
    if (dodgeInterval) {
        clearInterval(dodgeInterval);
        dodgeInterval = null;
    }
    hasStartedDodging = false;

    const btnRow = document.getElementById('btn-row');
    if (btnNo.parentNode !== btnRow) {
        btnRow.appendChild(btnNo);
    }
    btnNo.style.position = 'relative';
    btnNo.style.left = '0px';
    btnNo.style.top = '0px';
    btnNo.style.transform = 'none';
    btnNo.innerText = 'Hayır';
    btnNo.classList.remove('hidden');
}

// Kalp Efekti
let heartsInterval = null;
function createFloatingHearts() {
    if (heartsInterval) return; // Birden fazla kez çalışmasın

    const container = document.getElementById('hearts-bg');
    const emojis = ['❤️', '💖', '💕', '✨', '🌸'];

    heartsInterval = setInterval(() => {
        if (proposalScreen.classList.contains('hidden')) return; // Sadece teklif ekranında

        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDuration = (Math.random() * 3 + 3) + 's';
        
        container.appendChild(heart);

        setTimeout(() => heart.remove(), 6000);
    }, 400);
}

function dodgeButton(e) {
    if (e) {
        // Tıklamaları ve dokunmaları engelle
        if (e.type !== 'mouseover') {
            e.preventDefault();
        }
    }

    // İlk etkileşimde döngüyü (setInterval) başlat
    if (!hasStartedDodging) {
        hasStartedDodging = true;
        dodgeInterval = setInterval(dodgeButton, 900); // 900ms'de bir kaçmaya devam etsin
    }

    // Butonu ana kapsayıcıya al (CSS transform hatasını önlemek için)
    if (btnNo.parentNode !== proposalScreen) {
        proposalScreen.appendChild(btnNo);
        btnNo.style.position = 'absolute';
    }

    // Rastgele komik yazı ata
    btnNo.innerText = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];

    // Yazı değiştikten SONRA butonun yeni boyutlarını al
    const btnWidth = btnNo.offsetWidth || 140;
    const btnHeight = btnNo.offsetHeight || 50;

    // Ekranda tamamen kalabilmesi için maksimum koordinatları hesapla (kenarlardan pay bırakıyoruz)
    const maxX = window.innerWidth - btnWidth - 30; 
    const maxY = window.innerHeight - btnHeight - 30;
    
    const safeMaxX = Math.max(15, maxX);
    const safeMaxY = Math.max(15, maxY);

    const randomX = 15 + (Math.random() * (safeMaxX - 15));
    const randomY = 15 + (Math.random() * (safeMaxY - 15));

    // Ana ekranda mutlak pozisyonlama
    btnNo.style.left = randomX + 'px';
    btnNo.style.top = randomY + 'px';
}

// Olay Dinleyicileri (Bir kere tanımlanır)

// Ekrana tıklandıkça mesajları ilerletme (sadece bir kere tanımlanır)
proposalScreen.addEventListener('click', (e) => {
    // Butonlara basıldığında veya soru ekranı/başarı ekranı aktifken tıklamayı yoksay
    if (e.target.tagName === 'BUTTON' || 
        !finalQ.classList.contains('hidden') || 
        !document.getElementById('success-msg').classList.contains('hidden')) {
        return;
    }
    if (isTransitioning) return;

    isTransitioning = true;
    msgIndex++;
    if (msgIndex < loveMessages.length) {
        msgText.classList.add('fade-out');
        setTimeout(() => {
            msgText.innerText = loveMessages[msgIndex];
            msgText.classList.remove('fade-out');
            isTransitioning = false;
        }, 500);
    } else {
        msgText.classList.add('hidden');
        tapHint.classList.add('hidden');
        finalQ.classList.remove('hidden');
        isTransitioning = false;
    }
});

// Fareyle veya parmakla dokunmaya çalışınca hemen kaçsın
btnNo.addEventListener('mouseover', dodgeButton);
btnNo.addEventListener('touchstart', dodgeButton, { passive: false });
btnNo.addEventListener('click', (e) => {
    e.preventDefault();
    dodgeButton(e);
});

btnYes.addEventListener('click', () => {
    if (dodgeInterval) {
        clearInterval(dodgeInterval);
        dodgeInterval = null;
    }
    finalQ.classList.add('hidden');
    document.getElementById('success-msg').classList.remove('hidden');
    btnNo.classList.add('hidden');
});
