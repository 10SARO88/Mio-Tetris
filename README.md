      # Tetris in JavaScript
Un clone del classico gioco Tetris, sviluppato interamente con tecnologie web standard: HTML, CSS e JavaScript. Questo progetto è stato realizzato a scopo didattico e per dimostrare le potenzialità dello sviluppo web front-end.

## Caratteristiche

*   **Gameplay classico di Tetris:** I tetramini cadono, si possono muovere e ruotare, e le righe complete vengono eliminate.
*   **Controlli touch:** Progettato per essere giocabile su dispositivi mobili (smartphone e tablet) tramite pulsanti touch sullo schermo.
*   **Responsive design:** Il layout si adatta alle dimensioni dello schermo, garantendo una buona esperienza di gioco su diversi dispositivi.
*   **Punteggio e livello:** Tiene traccia del punteggio e del livello del giocatore.
*   **Musica ed effetti sonori:** Include musica di sottofondo ed effetti sonori per le azioni di gioco (rotazione, movimento, eliminazione righe, game over).
*   **Punteggi migliori (localStorage):** Salva il punteggio migliore nel localStorage del browser.
* **Selezione difficoltà:** Possibilità di scegliere il livello (Facile, Medio, Difficile)
* **Pulsanti di controllo**: Possibilità di mettere in pausa, mutare l'audio e ricominciare

## Come giocare

1.  **Clona o scarica il repository:**
    ```bash
    git clone https://github.com/tuonomeutente/Mio-Tetris.git  # Sostituisci con l'URL del tuo repository
    ```
    Oppure scarica l'archivio ZIP e decomprimilo.

2.  **Apri `index.html` nel browser:** Apri il file `index.html` in un browser web moderno (Chrome, Firefox, Safari, Edge).  È consigliabile giocare su un dispositivo mobile per sfruttare i controlli touch.

## Struttura del progetto

*   `index.html`:  La struttura HTML del gioco.
*   `style.css`:  Lo stile CSS per l'aspetto del gioco.
*   `script.js`:  Il codice JavaScript che implementa la logica del gioco, i controlli e il ridimensionamento.
*   `sounds/`:  Cartella contenente i file audio (musica ed effetti sonori).

## Controlli

### Desktop

*   **Frecce sinistra/destra:** Muovono il pezzo orizzontalmente.
*   **Freccia giù:** Caduta lenta del pezzo.
*   **Q / W:** Ruotano il pezzo in senso antiorario/orario.
*   **Spazio:** Caduta rapida (hard drop).
*   **P:** Mette il gioco in pausa/riprende il gioco.

### Mobile (Touch)

*   **Pulsanti sullo schermo:** Pulsanti dedicati per tutte le azioni (muovere a sinistra/destra, ruotare a sinistra/destra, caduta lenta, caduta rapida).

## Personalizzazione

*   **Difficoltà:** Puoi modificare la difficoltà del gioco cambiando la selezione nel menu a tendina apposito.
*   **Musica/Suoni:** Puoi attivare/disattivare la musica e gli effetti sonori tramite il pulsante "Muto".
*   **Aspetto:** Puoi modificare l'aspetto del gioco (colori, font, ecc.) modificando il file `style.css`.
*   **Logica di gioco:** Puoi modificare il comportamento del gioco (velocità, punteggi, ecc.) modificando il file `script.js`.

## Dipendenze

Il progetto non ha dipendenze esterne.  È scritto interamente in HTML, CSS e JavaScript "vanilla" (senza librerie o framework).

## Autore

Roberto - 10SARO88
