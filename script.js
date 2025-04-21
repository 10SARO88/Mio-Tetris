document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');

    // --- Costanti ---
    const ROWS = 20;
    const COLS = 12;
    const BLOCK_SIZE = 20; // Manteniamo questa costante per calcoli interni
    const GRID_COLOR = '#ddd';
    const INITIAL_DROP_INTERVAL = 1000; // Verrà sovrascritto da setDifficulty
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
        null,      // Indice 0 non usato
        '#00FFFF', // I - Ciano
        '#0000FF', // J - Blu
        '#FFA500', // L - Arancione
        '#FFFF00', // O - Giallo
        '#00FF00', // S - Verde
        '#800080', // T - Viola
        '#FF0000'  // Z - Rosso
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
    let audioInitialized = false; // Flag per l'inizializzazione audio
    let currentBlockSize = BLOCK_SIZE; // Variabile per la dimensione attuale del blocco (per resize)
    let animationFrameId = null; // ID per requestAnimationFrame

    // --- Audio ---
    // NOTA: Assicurati che i percorsi 'sounds/...' siano corretti rispetto al tuo file HTML
    const rotateSound = new Audio('sounds/rotate.mp3');
    const moveSound = new Audio('sounds/move.mp3');
    const lineClearSound = new Audio('sounds/line.mp3');
    const gameOverSound = new Audio('sounds/gameover.mp3');
    const hardDropSound = new Audio('sounds/harddrop.mp3');
    const backgroundMusic = new Audio('sounds/background_music.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;

    // --- Funzioni Helper Audio ---

    // Eseguita solo una volta alla prima interazione utente
    function handleFirstInteraction() {
        if (!audioInitialized) {
            startAllAudio(); // Tenta di sbloccare e avviare la musica
        }
    }

    // Inizializza l'audio (sblocca l'autoplay) e avvia la musica se possibile
    function startAllAudio() {
        if (audioInitialized) return; // Già inizializzato

        console.log("Attempting to initialize audio...");

        // Tenta di sbloccare il contesto audio con suoni brevi (play/pause)
        const soundsToUnlock = [rotateSound, moveSound, lineClearSound, gameOverSound, hardDropSound];
        let unlockPromise = Promise.resolve();

        soundsToUnlock.forEach(sound => {
            // Sequenza di play/pause per sbloccare
            unlockPromise = unlockPromise.then(() => {
                sound.volume = 0; // Muta temporaneamente per evitare suoni indesiderati
                return sound.play();
            })
            .then(() => sound.pause())
            .then(() => {
                sound.volume = isMuted ? 0 : 1; // Ripristina il volume corretto
            })
            .catch(e => console.warn(`Audio unlock warning for ${sound.src}:`, e.message));
        });

        unlockPromise.then(() => {
            console.log("Audio context likely unlocked.");
            audioInitialized = true; // Imposta il flag QUI dopo lo sblocco

            // Ora prova ad avviare la musica di sottofondo, SE non è in pausa o muto
            if (!isPaused && !isMuted) {
                backgroundMusic.volume = 0.5; // Assicura volume corretto
                backgroundMusic.play()
                    .then(() => {
                        console.log("Background music started successfully.");
                        isMusicPlaying = true; // Imposta il flag SOLO se parte
                    })
                    .catch(e => {
                        console.warn("Background music auto-play failed initially:", e.message);
                        isMusicPlaying = false; // Assicurati che sia false se non parte
                    });
            } else {
                console.log("Background music not started due to initial pause/mute state.");
                backgroundMusic.volume = 0; // Assicurati che sia muta se deve esserlo
                isMusicPlaying = false;
            }
        }).catch(e => {
            console.error("Error during audio unlock sequence:", e);
            // Imposta comunque il flag per non riprovare all'infinito, anche se fallisce
            audioInitialized = true;
        });
    }

    // --- Funzioni di Utilità ---
    function createMatrix(width, height) {
        return Array(height).fill(null).map(() => Array(width).fill(0));
    }

    function createPiece(typeIndex) { // Prende l'indice (0-6)
        if (typeIndex < 0 || typeIndex >= TETROMINOS.length) return null;
        // Clona la matrice per evitare modifiche all'originale
        return TETROMINOS[typeIndex].map(row => [...row]);
    }

    // --- Funzioni di Disegno ---
    function draw() {
        // Pulisce il canvas
        context.fillStyle = '#444'; // Sfondo scuro del gioco
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Disegna la griglia (board)
        drawMatrix(board, { x: 0, y: 0 });
        // Disegna il pezzo corrente (player)
        drawMatrix(player.matrix, player.pos);

        // Disegna le linee della griglia sopra i pezzi
        drawGridLines();

        // Disegna il messaggio di Game Over se necessario
        if (gameOver) {
            context.fillStyle = 'rgba(0, 0, 0, 0.75)';
            context.fillRect(0, canvas.height / 3, canvas.width, canvas.height / 3);
            context.font = `bold ${currentBlockSize * 1.5}px sans-serif`;
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.fillText('Game Over', canvas.width / 2, canvas.height / 2);
             context.font = `bold ${currentBlockSize * 0.8}px sans-serif`;
             context.fillText('Premi Ricomincia', canvas.width / 2, canvas.height / 2 + currentBlockSize * 1.5);
        }
    }

    function drawGridLines() {
        context.strokeStyle = GRID_COLOR;
        context.lineWidth = 1 / currentBlockSize; // Linee sottili

        // Righe orizzontali
        for (let i = 0; i <= ROWS; i++) {
            context.beginPath();
            context.moveTo(0, i * currentBlockSize);
            context.lineTo(canvas.width, i * currentBlockSize);
            context.stroke();
        }
        // Colonne verticali
        for (let i = 0; i <= COLS; i++) {
            context.beginPath();
            context.moveTo(i * currentBlockSize, 0);
            context.lineTo(i * currentBlockSize, canvas.height);
            context.stroke();
        }
    }

    function drawMatrix(matrix, offset) {
        if (!matrix) return;
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const drawX = (x + offset.x) * currentBlockSize;
                    const drawY = (y + offset.y) * currentBlockSize;
                    // Disegna solo se dentro i limiti del canvas (utile per pezzi parzialmente fuori)
                    if (drawX >= 0 && drawX < canvas.width && drawY >= 0 && drawY < canvas.height) {
                        context.fillStyle = COLORS[value];
                        context.fillRect(drawX, drawY, currentBlockSize, currentBlockSize);
                        // Aggiungi un bordo più scuro per separare i blocchi (opzionale)
                        context.strokeStyle = '#333';
                        context.lineWidth = 1;
                        context.strokeRect(drawX, drawY, currentBlockSize, currentBlockSize);
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
                    const boardY = y + player.pos.y;
                    const boardX = x + player.pos.x;
                    // Assicurati di non scrivere fuori dai limiti della board
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        board[boardY][boardX] = value;
                    }
                }
            });
        });
    }

    // Ruota una matrice quadrata
    function rotate(matrix, dir) {
        const m = matrix.length;
        const rotated = createMatrix(m, m); // Crea una nuova matrice vuota
        for (let i = 0; i < m; ++i) {
            for (let j = 0; j < m; ++j) {
                if (dir > 0) { // Rotazione oraria
                    rotated[j][m - 1 - i] = matrix[i][j];
                } else { // Rotazione antioraria
                    rotated[m - 1 - j][i] = matrix[i][j];
                }
            }
        }
        return rotated;
    }

    function playerDrop() {
        if (gameOver || isPaused) return; // Non fare nulla se il gioco è finito o in pausa
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--; // Torna indietro
            merge(board, player); // Fissa il pezzo sulla board
            playerReset(); // Prendi un nuovo pezzo
            sweepRows();   // Controlla e pulisci le linee
            updateScore(); // Aggiorna punteggio/livello UI
            // Non serve riprodurre suono qui, viene fatto dal movimento
        }
        dropCounter = 0; // Resetta il contatore per la prossima caduta automatica
    }

    function playerMove(dir) {
        if (gameOver || isPaused) return;
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir; // Annulla mossa se collisione
        } else {
            // Suona solo se la mossa è valida
            playSound(moveSound);
        }
    }

    function playerReset() {
        const pieces = 'IJLOSTZ'; // Indici 0-6
        const randomIndex = Math.floor(Math.random() * pieces.length);
        player.matrix = createPiece(randomIndex + 1); // +1 perché COLORS inizia da 1
        if (!player.matrix) { // Fallback se createPiece fallisce
             console.error("Failed to create piece with index:", randomIndex + 1);
             player.matrix = createPiece(1); // Crea un pezzo 'I' di default
        }

        // Posizione iniziale (centrata orizzontalmente, in alto)
        player.pos.y = 0;
        player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);

        // Controllo Game Over immediato
        if (collide(board, player)) {
            gameOver = true;
            playSound(gameOverSound);
             if (isMusicPlaying) {
                 backgroundMusic.pause();
                 isMusicPlaying = false;
             }
            addHighScore(player.score); // Salva il punteggio prima di resettarlo
            displayHighScores();
            // Non resettare subito board/score qui, lascia il game over visibile
            // Verrà resettato da resetGame() o all'avvio di un nuovo gioco
        }
    }

    function playerRotate(dir) {
        if (gameOver || isPaused || !player.matrix) return;

        const originalPos = player.pos.x;
        const originalMatrix = player.matrix; // Salva matrice originale
        let offset = 1;
        let rotatedMatrix = rotate(player.matrix, dir);
        player.matrix = rotatedMatrix; // Applica subito la rotazione per il check

        // Wall Kick Logic (tentativi di spostamento laterale)
        while (collide(board, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1)); // Alterna: +1, -1, +2, -2...
            // Limita lo spostamento laterale massimo alla larghezza del pezzo
            if (Math.abs(offset) > player.matrix[0].length) {
                // Se non si trova una posizione valida, ripristina tutto
                player.pos.x = originalPos;
                player.matrix = originalMatrix; // Ripristina la matrice originale
                return; // Rotazione fallita
            }
        }
        // Se la rotazione (con eventuale wall kick) è riuscita
        playSound(rotateSound);
    }

    function collide(board, player) {
        const matrix = player.matrix;
        const offset = player.pos;

        if (!matrix) return false; // Non può collidere se non c'è matrice

        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < matrix[y].length; ++x) {
                if (matrix[y][x] !== 0) { // Se è un blocco del pezzo
                    const boardX = x + offset.x;
                    const boardY = y + offset.y;

                    // 1. Collisione con i bordi laterali (sinistro/destro)
                    if (boardX < 0 || boardX >= COLS) {
                        return true;
                    }
                    // 2. Collisione con il fondo
                    if (boardY >= ROWS) {
                        return true;
                    }
                    // 3. Collisione con altri pezzi sulla board
                    // Controlla solo se boardY è un indice valido (>= 0)
                    if (boardY >= 0 && board[boardY] && board[boardY][boardX] !== 0) {
                        return true;
                    }
                }
            }
        }
        // Nessuna collisione trovata
        return false;
    }

    function sweepRows() {
        let rowCount = 0;
        outer: for (let y = ROWS - 1; y >= 0; --y) { // Itera dal basso verso l'alto
            for (let x = 0; x < COLS; ++x) {
                if (board[y][x] === 0) {
                    continue outer; // Se trova una cella vuota, passa alla riga sopra
                }
            }

            // Se arriva qui, la riga 'y' è piena
            const row = board.splice(y, 1)[0].fill(0); // Rimuovi la riga piena e riempila di 0
            board.unshift(row); // Aggiungi una nuova riga vuota in cima
            rowCount++;

            // Poiché abbiamo rimosso una riga, dobbiamo ricontrollare la stessa riga 'y' (che ora contiene la riga che era sopra)
            y++; // Incrementa y per compensare lo splice
        }

        if (rowCount > 0) {
            player.score += calculateScore(rowCount) * player.level;
            player.linesCleared += rowCount;

            // Controllo Level Up
            const currentLevelThreshold = LEVEL_UP_THRESHOLD * player.level; // Soglia dinamica (o mantieni fissa)
            if (player.linesCleared >= currentLevelThreshold) { // O usa LEVEL_UP_THRESHOLD fisso
                player.level++;
                // player.linesCleared -= currentLevelThreshold; // Opzionale: azzerare linee per livello
                // Aumenta velocità (riduci intervallo), con un limite minimo
                dropInterval = Math.max(100, dropInterval * SPEED_INCREASE_FACTOR); // Min 100ms
                console.log(`Level Up! New Level: ${player.level}, New Interval: ${dropInterval}`);
            }
            playSound(lineClearSound);
            updateScore(); // Aggiorna UI dopo il calcolo
        }
    }

    function calculateScore(rowCount) {
        // Punteggi standard Tetris
        switch (rowCount) {
            case 1: return 40;   // Single
            case 2: return 100;  // Double
            case 3: return 300;  // Triple
            case 4: return 1200; // Tetris
            default: return 0;
        }
    }

    function updateScore() {
        document.getElementById('score').innerText = player.score;
        document.getElementById('level').innerText = player.level;
    }

    function hardDrop() {
        if (gameOver || isPaused) return;
        // Continua a scendere finché non collide
        while (!collide(board, player)) {
            player.pos.y++;
        }
        player.pos.y--; // Torna indietro di uno (posizione valida)
        merge(board, player);
        playSound(hardDropSound);
        playerReset();
        sweepRows();
        updateScore();
        dropCounter = 0; // Resetta contatore caduta
    }

    // Funzione wrapper per riprodurre suoni (gestisce isMuted)
    function playSound(sound) {
        if (!isMuted && audioInitialized) { // Suona solo se non muto e audio inizializzato
             sound.currentTime = 0; // Riavvolgi prima di suonare
             sound.play().catch(e => console.warn(`Sound play failed for ${sound.src}:`, e.message));
        }
    }


    // --- Game Loop ---
    function update(time = 0) {
        if (isPaused) return; // Non fare nulla se in pausa
        if (gameOver) {
            // Disegna lo stato di Game Over ma non continuare il loop di gioco
            draw();
            // Cancella il frame richiesto precedentemente per fermare il loop
             if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            return;
        }

        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;

        if (dropCounter > dropInterval) {
            playerDrop(); // Fa scendere il pezzo automaticamente
        }

        draw(); // Disegna lo stato attuale
        animationFrameId = requestAnimationFrame(update); // Richiedi il prossimo frame
    }


    // --- Funzioni di Controllo UI ---
    function setDifficulty() {
        const difficulty = document.getElementById('difficulty').value;
        switch (difficulty) {
            case 'easy':
                dropInterval = 1200;
                break;
            case 'medium':
                dropInterval = 1000;
                break;
            case 'hard':
                dropInterval = 700;
                break;
            default:
                 dropInterval = 1000; // Default a medio
        }
        console.log(`Difficulty set to ${difficulty}, Interval: ${dropInterval}`);
        // Resetta il gioco quando la difficoltà cambia per applicare subito la velocità
        if (player) { // Resetta solo se il gioco è già stato inizializzato
             resetGame();
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        const muteButton = document.getElementById('mute-button');
        const baseVolume = 0.5; // Volume base per la musica

        // Applica muto/smuto a tutti i suoni
        rotateSound.volume = isMuted ? 0 : 1;
        moveSound.volume = isMuted ? 0 : 1;
        lineClearSound.volume = isMuted ? 0 : 1;
        gameOverSound.volume = isMuted ? 0 : 1;
        hardDropSound.volume = isMuted ? 0 : 1;
        backgroundMusic.volume = isMuted ? 0 : baseVolume;

        if (isMuted) {
            backgroundMusic.pause();
            isMusicPlaying = false; // La musica è tecnicamente ferma
            muteButton.textContent = 'Audio On';
            console.log("Audio Muted");
        } else {
             muteButton.textContent = 'Muto';
             console.log("Audio Unmuted");
            // Se non è in pausa E l'audio è inizializzato, riprendi la musica
            if (!isPaused && audioInitialized) {
                backgroundMusic.play().catch(e => console.warn("Unmute music play failed:", e.message));
                isMusicPlaying = true;
            } else if (!audioInitialized){
                 console.log("Audio not initialized yet, cannot play music on unmute.");
            } else {
                 console.log("Game is paused, music will not resume on unmute.");
            }
        }
    }

    function togglePause() {
        isPaused = !isPaused;
        const pauseButton = document.getElementById("pause-button");
        if (isPaused) {
            if (isMusicPlaying) {
                backgroundMusic.pause();
                 // Non impostare isMusicPlaying = false qui, ricorda solo che è stata messa in pausa
            }
            if (pauseButton) pauseButton.textContent = "Riprendi";
            console.log("Game Paused");
            // Ferma il game loop annullando il frame richiesto
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        } else {
            if (pauseButton) pauseButton.textContent = "Pausa";
            console.log("Game Resumed");
            // Riprendi la musica solo se non è muta e l'audio è inizializzato
            if (!isMuted && audioInitialized) {
                backgroundMusic.play().catch(e => console.warn("Resume music failed:", e.message));
                isMusicPlaying = true; // Ora sta suonando di nuovo
            }
            // Riavvia il game loop
            lastTime = performance.now(); // Resetta lastTime per evitare salti
            update();
        }
    }

    function resetGame() {
        console.log("Resetting game...");
        if (animationFrameId) { // Ferma il loop precedente se attivo
             cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
        }

        gameOver = false;
        isPaused = false; // Assicurati che non sia in pausa
        board = createMatrix(COLS, ROWS); // Crea una nuova board vuota
        player.score = 0;
        player.level = 1;
        player.linesCleared = 0;

        // Resetta intervallo basato sulla difficoltà selezionata CORRENTEMENTE
        const difficulty = document.getElementById('difficulty').value;
         switch (difficulty) {
            case 'easy': dropInterval = 1200; break;
            case 'medium': dropInterval = 1000; break;
            case 'hard': dropInterval = 700; break;
            default: dropInterval = 1000;
        }

        dropCounter = 0;
        lastTime = 0; // performance.now(); // O resetta a 0

        playerReset(); // Genera il primo pezzo
        updateScore(); // Aggiorna UI (punteggio 0, livello 1)
        displayHighScores(); // Mostra i punteggi migliori

        // Aggiorna stato UI bottoni
        const pauseButton = document.getElementById("pause-button");
         if (pauseButton) pauseButton.textContent = "Pausa";

        // Riavvia la musica se non è muta e l'audio è inizializzato
        if (audioInitialized && !isMuted) {
             backgroundMusic.currentTime = 0; // Riavvolgi
             backgroundMusic.play().catch(e => console.warn("Music play on reset failed:", e.message));
             isMusicPlaying = true;
        } else {
            backgroundMusic.pause();
            isMusicPlaying = false;
        }

        // Riavvia il game loop
        update();
    }

    // --- Funzioni per i Punteggi Migliori (Semplice, solo 1 punteggio) ---
    function addHighScore(score) {
        const currentHighScore = getHighScore();
        if (score > currentHighScore) {
            localStorage.setItem('tetrisHighScore', score);
            console.log(`New high score: ${score}`);
        }
    }

    function getHighScore() {
        // Usiamo parseInt per ottenere un numero, o 0 se non esiste/non è un numero
        return parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
    }

    function displayHighScores() {
        const bestScore = getHighScore();
        const highScoreList = document.getElementById('high-score-list');
        highScoreList.innerHTML = ''; // Pulisce la lista precedente
        const listItem = document.createElement('li');
        listItem.textContent = `Migliore: ${bestScore}`; // Testo più chiaro
        highScoreList.appendChild(listItem);
    }


    // --- Gestione Resize ---
    function resizeCanvas() {
        const container = document.querySelector('.container');
        const sidePanel = document.querySelector('.side-panel');
        const touchControls = document.querySelector('.touch-controls'); // Seleziona i controlli touch

        const containerWidth = container.clientWidth; // Usa clientWidth per padding/border
        const sidePanelWidth = sidePanel.offsetWidth; // Larghezza effettiva pannello laterale
        const availableWidth = containerWidth - sidePanelWidth - 60; // 60px per gap e margini vari

        // Calcola l'altezza disponibile (limitata dall'altezza della viewport meno altri elementi)
        const availableHeight = window.innerHeight - 100; // 100px per H1 e margini/spazi

        // Calcola la dimensione massima del blocco basata su larghezza E altezza
        const blockWidthBasedOnWidth = availableWidth / COLS;
        const blockWidthBasedOnHeight = availableHeight / ROWS;

        // Usa la dimensione più piccola per far stare tutto
        currentBlockSize = Math.max(8, Math.floor(Math.min(blockWidthBasedOnWidth, blockWidthBasedOnHeight))); // Minimo 8px

        // Imposta dimensioni canvas (multipli esatti della dimensione blocco)
        canvas.width = COLS * currentBlockSize;
        canvas.height = ROWS * currentBlockSize;

         // Adatta larghezza controlli touch alla larghezza del canvas
         if (touchControls) {
             touchControls.style.width = canvas.width + 'px';
         }

        console.log(`Resized: BlockSize=${currentBlockSize}, Canvas=${canvas.width}x${canvas.height}`);

        // Ridisegna tutto con la nuova dimensione
        draw();
    }

    // --- Inizializzazione ---
    function init() {
        console.log("Initializing Tetris...");
        // Inizializza variabili di stato principali
        player = {
            pos: { x: 0, y: 0 },
            matrix: null,
            score: 0,
            level: 1,
            linesCleared: 0
        };
        isMusicPlaying = false;
        isMuted = false;
        isPaused = false;
        audioInitialized = false; // Fondamentale resettarlo qui
        gameOver = false;
        animationFrameId = null; // Inizializza ID animazione

        // Imposta la difficoltà iniziale e resetta il gioco
        displayHighScores(); // Mostra subito i punteggi salvati
        setDifficulty();     // Questo chiama resetGame(), che inizializza board, player, ecc.

        resizeCanvas(); // Adatta subito le dimensioni

        // --- Gestione degli Eventi ---

        // Tastiera
        document.addEventListener('keydown', event => {
             handleFirstInteraction(); // Assicura inizializzazione audio alla prima pressione

             if (isPaused && event.key !== 'p' && event.key !== 'P') return; // Ignora input (tranne pausa) se in pausa
             if (gameOver) return; // Ignora input se game over

            switch (event.key) {
                case 'ArrowLeft':
                case 'a': // Aggiungi controllo WASD opzionale
                    playerMove(-1);
                    break;
                case 'ArrowRight':
                case 'd': // Aggiungi controllo WASD opzionale
                    playerMove(1);
                    break;
                case 'ArrowDown':
                case 's': // Aggiungi controllo WASD opzionale
                    playerDrop();
                    // Opzionale: aggiungi punteggio per soft drop
                    // player.score += 1;
                    // updateScore();
                    break;
                case 'q': // Rotazione Antioraria
                case 'Q':
                    playerRotate(-1);
                    break;
                case 'ArrowUp': // Tradizionalmente rotazione oraria
                case 'w':       // Aggiungi controllo WASD opzionale
                case 'e':       // O usa 'e' per rotazione oraria se 'w' è per hard drop
                    playerRotate(1);
                    break;
                case ' ': // Hard Drop
                    hardDrop();
                    break;
                case 'p': // Pausa
                case 'P':
                    togglePause();
                    break;
                case 'm': // Muto (opzionale)
                case 'M':
                     toggleMute();
                     break;
            }
            // Prevenire lo scroll della pagina con le frecce/spazio
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                 event.preventDefault();
            }
        });

        // Controlli Touch
        function handleTouch(event, action) {
            event.preventDefault(); // Impedisce comportamenti touch predefiniti (es. zoom)
            handleFirstInteraction(); // Inizializza audio al primo tocco

            if (isPaused || gameOver) return; // Ignora se in pausa o game over

            switch (action) {
                case 'moveLeft': playerMove(-1); break;
                case 'moveRight': playerMove(1); break;
                case 'rotateLeft': playerRotate(-1); break;
                case 'rotateRight': playerRotate(1); break;
                case 'softDrop': playerDrop(); break;
                case 'hardDrop': hardDrop(); break;
            }
        }

        // Associa eventi touch ai bottoni
        const touchControlsMap = {
            'move-left': 'moveLeft',
            'move-right': 'moveRight',
            'rotate-left': 'rotateLeft',
            'rotate-right': 'rotateRight',
            'soft-drop': 'softDrop',
            'hard-drop': 'hardDrop'
        };
        for (const [id, action] of Object.entries(touchControlsMap)) {
            const button = document.getElementById(id);
            if (button) {
                 // Usiamo 'touchstart' per reattività immediata
                button.addEventListener('touchstart', (event) => handleTouch(event, action), { passive: false });
                // Potresti voler aggiungere 'click' per supporto mouse su desktop
                // button.addEventListener('click', (event) => handleTouch(event, action));
            } else {
                 console.warn(`Touch control button with id "${id}" not found.`);
            }
        }

        // Bottoni UI
        document.getElementById('difficulty').addEventListener('change', () => {
             handleFirstInteraction(); // In caso sia la prima interazione
             setDifficulty();
        });
        document.getElementById('reset-button').addEventListener('click', () => {
             handleFirstInteraction();
             resetGame();
        });
         document.getElementById('mute-button').addEventListener('click', () => {
             handleFirstInteraction();
             toggleMute();
        });
        document.getElementById('pause-button').addEventListener('click', () => {
             handleFirstInteraction();
             togglePause();
        });

        // Resize finestra
        window.addEventListener('resize', resizeCanvas);

        // Avvia il game loop iniziale (verrà fermato/riavviato da pause/reset)
        // La chiamata iniziale a update è ora dentro resetGame() chiamato da setDifficulty()
        // update(); // Non più necessaria qui
        console.log("Initialization complete. Starting game loop via resetGame.");
    }

    // --- Avvio ---
    init();

});
