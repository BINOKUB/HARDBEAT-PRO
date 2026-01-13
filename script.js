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
    setupTempoDrag('display-bpm1');
setupTempoDrag('display-bpm2');
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

// Ajoute ceci dans ton fichier script.js
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('step-pad')) {
        const pad = e.target;
        const led = pad.querySelector('.led');
        
        // Alterne l'état actif
        pad.classList.toggle('active');
        
        // Allume ou éteint la LED visuellement
        if (pad.classList.contains('active')) {
            led.style.background = "#ff0000"; // Rouge ON
            led.style.boxShadow = "0 0 10px #ff0000";
        } else {
            led.style.background = "#330000"; // Rouge OFF
            led.style.boxShadow = "none";
        }
    }
});

// --- GESTION DU TEMPO PAR GLISSEMENT ---
function setupTempoDrag(displayId) {
    const display = document.getElementById(displayId);
    let isDragging = false;
    let startY = 0;
    let startBpm = 0;

    display.style.cursor = 'ns-resize'; // Curseur haut/bas

    display.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startBpm = parseInt(display.innerText);
        display.style.color = "#ffffff"; // Feedback visuel
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Sensibilité : on divise par 2 pour un contrôle précis
        const delta = Math.floor((startY - e.clientY) / 2);
        let newBpm = startBpm + delta;
        
        // Limites (comme convenu : 40 à 220)
        newBpm = Math.max(40, Math.min(220, newBpm));
        
        display.innerText = newBpm;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            display.style.color = "#00f3ff"; // Retour au cyan
        }
    });
}

// --- INITIALISATION DE L'HORLOGE (PLAYHEAD) ---
let isPlaying = false;
let currentStep = 0;
let timerSeq1;

function startSequencer() {
    if (isPlaying) return;
    isPlaying = true;
    runTick();
}

function runTick() {
    if (!isPlaying) return;

    const bpm = parseInt(document.getElementById('display-bpm1').innerText);
    const stepDuration = (60 / bpm) / 4 * 1000; // Un 16ème de note en ms

    // 1. Enlever la surbrillance du pad précédent
    const allPads = document.querySelectorAll('#grid-seq1 .step-pad');
    allPads.forEach(p => p.style.borderColor = "#333");

    // 2. Allumer le pad actuel (La tête de lecture)
    const activePad = allPads[currentStep];
    if (activePad) activePad.style.borderColor = "#ffffff";

    // 3. Passer au pas suivant (Boucle sur 16)
    currentStep = (currentStep + 1) % 16;

    timerSeq1 = setTimeout(runTick, stepDuration);
}

// --- BOUTON PLAY/STOP ---
const playBtn = document.getElementById('master-play-stop');
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false;
        clearTimeout(timerSeq1);
        playBtn.innerText = "PLAY / STOP";
        playBtn.style.background = "#222";
    } else {
        playBtn.innerText = "STOP";
        playBtn.style.background = "#ff0000";
        startSequencer();
    }
});
