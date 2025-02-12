const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// --- Funzione per ridimensionare il canvas (ottimizzata) ---
function resizeCanvas() {
    const container = document.querySelector('.container');
    const containerWidth = container.offsetWidth;
    const sidePanelWidth = document.querySelector('.side-panel').offsetWidth; // Larghezza del side-panel

    // Calcola la larghezza disponibile per il canvas e i controlli
    const availableWidth = containerWidth - sidePanelWidth - 40; // 40 = 20px di gap * 2

    // Calcola la scala in base alla larghezza disponibile, ma non più grande di 1
    const scale = Math.min(1, availableWidth / 240); // 240 è la larghezza originale del canvas

    // Imposta larghezza e altezza del canvas
    canvas.width = 240 * scale;
    canvas.height = 400 * scale;

    // Aggiorna la larghezza dei controlli touch
    const touchControls = document.querySelector('.touch-controls');
    if (touchControls) {
        touchControls.style.width = canvas.width + 'px';
    }

    // Scala il contesto
    context.scale(20 * scale, 20 * scale);

    // Ridisegna tutto
    draw();
}


// --- Costanti ---
const ROWS = 20;  // Numero di righe della griglia di gioco
const COLS = 12;  // Numero di colonne della griglia di gioco
const GRID_COLOR = '#ddd'; // Colore della griglia
const INITIAL_DROP_INTERVAL = 1000; // Intervallo iniziale di caduta del pezzo (in millisecondi)
const LEVEL_UP_THRESHOLD = 15;     // Numero di righe eliminate per passare al livello successivo
const SPEED_INCREASE_FACTOR = 0.85; // Fattore di aumento della velocità ad ogni livello

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
    null,        // Nessun colore (per le celle vuote)
    '#00FFFF',  // Ciano (I)
    '#0000FF',  // Blu (J)
    '#FFA500',  // Arancione (L)
    '#FFFF00',  // Giallo (O)
    '#00FF00',  // Verde (S)
    '#800080',  // Viola (T)
    '#FF0000'   // Rosso (Z)
];

// --- Variabili di stato del gioco ---
let board = createMatrix(COLS, ROWS); // Griglia di gioco (inizialmente vuota)
let player = {      // Stato del giocatore
    pos: { x: 0, y: 0 },  // Posizione del pezzo corrente
    matrix: null,         // Forma del pezzo corrente
    score: 0,             // Punteggio
    level: 1,             // Livello
    linesCleared: 0       // Numero totale di righe eliminate
};
let dropCounter = 0;        // Contatore per la caduta del pezzo
let dropInterval = INITIAL_DROP_INTERVAL; // Intervallo di caduta (diminuisce con l'aumentare del livello)
let lastTime = 0;           // Timestamp dell'ultimo frame
let gameOver = false;       // Flag per indicare se il gioco è finito
let isMusicPlaying = false; // Flag per la musica

// --- Oggetti Audio (suoni) ---
const rotateSound = new Audio('sounds/rotate.ogg');
const moveSound = new Audio('sounds/move.ogg');
const lineClearSound = new Audio('sounds/line.ogg');
const gameOverSound = new Audio('sounds/gameover.ogg');
const hardDropSound = new Audio('sounds/harddrop.ogg');
const backgroundMusic = new Audio('sounds/background_music.ogg');

backgroundMusic.loop = true;  // Riproduci la musica in loop
backgroundMusic.volume = 0.5; // Volume della musica (0.0 - 1.0)

// --- Funzioni ---

// Crea una matrice (griglia) di dimensioni date, riempita con zeri
function createMatrix(width, height) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

// Crea un tetramino casuale
function createPiece(type) {
    switch (type) {
        case 1: return TETROMINOS[0]; // I
        case 2: return TETROMINOS[1]; // J
        case 3: return TETROMINOS[2]; // L
        case 4: return TETROMINOS[3]; // O
        case 5: return TETROMINOS[4]; // S
        case 6: return TETROMINOS[5]; // T
        case 7: return TETROMINOS[6]; // Z
        default: return null;
    }
}

// Disegna il gioco (griglia, pezzo corrente, ecc.)
function draw() {
    // Sfondo
    context.fillStyle = '#444';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Griglia di gioco
    drawMatrix(board, { x: 0, y: 0 });

    // Pezzo corrente
    drawMatrix(player.matrix, player.pos);

    // Griglia (linee)
    drawGrid();
}

