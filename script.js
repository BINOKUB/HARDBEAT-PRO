/* ==========================================
   HARDBEAT PRO - CORE ENGINE (script.js)
   ========================================== */

// 1. CONFIGURATION ET VARIABLES GLOBALES
const stepsPerPage = 16;
let isPlaying = false;
let currentStep = 0;
let timerSeq1;

// Le "Carnet de notes" pour le son du Kick
let kickSettings = {
    pitch: 150,
    decay: 0.5,
    level: 0.8
};

// Moteur Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 2. GÉNÉRATION DE L'INTERFACE
function generateSteps(containerId, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 
    for (let i = 0; i < stepsPerPage; i++) {
        const step = document.createElement('div');
        step.classList.add(className);
        step.dataset.index = i;
        const led = document.createElement('div');
        led.classList.add('led');
        step.appendChild(led);
        container.appendChild(step);
    }
}

function generateFaders(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < stepsPerPage; i++) {
        const faderContainer = document.createElement('div');
        faderContainer.classList.add('fader-unit');
        const fader = document.createElement('input');
        fader.type = 'range';
        fader.classList.add('freq-fader');
        fader.min = 20;
        fader.max = 15000;
        const label = document.createElement('span');
        label.innerText = '---Hz';
        label.classList.add('hz-label');
        faderContainer.appendChild(label);
        faderContainer.appendChild(fader);
        container.appendChild(faderContainer);
    }
}

