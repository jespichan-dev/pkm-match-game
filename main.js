// ======== GAME STATE VARIABLES ========

// Track how many cards are currently flipped (max 2)
let tarjetasDestapadas = 0;

// References to the currently flipped cards
let tarjeta1 = null;
let tarjeta2 = null;

// Values behind those cards (Pokémon IDs)
let primerResultado = null;
let segundoResultado = null;

// Track moves and successful matches
let movimientos = 0;
let aciertos = 0;

// Game flow control
let temporizadorIniciado = false; // Ensures timer starts only once
let bloqueoTemporal = false; // Blocks interaction during mismatch animations

// Timer variables
let timer = 150; // Total time to play
const timerInicial = 150; // For score display after win
let tiempoRegresivoId = null; // Timer interval ID

// ======== CREATE 9x8 GAME BOARD (72 CARDS) ========

const tablero = document.getElementById("tablero"); // Board container
const botones = []; // Store all card buttons

// Set grid layout to 8 columns
tablero.style.gridTemplateColumns = "repeat(9, 1fr)";

// Dynamically create 72 buttons (cards)
for (let i = 0; i < 72; i++) {
  const carta = document.createElement("button");
  carta.id = i; // Assign unique ID
  carta.onclick = () => destapar(i); // Add click handler
  tablero.appendChild(carta); // Add to board
  botones.push(carta); // Store reference
}

// ======== AUDIO FEEDBACK ========
const audios = {
  win: new Audio("./resources/sounds/win.wav"),
  lose: new Audio("./resources/sounds/loseAudio.wav"),
  click: new Audio("./resources/sounds/clickAudio.wav"),
  right: new Audio("./resources/sounds/right.wav"),
  wrong: new Audio("./resources/sounds/wrongAudio.wav"),
};

// Helper to play audio without overlap
function playAudio(key) {
  const audio = audios[key];
  audio.pause();
  audio.currentTime = 0;
  audio.play();
}

// ======== DOM ELEMENT REFERENCES FOR UI ========
const mostrarMovimientos = document.getElementById("movimientos");
const mostrarAciertos = document.getElementById("aciertos");
const mostrarTiempo = document.getElementById("t-restante");

// ======== SETUP POKÉMON PAIRS (FROM 1–1025) ========
let numeros = []; // Shuffled IDs for cards
let pokemonMap = {}; // Maps ID to image URL

// Preload Pokémon image to avoid flicker
function preloadImage(src) {
  const img = new Image();
  img.src = src;
}

// Fetch and assign Pokémon pairs
async function cargarPokemones() {
  let ids = [];

  // Step 1: Pick 36 unique random Pokémon IDs
  while (ids.length < 36) {
    const id = Math.floor(Math.random() * 1025) + 1;
    if (!ids.includes(id)) ids.push(id);
  }

  // Step 2: Duplicate each ID to form 36 pairs
  const pares = [...ids, ...ids];

  // Step 3: Shuffle array using Fisher-Yates
  for (let i = pares.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pares[i], pares[j]] = [pares[j], pares[i]];
  }

  numeros = pares; // Store shuffled deck

  // Step 4: Fetch Pokémon image for each unique ID and preload it
  const promises = ids.map((id) =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      .then((res) => res.json())
      .then((data) => {
        const imgSrc = data.sprites.front_shiny; // Use shiny sprite
        pokemonMap[id] = imgSrc; // Save to map
        preloadImage(imgSrc); // Preload image
      })
  );

  await Promise.all(promises); // Wait for all images to load
}

// ======== CARD DISPLAY HELPERS ========

// Return <img> tag with Pokémon image for a given card
function mostrarImagen(id) {
  const pokeId = numeros[id];
  const imgSrc = pokemonMap[pokeId];
  return `<img src="${imgSrc}" alt="pokemon" />`;
}

// Show or hide a card
function mostrarCarta(id, mostrar = true) {
  const btn = botones[id];
  btn.innerHTML = mostrar ? mostrarImagen(id) : ""; // Show image or clear
  btn.disabled = mostrar; // Disable if showing (prevents re-click)
}

// ======== TIMER HANDLING ========

// Start countdown timer
function contarTiempo() {
  mostrarTiempo.textContent = `Tiempo: ${timer} segundos`;

  tiempoRegresivoId = setInterval(() => {
    timer--;
    mostrarTiempo.textContent = `Tiempo: ${timer} segundos`;

    // If time runs out
    if (timer <= 0) {
      clearInterval(tiempoRegresivoId);
      bloquearTarjetas(); // Show all cards and disable
      playAudio("lose"); // Play losing sound
    }
  }, 1000); // Update every second
}

// Show all cards and disable interaction
function bloquearTarjetas() {
  for (let i = 0; i < botones.length; i++) {
    mostrarCarta(i, true);
    botones[i].disabled = true;
  }
}

// ======== TURN RESET AFTER MATCH / MISMATCH ========

function resetTurn() {
  tarjetasDestapadas = 0;
  tarjeta1 = null;
  tarjeta2 = null;
  bloqueoTemporal = false;
}

// ======== MAIN LOGIC: CARD FLIP HANDLER ========

function destapar(id) {
  if (bloqueoTemporal || tarjetasDestapadas >= 2) return; // Ignore if locked

  const tarjeta = botones[id];
  if (tarjeta.disabled || tarjeta === tarjeta1) return; // Ignore invalid clicks

  // Start timer on first interaction
  if (!temporizadorIniciado) {
    contarTiempo();
    temporizadorIniciado = true;
  }

  mostrarCarta(id, true); // Show image
  playAudio("click");

  if (tarjetasDestapadas === 0) {
    // First card flipped
    tarjeta1 = tarjeta;
    primerResultado = numeros[id];
    tarjetasDestapadas = 1;
  } else {
    // Second card flipped
    tarjeta2 = tarjeta;
    segundoResultado = numeros[id];
    tarjetasDestapadas = 2;

    movimientos++; // Count move
    mostrarMovimientos.textContent = `Movimientos: ${movimientos}`;
    bloqueoTemporal = true; // Lock interaction

    if (primerResultado === segundoResultado) {
      // Match found
      aciertos++;
      mostrarAciertos.textContent = `Aciertos: ${aciertos}`;
      playAudio("right");
      resetTurn();

      // Win condition
      if (aciertos === 36) {
        clearInterval(tiempoRegresivoId);
        mostrarTiempo.textContent = `Fantástico: ${
          timerInicial - timer
        } segundos`;
        playAudio("win");
      }
    } else {
      // Mismatch: flip cards back after delay
      playAudio("wrong");
      setTimeout(() => {
        mostrarCarta(tarjeta1.id, false);
        mostrarCarta(tarjeta2.id, false);
        resetTurn();
      }, 700);
    }
  }
}

// ======== INIT GAME: LOAD IMAGES FIRST ========
cargarPokemones();
