const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');

let score = 0;
let gameOver = false;

// --- Настройки стрельбы ---
const SHOOT_MAX_PULL = 50;        // Максимальное натяжение тетивы (px)
const SHOOT_POWER_DIV = 10;       // Делитель силы (чем больше, тем слабее)
const SHOOT_SPEED_MULT = -5/3;    // Множитель скорости (отрицательный — стреляет влево)
const SHOOT_GRAVITY = 0.15;       // Сила гравитации

// --- Параметры лука и стрел ---
const bow = { x: canvas.width - 100, y: canvas.height / 2, radius: 40 }; // Лук справа
let arrow = null; // {x, y, vx, vy, flying}
let isAiming = false;
let aimPos = { x: bow.x, y: bow.y };

// --- Мишени ---
const targetRadius = 30;
let targets = [];
const targetSpeed = 2;
const numTargets = 3;

// --- Взрывы ---
let explosions = [];

// --- Стенка перед луком ---
const WALL_X = bow.x - 120; // левее
const WALL_WIDTH = 18;
const WALL_HEIGHT = Math.floor(canvas.height / 2);
const WALL_Y = Math.floor(canvas.height / 1.67);

// --- Осколки ---
let debris = [];

// --- Здоровье стены ---
let wallHealth = 100;

canvas.addEventListener('mousedown', (e) => {
    if (gameOver) return;
    const mouse = getMousePos(e);
    // Запрещаем натягивать тетиву влево (мышь левее лука)
    if (mouse.x < bow.x) return;
    isAiming = true;
    aimPos = mouse;
});
canvas.addEventListener('mousemove', (e) => {
    if (isAiming) {
        const mouse = getMousePos(e);
        // Не даём увести мышь левее лука
        if (mouse.x < bow.x) {
            aimPos.x = bow.x;
            aimPos.y = mouse.y;
        } else {
            aimPos = mouse;
        }
    }
});
canvas.addEventListener('mouseup', (e) => {
    if (isAiming && !arrow) {
        const mouse = getMousePos(e);
        // Стрела выпускается только если мышь правее лука
        if (mouse.x < bow.x) {
            isAiming = false;
            return;
        }
        const dx = mouse.x - bow.x;
        const dy = mouse.y - bow.y;
        const pull = Math.min(Math.sqrt(dx*dx + dy*dy), SHOOT_MAX_PULL);
        const angle = Math.atan2(dy, dx);
        const power = pull / SHOOT_POWER_DIV;
        arrow = {
            x: bow.x,
            y: bow.y,
            vx: Math.cos(angle) * power * SHOOT_SPEED_MULT,
            vy: Math.sin(angle) * power * SHOOT_SPEED_MULT,
            flying: true
        };
    }
    isAiming = false;
});

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function resetTargets() {
    targets = [];
    for (let i = 0; i < numTargets; i++) {
        targets.push({
            x: -targetRadius - i * 120, // стартуют у левого края
            y: 100 + Math.random() * (canvas.height - 200),
            radius: targetRadius,
            alive: true
        });
    }
}

function startGame() {
    score = 0;
    gameOver = false;
    scoreDiv.textContent = 'Очки: ' + score;
    restartBtn.style.display = 'none';
    arrow = null;
    resetTargets();
    wallHealth = 100;
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameOver = true;
    restartBtn.style.display = 'inline-block';
}

restartBtn.addEventListener('click', startGame);

function drawBow() {
    // Лук (отражён горизонтально)
    ctx.save();
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(bow.x, bow.y, bow.radius, Math.PI*1.5, Math.PI/2, true);
    ctx.stroke();
    // Тетива
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bow.x, bow.y - bow.radius);
    ctx.lineTo(bow.x, bow.y + bow.radius);
    ctx.stroke();
    // Натяжение тетивы
    if (isAiming) {
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(bow.x, bow.y - bow.radius);
        ctx.lineTo(aimPos.x, aimPos.y);
        ctx.lineTo(bow.x, bow.y + bow.radius);
        ctx.stroke();
    }
    ctx.restore();
}

function drawArrow() {
    if (arrow) {
        ctx.save();
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(arrow.x, arrow.y);
        ctx.lineTo(arrow.x + 30 * Math.cos(Math.atan2(arrow.vy, arrow.vx)), arrow.y + 30 * Math.sin(Math.atan2(arrow.vy, arrow.vx)));
        ctx.stroke();
        ctx.restore();
    } else if (isAiming) {
        // Показываем стрелу при натяжении
        ctx.save();
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bow.x, bow.y);
        ctx.lineTo(aimPos.x, aimPos.y);
        ctx.stroke();
        ctx.restore();
    }
}

function drawTargets() {
    targets.forEach(t => {
        if (!t.alive) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI*2);
        ctx.fillStyle = '#2196f3'; // синий
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
    });
}

