// Création du Master Gain
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);

// Fonction pour lier le slider Master au volume
document.getElementById('master-volume').addEventListener('input', (e) => {
    masterGain.gain.value = e.target.value;
});
