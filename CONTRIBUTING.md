# Contribuer à HARDBEAT PRO

Merci de vouloir participer au développement du séquenceur Techno le plus lourd du web ! 🎹

## 🛠️ Règles de Développement

### 1. Le Moteur Audio (`logic.js`)
C'est le cœur du réacteur. 
* **Attention :** Toute modification ici doit être testée rigoureusement. Une latence de 10ms est inacceptable.
* **Architecture :** Nous utilisons l'API Web Audio native. Pas de bibliothèques tierces lourdes.

### 2. L'Interface (`HARDBEAT-PRO.html`)
* Le design est "Desktop First" (Console de Studio).
* Sur mobile, nous forçons l'utilisateur à passer en mode Paysage ou nous le redirigeons.

### 3. Système I/O (`io.js`)
* La V13 a introduit la persistance JSON.
* Si vous ajoutez un paramètre au son (ex: Reverb), vous DEVEZ mettre à jour l'export/import JSON pour qu'il soit sauvegardé.

##  workflow

1. **Forkez** le projet.
2. Créez une branche (`git checkout -b feature/MaSuperIdee`).
3. Testez sur Chrome ET Firefox.
4. Envoyez une **Pull Request** vers la branche `main`.

Merci de faire vivre la Techno !
