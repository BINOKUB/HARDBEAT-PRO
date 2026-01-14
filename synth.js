/* ==========================================
   HARDBEAT PRO - SYNTH ENGINE (synth.js)
   ========================================== */

// 1. LOGIQUE DES FADERS (Hz)
function initFaderLogic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.freq-fader').forEach(fader => {
        fader.addEventListener('input', (e) => {
            const label = e.target.previousElementSibling;
            label.innerText = e.target.value + "Hz";
            label.style.color = "#00f3ff";
        });
    });
}

// 2. BOUTON D'EXTENSION SEQ 3
document.addEventListener('DOMContentLoaded', () => {
    const addSeqBtn = document.getElementById('add-seq-btn');
    if (!addSeqBtn) return;

    addSeqBtn.addEventListener('click', () => {
        if (document.getElementById('seq3-container')) return;

        const seq2 = document.getElementById('seq2-container');
        const seq3 = seq2.cloneNode(true);
        seq3.id = 'seq3-container';
        seq3.querySelector('h2').innerText = 'SEQ 3 : FREQ SYNTH (LAYER)';
        
        const newFreqGrid = seq3.querySelector('.freq-sliders-container');
        const newStepGrid = seq3.querySelector('.step-grid');
        newFreqGrid.id = 'grid-freq-seq3';
        newStepGrid.id = 'grid-seq3';
        
        document.getElementById('extension-zone').appendChild(seq3);
        
        // Appel des fonctions définies dans drums.js
        generateSteps('grid-seq3', 'step-pad');
        generateFaders('grid-freq-seq3');
        initFaderLogic('grid-freq-seq3');
        
        addSeqBtn.innerText = "MAX LAYERS REACHED";
        addSeqBtn.disabled = true;
        addSeqBtn.style.opacity = "0.5";
    });

    // Init faders initiaux du SEQ 2
    initFaderLogic('grid-freq-seq2');
});