// Disegna la griglia (linee)
function drawGrid() {
     const scaledLineWidth = 0.05 * Math.min(canvas.width / (COLS * 20), canvas.height / (ROWS * 20));
    context.strokeStyle = GRID_COLOR;
    context.lineWidth = scaledLineWidth;

      for (let i = 0; i <= ROWS; i++) {
        context.beginPath();
        context.moveTo(0, i * (canvas.height / context.canvas.height));
        context.lineTo(canvas.width, i * (canvas.height / context.canvas.height));
        context.stroke();
    }
    for (let i = 0; i <= COLS; i++) {
        context.beginPath();
        context.moveTo(i * (canvas.width/context.canvas.width), 0);
        context.lineTo(i * (canvas.width/context.canvas.width), canvas.height);
        context.stroke();
    }
}

// Funzione di utilità per disegnare una matrice (pezzo o griglia)
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            } else {
                // Cella vuota
                context.fillStyle = '#666';
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Unisce il pezzo corrente alla griglia di gioco
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
    const rotated = createMatrix(m, m); // Crea una matrice vuota delle stesse dimensioni
    for (let i = 0; i < m; ++i) {
        for (let j = 0; j < m; ++j) {
            if (dir > 0) {
                // Rotazione in senso orario
                rotated[j][m - 1 - i] = matrix[i][j];
            } else {
                // Rotazione in senso antiorario
                rotated[m - 1 - j][i] = matrix[i][j];
            }
        }
    }
    return rotated;
}

// Fa cadere il pezzo di una riga
function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        // Se c'è collisione, torna indietro di una riga
        player.pos.y--;
        merge(board, player); // Unisce il pezzo alla griglia
        playerReset();     // Crea un nuovo pezzo
        sweepRows();       // Controlla se ci sono righe complete
        updateScore();     // Aggiorna il punteggio
    }
    dropCounter = 0; // Resetta il contatore di caduta
}

// Muove il pezzo orizzontalmente
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        // Se c'è collisione, torna indietro
        player.pos.x -= dir;
    } else {
        // Riproduci il suono del movimento (solo se non c'è collisione)
        moveSound.currentTime = 0;
        moveSound.play();
    }
}

// Crea un nuovo pezzo casuale all'inizio o dopo che un pezzo è stato posizionato
function playerReset() {
    const pieces = '1234567'; // Stringa con i tipi di pezzi possibili
    player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)] | 0); // Scegli un pezzo a caso
    player.pos.y = 0;  // Posiziona il pezzo in cima
    player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0); // Centra il pezzo orizzontalmente

    // Se il nuovo pezzo collide immediatamente, il gioco è finito
    if (collide(board, player)) {
        gameOver = true;
        gameOverSound.play(); // Riproduci il suono di game over
        updateScore();       // Aggiorna il punteggio (per l'ultima volta)
        board.forEach(row => row.fill(0)); // Svuota la griglia
        player.score = 0;    // Resetta il punteggio
        player.level = 1;    // Resetta il livello
        player.linesCleared = 0; // Resetta le righe eliminate
    }
}

// Ruota il pezzo corrente
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    let rotatedMatrix = rotate(player.matrix, dir); // Ruota la copia del pezzo

    // Gestione delle collisioni durante la rotazione (wall kick)
    while (collide(board, { ...player, matrix: rotatedMatrix })) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            // Se non è possibile ruotare il pezzo, annulla la rotazione
            rotate(player.matrix, -dir);
            player.pos.x = pos; // Ripristina la posizione originale
            return;
        }
    }

    // Se la rotazione è possibile, applica la rotazione
    player.matrix = rotatedMatrix;
    rotateSound.currentTime = 0;
    rotateSound.play(); // Riproduci il suono di rotazione
}

// Controlla se c'è collisione tra il pezzo corrente e la griglia o i bordi
function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {

            if (y + o.y < 0) {
                continue;  // Salta il controllo se siamo fuori dalla griglia in alto
            }

            // Controlla se c'è una cella occupata nel pezzo e se la cella corrispondente nella griglia è occupata
            if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x] !== 0)) {
                return true; // C'è collisione
            }
        }
    }
    return false; // Non c'è collisione
}