function generateDrumControls() {
    const container = document.querySelector('.track-selectors');
    if (!container) return;
    const controlsHtml = `
        <div id="drum-params" style="margin-left: 20px; display: flex; gap: 15px; align-items: center; border-left: 2px solid #333; padding-left: 20px;">
            <div class="param">
                <label style="font-size: 10px; display: block; color: #888;">PITCH</label>
                <input type="range" id="kick-pitch" min="50" max="300" value="150" style="width: 80px;">
            </div>
            <div class="param">
                <label style="font-size: 10px; display: block; color: #888;">DECAY</label>
                <input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5" style="width: 80px;">
            </div>
            <div class="param">
                <label style="font-size: 10px; display: block; color: #888;">LEVEL</label>
                <input type="range" id="kick-level" min="0" max="1" step="0.1" value="0.8" style="width: 80px;">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', controlsHtml);

    // Connexion aux réglages
    document.getElementById('kick-pitch').addEventListener('input', (e) => kickSettings.pitch = parseFloat(e.target.value));
    document.getElementById('kick-decay').addEventListener('input', (e) => kickSettings.decay = parseFloat(e.target.value));
    document.getElementById('kick-level').addEventListener('input', (e) => kickSettings.level = parseFloat(e.target.value));
}

// 3. LOGIQUE AUDIO
function playKick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const startFreq = kickSettings.pitch;
    const duration = kickSettings.decay;

    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Variable pour savoir quel instrument on est en train d'éditer visuellement
let currentTrackIndex = 0; 

// On crée une mémoire pour les 5 pistes (0=KIK, 1=SNARE, 2=HH-C, 3=HH-O, 4=FM)
// Chaque piste contient 64 pas (4 pages de 16)
let drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));

function runTick() {
    if (!isPlaying) return;

    const bpm1 = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm1) / 4 * 1000;

    // 1. Gestion visuelle (La lumière qui défile sur les 16 pads)
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) {
        allPads[currentStep].style.borderColor = "#ffffff";
    }

    // 2. LOGIQUE SONORE : On vérifie les 5 pistes en même temps à chaque pas !
    // (C'est ça qui permet de faire jouer un Kick et un Snare sur le même temps)
    
    if (drumSequences[0][currentStep]) playKick();  // Piste 0 : KIK
    if (drumSequences[1][currentStep]) playSnare(); // Piste 1 : SNARE
    // (On ajoutera les autres ici plus tard)

    // 3. Avancement du pas
    currentStep = (currentStep + 1) % 16; // Pour l'instant on reste sur 16 pas
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// 4. INTERACTION ET ÉVÉNEMENTS
function initFaderLogic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const faders = container.querySelectorAll('.freq-fader');
    faders.forEach(fader => {
        fader.addEventListener('input', (e) => {
            const label = e.target.previousElementSibling;
            label.innerText = e.target.value + "Hz";
            label.style.color = "#00f3ff";
        });
    });
}

function setupTempoDrag(displayId) {
    const display = document.getElementById(displayId);
    if (!display) return;
    let isDragging = false;
    let startY = 0;
    let startBpm = 0;

    display.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startBpm = parseInt(display.innerText);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = Math.floor((startY - e.clientY) / 2);
        let newBpm = Math.max(40, Math.min(220, startBpm + delta));
        display.innerText = newBpm;
    });

    window.addEventListener('mouseup', () => isDragging = false);
}

// Clic sur les pads
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('step-pad')) {
        const pad = e.target;
        const led = pad.querySelector('.led');
        pad.classList.toggle('active');
        if (pad.classList.contains('active')) {
            led.style.background = "#ff0000";
            led.style.boxShadow = "0 0 10px #ff0000";
        } else {
            led.style.background = "#330000";
            led.style.boxShadow = "none";
        }
    }
});

// Bouton Play/Stop
const playBtn = document.getElementById('master-play-stop');
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false;
        clearTimeout(timerSeq1);
        playBtn.innerText = "PLAY / STOP";
        playBtn.style.background = "#222";
    } else {
        isPlaying = true;
        playBtn.innerText = "STOP";
        playBtn.style.background = "#ff0000";
        runTick();
    }
});

// Bouton Extension SEQ 3
document.getElementById('add-seq-btn').addEventListener('click', function() {
    if (document.getElementById('seq3-container')) return;
    const seq2 = document.getElementById('seq2-container');
    const seq3 = seq2.cloneNode(true);
    seq3.id = 'seq3-container';
    seq3.querySelector('h2').innerText = 'SEQ 3 : FREQ SYNTH (LAYER)';
    seq3.querySelector('.bpm-control label').innerText = 'TEMPO 3';
    seq3.querySelector('.freq-sliders-container').id = 'grid-freq-seq3';
    seq3.querySelector('.step-grid').id = 'grid-seq3';
    document.getElementById('extension-zone').appendChild(seq3);
    generateSteps('grid-seq3', 'step-pad');
    generateFaders('grid-freq-seq3');
    initFaderLogic('grid-freq-seq3');
    this.disabled = true;
    this.style.opacity = "0.5";
});

// 5. INITIALISATION FINALE
window.onload = () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
   generateSnareControls();
    initFaderLogic('grid-freq-seq2');
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    console.log("HARDBEAT PRO : Moteurs prêts.");
};


//************************************************************ ****************** PARTIE DU SNARE *********************************************************************************************

// 1. Réglages du Snare
let snareSettings = {
    snappy: 1,  // Quantité de bruit (le timbre)
    tone: 1000, // Fréquence du filtre
    level: 0.6
};

// 2. Fonction pour créer le bruit blanc (essentiel pour le Snare)
function playSnare() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Création d'un buffer de bruit blanc
    const bufferSize = audioCtx.sampleRate * 0.2; // 200ms de bruit
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filtre pour donner du "Tone" au Snare
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(snareSettings.tone, audioCtx.currentTime);

    const noiseGain = audioCtx.createGain();
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    // Enveloppe du Snare
    noiseGain.gain.setValueAtTime(snareSettings.level, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2 * snareSettings.snappy);

    noiseSource.start();
    noiseSource.stop(audioCtx.currentTime + 0.2);
}

// 3. Fonction pour générer les boutons du Snare (Interface)
function generateSnareControls() {
    const container = document.querySelector('.track-selectors');
    const controlsHtml = `
        <div id="snare-params" style="margin-left: 20px; display: flex; gap: 15px; align-items: center; border-left: 2px solid #333; padding-left: 20px;">
            <div class="param">
                <label style="font-size: 10px; display: block; color: #888;">SNAPPY</label>
                <input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1" style="width: 80px;">
            </div>
            <div class="param">
                <label style="font-size: 10px; display: block; color: #888;">TONE</label>
                <input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000" style="width: 80px;">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', controlsHtml);

    // Écouteurs Snare
    document.getElementById('snare-snappy').addEventListener('input', (e) => snareSettings.snappy = parseFloat(e.target.value));
    document.getElementById('snare-tone').addEventListener('input', (e) => snareSettings.tone = parseFloat(e.target.value));
}
