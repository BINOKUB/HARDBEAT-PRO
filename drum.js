/* ==========================================
   HARDBEAT PRO - CORE ENGINE (script.js)
   ========================================== */

// 1. CONFIGURATION ET MÉMOIRE
const stepsPerPage = 16;
let isPlaying = false;
let currentStep = 0;
let timerSeq1;
let currentTrackIndex = 0; 

let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));

let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };

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
        fader.min = 20; fader.max = 15000;
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
    noiseSource.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    const duration = isOpen ? hhSettings.decayOpen : hhSettings.decayClose;
    const currentLevel = isOpen ? hhSettings.levelOpen : hhSettings.levelClose;
    gain.gain.setValueAtTime(currentLevel, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + duration);
}

function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000;
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";

    if (drumSequences[0][currentStep]) playKick();
    if (drumSequences[1][currentStep]) playSnare();
    if (drumSequences[2][currentStep]) playHiHat(false);
    if (drumSequences[3][currentStep]) playHiHat(true);
   if (drumSequences[4][currentStep]) playDrumFM();

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

// 4. INTERACTION
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

function showParamsForTrack(trackIndex) {
    document.querySelectorAll('.instr-params').forEach(el => el.style.display = 'none');
    const activeParams = document.getElementById(`params-track-${trackIndex}`);
    if (activeParams) activeParams.style.display = 'flex';
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.step-pad') && e.target.closest('#grid-seq1')) {
        const pad = e.target.closest('.step-pad');
        const index = parseInt(pad.dataset.index);
        drumSequences[currentTrackIndex][index] = !drumSequences[currentTrackIndex][index];
        updatePadVisuals();
    }
    if (e.target.classList.contains('track-btn')) {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTrackIndex = parseInt(e.target.dataset.track);
        updatePadVisuals();
        showParamsForTrack(currentTrackIndex);
    }
});

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
                <div class="group"><label>LEVEL</label><input type="range" id="hhc-level" min="0" max="1" step="0.1" value="0.4"></div>
            </div>
            <div id="params-track-3" class="instr-params" style="display:none; gap:15px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">HH-OPEN ></span>
                <div class="group"><label>DECAY</label><input type="range" id="hho-decay" min="0.1" max="0.8" step="0.05" value="0.3"></div>
                <div class="group"><label>LEVEL</label><input type="range" id="hho-level" min="0" max="1" step="0.1" value="0.5"></div>
            </div>
            <div id="params-track-4" class="instr-params" style="display:none; gap:10px; align-items:center;">
                <span style="font-size:9px; color:var(--accent-color); font-weight:bold;">DRUM FM ></span>
                <div class="group"><label>CARRIER</label><input type="range" id="fm-carrier" min="20" max="1000" value="100"></div>
                <div class="group"><label>MOD</label><input type="range" id="fm-mod" min="1" max="1000" value="50"></div>
                <div class="group"><label>FM AMT</label><input type="range" id="fm-amt" min="0" max="2000" value="100"></div>
                <div class="group"><label>DECAY</label><input type="range" id="fm-decay" min="0.05" max="1.5" step="0.05" value="0.3"></div>
                <div class="group"><label>LEVEL</label><input type="range" id="fm-level" min="0" max="1" step="0.1" value="0.5"></div>
            </div>
        </div>`;
    
    container.insertAdjacentHTML('beforeend', html);

    document.getElementById('kick-pitch').oninput = (e) => kickSettings.pitch = parseFloat(e.target.value);
    document.getElementById('kick-decay').oninput = (e) => kickSettings.decay = parseFloat(e.target.value);
    document.getElementById('snare-snappy').oninput = (e) => snareSettings.snappy = parseFloat(e.target.value);
    document.getElementById('snare-tone').oninput = (e) => snareSettings.tone = parseFloat(e.target.value);
    document.getElementById('hhc-tone').oninput = (e) => hhSettings.tone = parseFloat(e.target.value);
    document.getElementById('hhc-level').oninput = (e) => hhSettings.levelClose = parseFloat(e.target.value);
    document.getElementById('hho-decay').oninput = (e) => hhSettings.decayOpen = parseFloat(e.target.value);
    document.getElementById('hho-level').oninput = (e) => hhSettings.levelOpen = parseFloat(e.target.value);
   document.getElementById('fm-carrier').oninput = (e) => fmSettings.carrierPitch = parseFloat(e.target.value);
    document.getElementById('fm-mod').oninput = (e) => fmSettings.modPitch = parseFloat(e.target.value);
    document.getElementById('fm-amt').oninput = (e) => fmSettings.fmAmount = parseFloat(e.target.value);
    document.getElementById('fm-decay').oninput = (e) => fmSettings.decay = parseFloat(e.target.value);
    document.getElementById('fm-level').oninput = (e) => fmSettings.level = parseFloat(e.target.value);
}

// 6. INITIALISATION ET UTILS
window.onload = () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    generateDrumControls();
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    const trackBtns = document.querySelectorAll('.track-btn');
    trackBtns.forEach((btn, i) => btn.dataset.track = i);
};

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


// *********************************************************************************************** PARTIE DU DRUM FM ******************

let fmSettings = {
    carrierPitch: 100, // Fréquence de base
    modPitch: 50,      // Fréquence du modulateur
    fmAmount: 100,     // Intensité de la modulation (FM AMT)
    decay: 0.3,
    level: 0.5
};

function playDrumFM() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain(); // C'est le FM AMT
    const mainGain = audioCtx.createGain();

    carrier.type = 'sine';
    modulator.type = 'sine'; // On reste sur du sine pour une FM plus musicale, ou 'square' pour plus de bruit

    modulator.frequency.value = fmSettings.modPitch;
    modGain.gain.value = fmSettings.fmAmount;
    carrier.frequency.value = fmSettings.carrierPitch;

    modulator.connect(modGain);
    modGain.connect(carrier.frequency); // Modulation de fréquence
    carrier.connect(mainGain);
    mainGain.connect(audioCtx.destination);

    mainGain.gain.setValueAtTime(fmSettings.level, audioCtx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + fmSettings.decay);

    carrier.start();
    modulator.start();
    carrier.stop(audioCtx.currentTime + fmSettings.decay);
    modulator.stop(audioCtx.currentTime + fmSettings.decay);
}
