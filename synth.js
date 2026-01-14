// ****************** SYNTH ENGINE (synth.js) ******************

const addSeqBtn = document.getElementById('add-seq-btn');

addSeqBtn.addEventListener('click', () => {
    if (document.getElementById('seq3-container')) return;

    const seq2 = document.getElementById('seq2-container');
    const seq3 = seq2.cloneNode(true);
    
    seq3.id = 'seq3-container';
    seq3.querySelector('h2').innerText = 'SEQ 3 : FREQ SYNTH (LAYER)';
    
    // On nettoie les IDs pour éviter les conflits
    const newFreqGrid = seq3.querySelector('.freq-sliders-container');
    const newStepGrid = seq3.querySelector('.step-grid');
    newFreqGrid.id = 'grid-freq-seq3';
    newStepGrid.id = 'grid-seq3';
    
    document.getElementById('extension-zone').appendChild(seq3);
    
    // Initialisation du nouveau séquenceur
    generateSteps('grid-seq3', 'step-pad');
    generateFaders('grid-freq-seq3');
    initFaderLogic('grid-freq-seq3');
    
    addSeqBtn.innerText = "MAX LAYERS REACHED";
    addSeqBtn.disabled = true;
    addSeqBtn.style.opacity = "0.5";
});
