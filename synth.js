/* ==========================================
   HARDBEAT PRO - SYNTH ENGINE (synth.js)
   ========================================== */

// Mémoire pour les séquences mélodiques (SEQ 2 et SEQ 3)
let synthSequences = {
    seq2: Array(16).fill(false),
    seq3: Array(16).fill(false)
};

// Fonction pour jouer une note du synthé
function playSynthNote(frequency, duration = 0.15) {
    if (!frequency || frequency <= 0) return;

    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const vca = audioCtx.createGain();

    osc.type = 'sawtooth'; // Onde en dent de scie pour le punch
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    filter.type = 'lowpass';
    // Enveloppe de filtre : le filtre s'ouvre vite et se ferme
    filter.frequency.setValueAtTime(frequency * 2, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioCtx.currentTime + duration);
    filter.Q.value = 5; // Un peu de résonance pour le "Twang"

    osc.connect(filter);
    filter.connect(vca);
    vca.connect(masterGain); 

    // Enveloppe d'amplitude (Volume)
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    vca.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
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
