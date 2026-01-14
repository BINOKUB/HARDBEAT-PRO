/* ==========================================
   HARDBEAT PRO - SYNTH ENGINE (synth.js)
   ========================================== */

// Mémoire pour les séquences mélodiques (SEQ 2 et SEQ 3)
let synthSequences = {
    seq2: Array(16).fill(false),
    seq3: Array(16).fill(false)
};

// Fonction pour jouer une note du synthé
/* --- FONCTION DE SATURATION (DISTORTION) --- */
function createDistortionCurve(amount = 50) {
    let n_samples = 44100, curve = new Float32Array(n_samples);
    let deg = Math.PI / 180;
    for (let i = 0 ; i < n_samples; ++i ) {
        let x = i * 2 / n_samples - 1;
        // Algorithme de distorsion non-linéaire
        curve[i] = ( 3 + amount ) * x * 20 * deg / ( Math.PI + amount * Math.abs(x) );
    }
    return curve;
}

const distortionNode = audioCtx.createWaveShaper();
distortionNode.curve = createDistortionCurve(400); // 400 = Très sale
distortionNode.connect(masterGain);

/* --- NOUVELLE FONCTION PLAY AVEC GRABUGE --- */
function playSynthNote(frequency, duration = 0.2) {
    if (!frequency || frequency <= 0) return;

    const osc = audioCtx.createOscillator();
    const sub = audioCtx.createOscillator(); // Un deuxième oscillateur pour le corps
    const filter = audioCtx.createBiquadFilter();
    const vca = audioCtx.createGain();

    // Configuration des oscillateurs
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    sub.type = 'square'; // Carré pour plus de "gras" indus
    sub.frequency.setValueAtTime(frequency / 2, audioCtx.currentTime); // Une octave en dessous

    // Filtre de caractère (Acid/Resonant)
    filter.type = 'lowpass';
    filter.Q.value = 12; // Grosse résonance qui siffle
    filter.frequency.setValueAtTime(frequency * 4, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, audioCtx.currentTime + duration);

    // Chainage : Osc -> Filter -> VCA -> Distortion -> Master
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(vca);
    vca.connect(distortionNode); // On passe dans la machine à grabuge !

    // Enveloppe de volume percutante
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start(); sub.start();
    osc.stop(audioCtx.currentTime + duration);
    sub.stop(audioCtx.currentTime + duration);
}
// Branchement sur l'horloge globale (On va devoir modifier runTick dans drums.js)
function checkSynthTick(step) {
    // Lecture SEQ 2
    if (synthSequences.seq2[step]) {
        const faders = document.querySelectorAll('#grid-freq-seq2 .freq-fader');
        const freq = parseFloat(faders[step].value);
        playSynthNote(freq);
    }
    // Lecture SEQ 3 (si il existe)
    if (document.getElementById('grid-seq3')) {
        if (synthSequences.seq3[step]) {
            const faders = document.querySelectorAll('#grid-freq-seq3 .freq-fader');
            const freq = parseFloat(faders[step].value);
            playSynthNote(freq * 0.5); // Un octave plus bas pour le layer
        }
    }
}

// Écouteur global pour les clics sur les séquenceurs de synthé
document.addEventListener('click', (e) => {
    const pad = e.target.closest('.step-pad');
    if (!pad) return;

    const container = pad.parentElement;
    const stepIndex = parseInt(pad.dataset.index);

    // Si on clique sur le SEQ 2
    if (container.id === 'grid-seq2') {
        synthSequences.seq2[stepIndex] = !synthSequences.seq2[stepIndex];
        pad.classList.toggle('active');
        const led = pad.querySelector('.led');
        led.style.background = synthSequences.seq2[stepIndex] ? "#00f3ff" : "#330000";
        led.style.boxShadow = synthSequences.seq2[stepIndex] ? "0 0 10px #00f3ff" : "none";
    }

    // Si on clique sur le SEQ 3 (Extension)
    if (container.id === 'grid-seq3') {
        synthSequences.seq3[stepIndex] = !synthSequences.seq3[stepIndex];
        pad.classList.toggle('active');
        const led = pad.querySelector('.led');
        led.style.background = synthSequences.seq3[stepIndex] ? "#7000ff" : "#330000";
        led.style.boxShadow = synthSequences.seq3[stepIndex] ? "0 0 10px #7000ff" : "none";
    }
});
