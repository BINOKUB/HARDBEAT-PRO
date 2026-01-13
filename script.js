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

    // Lecture simultanée des pistes
    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();

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

document.addEventListener('click', (e) => {
    // Clic sur un Pad
    if (e.target.closest('.step-pad') && e.target.closest('#grid-seq1')) {
        const pad = e.target.closest('.step-pad');
        const index = parseInt(pad.dataset.index);
        drumSequences[currentTrackIndex][index] = !drumSequences[currentTrackIndex][index];
        updatePadVisuals();
    }

    // Clic sur les boutons de pistes (KIK, SNARE...)
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        updatePadVisuals();
    }
});

// 5. RÉGLAGES UI
function generateDrumControls() {
    const container = document.querySelector('.track-selectors');
    const html = `
        <div id="global-params" style="margin-left:20px; display:flex; gap:15px; border-left:2px solid #333; padding-left:20px;">
            <div class="group">
                <span style="font-size:9px; color:var(--accent-color)">KICK</span>
                <input type="range" id="kick-pitch" min="50" max="300" value="150" style="width:60px;">
                <input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5" style="width:60px;">
            </div>
            <div class="group">
                <span style="font-size:9px; color:var(--accent-color)">SNARE</span>
                <input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1" style="width:60px;">
                <input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000" style="width:60px;">
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    document.getElementById('kick-pitch').oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
    document.getElementById('kick-decay').oninput = (e) => kickSettings.decay = parseFloat(e.target.value);
    document.getElementById('snare-snappy').oninput = (e) => snareSettings.snappy = parseFloat(e.target.value);
    document.getElementById('snare-tone').oninput = (e) => snareSettings.tone = parseFloat(e.target.value);
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
