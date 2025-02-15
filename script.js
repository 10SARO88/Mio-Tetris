document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');

    // --- Costanti ---
    const ROWS = 20;
    const COLS = 12;
    const BLOCK_SIZE = 20;
    const GRID_COLOR = '#ddd';
    const INITIAL_DROP_INTERVAL = 1000;
    const LEVEL_UP_THRESHOLD = 15;
    const SPEED_INCREASE_FACTOR = 0.85;

    // --- Tetramini ---
    const TETROMINOS = [
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
        [[4, 4], [4, 4]],                                           // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
    ];

    // --- Colori dei tetramini ---
    const COLORS = [
        null,
        '#00FFFF',
        '#0000FF',
        '#FFA500',
        '#FFFF00',
        '#00FF00',
        '#800080',
        '#FF0000'
    ];

    // --- Variabili di stato ---
    let board;
    let player;
    let dropCounter;
    let dropInterval;
    let lastTime;
    let gameOver;
    let isMusicPlaying;
    let isMuted;
    let isPaused;

    // --- Audio ---
    const rotateSound = new Audio('sounds/rotate.mp3'); // Usa MP3!
    const moveSound = new Audio('sounds/move.mp3');     // Usa MP3!
    const lineClearSound = new Audio('sounds/line.mp3');  // Usa MP3!
    const gameOverSound = new Audio('sounds/gameover.mp3');// Usa MP3!
    const hardDropSound = new Audio('sounds/harddrop.mp3');// Usa MP3!
    const backgroundMusic = new Audio('sounds/background_music.mp3'); // Usa MP3!

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;

    // Aggiungi questa variabile
    let audioInitialized = false;

    // NUOVA FUNZIONE: Inizializza l'audio (sblocca l'autoplay)
    function startAllAudio() {
        if (audioInitialized) return; // Evita inizializzazioni multiple

        // Tenta di riprodurre (e mettere in pausa) tutti i suoni
        rotateSound.play().then(() => rotateSound.pause()).catch(e => console.warn("Audio context:", e.message));
        moveSound.play().then(() => moveSound.pause()).catch(e => console.warn("Audio context:", e.message));
        lineClearSound.play().then(() => lineClearSound.pause()).catch(e => console.warn("Audio context:", e.message));
        gameOverSound.play().then(() => gameOverSound.pause()).catch(e => console.warn("Audio context:", e.message));
        hardDropSound.play().then(() => hardDropSound.pause()).catch(e => console.warn("Audio context:", e.message));
        backgroundMusic.play().catch(e => console.warn("Audio context:", e.message)); // La musica di sottofondo può partire subito

        audioInitialized = true; // Imposta il flag
    }

    // --- Funzioni di Utilità ---
    function createMatrix(width, height) {
        return Array(height).fill(null).map(() => Array(width).fill(0));
    }

    function createPiece(type) {
        return TETROMINOS[type - 1] || null;
    }

    // --- Funzioni di Disegno ---
    function draw() {
        context.fillStyle = '#444';
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawMatrix(board, { x: 0, y: 0 });
        drawMatrix(player.matrix, player.pos);
        drawGrid();
    }

    function drawGrid() {
        context.strokeStyle = GRID_COLOR;
        context.lineWidth = 1;
        const visibleRows = Math.floor(canvas.height / BLOCK_SIZE);
        const visibleCols = Math.floor(canvas.width / BLOCK_SIZE);
        for (let i = 0; i <= visibleRows; i++) {
            context.beginPath();
            context.moveTo(0, i * BLOCK_SIZE);
            context.lineTo(canvas.width, i * BLOCK_SIZE);
            context.stroke();
        }
        for (let i = 0; i <= visibleCols; i++) {
            context.beginPath();
            context.moveTo(i * BLOCK_SIZE, 0);
            context.lineTo(i * BLOCK_SIZE, canvas.height);
            context.stroke();
        }
    }

    function drawMatrix(matrix, offset) {
        if (!matrix) return;
        const visibleRows = Math.floor(canvas.height / BLOCK_SIZE);
        const visibleCols = Math.floor(canvas.width / BLOCK_SIZE);
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const drawX = (x + offset.x) * BLOCK_SIZE;
                    const drawY = (y + offset.y) * BLOCK_SIZE;
                    if (drawX >= 0 && drawX < canvas.width && drawY >= 0 && drawY < canvas.height) {
                        context.fillStyle = COLORS[value];
                        context.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            });
        });
    }

    // --- Funzioni di Gioco ---
    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    function rotate(matrix, dir) {
        const m = matrix.length;
        const rotated = createMatrix(m, m);
        for (let i = 0; i < m; ++i) {
            for (let j = 0; j < m; ++j) {
                if (dir > 0) {
                    rotated[j][m - 1 - i] = matrix[i][j];
                } else {
                    rotated[m - 1 - j][i] = matrix[i][j];
                }
            }
        }
        return rotated;
    }

    function playerDrop() {
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            merge(board, player);
            playerReset();
            sweepRows();
            updateScore();
        }
        dropCounter = 0;
    }

    function playerMove(dir) {
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir;
        }
        moveSound.currentTime = 0; // Interrompi il suono precedente
        moveSound.play();

    }

    function playerReset() {
        const pieces = '1234567';
        player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)] | 0);
        player.pos.y = 0;
        player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

        if (collide(board, player)) {
            gameOver = true;
            gameOverSound.currentTime = 0; // Interrompi
            gameOverSound.play();
            updateScore();
            board.forEach(row => row.fill(0));
            player.score = 0;
            player.level = 1;
            player.linesCleared = 0;
        }
    }

    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        let rotatedMatrix = rotate(player.matrix, dir);

        while (collide(board, { ...player, matrix: rotatedMatrix })) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                player.pos.x = pos;
                return;
            }
        }
        player.matrix = rotatedMatrix;
        rotateSound.currentTime = 0; // Interrompi
        rotateSound.play();

    }

    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        const visibleRows = Math.floor(canvas.height / BLOCK_SIZE);
        const visibleCols = Math.floor(canvas.width / BLOCK_SIZE);

        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0) {
                    const boardX = x + o.x;
                    const boardY = y + o.y;

                    if (boardY < 0) continue;
                    if (boardX < 0 || boardX >= visibleCols || boardY >= visibleRows || (board[boardY] && board[boardY][boardX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function sweepRows() {
        let rowCount = 0;
        outer: for (let y = ROWS - 1; y > 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (board[y][x] === 0) continue outer;
            }

            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            rowCount++;
        }

        if (rowCount > 0) {
            player.score += calculateScore(rowCount) * player.level;
            player.linesCleared += rowCount;
            if (player.linesCleared >= LEVEL_UP_THRESHOLD) {
                player.level++;
                player.linesCleared -= LEVEL_UP_THRESHOLD;
                dropInterval *= SPEED_INCREASE_FACTOR;
            }
            lineClearSound.currentTime = 0; // Interrompi
            lineClearSound.play();

            updateScore();
        }
    }

    function calculateScore(rowCount) {
        switch (rowCount) {
            case 1: return 40;
            case 2: return 100;
            case 3: return 300;
            case 4: return 1200;
            default: return 0;
        }
    }

    function updateScore() {
        document.getElementById('score').innerText = player.score;
        document.getElementById('level').innerText = player.level;

        if (gameOver) {
            addHighScore(player.score);
            displayHighScores();
        }
    }

    function update(time = 0) {
        if (!isPaused && !gameOver) {
            const deltaTime = time - lastTime;
            lastTime = time;

            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                playerDrop();
            }

            draw();
            requestAnimationFrame(update);
        }
    }

    // --- Funzioni di Controllo ---
    function setDifficulty() {
        const difficulty = document.getElementById('difficulty').value;
        switch (difficulty) {
            case 'easy': dropInterval = 1500; break;
            case 'medium': dropInterval = 1000; break;
            case 'hard': dropInterval = 800; break;
        }
        resetGame();
    }

    function toggleMute() {
        isMuted = !isMuted;
        rotateSound.volume = isMuted ? 0 : 1;
        moveSound.volume = isMuted ? 0 : 1;
        lineClearSound.volume = isMuted ? 0 : 1;
        gameOverSound.volume = isMuted ? 0 : 1;
        hardDropSound.volume = isMuted ? 0 : 1;
        backgroundMusic.volume = isMuted ? 0 : 0.5;
        document.getElementById('mute-button').textContent = isMuted ? ' আনমিউট' : 'মিউট';
    }

    function togglePause() {
        isPaused = !isPaused;
        const pauseButton = document.getElementById("pause-button");
        if (isPaused) {
            backgroundMusic.pause();
            if (pauseButton) pauseButton.textContent = "Riprendi";
        } else {
            backgroundMusic.play();
            update();
            if (pauseButton) pauseButton.textContent = "Pausa";
        }
    }

    function startMusic() {
        if (!isMusicPlaying) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play();
            isMusicPlaying = true;
        }
    }

    function resetGame() {
        gameOver = false;
        board = createMatrix(COLS, ROWS);
        player.score = 0;
        player.level = 1;
        player.linesCleared = 0;
        playerReset();
        if (!isPaused) {
            update();
        }
    }

    // --- Funzioni per i Punteggi Migliori ---
    function addHighScore(score) {
        const bestScore = getHighScores();
        if (score > bestScore) {
            localStorage.setItem('highScore', score);
        }
    }

    function getHighScores() {
        const highScoreJSON = localStorage.getItem('highScore');
        return highScoreJSON ? parseInt(highScoreJSON, 10) : 0;
    }

    function displayHighScores() {
        const bestScore = getHighScores();
        const highScoreList = document.getElementById('high-score-list');
        highScoreList.innerHTML = '';
        const listItem = document.createElement('li');
        listItem.textContent = `Punteggio: ${bestScore}`;
        highScoreList.appendChild(listItem);
    }

    function hardDrop() {
        while (!collide(board, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(board, player);
        playerReset();
        sweepRows();
        updateScore();
        dropCounter = 0;
        hardDropSound.currentTime = 0; //Interrompi
        hardDropSound.play();
    }

    function resizeCanvas() {
        const container = document.querySelector('.container');
        const containerWidth = container.offsetWidth;
        const sidePanelWidth = document.querySelector('.side-panel').offsetWidth;
        let availableWidth = containerWidth - sidePanelWidth - 40;

        if (availableWidth <= 0) {
            availableWidth = 240;
        }

        const scale = Math.min(1, availableWidth / (COLS * BLOCK_SIZE));
        canvas.width = COLS * BLOCK_SIZE * scale;
        canvas.height = ROWS * BLOCK_SIZE * scale;

        const touchControls = document.querySelector('.touch-controls');
        if (touchControls) {
            touchControls.style.width = canvas.width + 'px';
        }
        draw();
    }

    // --- Inizializzazione ---
    function init() {
        board = createMatrix(COLS, ROWS);
        player = {
            pos: { x: 0, y: 0 },
            matrix: null,
            score: 0,
            level: 1,
            linesCleared = 0
        };
        dropCounter = 0;
        dropInterval = INITIAL_DROP_INTERVAL;
        lastTime = 0;
        gameOver = false;
        isMusicPlaying = false;
        isMuted = false;
        isPaused = false;

        displayHighScores();
        setDifficulty();
        playerReset();
        resizeCanvas();

        // --- Gestione degli Eventi ---
        document.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') { startAllAudio(); startMusic(); playerMove(-1); }
            else if (event.key === 'ArrowRight') { startAllAudio(); startMusic(); playerMove(1); }
            else if (event.key === 'ArrowDown') { startAllAudio(); startMusic(); playerDrop(); }
            else if (event.key === 'q') { startAllAudio(); startMusic(); playerRotate(-1); }
            else if (event.key === 'w') { startAllAudio(); startMusic(); playerRotate(1); }
            else if (event.key === ' ') { startAllAudio(); startMusic(); hardDrop(); }
            else if (event.key === 'p' || event.key === 'P') { startAllAudio(); startMusic(); togglePause(); }
        });

        // Gestione input touch (migliorata)
        function handleTouch(event, action) {
            event.preventDefault();
            startAllAudio(); // Sblocca l'audio *prima* di qualsiasi altra azione
            startMusic();  // Assicurati che la musica parta
            switch (action) {
                case 'moveLeft': playerMove(-1); break;
                case 'moveRight': playerMove(1); break;
                case 'rotateLeft': playerRotate(-1); break;
                case 'rotateRight': playerRotate(1); break;
                case 'softDrop': playerDrop(); break;
                case 'hardDrop': hardDrop(); break;
            }
        }

        const touchControls = {
            'move-left': 'moveLeft',
            'move-right': 'moveRight',
            'rotate-left': 'rotateLeft',
            'rotate-right': 'rotateRight',
            'soft-drop': 'softDrop',
            'hard-drop': 'hardDrop'
        };
        for (const [id, action] of Object.entries(touchControls)) {
            const button = document.getElementById(id);
            button.addEventListener('touchstart', (event) => handleTouch(event, action));
        }

        document.getElementById('difficulty').addEventListener('change', () => { startAllAudio(); startMusic(); setDifficulty(); });
        document.getElementById('reset-button').addEventListener('click', () => { startAllAudio(); startMusic(); resetGame(); });
        document.getElementById('mute-button').addEventListener('click', () => { startAllAudio(); toggleMute(); }); // Non chiamare startMusic qui
        document.getElementById('pause-button').addEventListener('click', () => { startAllAudio(); togglePause(); });// Non chiamare startMusic qui

        window.addEventListener('resize', resizeCanvas);

        update();
    }

    init();

}); // DOMContentLoaded