function drawTrajectory() {
    if (!isAiming) return;
    const dx = aimPos.x - bow.x;
    const dy = aimPos.y - bow.y;
    const pull = Math.min(Math.sqrt(dx*dx + dy*dy), SHOOT_MAX_PULL);
    const angle = Math.atan2(dy, dx);
    const power = pull / SHOOT_POWER_DIV;
    let vx = Math.cos(angle) * SHOOT_SPEED_MULT * power;
    let vy = Math.sin(angle) * SHOOT_SPEED_MULT * power;
    let x = bow.x;
    let y = bow.y;
    ctx.save();
    ctx.strokeStyle = 'rgba(30,30,30,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let t = 0; t < 80; t++) {
        x += vx;
        y += vy;
        vy += SHOOT_GRAVITY;
        ctx.lineTo(x, y);
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function createExplosion(x, y) {
    const particles = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 2;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: 3 + Math.random() * 2
        });
    }
    explosions.push({ particles });
}

function updateExplosions() {
    for (const exp of explosions) {
        for (const p of exp.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.alpha -= 0.03;
        }
    }
    // Удаляем завершённые взрывы
    explosions = explosions.filter(exp => exp.particles.some(p => p.alpha > 0));
}

function drawExplosions() {
    for (const exp of explosions) {
        for (const p of exp.particles) {
            if (p.alpha <= 0) continue;
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

function createDebris(x, y, color) {
    // Осколки появляются в месте взрыва шарика и падают вниз
    for (let i = 0; i < 6; i++) {
        debris.push({
            x: x - 10 + Math.random() * 20,
            y: y - 10 + Math.random() * 20,
            w: 6 + Math.random() * 8,
            h: 4 + Math.random() * 4,
            color: color || '#f44336',
            vy: 2 + Math.random() * 2,
            landed: false
        });
    }
}

function updateDebris() {
    for (const d of debris) {
        if (d.landed) continue;
        d.y += d.vy;
        d.vy += 0.4;
        // Если достигли пола — останавливаем
        if (d.y + d.h >= canvas.height - 2) {
            d.y = canvas.height - d.h - 2;
            d.vy = 0;
            d.landed = true;
        }
    }
}

function drawDebris() {
    for (const d of debris) {
        ctx.save();
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.restore();
    }
}

function drawWall() {
    ctx.save();
    let color = '#4caf50'; // зелёный
    if (wallHealth < 70 && wallHealth >= 40) color = '#ffeb3b'; // жёлтый
    if (wallHealth < 40) color = '#f44336'; // красный
    ctx.fillStyle = color;
    ctx.fillRect(WALL_X, WALL_Y, WALL_WIDTH, WALL_HEIGHT);
    ctx.restore();
}

function drawWallHealth() {
    ctx.save();
    ctx.font = '18px Arial';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    ctx.fillText('Здоровье стены: ' + wallHealth, 20, 30);
    ctx.restore();
}

function updateArrow() {
    if (!arrow) return;
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;
    // Гравитация
    arrow.vy += SHOOT_GRAVITY;
    // Проверка выхода за пределы
    if (arrow.x > canvas.width || arrow.y > canvas.height || arrow.x < 0 || arrow.y < 0) {
        arrow = null;
        return;
    }
    // Проверка пересечения стены (стрела исчезает)
    if (
        arrow.x > WALL_X && arrow.x < WALL_X + WALL_WIDTH &&
        arrow.y > WALL_Y && arrow.y < WALL_Y + WALL_HEIGHT
    ) {
        arrow = null;
        return;
    }
    // Проверка попадания
    for (let t of targets) {
        if (t.alive && Math.hypot(arrow.x - t.x, arrow.y - t.y) < t.radius) {
            t.alive = false;
            score += 10;
            scoreDiv.textContent = 'Очки: ' + score;
            createExplosion(t.x, t.y);
            createDebris(t.x, t.y, '#f44336');
            // После попадания — респавн слева
            t.x = -t.radius;
            t.y = 100 + Math.random() * (canvas.height - 200);
            t.alive = true;
            arrow = null;
            // Проверка окончания игры
            break;
        }
    }
}

function updateTargets() {
    targets.forEach(t => {
        if (!t.alive) return;
        t.x += targetSpeed;
        // Проверка столкновения со стенкой (только по высоте стены)
        if (
            t.x - t.radius < WALL_X + WALL_WIDTH && t.x + t.radius > WALL_X &&
            t.y + t.radius > WALL_Y && t.y - t.radius < WALL_Y + WALL_HEIGHT
        ) {
            t.alive = false;
            createExplosion(t.x, t.y);
            createDebris(t.x, t.y, '#f44336');
            wallHealth = Math.max(0, wallHealth - 10);
            if (wallHealth === 0) {
                endGame();
                return;
            }
            // После лопания о стенку — респавн слева
            t.x = -t.radius;
            t.y = 100 + Math.random() * (canvas.height - 200);
            t.alive = true;
        }
        if (t.x - t.radius > canvas.width) {
            t.x = -t.radius;
            t.y = 100 + Math.random() * (canvas.height - 200);
            t.alive = true;
        }
    });
}

function drawGameOver() {
    if (!gameOver) return;
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#d32f2f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrajectory();
    drawWall();
    drawWallHealth();
    drawBow();
    drawArrow();
    drawTargets();
    drawExplosions();
    drawDebris();
    if (gameOver) {
        drawGameOver();
        return;
    }
    updateArrow();
    updateTargets();
    updateExplosions();
    updateDebris();
    requestAnimationFrame(gameLoop);
}

startGame(); 