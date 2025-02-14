document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');

    // --- Costanti ---
    const ROWS = 20;        // Righe totali della griglia di gioco (logica)
    const COLS = 12;        // Colonne totali della griglia di gioco (logica)
    const BLOCK_SIZE = 20;  // Dimensione di un singolo blocco (in pixel)
    const GRID_COLOR = '#ddd';
    const INITIAL_DROP_INTERVAL = 1000; // Velocità di caduta iniziale (ms)
    const LEVEL_UP_THRESHOLD = 15;      // Linee eliminate per aumentare il livello
    const SPEED_INCREASE_FACTOR = 0.85; // Fattore di aumento della velocità

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
        null,        // Nessun colore per il valore 0
        '#00FFFF',  // Ciano (I)
        '#0000FF',  // Blu (J)
        '#FFA500',  // Arancione (L)
        '#FFFF00',  // Giallo (O)
        '#00FF00',  // Verde (S)
        '#800080',  // Viola (T)
        '#FF0000'   // Rosso (Z)
    ];

    // --- Variabili di stato ---
    let board;           // La griglia di gioco
    let player;          // Il giocatore (posizione, tetramino, punteggio, ...)
    let dropCounter;     // Contatore per la caduta automatica
    let dropInterval;    // Intervallo di caduta automatica (variabile)
    let lastTime;        // Timestamp dell'ultimo frame
    let gameOver;        // Indica se il gioco è finito
    let isMusicPlaying;  // Indica se la musica è in riproduzione
    let isMuted;         // Indica se l'audio è disattivato
    let isPaused;        // Indica se il gioco è in pausa

    // --- Audio ---
    const rotateSound = new Audio('sounds/rotate.ogg');
    const moveSound = new Audio('sounds/move.ogg');
    const lineClearSound = new Audio('sounds/line.ogg');
    const gameOverSound = new Audio('sounds/gameover.ogg');
    const hardDropSound = new Audio('sounds/harddrop.ogg');
    const backgroundMusic = new Audio('sounds/background_music.ogg');
    backgroundMusic.loop = true;  // Riproduzione in loop
    backgroundMusic.volume = 0.5; // Volume della musica

    // --- Funzioni di Utilità ---

    // Crea una matrice (griglia) di dimensioni date, riempita con zeri
    function createMatrix(width, height) {
        return Array(height).fill(null).map(() => Array(width).fill(0));
    }

    // Restituisce la forma di un tetramino dato il suo tipo (numero)
    function createPiece(type) {
        return TETROMINOS[type - 1] || null;
    }

    // --- Funzioni di Disegno ---

    // Disegna l'intero gioco (griglia, tetramino corrente, ...)
    function draw() {
        context.fillStyle = '#444'; // Colore di sfondo del canvas
        context.fillRect(0, 0, canvas.width, canvas.height);

        drawMatrix(board, { x: 0, y: 0 });  // Disegna la griglia
        drawMatrix(player.matrix, player.pos); // Disegna il tetramino corrente
        drawGrid();                          // Disegna le linee della griglia
    }

    // Disegna le linee della griglia (solo quelle visibili)
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

    // Disegna una matrice (griglia o tetramino) sul canvas
    function drawMatrix(matrix, offset) {
        if (!matrix) return;

        const visibleRows = Math.floor(canvas.height / BLOCK_SIZE);
        const visibleCols = Math.floor(canvas.width / BLOCK_SIZE);

        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const drawX = (x + offset.x) * BLOCK_SIZE;
                    const drawY = (y + offset.y) * BLOCK_SIZE;

                    // Controlla se la cella è visibile prima di disegnarla
                    if (drawX >= 0 && drawX < canvas.width && drawY >= 0 && drawY < canvas.height) {
                        context.fillStyle = COLORS[value];
                        context.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            });
        });
    }

    // --- Funzioni di Gioco ---

    // Unisce il tetramino corrente alla griglia
    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    // Ruota un tetramino
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

    // Fa cadere il tetramino di una posizione verso il basso
    function playerDrop() {
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            merge(board, player);
            playerReset();
            sweepRows();
            updateScore();
        }
        dropCounter = 0; // Resetta il contatore della caduta
    }

   // Muove il tetramino orizzontalmente
    function playerMove(dir) {
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir; // Annulla il movimento se c'è collisione
        }
        moveSound.currentTime = 0; // Riproduci il suono dall'inizio
        moveSound.play();
    }

    // Genera un nuovo tetramino casuale e lo posiziona in cima alla griglia
    function playerReset() {
        const pieces = '1234567';
        player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)] | 0);
        player.pos.y = 0;
        player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

        // Se c'è collisione immediata, il gioco è finito
        if (collide(board, player)) {
            gameOver = true;
            gameOverSound.play();
            updateScore();  // Aggiorna il punteggio prima di resettare
            board.forEach(row => row.fill(0)); // Pulisci la griglia
            player.score = 0;
            player.level = 1;
            player.linesCleared = 0;
        }
    }

    // Ruota il tetramino corrente
    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        let rotatedMatrix = rotate(player.matrix, dir);

        // Gestione delle collisioni durante la rotazione (kick wall)
        while (collide(board, { ...player, matrix: rotatedMatrix })) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                player.pos.x = pos; // Ripristina la posizione originale
                return; // Non ruotare
            }
        }
        player.matrix = rotatedMatrix; // Applica la rotazione
        rotateSound.currentTime = 0;
        rotateSound.play();
    }

    // Controlla se c'è collisione tra il tetramino e la griglia o i bordi
    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];

        // Calcola le righe *e le colonne* visibili
        const visibleRows = Math.floor(canvas.height / BLOCK_SIZE);
        const visibleCols = Math.floor(canvas.width / BLOCK_SIZE);

        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0) {
                    const boardX = x + o.x;
                    const boardY = y + o.y;

                    // CORREZIONE: Usa >= per il controllo di collisione, non >
                    if (boardY < 0) continue;
                    if (boardX < 0 || boardX >= visibleCols || boardY >= visibleRows || (board[boardY] && board[boardY][boardX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Rimuove le righe complete e aggiorna il punteggio
    function sweepRows() {
        let rowCount = 0;
        outer: for (let y = ROWS - 1; y > 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (board[y][x] === 0) continue outer; // Se c'è uno spazio vuoto, passa alla riga successiva
            }

            // Rimuovi la riga completa e aggiungine una vuota in cima
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y; // Controlla di nuovo la stessa riga (perché ne abbiamo spostata una sopra)
            rowCount++;
        }

        // Aggiorna il punteggio e il livello in base alle righe eliminate
        if (rowCount > 0) {
            player.score += calculateScore(rowCount) * player.level;
            player.linesCleared += rowCount;
            if (player.linesCleared >= LEVEL_UP_THRESHOLD) {
                player.level++;
                player.linesCleared -= LEVEL_UP_THRESHOLD;
                dropInterval *= SPEED_INCREASE_FACTOR; // Aumenta la velocità
            }
            lineClearSound.currentTime = 0;
            lineClearSound.play();
            updateScore();
        }
    }

    // Calcola il punteggio in base al numero di righe eliminate contemporaneamente
    function calculateScore(rowCount) {
        switch (rowCount) {
            case 1: return 40;
            case 2: return 100;
            case 3: return 300;
            case 4: return 1200;
            default: return 0;
        }
    }

    // Aggiorna il punteggio e il livello visualizzati
    function updateScore() {
        document.getElementById('score').innerText = player.score;
        document.getElementById('level').innerText = player.level;

        // Se il gioco è finito, salva il punteggio migliore
        if (gameOver) {
            addHighScore(player.score);
            displayHighScores();
        }
    }

    // Funzione principale di aggiornamento del gioco (chiamata ripetutamente)
    function update(time = 0) {
        if (!isPaused && !gameOver) {
            const deltaTime = time - lastTime;
            lastTime = time;

            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                playerDrop(); // Fa cadere il tetramino
            }

            draw(); // Ridisegna il gioco
            requestAnimationFrame(update); // Richiedi il prossimo frame
        }
    }

    // --- Funzioni di Controllo ---

    // Imposta la difficoltà (velocità di caduta)
    function setDifficulty() {
        const difficulty = document.getElementById('difficulty').value;
        switch (difficulty) {
            case 'easy': dropInterval = 1500; break;
            case 'medium': dropInterval = 1000; break;
            case 'hard': dropInterval = 800; break;
        }
        resetGame(); // Resetta il gioco con la nuova difficoltà
    }

    // Attiva/disattiva l'audio
    function toggleMute() {
        isMuted = !isMuted;
        // Imposta il volume di tutti gli effetti sonori e della musica
        rotateSound.volume = isMuted ? 0 : 1;
        moveSound.volume = isMuted ? 0 : 1;
        lineClearSound.volume = isMuted ? 0 : 1;
        gameOverSound.volume = isMuted ? 0 : 1;
        hardDropSound.volume = isMuted ? 0 : 1;
        backgroundMusic.volume = isMuted ? 0 : 0.5;
        document.getElementById('mute-button').textContent = isMuted ? ' আনমিউট' : 'মিউট'; // Testo del pulsante
    }

    // Mette in pausa/riprende il gioco
    function togglePause() {
        isPaused = !isPaused;
        const pauseButton = document.getElementById("pause-button");
        if (isPaused) {
            backgroundMusic.pause();
            if (pauseButton) pauseButton.textContent = "Riprendi";
        } else {
            backgroundMusic.play();
            update(); // Riprendi il ciclo di aggiornamento
            if (pauseButton) pauseButton.textContent = "Pausa";
        }
    }

    // Avvia la musica (se non è già in riproduzione)
    function startMusic() {
        if (!isMusicPlaying) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play();
            isMusicPlaying = true;
        }
    }

    // Resetta il gioco allo stato iniziale
    function resetGame() {
        gameOver = false;
        board = createMatrix(COLS, ROWS);
        player.score = 0;
        player.level = 1;
        player.linesCleared = 0;
        playerReset();
        if (!isPaused) {
            update(); // Avvia il ciclo di aggiornamento (solo se non in pausa)
        }
    }

    // --- Funzioni per i Punteggi Migliori ---

    // Aggiunge un nuovo punteggio migliore (se necessario)
    function addHighScore(score) {
        const bestScore = getHighScores();
        if (score > bestScore) {
            localStorage.setItem('highScore', score);
        }
    }

    // Recupera il punteggio migliore salvato
    function getHighScores() {
        const highScoreJSON = localStorage.getItem('highScore');
        return highScoreJSON ? parseInt(highScoreJSON, 10) : 0;
    }

    // Visualizza i punteggi migliori
    function displayHighScores() {
        const bestScore = getHighScores();
        const highScoreList = document.getElementById('high-score-list');
        highScoreList.innerHTML = ''; // Pulisci la lista
        const listItem = document.createElement('li');
        listItem.textContent = `Punteggio: ${bestScore}`;
        highScoreList.appendChild(listItem);
    }

    // Fa cadere il tetramino fino in fondo (hard drop)
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

    // --- Funzione di Ridimensionamento del Canvas ---
     function resizeCanvas() {
        const container = document.querySelector('.container');
        const containerWidth = container.offsetWidth;
        const sidePanelWidth = document.querySelector('.side-panel').offsetWidth;
        let availableWidth = containerWidth - sidePanelWidth - 40; // Margine

        if (availableWidth <= 0) {
            availableWidth = 240; // Larghezza minima
        }

        // Calcola la scala in base alla *larghezza* e alle proporzioni originali
        const scale = Math.min(1, availableWidth / (COLS * BLOCK_SIZE));
        canvas.width = COLS * BLOCK_SIZE * scale;
        canvas.height = ROWS * BLOCK_SIZE * scale;

        const touchControls = document.querySelector('.touch-controls');
        if (touchControls) {
            touchControls.style.width = canvas.width + 'px'; // Adatta la larghezza dei controlli
        }
        draw(); // Ridisegna
    }


    // --- Inizializzazione ---
    function init() {
        board = createMatrix(COLS, ROWS);
        player = {
            pos: { x: 0, y: 0 },
            matrix: null,
            score: 0,
            level: 1,
            linesCleared: 0
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
        resizeCanvas(); // Imposta le dimensioni iniziali del canvas

        // --- Gestione degli Eventi ---

        // Tasti freccia, Q, W, Spazio, P
        document.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') { startMusic(); playerMove(-1); }
            else if (event.key === 'ArrowRight') { startMusic(); playerMove(1); }
            else if (event.key === 'ArrowDown') { startMusic(); playerDrop(); }
            else if (event.key === 'q') { startMusic(); playerRotate(-1); }
            else if (event.key === 'w') { startMusic(); playerRotate(1); }
            else if (event.key === ' ') { startMusic(); hardDrop(); }
            else if (event.key === 'p' || event.key === 'P') { startMusic(); togglePause(); }
        });

        // Gestione input touch (migliorata)
        function handleTouch(event, action) {
            event.preventDefault(); // Impedisci il comportamento predefinito del touch (es. scrolling)
            startMusic();
            switch (action) {
                case 'moveLeft': playerMove(-1); break;
                case 'moveRight': playerMove(1); break;
                case 'rotateLeft': playerRotate(-1); break;
                case 'rotateRight': playerRotate(1); break;
                case 'softDrop': playerDrop(); break;
                case 'hardDrop': hardDrop(); break;
            }
        }

        // Associa gli eventi touch ai pulsanti
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

        // Eventi di cambio difficoltà, reset, muto, pausa
        document.getElementById('difficulty').addEventListener('change', () => { startMusic(); setDifficulty(); });
        document.getElementById('reset-button').addEventListener('click', () => { startMusic(); resetGame(); });
        document.getElementById('mute-button').addEventListener('click', () => { startMusic(); toggleMute(); });
        document.getElementById('pause-button').addEventListener('click', () => { startMusic(); togglePause(); });

        // Ridimensionamento della finestra
        window.addEventListener('resize', resizeCanvas);

        update(); // Avvia il ciclo di gioco
    }

    init(); // Inizializza il gioco

}); // DOMContentLoaded
