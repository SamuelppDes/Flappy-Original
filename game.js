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

// Assets
const bgImage = new Image();
bgImage.src = 'assets/bg.png';

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(freq, type = 'sine', duration = 0.1, volume = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

let musicInterval = null;

function playFunLoop() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const volume = 0.05;

    const melody = [
        { f: 261.63, t: 0, d: 0.2 },
        { f: 329.63, t: 0.2, d: 0.2 },
        { f: 392.00, t: 0.4, d: 0.2 },
        { f: 440.00, t: 0.6, d: 0.2 },
        { f: 392.00, t: 0.8, d: 0.2 },
        { f: 329.63, t: 1.0, d: 0.2 },
        { f: 261.63, t: 1.2, d: 0.4 },
    ];

    melody.forEach(note => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(volume, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d - 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
    });
}

function startGameOverMusic() {
    playFunLoop();
    if (!musicInterval) {
        musicInterval = setInterval(playFunLoop, 1600);
    }
}

function stopGameOverMusic() {
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// Game Variables
const DEGREE = Math.PI / 180;

// --- ENTITIES ---

const bg = {
    x: 0,
    dx: 2,

    draw: function () {
        if (bgImage.complete) {
            const aspectRatio = bgImage.width / bgImage.height;
            const drawHeight = canvas.height;
            const drawWidth = drawHeight * aspectRatio;

            let currentX = this.x;
            while (currentX < canvas.width) {
                ctx.drawImage(bgImage, currentX, 0, drawWidth, drawHeight);
                currentX += drawWidth;
            }
            ctx.drawImage(bgImage, this.x - drawWidth, 0, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = '#70c5ce';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },

    update: function () {
        if (gameState.current == gameState.game) {
            const aspectRatio = bgImage.width / bgImage.height || 1;
            const drawHeight = canvas.height;
            const drawWidth = drawHeight * aspectRatio;
            this.x = (this.x - this.dx) % drawWidth;
        }
    }
};

const bird = {
    x: 50,
    y: 150,
    w: 48,
    h: 36,
    radius: 16,
    frame: 0,
    speed: 0,
    gravity: 0.25,
    jump: 4.6,
    rotation: 0,
    trail: [],

    draw: function () {
        this.trail.forEach((pos, index) => {
            const alpha = index / this.trail.length;
            ctx.beginPath();
            ctx.arc(pos.x + this.w / 2, pos.y + this.h / 2, this.radius * (0.6 + alpha * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(248, 231, 88, ${alpha * 0.4})`;
            ctx.fill();
        });

        let birdCenter = {
            x: this.x + this.w / 2,
            y: this.y + this.h / 2
        };

        ctx.save();
        ctx.translate(birdCenter.x, birdCenter.y);

        if (this.rotation > 90 * DEGREE) {
            this.rotation = 90 * DEGREE;
        } else if (this.rotation < -25 * DEGREE) {
            this.rotation = -25 * DEGREE;
        }
        ctx.rotate(this.rotation);

        const scale = this.w / 17;
        ctx.scale(scale, scale);

        const ox = -8.5;
        const oy = -6;

        // BLACK OUTLINE
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + 6, oy + 0, 6, 1);
        ctx.fillRect(ox + 3, oy + 1, 3, 1);
        ctx.fillRect(ox + 1, oy + 2, 2, 1);
        ctx.fillRect(ox + 0, oy + 3, 1, 6);
        ctx.fillRect(ox + 1, oy + 9, 2, 1);
        ctx.fillRect(ox + 3, oy + 10, 8, 1);
        ctx.fillRect(ox + 12, oy + 1, 4, 1);
        ctx.fillRect(ox + 16, oy + 2, 1, 4);
        ctx.fillRect(ox + 12, oy + 6, 4, 1);
        ctx.fillRect(ox + 16, oy + 7, 1, 3);
        ctx.fillRect(ox + 12, oy + 10, 4, 1);
        ctx.fillRect(ox + 8, oy + 8, 4, 2);

        // BODY COLOR
        ctx.fillStyle = '#F8E758';
        ctx.fillRect(ox + 6, oy + 1, 6, 5);
        ctx.fillRect(ox + 1, oy + 3, 11, 6);
        ctx.fillRect(ox + 3, oy + 2, 3, 1);
        ctx.fillRect(ox + 3, oy + 9, 8, 1);

        // EYE
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ox + 12, oy + 2, 4, 4);

        // PUPIL
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + 14, oy + 2, 2, 1);
        ctx.fillRect(ox + 15, oy + 3, 1, 2);
        ctx.fillRect(ox + 14, oy + 5, 1, 1);

        // BEAK
        ctx.fillStyle = '#E65917';
        ctx.fillRect(ox + 12, oy + 7, 4, 3);

        // WING
        ctx.fillStyle = '#FFFFFF';
        if (Math.floor(frames / 5) % 2 === 0) {
            ctx.fillRect(ox + 4, oy + 6, 6, 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(ox + 4, oy + 8, 6, 1);
        } else {
            ctx.fillRect(ox + 4, oy + 4, 6, 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(ox + 4, oy + 6, 6, 1);
        }

        ctx.restore();
    },

    flap: function () {
        this.speed = -this.jump;
        this.rotation = -25 * DEGREE;
        playTone(440, 'triangle', 0.2);
    },

    update: function () {
        if (frames % 3 === 0) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 10) this.trail.shift();
        }

        const period = gameState.current == gameState.getReady ? 10 : 5;
        this.frame += frames % period == 0 ? 1 : 0;

        if (gameState.current == gameState.getReady) {
            this.y = 150;
            this.rotation = 0 * DEGREE;
            this.trail = [];
        } else {
            this.speed += this.gravity;
            this.y += this.speed;

            if (this.speed < this.jump / 2) {
                this.rotation = -25 * DEGREE;
            } else {
                this.rotation += 5 * DEGREE;
            }

            // Ground collision
            const groundHeight = 0;
            if (this.y + this.h / 2 >= canvas.height - groundHeight) {
                this.y = canvas.height - groundHeight - this.h / 2;
                gameOver();
            }
        }
    },

    reset: function () {
        this.speed = 0;
        this.rotation = 0;
        this.y = 150;
        this.trail = [];
    }
};

const pipes = {
    position: [],
    w: 52,
    gap: 130,
    dx: 3,

    draw: function () {
        const groundHeight = 0; // Height of the ground/bushes
        const capHeight = 24;     // Height of the pipe cap

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];

            // p.y is the CENTER of the gap in this logic, or the TOP of the gap?
            // In the update function: yPos = gapCenter - (this.gap / 2);
            // So p.y is the TOP of the gap.

            let gapTop = p.y;
            let gapBottom = p.y + this.gap;

            // --- TOP PIPE ---
            // Body: From way up (-1000) down to (gapTop - capHeight)
            // Cap: At (gapTop - capHeight)

            let topPipeBodyBottom = gapTop - capHeight;
            this.drawPipeBody(p.x, -1000, this.w, topPipeBodyBottom - (-1000));
            this.drawPipeCap(p.x, topPipeBodyBottom, this.w, capHeight);

            // --- BOTTOM PIPE ---
            // Cap: At gapBottom
            // Body: From (gapBottom + capHeight) down to (canvas.height - groundHeight)

            let bottomPipeBodyTop = gapBottom + capHeight;
            let bottomPipeBodyHeight = (canvas.height - groundHeight) - bottomPipeBodyTop;

            this.drawPipeCap(p.x, gapBottom, this.w, capHeight);

            // Add extra height to ensure it covers any sub-pixel gaps at the bottom
            if (bottomPipeBodyHeight > -100) {
                // Draw body slightly taller to ensure it hits the bottom edge cleanly
                this.drawPipeBody(p.x, bottomPipeBodyTop, this.w, bottomPipeBodyHeight + 5);
            }
        }
    },

    drawPipeBody: function (x, y, w, h) {
        const mainColor = '#4be612';
        const lightColor = '#8aff69';
        const darkColor = '#2ea600';
        const outlineColor = '#000';

        // Main Body
        ctx.fillStyle = mainColor;
        ctx.fillRect(x, y, w, h);

        // Highlight
        ctx.fillStyle = lightColor;
        ctx.fillRect(x + 5, y, 4, h);
        ctx.fillRect(x + 12, y, 2, h);

        // Shadow
        ctx.fillStyle = darkColor;
        ctx.fillRect(x + w - 10, y, 8, h);

        // Borders (Left and Right only for body to avoid internal cuts)
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h); // Left border
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h); // Right border
        ctx.stroke();

        // Top/Bottom borders for body are handled by caps or screen edges, 
        // but strictly speaking we might want a border if it touches screen edge.
        // For simplicity and cleanliness, vertical borders are key.
    },

    drawPipeCap: function (x, y, w, h) {
        const mainColor = '#4be612';
        const lightColor = '#8aff69';
        const darkColor = '#2ea600';
        const outlineColor = '#000';

        // Cap is slightly wider
        const capW = w + 4;
        const capX = x - 2;

        ctx.fillStyle = mainColor;
        ctx.fillRect(capX, y, capW, h);

        ctx.fillStyle = lightColor;
        ctx.fillRect(capX + 5, y, 4, h);
        ctx.fillRect(capX + 12, y, 2, h);

        ctx.fillStyle = darkColor;
        ctx.fillRect(capX + capW - 10, y, 8, h);

        // Full border for cap
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(capX, y, capW, h);
    },

    update: function () {
        if (gameState.current !== gameState.game) return;

        if (frames % 90 == 0) {
            let yPos;
            const centerY = canvas.height / 2;

            if (Math.random() < 0.7) {
                const variation = (Math.random() * 120) - 60;
                yPos = centerY + variation - (this.gap / 2);
            } else {
                const padding = 80;
                const minGapCenter = padding + this.gap / 2;
                const maxGapCenter = canvas.height - padding - this.gap / 2;
                const gapCenter = Math.random() * (maxGapCenter - minGapCenter) + minGapCenter;
                yPos = gapCenter - (this.gap / 2);
            }

            this.position.push({
                x: canvas.width,
                y: yPos
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            let gapBottom = p.y + this.gap;

            // Collision
            if (bird.x + bird.w > p.x && bird.x < p.x + this.w) {
                if (bird.y < p.y || bird.y + bird.h > gapBottom) {
                    gameOver();
                }
            }

            if (p.x + this.w < bird.x && !p.passed) {
                score += 1;
                scoreDisplay.innerText = score;
                p.passed = true;
                playTone(880, 'sine', 0.3);
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

// --- GAME LOOP & CONTROL ---

function init() {
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

    startGameOverMusic();
}

function resetGame() {
    stopGameOverMusic();
    bird.reset();
    pipes.reset();
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
    pipes.draw();
    bird.draw();
}

function update() {
    bg.update();
    bird.update();
    pipes.update();
}

function loop() {
    update();
    draw();
    frames++;
    requestAnimationFrame(loop);
}

init();
