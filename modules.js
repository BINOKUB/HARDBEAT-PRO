/* ==========================================
   HARDBEAT PRO - EXTERNAL MODULES (V1.4 CLEAN)
   ========================================== */
console.log("Modules System : Loading...");

// 1. DÉTECTION INTELLIGENTE : ELECTRON OU NAVIGATEUR ?
let ipcRenderer = null;
try {
    if (typeof require !== 'undefined') {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
        console.log(">>> MODE: ELECTRON (Modules Externes Actifs)");
    } else {
        throw new Error("Navigateur Standard");
    }
} catch (e) {
    console.warn(">>> MODE: NAVIGATEUR (Modules Externes Désactivés)");
}

/* ==========================================
   MODULES SYSTEM - SÉCURITÉ BANQUE
   ========================================== */
if (!window.vcfBank) {
    console.warn(">>> VCF BANK non trouvée. Création de secours...");
    window.vcfBank = {
        seq2: { cutoff: 0.5, res: 0.0, bypass: true },
        seq3: { cutoff: 0.5, res: 0.0, bypass: true }
    };
}

// ==========================================
// 2. RECEPTION DES ORDRES (SECURISÉ)
// ==========================================
if (ipcRenderer) {
    // Module Waveform
    ipcRenderer.on('update-synth-waveform', (event, newShape) => {
        console.log("🔊 MODULE UPDATE (SEQ 2) : " + newShape);
        if (typeof waveformSEQ2 !== 'undefined') window.waveformSEQ2 = newShape;
    });
}

// ==========================================
// 3. MODULE INTERNE : KICK RUMBLE UI
// ==========================================
function initKickRumbleUI() {
    const kickParams = document.getElementById('params-track-0');
    if (!kickParams) return;

    const div = document.createElement('div');
    div.className = "group"; 
    div.style.border = "1px solid #a855f7"; 
    div.style.padding = "2px 5px";
    div.style.borderRadius = "4px";

    const label = document.createElement('label');
    label.innerText = "RUMBLE";
    label.style.color = "#a855f7"; 
    label.style.fontWeight = "bold";

    const input = document.createElement('input');
    input.type = "range";
    input.min = "0"; input.max = "1"; input.step = "0.01";
    input.value = "0"; 
    input.id = "kick-rumble-amount";

    input.oninput = (e) => {
        if (window.kickSettings) window.kickSettings.rumble = parseFloat(e.target.value);
    };

    div.appendChild(label);
    div.appendChild(input);
    kickParams.appendChild(div);
    console.log("Module Rumble: Injecté.");
}

window.addEventListener('load', () => {
    setTimeout(() => { initKickRumbleUI(); }, 500);
});

/* ==========================================
   MODULE VCF - LOGIC & UI (v1.2 FINAL)
   ========================================== */
window.vcfState = {
    trackId: 2,            
    cutoff: 0.5,          
    resonance: 0.0,       
    bypass: false
};

// Lancement immédiat
initVCFInteractions();

function initVCFInteractions() {
    const btnOpenList = document.querySelectorAll('.btn-open-filter');
    const btnClose = document.getElementById('btn-close-vcf');
    const bypassToggle = document.getElementById('vcf-bypass-toggle');

    // 1. OUVRIR
    btnOpenList.forEach(btn => {
        btn.onclick = (e) => {
            const targetId = parseInt(btn.dataset.target);
            openVCFModule(targetId);
        };
    });

    // 2. FERMER
    if(btnClose) {
        btnClose.onclick = () => {
            const overlay = document.getElementById('vcf-module-overlay');
            if(overlay) overlay.classList.add('hidden');
        };
    }

    // 3. BYPASS SWITCH (Connecté à la mémoire)
    if(bypassToggle) {
        bypassToggle.addEventListener('change', (e) => {
            const isActive = e.target.checked;
            window.vcfState.bypass = !isActive;

            // Ecriture Mémoire
            if (window.vcfState.trackId === 2) window.vcfBank.seq2.bypass = !isActive;
            if (window.vcfState.trackId === 3) window.vcfBank.seq3.bypass = !isActive;
            
            // Update Audio Immédiat
            if(window.updateFilterFreq) {
                const currentKnobVal = window.vcfState.cutoff;
                const freqHz = Math.floor(20 + (Math.pow(currentKnobVal, 2) * 12000));
                window.updateFilterFreq(freqHz);
            }
            updateFilterGraph();
        });
    }

    // 4. KNOBS
    setupKnob('knob-cutoff', (val) => {
        window.vcfState.cutoff = val;
        // Audio
        const freq = Math.floor(20 + (Math.pow(val, 2) * 12000)); 
        const display = document.getElementById('val-cutoff');
        if(display) display.innerText = freq + " Hz";
        if(window.updateFilterFreq) window.updateFilterFreq(freq);
        
        // Mémoire
        if (window.vcfState.trackId === 2) window.vcfBank.seq2.cutoff = val;
        if (window.vcfState.trackId === 3) window.vcfBank.seq3.cutoff = val;
        
        updateFilterGraph();
    });

    setupKnob('knob-res', (val) => {
        window.vcfState.resonance = val;
        // Audio
        const res = (val * 20).toFixed(1);
        const display = document.getElementById('val-res');
        if(display) display.innerText = res;
        if(window.updateFilterRes) window.updateFilterRes(res);

        // Mémoire
        if (window.vcfState.trackId === 2) window.vcfBank.seq2.res = val;
        if (window.vcfState.trackId === 3) window.vcfBank.seq3.res = val;

        updateFilterGraph();
    });
    
    updateFilterGraph();
}

