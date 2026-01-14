/* ==========================================
   HARDBEAT PRO - CORE ENGINE (drum.js)
   ========================================== */

const stepsPerPage = 16;
let isPlaying = false;
let currentStep = 0;
let timerSeq1;
let currentTrackIndex = 0; 
let drumSequences = Array.from({ length: 5 }, () => Array(16).fill(false));
let loopLengths = [16, 16, 16, 16, 16]; // Longueur de boucle par piste (16 par défaut)
let trackCounters = [0, 0, 0, 0, 0];   // Compteurs individuels pour la polyrythmie

// Paramètres
let kickSettings = { pitch: 150, decay: 0.5, level: 0.8 };
let snareSettings = { snappy: 1, tone: 1000, level: 0.6 };
let hhSettings = { tone: 8000, decayClose: 0.05, decayOpen: 0.3, levelClose: 0.4, levelOpen: 0.5 };
let fmSettings = { carrierPitch: 100, modPitch: 50, fmAmount: 100, decay: 0.3, level: 0.5 };

// Moteur Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

// --- SYNTHÈSE ---
function playKick() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(masterGain);
    osc.frequency.setValueAtTime(kickSettings.pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    gain.gain.setValueAtTime(kickSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + kickSettings.decay);
    osc.start(); osc.stop(audioCtx.currentTime + kickSettings.decay);
}

function playSnare() {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) { data[i] = Math.random() * 2 - 1; }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(snareSettings.tone, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    noiseSource.connect(filter); filter.connect(gain); gain.connect(masterGain);
    gain.gain.setValueAtTime(snareSettings.level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2 * snareSettings.snappy);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + 0.2);
}

function playHiHat(isOpen) {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) { data[i] = Math.random() * 2 - 1; }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(hhSettings.tone, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    noiseSource.connect(filter); filter.connect(gain); gain.connect(masterGain);
    const duration = isOpen ? hhSettings.decayOpen : hhSettings.decayClose;
    const level = isOpen ? hhSettings.levelOpen : hhSettings.levelClose;
    gain.gain.setValueAtTime(level, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    noiseSource.start(); noiseSource.stop(audioCtx.currentTime + duration);
}

function playDrumFM() {
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();
    const mainGain = audioCtx.createGain();
    modulator.frequency.value = fmSettings.modPitch;
    modGain.gain.value = fmSettings.fmAmount;
    carrier.frequency.value = fmSettings.carrierPitch;
    modulator.connect(modGain); modGain.connect(carrier.frequency);
    carrier.connect(mainGain); mainGain.connect(masterGain);
    mainGain.gain.setValueAtTime(fmSettings.level, audioCtx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + fmSettings.decay);
    carrier.start(); modulator.start();
    carrier.stop(audioCtx.currentTime + fmSettings.decay); modulator.stop(audioCtx.currentTime + fmSettings.decay);
}

// --- INTERFACE ---
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
        faderContainer.innerHTML = `<span class="hz-label">---Hz</span><input type="range" class="freq-fader" min="20" max="15000">`;
        container.appendChild(faderContainer);
    }
}

function initFaderLogic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.freq-fader').forEach(fader => {
        fader.oninput = (e) => {
            const label = e.target.previousElementSibling;
            label.innerText = e.target.value + "Hz";
            label.style.color = "#00f3ff";
        };
    });
}

function generateDrumControls() {
    const container = document.querySelector('.track-selectors');
    if (!container) return;
    
    // On crée un conteneur dédié pour ne pas polluer le reste du DOM
    let paramsContainer = document.getElementById('instruments-params-container');
    if (!paramsContainer) {
        paramsContainer = document.createElement('div');
        paramsContainer.id = 'instruments-params-container';
        paramsContainer.style.cssText = "margin-left:20px; border-left:2px solid #333; padding-left:20px; display:flex;";
        container.after(paramsContainer); // On le place juste APRÈS les boutons de pistes
    }

    const names = ["KICK", "SNARE", "HH-CLOSE", "HH-OPEN", "DRUM FM"];
    
    // On génère le HTML pour chaque piste proprement
    let innerHTML = "";
    for (let i = 0; i < 5; i++) {
        innerHTML += `
        <div id="params-track-${i}" class="instr-params" style="display:${i === 0 ? 'flex' : 'none'}; gap:10px; align-items:center;">
            <span style="font-size:9px; color:#00f3ff; font-weight:bold;">${names[i]} ></span>
            ${getInstrumentInputs(i)}
            <div class="group" style="margin-left:10px; padding-left:10px; border-left:1px solid #444; display:flex; flex-direction:column; align-items:center;">
                <label style="font-size:8px; margin-bottom:2px;">STEPS</label>
                <div style="display:flex; align-items:center; gap:5px; background:#000; padding:2px 5px; border-radius:3px; border:1px solid #333;">
                    <button onclick="changeLoopLength(${i}, -1)" style="background:none; border:none; color:#00f3ff; cursor:pointer; font-weight:bold;">-</button>
                    <span id="step-display-${i}" style="color:#00f3ff; font-family:monospace; font-size:11px; min-width:15px; text-align:center;">16</span>
                    <button onclick="changeLoopLength(${i}, 1)" style="background:none; border:none; color:#00f3ff; cursor:pointer; font-weight:bold;">+</button>
                </div>
            </div>
        </div>`;
    }
    paramsContainer.innerHTML = innerHTML;

    // Ré-attacher les liaisons de sliders
    attachSliderEvents();
}

