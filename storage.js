/* ==========================================
   HARDBEAT PRO - STORAGE ENGINE (V12 - VCF & FIX)
   ========================================== */

/* --- VCF DATA BANK --- */
window.vcfBank = {
    seq2: { cutoff: 0.5, res: 0.0, bypass: true },
    seq3: { cutoff: 0.5, res: 0.0, bypass: true }
};

window.applyFilterConfig = function(seqId, config) {
    if (!config) return;
    
    // 1. Mémoire
    if (seqId === 2) window.vcfBank.seq2 = { ...config };
    if (seqId === 3) window.vcfBank.seq3 = { ...config };

    // 2. Audio
    const targetFilter = (seqId === 3) ? window.globalFilter3 : window.globalFilter2;
    if (targetFilter && window.audioCtx) {
        if (config.bypass) {
            targetFilter.frequency.setValueAtTime(20000, window.audioCtx.currentTime);
            targetFilter.Q.setValueAtTime(0, window.audioCtx.currentTime);
        } else {
            const freqHz = Math.floor(20 + (Math.pow(config.cutoff, 2) * 12000));
            targetFilter.frequency.setValueAtTime(freqHz, window.audioCtx.currentTime);
            targetFilter.Q.setValueAtTime(config.res * 20, window.audioCtx.currentTime);
        }
    }

    // 3. UI
    if (window.vcfState && window.vcfState.trackId === seqId) {
        window.vcfState.cutoff = config.cutoff;
        window.vcfState.resonance = config.res;
        window.vcfState.bypass = config.bypass;
        
        const knobCut = document.getElementById('knob-cutoff');
        const knobRes = document.getElementById('knob-res');
        const check = document.getElementById('vcf-bypass-toggle');
        
        if(knobCut && window.updateKnobVisual) window.updateKnobVisual(knobCut, config.cutoff);
        if(knobRes && window.updateKnobVisual) window.updateKnobVisual(knobRes, config.res);
        if(check) check.checked = !config.bypass;
        
        if(document.getElementById('val-cutoff')) {
             const hz = Math.floor(20 + (Math.pow(config.cutoff, 2) * 12000));
             document.getElementById('val-cutoff').innerText = hz + " Hz";
        }
        if(document.getElementById('val-res')) document.getElementById('val-res').innerText = (config.res * 20).toFixed(1);
        
        if(window.updateFilterGraph) window.updateFilterGraph();
    }
};




/* ==========================================
   CORRECTION DES NOMS (MATCHING HTML)
   ========================================== */

