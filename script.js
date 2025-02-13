    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');

    // --- Funzione per ridimensionare il canvas (ottimizzata) ---
    function resizeCanvas() {
        const container = document.querySelector('.container');
        const containerWidth = container.offsetWidth;
        const sidePanelWidth = document.querySelector('.side-panel').offsetWidth;

        // Calcola la larghezza disponibile. Aggiungi un margine per sicurezza.
        let availableWidth = containerWidth - sidePanelWidth - 40; // 40px di margine

        //Se non c'è spazio, imposta valori di default.
        if (availableWidth <= 0) {
            availableWidth = 240;
        }

        // Calcola la scala (non più grande di 1 per evitare ingrandimenti)
        const scale = Math.min(1, availableWidth / 240);

        // Imposta larghezza e altezza del canvas
        canvas.width = 240 * scale;
        canvas.height = 400 * scale;

        // Aggiorna la larghezza dei controlli touch.
        const touchControls = document.querySelector('.touch-controls');
        if (touchControls) {
            touchControls.style.width = canvas.width + 'px';
        }

        // Scala il contesto (IMPORTANTE: fallo DOPO aver impostato width/height)
        context.scale(scale, scale);

        // Ridisegna tutto
        draw();
    }



    // --- Costanti ---
    const ROWS = 20;  // Numero di righe della griglia di gioco
    const COLS = 12;  // Numero di colonne della griglia di gioco
    const GRID_COLOR = '#ddd'; // Colore della griglia
    const INITIAL_DROP_INTERVAL = 1000; // Intervallo iniziale di caduta (ms)
    const LEVEL_UP_THRESHOLD = 15;     // Righe per passare al livello successivo
    const SPEED_INCREASE_FACTOR = 0.85; // Fattore di aumento della velocità

    // --- Tetramini (forme dei pezzi) ---
    const TETROMINOS = [
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1], // I
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        [
            [2, 0, 0],
            [2, 2, 2], // J
            [0, 0, 0]
        ],
        [
            [0, 0, 3],
            [3, 3, 3], // L
            [0, 0, 0]
        ],
        [
            [4, 4],
            [4, 4], // O
        ],
        [
            [0, 5, 5],
            [5, 5, 0], // S
            [0, 0, 0]
        ],
        [
            [0, 6, 0],
            [6, 6, 6], // T
            [0, 0, 0]
        ],
        [
            [7, 7, 0],
            [0, 7, 7], // Z
            [0, 0, 0]
        ]
    ];

    // --- Colori dei tetramini ---
    const COLORS = [
        null,        // Nessun colore (celle vuote)
        '#00FFFF',  // Ciano (I)
        '#0000FF',  // Blu (J)
        '#FFA500',  // Arancione (L)
        '#FFFF00',  // Giallo (O)
        '#00FF00',  // Verde (S)
        '#800080',  // Viola (T)
        '#FF0000'   // Rosso (Z)
    ];

    // --- Variabili di stato del gioco ---
    let board = createMatrix(COLS, ROWS);
    let player = {
        pos: { x: 0, y: 0 },
        matrix: null,
        score: 0,
        level: 1,
        linesCleared: 0
    };
    let dropCounter = 0;
    let dropInterval = INITIAL_DROP_INTERVAL;
    let lastTime = 0;
    let gameOver = false;
    let isMusicPlaying = false;
    let isMuted = false; // <--- Inizializzata a false


    // --- Oggetti Audio (suoni) ---
    const rotateSound = new Audio('sounds/rotate.ogg');
    const moveSound = new Audio('sounds/move.ogg');
    const lineClearSound = new Audio('sounds/line.ogg');
    const gameOverSound = new Audio('sounds/gameover.ogg');
    const hardDropSound = new Audio('sounds/harddrop.ogg');
    const backgroundMusic = new Audio('sounds/background_music.ogg');

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;

    // --- Funzioni ---

    function createMatrix(width, height) {
        const matrix = [];
        while (height--) {
            matrix.push(new Array(width).fill(0));
        }
        return matrix;
    }

    function createPiece(type) {
        return TETROMINOS[type - 1] || null; // Più conciso
    }

    function draw() {
        context.fillStyle = '#444';
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawMatrix(board, { x: 0, y: 0 });
        drawMatrix(player.matrix, player.pos);
        drawGrid();
    }


    function drawGrid() {
        const scaledLineWidth = 0.05; //Larghezza delle linee, evita for ... loop
        context.strokeStyle = GRID_COLOR;
        context.lineWidth = scaledLineWidth;

        for (let i = 0; i <= ROWS; i++) {
            context.beginPath();
            context.moveTo(0, i);
            context.lineTo(COLS, i);
            context.stroke();
        }
        for (let i = 0; i <= COLS; i++) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, ROWS);
            context.stroke();
        }
    }

    function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

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
        const rotated = createMatrix(m, m); // Crea una matrice vuota
        for (let i = 0; i < m; ++i) {
            for (let j = 0; j < m; ++j) {
                if (dir > 0) {
                    rotated[j][m - 1 - i] = matrix[i][j]; // Rotazione oraria
                } else {
                    rotated[m - 1 - j][i] = matrix[i][j]; // Rotazione antioraria
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
        } else {
            moveSound.currentTime = 0;
            moveSound.play();
        }
    }

  function playerReset() {
    const pieces = '1234567';
    player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)] | 0);
    player.pos.y = 0;
    player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(board, player)) {
        gameOver = true;
        gameOverSound.play();
        updateScore(); // Aggiorna il punteggio (per l'ultima volta)
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
        rotateSound.currentTime = 0;
        rotateSound.play();
    }

    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (y + o.y < 0) continue;
                if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

   function sweepRows() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
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
        lineClearSound.currentTime = 0;
        lineClearSound.play();
        updateScore();
    }
}

