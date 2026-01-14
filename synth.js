/* ==========================================
   HARDBEAT PRO - SYNTH ENGINE (synth.js)
   ========================================== */

// 1. MÉMOIRE ET ÉTAT GLOBAL
let synthSequences = {
    seq2: Array(16).fill(false),
    seq3: Array(16).fill(false)
};

let synthParams = {
    disto: 400,
    resonance: 12,
    cutoffEnv: 4,
    delayAmt: 0.3,
    delayTime: 0.375
};

// 2. CONFIGURATION DES NOEUDS AUDIO (DISTO + DELAY)
const distortionNode = audioCtx.createWaveShaper();
const delayNode = audioCtx.createDelay(2.0);
const feedback = audioCtx.createGain();
const delayMix = audioCtx.createGain();

// Fonctions utilitaires
function createDistortionCurve(amount = 50) {
    let n_samples = 44100, curve = new Float32Array(n_samples);
    let deg = Math.PI / 180;
    for (let i = 0 ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + amount ) * x * 20 * deg / ( Math.PI + amount * Math.abs(x) );
    }
    return curve;
}

// Connexions du circuit : [Synth] -> [Disto] -> [Delay Circuit] -> [Master]
distortionNode.curve = createDistortionCurve(synthParams.disto);
distortionNode.connect(masterGain); // Signal Dry (Disto seule)

// Circuit de Feedback pour le Delay
distortionNode.connect(delayNode);
delayNode.connect(feedback);
feedback.connect(delayNode);
delayNode.connect(delayMix);
delayMix.connect(masterGain); // Signal Wet (Echo)

// Initialisation des valeurs par défaut
delayMix.gain.value = synthParams.delayAmt;
feedback.gain.value = synthParams.delayAmt * 0.7;
delayNode.delayTime.value = synthParams.delayTime;

// 3. MOTEUR DE SYNTHÈSE
function playSynthNote(frequency, duration = 0.2) {
    if (!frequency || frequency <= 0) return;

    const osc = audioCtx.createOscillator();
    const sub = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const vca = audioCtx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'square';
    
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    sub.frequency.setValueAtTime(frequency / 2, audioCtx.currentTime);

    filter.type = 'lowpass';
    filter.Q.value = synthParams.resonance; 
    filter.frequency.setValueAtTime(frequency * synthParams.cutoffEnv, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioCtx.currentTime + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(vca);
    vca.connect(distortionNode); // Envoi vers la chaîne d'effets

    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start(); sub.start();
    osc.stop(audioCtx.currentTime + duration);
    sub.stop(audioCtx.currentTime + duration);
}

function checkSynthTick(step) {
    if (synthSequences.seq2[step]) {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        if (faders[step]) playSynthNote(parseFloat(faders[step].value));
    }
    if (document.getElementById('grid-seq3') && synthSequences.seq3[step]) {
        const faders = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
        if (faders[step]) playSynthNote(parseFloat(faders[step].value) * 0.5);
    }
}

// 4. INTERACTION ET SLIDERS
document.addEventListener('DOMContentLoaded', () => {
    // Sliders de synthèse
    const distoIn = document.getElementById('synth-disto');
    const resIn = document.getElementById('synth-res');
    const cutIn = document.getElementById('synth-cutoff');
    const dAmtIn = document.getElementById('synth-delay-amt');
    const dTimeIn = document.getElementById('synth-delay-time');

    if(distoIn) distoIn.oninput = (e) => {
        synthParams.disto = parseFloat(e.target.value);
        distortionNode.curve = createDistortionCurve(synthParams.disto);
    };
    if(resIn) resIn.oninput = (e) => synthParams.resonance = parseFloat(e.target.value);
    if(cutIn) cutIn.oninput = (e) => synthParams.cutoffEnv = parseFloat(e.target.value);
    
    if(dAmtIn) dAmtIn.oninput = (e) => {
        synthParams.delayAmt = parseFloat(e.target.value);
        delayMix.gain.setValueAtTime(synthParams.delayAmt, audioCtx.currentTime);
        feedback.gain.setValueAtTime(synthParams.delayAmt * 0.7, audioCtx.currentTime);
    };
    if(dTimeIn) dTimeIn.oninput = (e) => {
        synthParams.delayTime = parseFloat(e.target.value);
        delayNode.delayTime.setTargetAtTime(synthParams.delayTime, audioCtx.currentTime, 0.1);
    };
});

// Gestion des clics sur les pads (Délégation d'événement)
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (!pad) return;

    const container = pad.parentElement;
    const stepIndex = parseInt(pad.dataset.index);

    if (container.id === 'grid-seq2') {
        synthSequences.seq2[stepIndex] = !synthSequences.seq2[stepIndex];
        pad.classList.toggle('active');
        const led = pad.querySelector('.led');
        led.style.background = synthSequences.seq2[stepIndex] ? "#00f3ff" : "#330000";
        led.style.boxShadow = synthSequences.seq2[stepIndex] ? "0 0 10px #00f3ff" : "none";
    }

    if (container.id === 'grid-seq3') {
        synthSequences.seq3[stepIndex] = !synthSequences.seq3[stepIndex];
        pad.classList.toggle('active');
        const led = pad.querySelector('.led');
        led.style.background = synthSequences.seq3[stepIndex] ? "#7000ff" : "#330000";
        led.style.boxShadow = synthSequences.seq3[stepIndex] ? "0 0 10px #7000ff" : "none";
    }
});
