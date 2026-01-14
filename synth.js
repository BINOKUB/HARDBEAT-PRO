/* ==========================================
   HARDBEAT PRO - SYNTH ENGINE (synth.js)
   ========================================== */

// Mémoire pour les séquences mélodiques (SEQ 2 et SEQ 3)
let synthSequences = {
    seq2: Array(16).fill(false),
    seq3: Array(16).fill(false)
};

// Fonction pour jouer une note du synthé
function playSynthNote(frequency, duration = 0.2) {
    if (!frequency || frequency <= 0) return;

    const osc = audioCtx.createOscillator();
    const vca = audioCtx.createGain();

    // Type d'onde : 'sawtooth' pour le Hardgroove, 'square' pour l'Indus
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Filtre passe-bas pour enlever le côté trop agressif
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(vca);
    vca.connect(masterGain); // On tente quand même de le lier au Master !

    // Enveloppe de volume
    vca.gain.setValueAtTime(0, audioCtx.currentTime);
    vca.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
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
