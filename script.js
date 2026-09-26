// --- Configuración y Constantes ---
const COLS = 10;
const ROWS = 20;
const BLOCK_CHAR = "[]"; // El bloque visual solicitado

// Definición de las piezas (Matrices)
const SHAPES = {
    'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    'J': [[1,0,0], [1,1,1], [0,0,0]],
    'L': [[0,0,1], [1,1,1], [0,0,0]],
    'O': [[1,1], [1,1]],
    'S': [[0,1,1], [1,1,0], [0,0,0]],
    'T': [[0,1,0], [1,1,1], [0,0,0]],
    'Z': [[1,1,0], [0,1,1], [0,0,0]]
};

const COLORS = {
    'I': '#00ffff', // Cyan
    'J': '#0000ff', // Azul
    'L': '#ffa500', // Naranja
    'O': '#ffff00', // Amarillo
    'S': '#00ff00', // Verde
    'T': '#ff00ff', // Magenta
    'Z': '#ff0000'  // Rojo
};

let board = [];
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000; // ms
let lastTime = 0;

let currentPiece = {
    shape: [],
    color: '',
    x: 0,
    y: 0
};

const boardElement = document.getElementById('board');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');

function init() {
    createBoard();
    resetGame();
    updateUI();
    requestAnimationFrame(update);
}

function createBoard() {
    boardElement.innerHTML = '';
    for (let i = 0; i < ROWS * COLS; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        boardElement.appendChild(cell);
    }
}

function resetGame() {
    // Crear matriz lógica vacía
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    isPaused = false;
    dropInterval = 1000;
    
    overlay.style.display = 'none';
    
    spawnPiece();
    updateUI();
    lastTime = performance.now();
    requestAnimationFrame(update);
}

// --- Lógica del Juego ---

// Genera una nueva pieza aleatoria
function spawnPiece() {
    const keys = Object.keys(SHAPES);
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    const shape = SHAPES[randKey].map(row => [...row]); // Copia profunda

    currentPiece = {
        shape: shape,
        color: COLORS[randKey],
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };

    //Game Over
    if (collide(board, currentPiece)) {
        gameOver = true;
        overlayTitle.textContent = "GAME OVER";
        overlay.style.display = 'flex';
    }
}

function draw() {
    // 1. Limpiar el tablero
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.style.color = 'var(--text-color)';
    });

    // 2. Dibujar el tablero lógico
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const index = y * COLS + x;
                cells[index].textContent = BLOCK_CHAR;
                cells[index].style.color = value; 
            }
        });
    });

    // 3. Dibujar la pieza actual
    if (!gameOver && !isPaused) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardX = currentPiece.x + x;
                    const boardY = currentPiece.y + y;
                    
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        const index = boardY * COLS + boardX;
                        cells[index].textContent = BLOCK_CHAR;
                        cells[index].style.color = currentPiece.color;
                    }
                }
            });
        });
    }
}

// Colisión
function collide(board, piece) {
    const m = piece.shape;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                const newY = piece.y + y;
                const newX = piece.x + x;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Fusionar pieza con el tablero
function merge(board, piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = piece.color;
                }
            }
        });
    });
}

// Rotar pieza
function rotate(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            result[x][N - 1 - y] = matrix[y][x];
        }
    }
    return result;
}

// Mover pieza
function playerMove(dir) {
    currentPiece.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.x -= dir;
    }
}

// Rotar jugador
function playerRotate() {
    const rotated = rotate(currentPiece.shape);
    const posX = currentPiece.x;
    let offset = 1;
    
    currentPiece.shape = rotated;
    while (collide(board, currentPiece)) {
        currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > currentPiece.shape[0].length) {
            currentPiece.shape = rotate(rotate(rotate(rotated))); 
            currentPiece.x = posX;
            return;
        }
    }
}

// Caída rápida 
function playerDrop() {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
        currentPiece.y--;
        lockPiece();
    }
    dropCounter = 0;
}

// Caída suave
function playerSoftDrop() {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
        currentPiece.y--;
        lockPiece();
    }
    dropCounter = 0;
}

// Fijar pieza y limpiar líneas
function lockPiece() {
    merge(board, currentPiece);
    clearLines();
    spawnPiece();
}

// Limpiar líneas completas
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++; 
        linesCleared++;
    }

    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;
        
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateUI();
    }
}

// Actualizar Interfaz de Usuario
function updateUI() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
}

// --- Bulce Principal ---
function update(time = 0) {
    if (gameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

// --- Controles ---
document.addEventListener('keydown', e => {
    if (gameOver) return;

    // Pausa
    if (e.key === 'p' || e.key === 'P') {
        isPaused = !isPaused;
        if (!isPaused) {
            lastTime = performance.now();
            requestAnimationFrame(update);
        } else {
            overlayTitle.textContent = "PAUSA";
            overlay.style.display = 'flex';
            draw(); 
        }
        return;
    }

    if (isPaused) return;

    switch(e.key) {
        case 'ArrowLeft':
            playerMove(-1);
            break;
        case 'ArrowRight':
            playerMove(1);
            break;
        case 'ArrowDown':
            playerSoftDrop();
            break;
        case 'ArrowUp':
            playerRotate();
            break;
        case ' ': 
            e.preventDefault();
            while (!collide(board, currentPiece)) {
                currentPiece.y++;
            }
            currentPiece.y--;
            lockPiece();
            dropCounter = 0;
            break;
    }
    draw();
});
//Iniciar Juego
init();