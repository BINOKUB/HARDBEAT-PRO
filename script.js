// Configuration de base
const stepsPerPage = 16;

// Fonction pour générer les pads d'un séquenceur
function generateSteps(containerId, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Nettoie le conteneur
    for (let i = 0; i < stepsPerPage; i++) {
        const step = document.createElement('div');
        step.classList.add(className);
        step.dataset.index = i;
        // Petit cercle LED à l'intérieur du pad
        const led = document.createElement('div');
        led.classList.add('led');
        step.appendChild(led);
        container.appendChild(step);
    }
}

// Fonction pour générer les faders du SEQ 2/3
function generateFaders(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < stepsPerPage; i++) {
        const faderContainer = document.createElement('div');
        faderContainer.classList.add('fader-unit');
        
        const fader = document.createElement('input');
        fader.type = 'range';
        fader.orient = 'vertical'; // Pour certains navigateurs
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

// --- LOGIQUE D'EXTENSION SEQ 3 ---
const addSeqBtn = document.getElementById('add-seq-btn');
const extensionZone = document.getElementById('extension-zone');

addSeqBtn.addEventListener('click', () => {
    if (document.getElementById('seq3-container')) return; // Limite à 3

    // Clone le container du SEQ 2
    const seq2 = document.getElementById('seq2-container');
    const seq3 = seq2.cloneNode(true);
    
    // Ajuste les IDs et titres pour le SEQ 3
    seq3.id = 'seq3-container';
    seq3.querySelector('h2').innerText = 'SEQ 3 : FREQ SYNTH (LAYER)';
    seq3.querySelector('.bpm-control label').innerText = 'TEMPO 3';
    
    // On vide les grilles clonées pour les regénérer proprement
    seq3.querySelector('#grid-freq-seq2').id = 'grid-freq-seq3';
    seq3.querySelector('#grid-seq2').id = 'grid-seq3';
    
    extensionZone.appendChild(seq3);
    
    // Génère le visuel pour le nouveau SEQ 3
    generateSteps('grid-seq3', 'step-pad');
    generateFaders('grid-freq-seq3');
    
    // Change le bouton après usage
    addSeqBtn.innerText = "MAX LAYERS REACHED";
    addSeqBtn.disabled = true;
    addSeqBtn.style.opacity = "0.5";
});

// Initialisation au chargement
window.onload = () => {
    generateSteps('grid-seq1', 'step-pad');
    generateSteps('grid-seq2', 'step-pad');
    generateFaders('grid-freq-seq2');
    console.log("HARDBEAT PRO : Moteurs visuels initialisés.");
};

// Fonction pour activer l'affichage des Hz sur les faders
function initFaderLogic(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const faders = container.querySelectorAll('.freq-fader');
    
    faders.forEach(fader => {
        fader.addEventListener('input', (e) => {
            // Récupère le label (span) juste au-dessus du fader
            const label = e.target.previousElementSibling;
            const val = e.target.value;
            
            // Affiche la valeur avec un style propre
            label.innerText = val + "Hz";
            label.style.color = "#00f3ff"; // Devient brillant quand on change
        });
    });
}

// On modifie légèrement la fonction d'extension pour qu'elle initialise aussi le SEQ 3
// (À ajouter dans ta logique de clic sur le bouton + EXTEND)
// initFaderLogic('grid-freq-seq3');

// Initialisation au démarrage
window.addEventListener('DOMContentLoaded', () => {
    initFaderLogic('grid-freq-seq2');
});
