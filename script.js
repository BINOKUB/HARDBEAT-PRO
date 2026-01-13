/* ==========================================
   HARDBEAT PRO - CORE ENGINE (script.js)
   ========================================== */

// 1. CONFIGURATION ET MÉMOIRE
const stepsPerPage = 16;
let isPlaying = false;
let currentStep = 0;
let timerSeq1;

// Index de la piste actuellement affichée (0=KIK, 1=SNARE, etc.)
let currentTrackIndex = 0; 

// Mémoire des séquences : 5 pistes de 16 pas
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));

let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };

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

// 3. LOGIQUE AUDIO
function playKick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(kickSettings.pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    gain.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    osc.start(); osc.stop(audioCtx.currentTime + kickSettings.decay);
}

function playSnare() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 0.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(snareSettings.tone, audioCtx.currentTime);
    const noiseGain = audioCtx.createGain();
    noiseSource.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noiseGain.gain.setValueAtTime(snareSettings.level, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2 * snareSettings.snappy);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + 0.2);
}

function runTick() {
    if (!isPlaying) return;

    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000;

    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    // Moteur de lecture Polyphonique
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false); // Close
    if (drumSequences[3][currentStep]) playHiHat(true);  // Open

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// 4. INTERACTION PADS ET PISTES
function updatePadVisuals() {
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach((pad, i) => {
        const led = pad.querySelector('.led');
        if (drumSequences[currentTrackIndex][i]) {
            pad.classList.add('active');
            led.style.background = "#ff0000";
            led.style.boxShadow = "0 0 10px #ff0000";
        } else {
            pad.classList.remove('active');
            led.style.background = "#330000";
            led.style.boxShadow = "none";
        }
    });
}

// --- GESTION DES CLICS (PADS ET BOUTONS DE PISTES) ---
document.addEventListener('click', (e) => {
    
    // 1. CLIC SUR UN PAD (Séquenceur 1)
    if (e.target.closest('.step-pad') && e.target.closest('#grid-seq1')) {
        const pad = e.target.closest('.step-pad');
        const index = parseInt(pad.dataset.index);
        
        // On inverse l'état dans la mémoire (vrai/faux)
        drumSequences[currentTrackIndex][index] = !drumSequences[currentTrackIndex][index];
        
        // On met à jour le visuel immédiatement
        updatePadVisuals();
    }

    // 2. CLIC SUR UN BOUTON DE PISTE (KIK, SNARE, etc.)
    if (e.target.classList.contains('track-btn')) {
        // Design des boutons : on enlève l'allumage cyan des autres, on l'active sur celui-ci
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // On change l'index de la piste (0 pour Kik, 1 pour Snare...)
        currentTrackIndex = parseInt(e.target.dataset.track);
        
        // --- LES DEUX ACTIONS MAGIQUES ---
        updatePadVisuals();    // 1. On montre les pads rouges de CET instrument
        showParamsForTrack(currentTrackIndex); // 2. On montre les SLIDERS de CET instrument
    }
});

// Cette fonction doit aussi être présente pour que showParamsForTrack fonctionne :
function showParamsForTrack(trackIndex) {
    document.querySelectorAll('.instr-params').forEach(el => {
        el.style.display = 'none';
    });
    const activeParams = document.getElementById(`params-track-${trackIndex}`);
    if (activeParams) {
        activeParams.style.display = 'flex';
    }
}

// 5. RÉGLAGES UI
function generateDrumControls() {
    const container = document.querySelector('.track-selectors');
    const html = `
        <div id="instruments-params-container" style="margin-left:20px; border-left:2px solid #333; padding-left:20px;">
            <div id="params-track-0" class="instr-params" style="display:flex; gap:15px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">KICK ></span>
                <div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div>
                <div class="group"><label>DECAY</label><input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5"></div>
            </div>
            <div id="params-track-1" class="instr-params" style="display:none; gap:15px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">SNARE ></span>
                <div class="group"><label>SNAPPY</label><input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1"></div>
                <div class="group"><label>TONE</label><input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000"></div>
            </div>
            <div id="params-track-2" class="instr-params" style="display:none; gap:15px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">HH-CLOSE ></span>
                <div class="group"><label>TONE</label><input type="range" id="hhc-tone" min="4000" max="12000" step="100" value="8000"></div>
            </div>
            <div id="params-track-3" class="instr-params" style="display:none; gap:15px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">HH-OPEN ></span>
                <div class="group"><label>DECAY</label><input type="range" id="hho-decay" min="0.1" max="0.8" step="0.05" value="0.3"></div>
            </div>
        </div>`;
    
    container.insertAdjacentHTML('beforeend', html);

    // Écouteurs pour tous les instruments
   document.getElementById('hhc-level').oninput = (e) => hhSettings.levelClose = parseFloat(e.target.value);
    document.getElementById('hho-level').oninput = (e) => hhSettings.levelOpen = parseFloat(e.target.value);
    document.getElementById('kick-pitch').oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
    document.getElementById('kick-decay').oninput = (e) => kickSettings.decay = parseFloat(e.target.value);
    document.getElementById('snare-snappy').oninput = (e) => snareSettings.snappy = parseFloat(e.target.value);
    document.getElementById('snare-tone').oninput = (e) => snareSettings.tone = parseFloat(e.target.value);
    document.getElementById('hhc-tone').oninput = (e) => hhSettings.tone = parseFloat(e.target.value);
    document.getElementById('hho-decay').oninput = (e) => hhSettings.decayOpen = parseFloat(e.target.value);
}

// ****************** PARTIE DES HI-HATS ******************

let hhSettings = {
    tone: 8000,
    decayClose: 0.05,
    decayOpen: 0.3,
    levelClose: 0.4, // Nouveau
    levelOpen: 0.5   // Nouveau
};

function playHiHat(isOpen) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(hhSettings.tone, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const duration = isOpen ? hhSettings.decayOpen : hhSettings.decayClose;
    const currentLevel = isOpen ? hhSettings.levelOpen : hhSettings.levelClose; // On choisit le bon volume

    gain.gain.setValueAtTime(currentLevel, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noiseSource.start();
    noiseSource.stop(audioCtx.currentTime + duration);
}


// 6. INITIALISATION
window.onload = () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    
    // Ajoute les dataset-track aux boutons KIK et SNARE s'ils n'y sont pas
    const trackBtns = document.querySelectorAll('.track-btn');
    trackBtns.forEach((btn, i) => btn.dataset.track = i);
};

// --- Garde tes fonctions setupTempoDrag et playBtn habituelles ici ---
const playBtn = document.getElementById('master-play-stop');
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false; clearTimeout(timerSeq1);
        playBtn.innerText = "PLAY / STOP"; playBtn.style.background = "#222";
    } else {
        isPlaying = true; playBtn.innerText = "STOP"; playBtn.style.background = "#ff0000";
        runTick();
    }
});

function setupTempoDrag(displayId) {
    const display = document.getElementById(displayId);
    if (!display) return;
    let isDragging = false, startY = 0, startBpm = 0;
    display.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startBpm = parseInt(display.innerText); });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = Math.floor((startY - e.clientY) / 2);
        display.innerText = Math.max(40, Math.min(220, startBpm + delta));
    });
    window.addEventListener('mouseup', () => isDragging = false);
}

function showParamsForTrack(trackIndex) {
    // On cache tous les groupes de paramètres
    document.querySelectorAll('.instr-params').forEach(el => {
        el.style.display = 'none';
    });
    
    // On affiche seulement celui de la piste active
    const activeParams = document.getElementById(`params-track-${trackIndex}`);
    if (activeParams) {
        activeParams.style.display = 'flex';
    }
}
