const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

// Game State
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappy_highscore') || 0;
let gameState = {
    current: 0,
    getReady: 0,
    game: 1,
    over: 2
};

// Colors (matching CSS)
const colors = {
    bg: '#FDFCF5',
    bird: '#F6E05E',
    cat: '#718096',
    hill1: '#B2F5EA',
    hill2: '#81E6D9',
    trail: 'rgba(246, 224, 94, 0.4)'
};

// Audio Context (Simple Web Audio API for ambient sounds)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(freq, type = 'sine', duration = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// --- ENTITIES ---

const bg = {
    hills: [],

    init: function () {
        // Generate some random wave offsets
        this.hills = [
            { y: 0, speed: 0.5, color: colors.hill1, offset: 0, amp: 30, freq: 0.01 },
            { y: 0, speed: 1.0, color: colors.hill2, offset: 100, amp: 50, freq: 0.015 }
        ];
    },

    draw: function () {
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.hills.forEach(hill => {
            ctx.fillStyle = hill.color;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            for (let x = 0; x <= canvas.width; x += 10) {
                const y = canvas.height - 150 + Math.sin(x * hill.freq + hill.offset) * hill.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(canvas.width, canvas.height);
            ctx.fill();
        });
    },

    update: function () {
        if (gameState.current == gameState.game) {
            this.hills.forEach(hill => {
                hill.offset += hill.speed * 0.05;
            });
        }
    }
};

const bird = {
    x: 50,
    y: 150,
    radius: 15,
    speed: 0,
    gravity: 0.25,
    jump: 4.6,
    trail: [],

    draw: function () {
        // Draw Trail
        this.trail.forEach((pos, index) => {
            const alpha = index / this.trail.length;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(246, 224, 94, ${alpha * 0.5})`;
            ctx.fill();
        });

        // Draw Bird (Geometric Shape)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.bird;
        ctx.fill();

        // Simple Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + 6, this.y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4A5568';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y - 4, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    flap: function () {
        this.speed = -this.jump;
        playTone(440, 'triangle', 0.2); // Soft chime
    },

    update: function () {
        // Trail Logic
        if (frames % 3 === 0) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 10) this.trail.shift();
        }

        if (gameState.current == gameState.getReady) {
            this.y = canvas.height / 2;
            this.trail = [];
        } else {
            this.speed += this.gravity;
            this.y += this.speed;

            // Floor collision
            if (this.y + this.radius >= canvas.height) {
                this.y = canvas.height - this.radius;
                gameOver();
            }
        }
    },

    reset: function () {
        this.speed = 0;
        this.y = canvas.height / 2;
        this.trail = [];
    }
};

const cats = {
    position: [],
    w: 60,
    gap: 160,
    dx: 3,
    pulse: 0,

    draw: function () {
        this.pulse += 0.05;
        const breathing = Math.sin(this.pulse) * 2;

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;

            ctx.fillStyle = colors.cat;

            // Top Cat (Head at bottom)
            // Body
            ctx.fillRect(p.x - breathing / 2, 0, this.w + breathing, topY);
            // Head
            this.drawCatHead(p.x + this.w / 2, topY, true);

            // Bottom Cat (Head at top)
            // Body
            ctx.fillRect(p.x - breathing / 2, bottomY, this.w + breathing, canvas.height - bottomY);
            // Head
            this.drawCatHead(p.x + this.w / 2, bottomY, false);
        }
    },

    drawCatHead: function (cx, cy, inverted) {
        const size = 35;
        const dir = inverted ? -1 : 1;

        ctx.beginPath();
        // Base of head
        ctx.moveTo(cx - size / 2, cy);
        // Left Ear
        ctx.lineTo(cx - size / 2, cy + (size * 0.8 * dir));
        ctx.lineTo(cx - size / 4, cy + (size * 0.4 * dir));
        // Top of head
        ctx.lineTo(cx + size / 4, cy + (size * 0.4 * dir));
        // Right Ear
        ctx.lineTo(cx + size / 2, cy + (size * 0.8 * dir));
        ctx.lineTo(cx + size / 2, cy);

        ctx.closePath();
        ctx.fill();
    },

    update: function () {
        if (gameState.current !== gameState.game) return;

        if (frames % 100 == 0) {
            this.position.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 300) + 50
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            // Collision
            // Simplified bounding box for sleek feel
            if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w) {
                if (bird.y - bird.radius < p.y || bird.y + bird.radius > p.y + this.gap) {
                    gameOver();
                }
            }

            if (p.x + this.w < bird.x && !p.passed) {
                score += 1;
                scoreDisplay.innerText = score;
                p.passed = true;
                playTone(880, 'sine', 0.3); // High chime
            }

            if (p.x + this.w <= 0) {
                this.position.shift();
                i--;
            }
        }
    },

    reset: function () {
        this.position = [];
    }
};

// --- GAME LOOP ---

function init() {
    bg.init();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') action();
    });

    canvas.addEventListener('click', action);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        action();
    }, { passive: false });

    restartBtn.addEventListener('click', resetGame);

    loop();
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function action() {
    switch (gameState.current) {
        case gameState.getReady:
            gameState.current = gameState.game;
            startScreen.classList.remove('active');
            startScreen.classList.add('hidden');
            scoreDisplay.classList.remove('hidden');
            bird.flap();
            break;
        case gameState.game:
            bird.flap();
            break;
    }
}

function gameOver() {
    gameState.current = gameState.over;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappy_highscore', highScore);
    }
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = highScore;

    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
    scoreDisplay.classList.add('hidden');

    playTone(150, 'sawtooth', 0.5); // Sad tone
}

function resetGame() {
    bird.reset();
    cats.reset();
    score = 0;
    scoreDisplay.innerText = score;
    frames = 0;
    gameState.current = gameState.getReady;

    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');
    scoreDisplay.classList.remove('hidden');
}

function draw() {
    bg.draw();
    cats.draw();
    bird.draw();
}

function update() {
    bg.update();
    bird.update();
    cats.update();
}

function loop() {
    update();
    draw();
    frames++;
    requestAnimationFrame(loop);
}

init();