function initStorageSystem() {
    console.log("Storage System V22: Ready & Synced with HTML.");
    
    // 1. Mise à jour visuelle immédiate
    updateMemoryUI(); 

    // 2. Gestion du bouton SAVE (Mode Sauvegarde)
    // DANS TON HTML C'EST "btn-mem-save", PAS "btn-save-mode"
    const btnSave = document.getElementById('btn-mem-save'); 
    if(btnSave) {
        btnSave.onclick = () => {
            window.isSaveMode = !window.isSaveMode;
            btnSave.classList.toggle('active', window.isSaveMode);
            
            // Ajout d'effet visuel sur les pads
            document.querySelectorAll('.mem-pad').forEach(p => {
                p.classList.toggle('save-mode', window.isSaveMode);
            });
        };
    }

    // 3. Gestion du bouton CLEAR (Vider)
    // DANS TON HTML C'EST "btn-mem-clear"
    const btnClear = document.getElementById('btn-mem-clear');
    if(btnClear) {
        btnClear.onclick = () => {
            if(confirm("Vider la séquence actuelle à l'écran ?")) clearAllData();
        };
    }

    // 4. Gestion des 8 PADS DE MÉMOIRE
    // DANS TON HTML C'EST LA CLASSE ".mem-pad"
    const pads = document.querySelectorAll('.mem-pad');
    
    if (pads.length === 0) {
        console.error("ERREUR CRITIQUE: Aucun bouton '.mem-pad' trouvé dans le HTML !");
    }

    pads.forEach(pad => {
        // Clic Gauche (Load / Save)
        pad.onclick = () => {
            const slot = parseInt(pad.dataset.slot); // Ton HTML utilise data-slot="0" à "7"
            
            // Si on est en mode Save
            if (window.isSaveMode) {
                // On ajoute +1 pour le nom du fichier (Slot 0 devient Slot 1 pour l'humain)
                const fileSlot = slot + 1; 
                
                if(localStorage.getItem(`hardbeat_pattern_${fileSlot}`)) {
                    if(!confirm(`Écraser le Slot ${fileSlot} ?`)) return;
                }
                savePattern(fileSlot); // On appelle la nouvelle fonction de sauvegarde
                
                // Feedback Visuel
                pad.style.backgroundColor = "red";
                setTimeout(() => { pad.style.backgroundColor = ""; updateMemoryUI(); }, 200);
                
                // On quitte le mode save
                window.isSaveMode = false; 
                if(btnSave) {
                    btnSave.classList.remove('active');
                    document.querySelectorAll('.mem-pad').forEach(p => p.classList.remove('save-mode'));
                }
            } 
            // Sinon on est en mode Load
            else {
                const fileSlot = slot + 1;
                if (localStorage.getItem(`hardbeat_pattern_${fileSlot}`)) {
                    loadPattern(fileSlot); // On appelle la nouvelle fonction de chargement
                    
                    // Feedback Visuel
                    window.currentMemorySlot = slot;
                    updateMemoryUI();
                } else {
                    if(confirm(`Slot ${fileSlot} vide. Créer nouveau projet ?`)) {
                        clearAllData();
                        window.currentMemorySlot = -1;
                        updateMemoryUI();
                    }
                }
            }
        };

        // Clic Droit (Supprimer)
        pad.oncontextmenu = (e) => {
            e.preventDefault();
            const slot = parseInt(pad.dataset.slot);
            const fileSlot = slot + 1;
            
            if (localStorage.getItem(`hardbeat_pattern_${fileSlot}`)) {
                if(confirm(`⚠️ Supprimer définitivement le SLOT ${fileSlot} ?`)) {
                    localStorage.removeItem(`hardbeat_pattern_${fileSlot}`);
                    updateMemoryUI();
                }
            }
        };
    });
}




/* ANCIENNE FONCTION AVANT QUI NE POUVAIT REMETTRE A ZERO LE FILTER / FX QUI EST REMPLACE PAR CELLE DU DESSOUS

function clearAllData() {
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    if(window.fmFreqData) window.fmFreqData.fill(100);
    
    window.isMutedSeq2 = false;
    window.isMutedSeq3 = false;
    const btnM2 = document.getElementById('btn-mute-seq2'); if(btnM2) btnM2.classList.remove('active');
    const btnM3 = document.getElementById('btn-mute-seq3'); if(btnM3) btnM3.classList.remove('active');
    
    window.masterLength = 16;
    
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === 16); });
    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    if(window.refreshFMFaders) window.refreshFMFaders();

    // RESET VCF (IMPORTANT POUR EVITER QUE LE SON RESTE)
    window.applyFilterConfig(2, { cutoff: 0.5, res: 0.0, bypass: true });
    window.applyFilterConfig(3, { cutoff: 0.5, res: 0.0, bypass: true });
}

*/