// Controlla ed elimina le righe complete
function sweepRows() {
    let rowCount = 0; // Numero di righe complete trovate

    // Itera attraverso le righe della griglia, partendo dal basso
    outer: for (let y = board.length - 1; y > 0; --y) {
        // Controlla se la riga corrente è completa
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer; // Se c'è una cella vuota, passa alla riga successiva
            }
        }

        // Se la riga è completa:
        const row = board.splice(y, 1)[0].fill(0); // Rimuovi la riga e riempila con zeri
        board.unshift(row); // Aggiungi la riga vuota in cima alla griglia
        ++y; // Controlla di nuovo la stessa riga (perché le righe sopra sono scese)
        rowCount++; // Incrementa il contatore delle righe complete
    }

    // Se sono state eliminate delle righe:
    if (rowCount > 0) {
        player.score += calculateScore(rowCount) * player.level; // Aggiorna il punteggio
        player.linesCleared += rowCount; // Aggiorna il numero di righe eliminate

        // Controlla se è necessario aumentare il livello
        if (player.linesCleared >= LEVEL_UP_THRESHOLD) {
            player.level++;  // Incrementa il livello
            player.linesCleared -= LEVEL_UP_THRESHOLD; // Resetta il contatore delle righe per il livello corrente
            dropInterval *= SPEED_INCREASE_FACTOR; // Aumenta la velocità di caduta
        }

        lineClearSound.currentTime = 0;
        lineClearSound.play(); // Riproduci il suono di eliminazione riga
        updateScore(); // Aggiorna la visualizzazione del punteggio
    }
}

// Calcola il punteggio in base al numero di righe eliminate contemporaneamente
function calculateScore(rowCount) {
     let score = 0;
    switch (rowCount) {
        case 1: score = 40; break;   // 1 riga: 40 punti
        case 2: score = 100; break;  // 2 righe: 100 punti
        case 3: score = 300; break;  // 3 righe: 300 punti
        case 4: score = 1200; break; // 4 righe: 1200 punti
    }
    return score;
}

// Aggiorna la visualizzazione del punteggio e del livello
function updateScore() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;

    // Se il gioco è finito, aggiungi il punteggio ai punteggi migliori
    if (gameOver) {
        addHighScore(player.score);
        displayHighScores();
    }
}

// Funzione principale di aggiornamento del gioco (chiamata ad ogni frame)
function update(time = 0) {
    if (!isPaused && !gameOver) { // Aggiorna solo se il gioco non è in pausa e non è finito
        const deltaTime = time - lastTime; // Calcola il tempo trascorso dall'ultimo frame
        lastTime = time;

        dropCounter += deltaTime; // Aggiorna il contatore di caduta
        if (dropCounter > dropInterval) {
            playerDrop(); // Fa cadere il pezzo
        }

        draw(); // Ridisegna il gioco
        requestAnimationFrame(update); // Richiedi il prossimo frame (chiamata ricorsiva)
    }
}

// --- Funzioni per difficoltà, muting, pausa e high scores ---

// Imposta la difficoltà del gioco
function setDifficulty() {
    const difficulty = document.getElementById('difficulty').value;
    switch (difficulty) {
        case 'easy':
            dropInterval = 1500; // Facile: intervallo più lungo
            break;
        case 'medium':
            dropInterval = 1000; // Medio: intervallo standard
            break;
        case 'hard':
            dropInterval = 800;  // Difficile: intervallo più breve
            break;
    }
    resetGame(); // Resetta il gioco per applicare la nuova difficoltà
}

// Attiva/disattiva l'audio
let isMuted = false;
function toggleMute() {
    isMuted = !isMuted; // Inverte lo stato (true -> false, false -> true)

    // Imposta il volume di tutti i suoni in base allo stato di mute
    rotateSound.volume = isMuted ? 0 : 1;
    moveSound.volume = isMuted ? 0 : 1;
    lineClearSound.volume = isMuted ? 0 : 1;
    gameOverSound.volume = isMuted ? 0 : 1;
    hardDropSound.volume = isMuted ? 0 : 1;
    backgroundMusic.volume = isMuted ? 0 : 0.5; // Volume della musica più basso

    // Aggiorna il testo del pulsante
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
        muteButton.textContent = isMuted ? ' আনমিউট' : 'মিউট';
    }
}

// Mette in pausa/riprende il gioco
let isPaused = false;
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        backgroundMusic.pause(); // Metti in pausa la musica
        const pauseButton = document.getElementById("pause-button");
        if(pauseButton) pauseButton.textContent = "চালু করুন";
    } else {
        backgroundMusic.play();  // Riprendi la musica
        update();              // Riprendi il ciclo di gioco
        const pauseButton = document.getElementById("pause-button");
        if(pauseButton) pauseButton.textContent = "বিরতি দিন";
    }
}