// Fonction utilitaire pour les inputs (plus propre)
function getInstrumentInputs(i) {
    if (i === 0) return `<div class="group"><label>PITCH</label><input type="range" id="kick-pitch" min="50" max="300" value="150"></div><div class="group"><label>DECAY</label><input type="range" id="kick-decay" min="0.1" max="1" step="0.1" value="0.5"></div>`;
    if (i === 1) return `<div class="group"><label>SNAPPY</label><input type="range" id="snare-snappy" min="0.1" max="2" step="0.1" value="1"></div><div class="group"><label>TONE</label><input type="range" id="snare-tone" min="500" max="5000" step="100" value="1000"></div>`;
    if (i === 2) return `<div class="group"><label>TONE</label><input type="range" id="hhc-tone" min="4000" max="12000" step="100" value="8000"></div><div class="group"><label>LEVEL</label><input type="range" id="hhc-level" min="0" max="1" step="0.1" value="0.4"></div>`;
    if (i === 3) return `<div class="group"><label>DECAY</label><input type="range" id="hho-decay" min="0.1" max="0.8" step="0.05" value="0.3"></div><div class="group"><label>LEVEL</label><input type="range" id="hho-level" min="0" max="1" step="0.1" value="0.5"></div>`;
    return `<div class="group"><label>CARR</label><input type="range" id="fm-carrier" min="20" max="1000" value="100" style="width:40px;"></div><div class="group"><label>MOD</label><input type="range" id="fm-mod" min="1" max="1000" value="50" style="width:40px;"></div><div class="group"><label>AMT</label><input type="range" id="fm-amt" min="0" max="2000" value="100" style="width:40px;"></div>`;
}

function attachSliderEvents() {
    const ids = ['kick-pitch','kick-decay','snare-snappy','snare-tone','hhc-tone','hhc-level','hho-decay','hho-level','fm-carrier','fm-mod','fm-amt'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.oninput = (e) => {
                const val = parseFloat(e.target.value);
                if (id === 'kick-pitch') kickSettings.pitch = val;
                if (id === 'kick-decay') kickSettings.decay = val;
                if (id === 'snare-snappy') snareSettings.snappy = val;
                if (id === 'snare-tone') snareSettings.tone = val;
                if (id === 'hhc-tone') hhSettings.tone = val;
                if (id === 'hhc-level') hhSettings.levelClose = val;
                if (id === 'hho-decay') hhSettings.decayOpen = val;
                if (id === 'hho-level') hhSettings.levelOpen = val;
                if (id === 'fm-carrier') fmSettings.carrierPitch = val;
                if (id === 'fm-mod') fmSettings.modPitch = val;
                if (id === 'fm-amt') fmSettings.fmAmount = val;
            };
        }
    });
}


// AJOUTE CETTE FONCTION JUSTE APRÈS generateDrumControls
function changeLoopLength(trackIndex, delta) {
    loopLengths[trackIndex] = Math.max(1, Math.min(16, loopLengths[trackIndex] + delta));
    document.getElementById(`step-display-${trackIndex}`).innerText = loopLengths[trackIndex];
    trackCounters[trackIndex] = 0; // Reset pour synchroniser au changement
}
// --- INITIALISATION ---
window.onload = () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    initFaderLogic('grid-freq-seq2');
    generateDrumControls();
    setupTempoDrag('display-bpm1');
    setupTempoDrag('display-bpm2');
    document.querySelectorAll('.track-btn').forEach((btn, i) => btn.dataset.track = i);

    // FIX DU VOLUME : On utilise 'master-gain' (ID de ton HTML)
    const masterVol = document.getElementById('master-gain'); 
    if (masterVol) {
        masterVol.oninput = (e) => {
            masterGain.gain.setTargetAtTime(parseFloat(e.target.value), audioCtx.currentTime, 0.02);
        };
    }

    const addSeqBtn = document.getElementById('add-seq-btn');
    if (addSeqBtn) {
        addSeqBtn.onclick = () => {
            if (document.getElementById('seq3-container')) return;
            const seq2 = document.getElementById('seq2-container');
            const seq3 = seq2.cloneNode(true);
            seq3.id = 'seq3-container';
            seq3.querySelector('h2').innerText = 'SEQ 3 : FREQ SYNTH (LAYER)';
            seq3.querySelector('.freq-sliders-container').id = 'grid-freq-seq3';
            seq3.querySelector('.step-grid').id = 'grid-seq3';
            document.getElementById('extension-zone').appendChild(seq3);
            generateSteps('grid-seq3', 'step-pad');
            generateFaders('grid-freq-seq3');
            initFaderLogic('grid-freq-seq3');
            addSeqBtn.disabled = true; addSeqBtn.style.opacity = "0.5";
        };
    }
};
// --- RUNTIME ---
function runTick() {
    if (!isPlaying) return;
    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000;
    
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");
    
    // Le curseur visuel reste sur le cycle de 16
    if (allPads[currentStep]) allPads[currentStep].style.borderColor = "#ffffff";
    if (typeof checkSynthTick === "function") checkSynthTick(currentStep);

    // LECTURE POLYRYTHMIQUE
    if (drumSequences[0][trackCounters[0]]) playKick();
    if (drumSequences[1][trackCounters[1]]) playSnare();
    if (drumSequences[2][trackCounters[2]]) playHiHat(false);
    if (drumSequences[3][trackCounters[3]]) playHiHat(true);
    if (drumSequences[4][trackCounters[4]]) playDrumFM();

    // Incrémentation indépendante de chaque piste
    for (let i = 0; i < 5; i++) {
        trackCounters[i] = (trackCounters[i] + 1) % loopLengths[i];
    }

    currentStep = (currentStep + 1) % 16;
    timerSeq1 = setTimeout(runTick, stepDuration);
}

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

const playBtn = document.getElementById('master-play-stop');
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false; clearTimeout(timerSeq1);
        playBtn.innerText = "PLAY / STOP";
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        isPlaying = true; playBtn.innerText = "STOP";
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