function clearAllData() {
    // 1. RESET SÉQUENCES
    window.drumSequences = Array.from({ length: 5 }, () => Array(64).fill(false));
    window.drumAccents = Array.from({ length: 5 }, () => Array(64).fill(false));
    
    window.synthSequences.seq2 = Array(64).fill(false);
    window.synthSequences.seq3 = Array(64).fill(false);
    
    window.freqDataSeq2.fill(440);
    window.freqDataSeq3.fill(440);
    
    if(window.fmFreqData) window.fmFreqData.fill(100);
    
    // 2. RESET MIXAGE
    window.isMutedSeq2 = false;
    window.isMutedSeq3 = false;
    const btnM2 = document.getElementById('btn-mute-seq2'); if(btnM2) btnM2.classList.remove('active');
    const btnM3 = document.getElementById('btn-mute-seq3'); if(btnM3) btnM3.classList.remove('active');
    window.trackMutes = [false, false, false, false, false];
    window.trackSolos = [false, false, false, false, false];
    
    // 3. RESET GLOBAL
    window.masterLength = 16;
    window.trackLengths = [16, 16, 16, 16, 16];
    
    // ============================================================
    // 👇 LE BLOC MAGIQUE POUR REMETTRE LE FILTRE A ZÉRO 👇
    // ============================================================
    // On remet la banque à neuf (Bypass = true, Cutoff = 0.5)
    if(window.applyFilterConfig) {
        window.applyFilterConfig(2, { cutoff: 0.5, res: 0.0, bypass: true });
        window.applyFilterConfig(3, { cutoff: 0.5, res: 0.0, bypass: true });
    }
    
    // On force la mise à jour visuelle du filtre si la fenêtre est ouverte
    if (window.updateFilterGraph) window.updateFilterGraph();
    // ============================================================

    // 4. RESET UI
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === 16); });
    
    // Reset des Sliders Steps
    const stepIds = ['kick-steps', 'snare-steps', 'hhc-steps', 'hho-steps', 'fm-steps'];
    stepIds.forEach(id => { 
        const el = document.getElementById(id); 
        if(el) { el.value = 16; el.dispatchEvent(new Event('input')); }
    });

    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    if(window.refreshFMFaders) window.refreshFMFaders();
    
    // Désélection du slot mémoire
    window.currentMemorySlot = -1;
    if(typeof updateMemoryVisuals === 'function') updateMemoryVisuals();

    console.log(">>> SYSTEM CLEARED (FILTERS RESET).");
}





/* FONCTION SAVEPATTERN */

function savePattern(slot) {
    try {
        console.log(">>> TENTATIVE DE SAUVEGARDE SLOT " + slot);
        
        // 1. SÉCURITÉ VCF
        const vcfSafe = window.vcfBank || { 
            seq2: { cutoff: 0.5, res: 0, bypass: true }, 
            seq3: { cutoff: 0.5, res: 0, bypass: true } 
        };

        // 2. CONSTRUCTION DE L'OBJET COMPLET
        const data = {
            version: "2.5-FULL", 
            masterLength: window.masterLength || 16,
            
            // --- AJOUT : CONTRÔLES LOGIQUES ---
            controls: {
                isChordMode: window.isChordModeSeq3 || false // Le bouton CHORD ON/OFF
            },
            
            // --- AJOUT : QUALITÉ DES ACCORDS ---
            chords: {
                qual: window.chordQualitySeq3 || Array(64).fill(false) // M/m
            },

            // --- VCF (FILTRE) ---
            vcfData: {
                seq2: vcfSafe.seq2,
                seq3: vcfSafe.seq3
            },

            // --- DRUMS ---
            drums: {
                seq: window.drumSequences,
                accents: window.drumAccents,
                fmFreqs: window.fmFreqData || Array(64).fill(100), 
                mutes: window.trackMutes,
                solos: window.trackSolos || [false,false,false,false,false],
                lengths: window.trackLengths,
                settings: { 
                    kick: window.kickSettings,
                    snare: window.snareSettings,
                    hhc: window.hhSettings,
                    hho: window.hhSettings,
                    fm: window.fmSettings
                }
            },

            // --- SYNTHS ---
            synths: {
                seq2: window.synthSequences.seq2,
                seq3: window.synthSequences.seq3,
                // AJOUT ACCENTS SYNTHS (Manquait dans la version Test)
                acc2: window.synthAccents.seq2 || Array(64).fill(false),
                acc3: window.synthAccents.seq3 || Array(64).fill(false),
                
                freqs2: window.freqDataSeq2,
                freqs3: window.freqDataSeq3,
                params2: window.paramsSeq2, 
                params3: window.paramsSeq3,
                mutes: { seq2: window.isMutedSeq2, seq3: window.isMutedSeq3 }, 
                vol2: document.getElementById('vol-seq2') ? document.getElementById('vol-seq2').value : 0.6,
                vol3: document.getElementById('vol-seq3') ? document.getElementById('vol-seq3').value : 0.6,
            },

            // --- GLOBAL ---
            global: {
                bpm1: document.getElementById('display-bpm1') ? document.getElementById('display-bpm1').innerText : 120,
                bpm2: 120,
                swing: document.getElementById('global-swing') ? document.getElementById('global-swing').value : 0,
                accent: 1,
                delay: window.globalDelay || { amt: 0, time: 0.3 }
            }
        }; 

        // 3. ÉCRITURE DISQUE
        const json = JSON.stringify(data);
        localStorage.setItem(`hardbeat_pattern_${slot}`, json);
        
        console.log("✅ SAUVEGARDE RÉUSSIE (V2.5) ! TAILLE: " + json.length);
        updateMemoryUI();

    } catch (e) {
        console.error("❌ ERREUR FATALE PENDANT LA SAUVEGARDE :", e);
        alert("ERREUR SAVE: " + e.message);
    }
}