function calculateScore(rowCount) {
     let score = 0;
    switch (rowCount) {
        case 1: score = 40; break;
        case 2: score = 100; break;
        case 3: score = 300; break;
        case 4: score = 1200; break;
        default: score = 0; //Gestione del caso 0 (nessuna riga eliminata)
    }
    return score;
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

    function setDifficulty() {
        const difficulty = document.getElementById('difficulty').value;
        switch (difficulty) {
            case 'easy':
                dropInterval = 1500;
                break;
            case 'medium':
                dropInterval = 1000;
                break;
            case 'hard':
                dropInterval = 800;
                break;
        }
        resetGame(); //Resetta il gioco per applicare
    }


    function toggleMute() {
        isMuted = !isMuted;
        rotateSound.volume = isMuted ? 0 : 1;
        moveSound.volume = isMuted ? 0 : 1;
        lineClearSound.volume = isMuted ? 0 : 1;
        gameOverSound.volume = isMuted ? 0 : 1;
        hardDropSound.volume = isMuted ? 0 : 1;
        backgroundMusic.volume = isMuted ? 0 : 0.5;

        const muteButton = document.getElementById('mute-button');
        if (muteButton) {
            muteButton.textContent = isMuted ? ' আনমিউট' : 'মিউট';
        }
    }

    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            backgroundMusic.pause();
            const pauseButton = document.getElementById("pause-button");
            if (pauseButton) pauseButton.textContent = "চালু করুন";
        } else {
            backgroundMusic.play();
            update();
            const pauseButton = document.getElementById("pause-button");
            if (pauseButton) pauseButton.textContent = "বিরতি দিন";
        }
    }

    function startMusic() {
        if (!isMusicPlaying) {
            backgroundMusic.currentTime = 0; // <--- Riproduci dall'inizio
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

    function addHighScore(score) {
        const bestScore = getHighScores();
        if (score > bestScore) localStorage.setItem('highScore', score); //salva il record
    }

    function getHighScores() {
        const highScoreJSON = localStorage.getItem('highScore');
        return highScoreJSON ? parseInt(highScoreJSON, 10) : 0;
    }

    function displayHighScores() {
        const bestScore = getHighScores();
        const highScoreList = document.getElementById('high-score-list');
        highScoreList.innerHTML = '';  // Pulisci la lista
        const listItem = document.createElement('li');
        listItem.textContent = `Punteggio: ${bestScore}`;
        highScoreList.appendChild(listItem);
    }


    // --- Gestione dell'input (TASTIERA - lascialo per compatibilità) ---
    document.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            startMusic();
            playerMove(-1);
        } else if (event.key === 'ArrowRight') {
            startMusic();
            playerMove(1);
        } else if (event.key === 'ArrowDown') {
            startMusic();
            playerDrop();
        } else if (event.key === 'q') {
            startMusic();
            playerRotate(-1);
        } else if (event.key === 'w') {
            startMusic();
            playerRotate(1);
        } else if (event.key === ' ') {
            startMusic();
            hardDrop();
        } else if (event.key === 'p' || event.key === 'P') {
            startMusic();
            togglePause();
        }
    });

    // --- Gestione dell'input (TOUCH) ---
    document.getElementById('move-left').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        playerMove(-1);
    });

    document.getElementById('move-right').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        playerMove(1);
    });

    document.getElementById('rotate-left').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        playerRotate(-1);
    });

    document.getElementById('rotate-right').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        playerRotate(1);
    });

    document.getElementById('soft-drop').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        playerDrop();
    });

    document.getElementById('hard-drop').addEventListener('touchstart', (event) => {
        event.preventDefault();
        startMusic();
        hardDrop();
    });


    // --- Gestione eventi pulsanti ---
    document.getElementById('difficulty').addEventListener('change', () => {
        startMusic();
        setDifficulty();
    });
    document.getElementById('reset-button').addEventListener('click', () => {
        startMusic();
        resetGame();
    });
    document.getElementById('mute-button').addEventListener('click', () => {
        startMusic();
        toggleMute();
    });
    document.getElementById('pause-button').addEventListener('click', () => {
        startMusic();
        togglePause();
    });


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
        hardDropSound.currentTime = 0;
        hardDropSound.play();
    }

    // --- Caricamento e ridimensionamento iniziale ---

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    displayHighScores();
    setDifficulty(); //Imposta difficoltà.

}); // <-- Chiusura di DOMContentLoaded