// Avvia la musica (solo alla prima interazione dell'utente)
function startMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.currentTime = 0; // Assicurati che la musica inizi dall'inizio
        backgroundMusic.play();
        isMusicPlaying = true;
    }
}

// Resetta il gioco
function resetGame() {
    gameOver = false;
    board = createMatrix(COLS, ROWS); // Ricrea la griglia vuota
    player.score = 0;
    player.level = 1;
    player.linesCleared = 0;
    playerReset(); // Crea un nuovo pezzo
    if (!isPaused) { // Solo se non è in pausa, avvia l'update
        update();
    }
}

// Aggiunge il punteggio corrente ai punteggi migliori (localStorage)
function addHighScore(score) {
    const bestScore = getHighScores();
    if (score > bestScore) localStorage.setItem('highScore', score); //salva il record
}

// Recupera i punteggi migliori dal localStorage
function getHighScores() {
    const highScoreJSON = localStorage.getItem('highScore');
    return highScoreJSON ? parseInt(highScoreJSON, 10) : 0;
}

// Visualizza i punteggi migliori
function displayHighScores() {
    const bestScore = getHighScores();
    const highScoreList = document.getElementById('high-score-list');

    // Pulisci la lista precedente
    highScoreList.innerHTML = '';

    // Crea un nuovo elemento <li> per ogni punteggio
    const listItem = document.createElement('li');
    listItem.textContent = `Punteggio: ${bestScore}`;
    highScoreList.appendChild(listItem);
}

// --- Gestione dell'input (TASTIERA - lascialo per compatibilità) ---
document.addEventListener('keydown', event => {
     if (event.key === 'ArrowLeft') {
        startMusic();
        playerMove(-1); // Muovi a sinistra
    } else if (event.key === 'ArrowRight') {
        startMusic();
        playerMove(1);  // Muovi a destra
    } else if (event.key === 'ArrowDown') {
        startMusic();
        playerDrop();     // Caduta lenta
    } else if (event.key === 'q') {
        startMusic();
        playerRotate(-1); // Ruota a sinistra
    } else if (event.key === 'w') {
        startMusic();
        playerRotate(1);  // Ruota a destra
    }  else if (event.key === ' ') {
        startMusic();
        hardDrop(); //Caduta istantanea
    } else if (event.key === 'p' || event.key === 'P') {
        startMusic();
        togglePause(); // Pausa
    }
});

// --- Gestione dell'input (TOUCH) ---
document.getElementById('move-left').addEventListener('touchstart', (event) => {
    event.preventDefault(); // Impedisci il comportamento predefinito del touch (es. scrolling)
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

// --- Gestione eventi pulsanti (difficoltà, reset, mute, pausa) ---
document.getElementById('difficulty').addEventListener('change', () => {
    startMusic();
    setDifficulty(); // Imposta la difficoltà
});

document.getElementById('reset-button').addEventListener('click', () => {
    startMusic();
    resetGame(); // Resetta il gioco
});

document.getElementById('mute-button').addEventListener('click', () => {
    startMusic();
    toggleMute(); // Attiva/disattiva l'audio
});

document.getElementById('pause-button').addEventListener('click', () => {
    startMusic();
    togglePause(); // Mette in pausa/riprende il gioco
});

// --- Hard Drop (caduta istantanea) ---
function hardDrop() {
    while (!collide(board, player)) {
        player.pos.y++; // Continua a far cadere il pezzo finché non collide
    }
    player.pos.y--; // Torna indietro di una riga (perché l'ultima mossa ha causato la collisione)
    merge(board, player); // Unisci il pezzo alla griglia
    playerReset();     // Crea un nuovo pezzo
    sweepRows();       // Controlla le righe complete
    updateScore();     // Aggiorna il punteggio
    dropCounter = 0;        // Resetta il contatore di caduta
    hardDropSound.currentTime = 0;
    hardDropSound.play();   // Riproduci il suono di hard drop
}


// --- Caricamento e ridimensionamento iniziale ---

window.addEventListener('resize', resizeCanvas); // Ridimensiona il canvas quando la finestra viene ridimensionata
resizeCanvas(); // Chiamalo all'inizio per impostare le dimensioni corrette
displayHighScores(); // Visualizza subito i migliori punteggi
setDifficulty();     // Imposta la difficoltà iniziale