// FONCTION LOADPATTERN

function loadPattern(slot) {
    const json = localStorage.getItem(`hardbeat_pattern_${slot}`);
    if (!json) return; 
    try {
        const data = JSON.parse(json);
        
        // 1. MASTER LENGTH
        window.masterLength = data.masterLength || 16;
        document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength); });
        if(window.updateNavButtonsState) window.updateNavButtonsState();

        // 2. DRUMS (SEQUENCES & ACCENTS)
        window.drumSequences = (data.drums.seq[0].length < 64) ? data.drums.seq.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.seq;
        window.drumAccents = (data.drums.accents[0].length < 64) ? data.drums.accents.map(r => [...r, ...Array(64-r.length).fill(false)]) : data.drums.accents;
        
        // 3. FM FREQS
        if (data.drums.fmFreqs) {
            window.fmFreqData = data.drums.fmFreqs.map(v => parseFloat(v));
            if (window.fmFreqData.length < 64) window.fmFreqData = [...window.fmFreqData, ...Array(64 - window.fmFreqData.length).fill(100)];
        } else { if(window.fmFreqData) window.fmFreqData.fill(100); }

        // 4. MIXER (MUTES/SOLOS/LENGTHS)
        window.trackMutes = data.drums.mutes;
        window.trackSolos = data.drums.solos;
        window.trackLengths = data.drums.lengths;

        // 5. DRUM SLIDERS
        const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
        setSlider('kick-pitch', data.drums.settings.kick.pitch);
        setSlider('kick-decay', data.drums.settings.kick.decay);
        setSlider('kick-level', data.drums.settings.kick.level);
        setSlider('snare-tone', data.drums.settings.snare.tone);
        setSlider('snare-snappy', data.drums.settings.snare.snappy);
        setSlider('snare-level', data.drums.settings.snare.level);
        setSlider('hhc-tone', data.drums.settings.hhc.tone);
        setSlider('hhc-level', data.drums.settings.hhc.levelClose);
        setSlider('hho-decay', data.drums.settings.hho.decayOpen);
        setSlider('hho-level', data.drums.settings.hho.levelOpen);
        setSlider('fm-carrier', data.drums.settings.fm.carrierPitch);
        setSlider('fm-mod', data.drums.settings.fm.modPitch);
        setSlider('fm-amt', data.drums.settings.fm.fmAmount);
        setSlider('fm-decay', data.drums.settings.fm.decay);
        setSlider('fm-level', data.drums.settings.fm.level);

        document.querySelectorAll('.btn-mute').forEach((btn) => { 
            if (!btn.classList.contains('btn-synth-mute')) { 
                const track = parseInt(btn.dataset.track); 
                btn.classList.toggle('active', window.trackMutes[track]); 
            }
        });

        // 6. SYNTHS (SEQUENCES)
        window.synthSequences.seq2 = (data.synths.seq2.length < 64) ? [...data.synths.seq2, ...Array(64 - data.synths.seq2.length).fill(false)] : data.synths.seq2;
        window.synthSequences.seq3 = (data.synths.seq3 && data.synths.seq3.length < 64) ? [...data.synths.seq3, ...Array(64 - data.synths.seq3.length).fill(false)] : (data.synths.seq3 || Array(64).fill(false));
        
        // --- AJOUT V2.5 : SYNTH ACCENTS ---
        if (data.synths.acc2) window.synthAccents.seq2 = [...data.synths.acc2];
        else if (window.synthAccents.seq2) window.synthAccents.seq2.fill(false);

        if (data.synths.acc3) window.synthAccents.seq3 = [...data.synths.acc3];
        else if (window.synthAccents.seq3) window.synthAccents.seq3.fill(false);
        // ----------------------------------

        if (data.synths.freqs2) window.freqDataSeq2 = data.synths.freqs2.map(v => parseFloat(v));
        if (data.synths.freqs3) window.freqDataSeq3 = data.synths.freqs3.map(v => parseFloat(v));

        setSlider('vol-seq2', data.synths.vol2);
        setSlider('synth2-disto', data.synths.params2.disto);
        setSlider('synth2-res', data.synths.params2.res);
        setSlider('synth2-cutoff', data.synths.params2.cutoff);
        setSlider('synth2-decay', data.synths.params2.decay);

        const mutes = data.synths.mutes || { seq2: false, seq3: false };
        if(window.toggleMuteSynth) {
            window.toggleMuteSynth(2, mutes.seq2);
            window.toggleMuteSynth(3, mutes.seq3);
        }
        const btnMute2 = document.getElementById('btn-mute-seq2'); 
        if(btnMute2) btnMute2.classList.toggle('active', mutes.seq2);

        // --- GESTION AFFICHAGE SEQ 3 ---
        const hasSeq3Data = data.synths.freqs3 && data.synths.freqs3.some(f => f !== 440);
        const isSeq3Visible = document.getElementById('seq3-container');
        if ((hasSeq3Data || mutes.seq3) && !isSeq3Visible) {
             const btnAdd = document.getElementById('add-seq-btn'); if(btnAdd) btnAdd.click();
        }

        setTimeout(() => {
             if(document.getElementById('seq3-container')) {
                 setSlider('vol-seq3', data.synths.vol3);
                 setSlider('synth3-disto', data.synths.params3.disto);
                 setSlider('synth3-res', data.synths.params3.res);
                 setSlider('synth3-cutoff', data.synths.params3.cutoff);
                 setSlider('synth3-decay', data.synths.params3.decay);
                 
                 const btnMute3 = document.getElementById('btn-mute-seq3'); 
                 if(btnMute3) btnMute3.classList.toggle('active', mutes.seq3);
                 
                 // --- AJOUT V2.5 : UPDATE VISUEL DU BOUTON CHORD ---
                 if (data.controls && data.controls.isChordMode !== undefined) {
                     window.isChordModeSeq3 = data.controls.isChordMode;
                     const btnChord = document.getElementById('btn-chord-seq3');
                     if (btnChord) {
                         if (window.isChordModeSeq3) {
                             btnChord.innerText = "CHORD: ON";
                             btnChord.style.background = "#a855f7"; 
                             btnChord.style.color = "#000";
                         } else {
                             btnChord.innerText = "CHORD: OFF";
                             btnChord.style.background = "transparent";
                             btnChord.style.color = "#a855f7";
                         }
                     }
                 }
                 // --------------------------------------------------

                 if(window.refreshFadersVisuals) window.refreshFadersVisuals(3);
             }
        }, 100);

        // --- AJOUT V2.5 : RESTAURATION QUALITÉ ACCORDS (M/m) ---
        if (data.chords && data.chords.qual) {
            window.chordQualitySeq3 = [...data.chords.qual];
        } else {
            if(window.chordQualitySeq3) window.chordQualitySeq3.fill(false);
        }
        // -------------------------------------------------------

        // 7. CHARGEMENT VCF
        if (data.vcfData) {
            window.applyFilterConfig(2, data.vcfData.seq2);
            window.applyFilterConfig(3, data.vcfData.seq3);
        } else {
            window.applyFilterConfig(2, { cutoff: 0.5, res: 0, bypass: true });
            window.applyFilterConfig(3, { cutoff: 0.5, res: 0, bypass: true });
        }

        // 8. GLOBAL
        document.getElementById('display-bpm1').innerText = data.global.bpm1;
        setSlider('global-swing', data.global.swing); 
        setSlider('global-accent-amount', data.global.accent);
        setSlider('global-delay-amt', data.global.delay.amt);
        setSlider('global-delay-time', data.global.delay.time);

        // 9. REFRESH UI FINALE
        if(window.refreshGridVisuals) window.refreshGridVisuals();
        if(window.refreshFadersVisuals) window.refreshFadersVisuals(2);
        if(window.refreshFMFaders) window.refreshFMFaders();

    } catch (e) {
        console.error(e);
        alert("Fichier incompatible.");
    }
}