function openVCFModule(trackId) {
    console.log(">>> OUVERTURE DU RACK POUR SEQ " + trackId);
    window.vcfState.trackId = trackId;
    
    const nameDisplay = document.getElementById('vcf-target-name');
    if(nameDisplay) {
        nameDisplay.innerText = "SEQ " + trackId;
        nameDisplay.style.color = (trackId === 2) ? "#00f3ff" : "#a855f7";
    }

    // SYNC: Lecture de la mémoire avant affichage
    if (window.vcfBank) {
        const bankData = (trackId === 3) ? window.vcfBank.seq3 : window.vcfBank.seq2;
        
        window.vcfState.cutoff = bankData.cutoff;
        window.vcfState.resonance = bankData.res;
        window.vcfState.bypass = bankData.bypass;

        const knobCut = document.getElementById('knob-cutoff');
        const knobRes = document.getElementById('knob-res');
        const check = document.getElementById('vcf-bypass-toggle');
        
        if(knobCut) updateKnobVisual(knobCut, bankData.cutoff);
        if(knobRes) updateKnobVisual(knobRes, bankData.res);
        if(check) check.checked = !bankData.bypass; 

        // Update Textes
        const freqHz = Math.floor(20 + (Math.pow(bankData.cutoff, 2) * 12000));
        const resVal = (bankData.res * 20).toFixed(1);
        if(document.getElementById('val-cutoff')) document.getElementById('val-cutoff').innerText = freqHz + " Hz";
        if(document.getElementById('val-res')) document.getElementById('val-res').innerText = resVal;

        if(typeof updateFilterGraph === 'function') updateFilterGraph();
    }

    const overlay = document.getElementById('vcf-module-overlay');
    if(overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = "flex"; 
        overlay.style.opacity = "1";
    }
}

function setupKnob(id, callback) {
    const knob = document.getElementById(id);
    if(!knob) return;

    let startY = 0; let startValue = 0; let isDragging = false;
    let currentValue = parseFloat(knob.dataset.value) || 0;
    
    updateKnobVisual(knob, currentValue);

    knob.addEventListener('mousedown', (e) => {
        isDragging = true; startY = e.clientY; startValue = currentValue;
        document.body.style.cursor = 'ns-resize'; 
        knob.classList.add('active'); e.preventDefault(); 
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const sensitivity = 200; 
        const deltaY = startY - e.clientY; 
        let newValue = startValue + (deltaY / sensitivity);
        if (newValue < 0) newValue = 0; if (newValue > 1) newValue = 1;
        currentValue = newValue;
        
        updateKnobVisual(knob, currentValue);
        if(callback) callback(currentValue);
    });

    window.addEventListener('mouseup', () => {
        if(isDragging) {
            isDragging = false; document.body.style.cursor = 'default'; knob.classList.remove('active');
        }
    });
}

function updateKnobVisual(knobElement, value0to1) {
    const minDeg = -135; const maxDeg = 135;
    const currentDeg = minDeg + (value0to1 * (maxDeg - minDeg));
    const indicator = knobElement.querySelector('.knob-indicator');
    if(indicator) indicator.style.transform = `translate(-50%, -100%) rotate(${currentDeg}deg)`;
    knobElement.dataset.value = value0to1;
}

/* ==========================================
   FORCE CLOSE FIX (ROBUSTE)
   ========================================== */
document.addEventListener('click', function(e) {
    // On utilise .closest() pour détecter le clic même sur l'icône à l'intérieur du bouton
    const closeBtn = e.target.closest('#btn-close-vcf');

    if (closeBtn) {
        console.log(">>> FERMETURE FORCÉE DETECTÉE");
        const overlay = document.getElementById('vcf-module-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            // On force le style CSS pour être sûr qu'il disparaisse
            overlay.style.display = 'none'; 
            overlay.style.opacity = '0';
        }
    }
});


function updateFilterGraph() {
    const canvas = document.getElementById('filter-graph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width; const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (window.vcfState.bypass) {
        ctx.beginPath(); ctx.strokeStyle = "#444"; ctx.lineWidth = 2;
        ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke(); return;
    }

    const cutoff = window.vcfState.cutoff; 
    const res = window.vcfState.resonance; 
    ctx.beginPath(); ctx.strokeStyle = "#00f3ff"; ctx.lineWidth = 2;
    ctx.shadowBlur = 5; ctx.shadowColor = "#00f3ff";
    ctx.moveTo(0, height - 5); 
    const cutoffX = cutoff * width; 
    const peakHeight = res * (height * 0.8); 
    ctx.bezierCurveTo(cutoffX / 2, height - 5, cutoffX - 10, height - 5, cutoffX, height - 5 - peakHeight);
    ctx.bezierCurveTo(cutoffX + 10, height - 5 - peakHeight, cutoffX + 20, height + 10, width, height + 10);
    ctx.stroke(); ctx.shadowBlur = 0; 
}