function updateMemoryUI() {
    // On cible .mem-pad (ton HTML)
    const pads = document.querySelectorAll('.mem-pad');
    
    pads.forEach(pad => {
        const slot = parseInt(pad.dataset.slot);
        const fileSlot = slot + 1;
        
        // Reset classes
        pad.classList.remove('has-data', 'playing');
        pad.style.backgroundColor = ""; // Reset couleur inline
        
        // Si une sauvegarde existe sur le disque
        if (localStorage.getItem(`hardbeat_pattern_${fileSlot}`)) {
            pad.classList.add('has-data');
            // Force la couleur si le CSS déconne (Cyan pour données)
            pad.style.borderColor = "#00f3ff";
            pad.style.color = "#00f3ff";
        } else {
            pad.style.borderColor = "#444";
            pad.style.color = "#444";
        }

        // Si c'est le slot actif
        if (slot === window.currentMemorySlot) {
            pad.classList.add('playing');
            pad.style.backgroundColor = "#00f3ff";
            pad.style.color = "#000";
        }
    });
}



function loadFactoryPreset(key) {
    const p = FACTORY_PRESETS[key];
    if(!p) return;
    
    // 1. On vide tout avant de charger
    clearAllData();

    // 2. Chargement GLOBAL
    window.masterLength = p.masterLength || 16;
    document.getElementById('display-bpm1').innerText = p.bpm;
    if(document.getElementById('display-bpm2')) document.getElementById('display-bpm2').innerText = p.bpm;
    
    const setSlider = (id, val) => { const el = document.getElementById(id); if(el) { el.value = val; el.dispatchEvent(new Event('input')); } };
    setSlider('global-swing', p.swing);

    // 3. Chargement TRACKS LENGTHS
    if(p.trackLengths) {
        window.trackLengths = [...p.trackLengths]; 
        setSlider('kick-steps', p.trackLengths[0]);
        setSlider('snare-steps', p.trackLengths[1]);
        setSlider('hhc-steps', p.trackLengths[2]);
        setSlider('hho-steps', p.trackLengths[3]);
        setSlider('fm-steps', p.trackLengths[4]);
    }

    // 4. Chargement DRUMS
    for(let i=0; i<5; i++) {
        window.drumSequences[i] = [...p.drums.seq[i], ...Array(64-p.drums.seq[i].length).fill(false)];
        if(p.drums.accents && p.drums.accents[i]) window.drumAccents[i] = [...p.drums.accents[i], ...Array(64-p.drums.accents[i].length).fill(false)];
    }
    
    if (p.drums && p.drums.fmFreqs) {
        window.fmFreqData = [...p.drums.fmFreqs];
        if (window.fmFreqData.length < 64) window.fmFreqData = [...window.fmFreqData, ...Array(64 - window.fmFreqData.length).fill(100)];
    } else { window.fmFreqData.fill(100); }

    // 5. Chargement SYNTHS (Séquences)
    if(p.synths.seq2) window.synthSequences.seq2 = [...p.synths.seq2, ...Array(64-p.synths.seq2.length).fill(false)];
    if(p.synths.seq3) window.synthSequences.seq3 = [...p.synths.seq3, ...Array(64-p.synths.seq3.length).fill(false)];

    if(p.freqs2) window.freqDataSeq2 = [...p.freqs2];
    else if(p.freqs && p.freqs.s2) window.freqDataSeq2.fill(p.freqs.s2); 
    
    if(p.freqs3) window.freqDataSeq3 = [...p.freqs3];
    else if(p.freqs && p.freqs.s3) window.freqDataSeq3.fill(p.freqs.s3); 
    
    if(p.accents2) window.synthAccents.seq2 = [...p.accents2];
    if(p.accents3) window.synthAccents.seq3 = [...p.accents3];

    // 6. Gestion CONTROLES & CHORD MODE (C'EST ICI LE CORRECTIF !)
    // ==========================================================
    if (p.controls) {
        // A. CHORD MODE
        if (p.controls.isChordMode !== undefined) {
            window.isChordModeSeq3 = p.controls.isChordMode;
            // On force le bouton visuellement
            const btnChord = document.getElementById('btn-chord-seq3');
            if (btnChord) {
                if (window.isChordModeSeq3) {
                    btnChord.innerText = "CHORD: ON";
                    btnChord.style.background = "#a855f7";
                    btnChord.style.color = "#000";
                } else {
                    btnChord.innerText = "CHORD: OFF";
                    btnChord.style.background = "transparent";
                    btnChord.style.color = "#a855f7";
                }
            }
        }

        // B. Autres contrôles (Optionnel, si tu veux charger les knobs depuis le preset)
        if (p.controls.kick) { setSlider('kick-pitch', p.controls.kick.pitch); setSlider('kick-decay', p.controls.kick.decay); setSlider('kick-level', p.controls.kick.level); }
        // Tu peux ajouter ici les autres knobs (snare, hh, s2, s3) si tu veux que tes presets contrôlent aussi le son
    } else {
        // Si pas de controls, on remet à zéro par sécurité
        window.isChordModeSeq3 = false;
        const btnChord = document.getElementById('btn-chord-seq3');
        if (btnChord) {
            btnChord.innerText = "CHORD: OFF";
            btnChord.style.background = "transparent";
            btnChord.style.color = "#a855f7";
        }
    }
    // ==========================================================

    // 7. Mise à jour UI
    document.querySelectorAll('.btn-length').forEach(b => { b.classList.toggle('active', parseInt(b.dataset.length) === window.masterLength); });
    if(window.updateNavButtonsState) window.updateNavButtonsState();
    if(window.refreshGridVisuals) window.refreshGridVisuals();
    if(window.refreshFadersVisuals) {
        window.refreshFadersVisuals(2);
        if(document.getElementById('grid-seq3')) window.refreshFadersVisuals(3);
    }
    
    // 8. Chargement VCF FACTORY
    if (p.vcf) {
        window.applyFilterConfig(2, p.vcf.seq2);
        window.applyFilterConfig(3, p.vcf.seq3);
    } else {
        window.applyFilterConfig(2, { cutoff: 0.5, res: 0, bypass: true });
        window.applyFilterConfig(3, { cutoff: 0.5, res: 0, bypass: true });
    }

    if(window.refreshFMFaders) window.refreshFMFaders();
    
    // Affichage auto de SEQ 3 si utilisé
    const seq3Used = p.synths.seq3.some(x => x === true);
    const isSeq3Visible = document.getElementById('seq3-container');
    if (seq3Used && !isSeq3Visible) {
         const btnAdd = document.getElementById('add-seq-btn'); if(btnAdd) btnAdd.click();
    }
    
    console.log(`Preset ${p.name} loaded (with Chord Mode).`);
}




/* ==========================================
   LE PONT HTML (Remplace la vieille fonction de logic.js)
   ========================================== */
window.loadPreset = function(val) {
    if (!val) return;

    // CAS 1 : INIT (Le nettoyage complet)
    if (val === 'init') {
        if(confirm("Réinitialiser tout le projet (Sons, FX, Séquences) ?")) {
            clearAllData(); // C'est cette fonction (dans storage.js) qui remet le VCF à zéro
        }
    }
    
    // CAS 2 : CHARGEMENT D'UN PRESET USINE
    else if (window.FACTORY_PRESETS && window.FACTORY_PRESETS[val]) {
        if(confirm(`Charger le preset "${window.FACTORY_PRESETS[val].name}" ?`)) {
            loadFactoryPreset(val);
        }
    }

    // Remettre le menu déroulant sur le titre par défaut
    const selector = document.getElementById('preset-selector');
    if(selector) {
        selector.value = "";
        selector.blur();
    }
};
