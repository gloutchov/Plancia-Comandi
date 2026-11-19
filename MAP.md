# Mappa del repository / Repository map

## Italiano

Questa mappa descrive la struttura di Plancia Comandi **0.3.10**, le responsabilità dei moduli e i file generati. Aggiornarla quando cambiano sorgenti, comandi, test, workflow o documentazione.

**Sommario**

- [1. Struttura ASCII](#1-struttura-ascii)
- [2. Flusso e responsabilità](#2-flusso-e-responsabilità)
- [3. Comandi e verifiche](#3-comandi-e-verifiche)
- [4. File locali e generati](#4-file-locali-e-generati)

### 1. Struttura ASCII

```text
Plancia-Comandi/
|-- README.md                         Presentazione e avvio IT/EN
|-- ISTRUZIONI.md                     Manuale italiano
|-- INSTRUCTIONS.md                  Traduzione completa inglese
|-- QUICK-START_Desktop.md            Avvio rapido desktop IT/EN
|-- SECURITY_MODEL.md                Controlli e limiti di sicurezza IT/EN
|-- PLAN.md                          Piano e verifiche IT/EN
|-- MAP.md                           Questa mappa IT/EN
|-- AGENTS.md                        Regole operative per maintainer e agenti
|-- STARTUP_PREFERENCES_HOME.md      Preferenze HOME del progettista, con appendice per gli agenti cloud; non è documentazione del repository
|-- LICENSE                          Apache License 2.0
|-- package.json                     Versione, dipendenze e script npm canonici
|-- package-lock.json                Risoluzione riproducibile delle dipendenze
|-- .gitignore                       Esclusioni per output, dipendenze e log
|-- electron-builder.json5           Target e contenuti dei pacchetti
|-- vite.config.ts                   Server locale, CSP di sviluppo e bundle main/preload/renderer
|-- vitest.config.ts                 Unit test in ambiente Node
|-- tsconfig.json                    Controllo TypeScript applicativo
|-- tsconfig.node.json               Configurazione TypeScript per Vite
|-- index.html                       Documento HTML del renderer; la CSP è iniettata dal plugin Vite
|-- config/
|   `-- app.config.json              Limiti di appunti, trascinamento, input e pattern
|-- electron/
|   |-- main.ts                      Finestra, lifecycle, IPC, CSP, notifiche, demo
|   |-- permissions.ts              Negazione di controlli e richieste Chromium
|   |-- legacyIpc.ts                 Registrazione dei canali IPC precedenti a M1
|   |-- preload.ts                   Bridge API dedicato al renderer
|   |-- editMenu.ts                  Menu Modifica e comandi di editing
|   |-- clipboardIpc.ts              Lettura e scrittura degli appunti
|   |-- customPatterns.ts            Worker unico, coda limitata, timeout e fallback M7
|   |-- customPatternWorker.ts       Programma worker statico incluso nel bundle main
|   |-- sessions.ts                  Creazione/chiusura PTY; su Windows useConptyDll e taskkill /T /F prima di pty.kill
|   |-- settings.ts                  Preferenze, default, validazione e migrazione
|   |-- settingsFile.ts              Lettura limitata, recupero .bak, blocco scritture e migrazione
|   |-- privateFile.ts               File regolari, temporanei esclusivi, fsync e rename
|   |-- diagnostics.ts               Log locali limitati con soli metadati consentiti
|   |-- startupFailure.ts            Avviso IT/EN, diagnostica consentita e uscita 1 differita
|   |-- shells.ts                    Rilevamento delle shell per piattaforma
|   |-- children.ts                  Snapshot dei processi figli e timeout
|   `-- screen.ts                    Parser terminale headless per lo schermo
|-- src/
|   |-- main.tsx                     Ingresso React e import degli stili
|   |-- App.tsx                      Coordinamento workspace, sessioni e dialoghi
|   |-- env.d.ts                     Tipi del bridge window.plancia
|   |-- styles.css                   Layout, temi e componenti
|   |-- termTheme.ts                 Palette dei terminali
|   |-- shortcuts.ts                 Riconoscimento delle scorciatoie
|   |-- shortcuts.test.ts            Test di copia, incolla e Ctrl+C
|   |-- terminalStream.ts            Ordine snapshot/output e deduplica per sequenza M28
|   |-- terminalStream.test.ts       Race di parsing, query frammentate, input e chiusura
|   |-- terminalEdit.ts              Copia, incolla e trascinamento nel terminale
|   |-- terminalEdit.test.ts         Test di deduplica, sequenza acc/key, gesto orfano e tetto FIFO
|   |-- terminalEdit.powershell.test.ts Test dei percorsi Unicode in drop e immagini incollate
|   |-- terminalEdit.fish.test.ts     Test fish per drop, immagini, limiti e testo libero
|   |-- test/
|   |   |-- fishQuoting.ts           Percorsi sintetici e attese per gli escape fish
|   |   |-- powershellQuoting.ts     Casi sintetici e bridge appunti finto per i test PowerShell
|   |   |-- powershellNativeTransport.ts Protocollo base64 UTF-8 e validazione dei report nativi
|   |   `-- powershellNativeTransport.test.ts Test di Unicode, separatori e report non validi
|   |-- cx.ts                        Helper per nomi di classi CSS
|   |-- components/
|   |   |-- Sidebar.tsx              Elenco sessioni, rinomina e affiancamento
|   |   |-- TerminalView.tsx         xterm, resize, clipboard e collegamenti
|   |   |-- TerminalMenu.tsx         Menu contestuale Copia e Incolla
|   |   |-- LayoutSwitcher.tsx       Icone delle quattro viste
|   |   |-- NewSessionDialog.tsx     Scelta nome, shell e cartella
|   |   |-- SettingsDialog.tsx       Preferenze e parametri del rilevamento
|   |   `-- ConfirmDialog.tsx        Conferma di chiusura di una sessione
|   `-- shared/
|       |-- types.ts                 Contratti dati condivisi
|       |-- i18n.ts                  Dizionari IT/EN e testi delle scorciatoie
|       |-- paths.ts                 Abbreviazione visiva dei percorsi
|       |-- appConfig.ts             Validazione della configurazione centrale
|       |-- ptyProbe.ts              Percorsi di pty.node, prebuild compresa
|       |-- startupTrace.ts          Traccia opt-in solo in sviluppo
|       |-- developmentOptions.ts    Dieci variabili ignorate nei pacchetti
|       |-- developmentOptions.test.ts Matrice sviluppo/pacchetto e alias
|       |-- startupFailure.test.ts   Lingue, privacy e uscita anche dopo errori degli effetti
|       |-- appConfig.test.ts        Test della configurazione e dei default
|       |-- shellQuote.ts            Quotatura dei percorsi per la shell
|       |-- shellQuote.test.ts       Test POSIX, fish, PowerShell Unicode e cmd
|       |-- shellDetection.test.ts   Rilevamento simulato dei quattro percorsi fish, senza shell reali
|       |-- shellQuote.native.test.ts Confronto API e round-trip PowerShell 5.1/7 senza autoload di moduli, file UTF-8/base64 e diagnosi della fase, condizionato alla piattaforma
|       |-- drop.ts                  Scelta tra percorsi e testo trascinati
|       |-- drop.test.ts             Test del trascinamento
|       |-- layout.ts                Abilitazione viste e sessioni visibili
|       |-- layout.test.ts           Test delle viste
|       |-- navigation.ts            Decisione di blocco delle navigazioni
|       |-- navigation.test.ts       Test delle navigazioni consentite
|       |-- csp.ts                   Policy CSP di produzione e di sviluppo
|       |-- csp.test.ts              Test della policy, senza eval e senza host remoti
|       |-- ipcSender.ts             WebContents, mainFrame e documento atteso
|       |-- legacyIpc.ts             Mittente e payload degli IPC precedenti a M1
|       |-- ipcSender.test.ts        Frame/URL mancanti, disposti, estranei e spoofing
|       |-- ipcRegistration.test.ts  Negativi sui 16 gestori con effetti simulati
|       |-- permissions.test.ts      Entrambi gli handler, anche tipi sconosciuti
|       |-- legacyIpc.test.ts        Test negativi isolati per mittente estraneo e payload invalido
|       |-- settingsForm.ts          Numeri del dialogo e aggiornamento delle impostazioni
|       |-- settingsForm.test.ts     Test di 1e400 e di un aggiornamento nullo
|       |-- settingsStore.test.ts    File temporanei, corruzione, limiti, guasti e interruzioni reali
|       |-- diagnostics.test.ts      Redazione, rotazione, errori PTY/IPC e testi localizzati
|       |-- diagnosticMessages.ts    Codici di avviso ed errori senza testo nativo nella UI
|       |-- textLimit.ts             Taglio del testo senza spezzare un'emoji
|       |-- textLimit.test.ts        Test dell'emoji a cavallo del limite
|       |-- nativeInstall.test.ts    Test della scelta prebuild Windows o ricompilazione
|       |-- clipboardImages.ts       Salvataggio e pulizia delle immagini
|       |-- clipboardImages.test.ts  Test di percorso, permessi e pulizia
|       |-- customPatternText.ts     Copia limitata e selezione delle righe per il worker
|       |-- customPatternText.test.ts Test dei limiti e dei contesti 10/12 righe
|       |-- customPatterns.test.ts    Worker reali: regex patologiche, coda, cancellazione e recupero
|       |-- status.ts                Logica pura di rilevamento e notifiche
|       `-- status.test.ts           Test della logica pura
|-- .github/
|   `-- workflows/
|       |-- package-macos.yml         Packaging macOS manuale, eseguito per v0.3.0
|       `-- package-windows.yml      Packaging Windows manuale, eseguito per v0.3.0
|-- scripts/
|   |-- demo-codex.sh                 Simulazione Bash busy/attention/idle
|   |-- check-site.mjs                Controllo landing, dizionari, risorse, CSP e link
|   |-- site-preferences.test.ts      Test di lingua, tema, storage bloccato e valori invalidi
|   |-- inspect-package.mjs          Confronto bundle ASAR, contenuti distribuiti e hash di conpty.dll e OpenConsole.exe
|   |-- install-native.d.mts        Tipi dello script, usati dai test
|   |-- install-native.mjs          Postinstall: prebuild Windows oppure ricompilazione Electron
|   |-- mac-unpacked-paths.mjs       Trova l'unico .app e legge CFBundleExecutable
|   |-- package-macos-cli.mjs        Avvio di electron-builder per macOS
|   |-- package-macos.mjs            Opzioni macOS arm64, DMG e ZIP, senza firma
|   |-- package-macos.test.ts        Test delle opzioni e del percorso dell'app
|   |-- package-windows.mjs          Opzioni Windows per electron-builder, senza shell
|   |-- package-windows.test.ts      Test dei booleani e dei nomi degli artifact
|   |-- packaging-globs.test.ts      API pubbliche minimatch dei due consumer di packaging
|   |-- smoke-custom-patterns.mjs    Smoke M7 del pacchetto: timeout, avvisi, bridge e recupero
|   |-- fixtures/                    Main/preload statici per lo smoke renderer M28
|   |-- smoke-terminal-stream.mjs    Renderer reale, bridge sintetico, DA/OSC e viste
|   |-- smoke-terminal-protocol.mjs  Query DA/OSC su PTY nativa nello smoke full da 0.3.10
|   |-- smoke-driver.mjs             Ambiente ereditato, profilo isolato e debugger loopback
|   |-- smoke-development-flags.mjs  Sonde delle dieci variabili, senza bypass nel prodotto
|   |-- smoke-development-flags.test.ts Soglia versione e rilevamento scritture vietate
|   |-- smoke-startup-failure.mjs    Guasti sintetici: IT/EN, 10 casi precoci Windows, stderr e uscita 1
|   |-- smoke-worker.mjs             Default worker non debug e handshake ConPTY di prova
|   |-- smoke-worker.test.ts         Regresso con inspector e opzioni worker esplicite
|   |-- smoke-report.mjs             Report di errore con metadati consentiti e limitati
|   |-- smoke-report.test.ts         Redazione dei contenuti e limite 32 richieste
|   |-- smoke-driver.test.ts         Ambiente isolato e scoperta debugger senza stderr
|   |-- smoke-security.mjs           IPC reale, permessi e CSP sul pacchetto
|   |-- smoke-macos-formats.mjs      ZIP in percorso con tilde, DMG readonly, ispezione e smoke
|   |-- smoke-settings.mjs           Smoke M8: guasto salvataggio, avvisi IT/EN e recupero
|   |-- electron-fuses.mjs           Valori dei nove fuse, gemello aperto e catena SHA-256
|   |-- electron-fuses.test.ts       Flip su una copia di Electron e legame del manifest
|   |-- after-pack-fuses.mjs         Copia il gemello e accende i fuse nel pacchetto
|   |-- smoke-fuses.mjs              Lettura dei fuse e prove negative sul binario di release
|   |-- fuse-smoke-cases.mjs         Esito di ELECTRON_RUN_AS_NODE e dettaglio dell'uscita
|   |-- check-fuse-wires.mjs         Stampa e verifica i fuse di release e gemello
|   |-- diagnose-fuse-variants.mjs   Avvio pulito con un fuse acceso e lettura INTEGRITY
|   |-- asar-integrity-resource.mjs  Risorsa Windows INTEGRITY e hash dell'header ASAR
|   |-- fuse-smoke-launch.mjs        Stesso profilo di smoke-package, chiusura e coda dei log
|   |-- check-mac-bundles.mjs        Firma ad hoc e fuse di default del gemello, prima dello smoke
|   |-- prepare-open-fuse-twin.mjs   Gemello ricavato dal binario finale, fuse riportati ai default
|   |-- assert-release-fuses.mjs     Fuse sull'exe: diretto se ha il sentinel, altrimenti exe estratto dal portable
|   |-- windows-package-exe.mjs      Estrae plancia-comandi.exe dal wrapper 7z del portable
|   |-- conpty-orphans.mjs           Chiusura ConPTY con figlio e controllo degli orfani
|   |-- conpty-orphans.test.ts       Tabella dei processi e rifiuto non gestito
|   |-- verify-sha256-manifest.mjs   Il manifest nomina i file appena misurati
|   `-- smoke-package.mjs            Smoke nativo isolato di un pacchetto, full o release
|-- build/
|   |-- icon.png                     Icona Linux e della finestra, PNG 1024
|   |-- icon.ico                     Icona Windows, 16, 24, 32, 48, 64, 128 e 256
|   `-- icon.icns                    Icona macOS, contenuto 824 su tela 1024
|-- public/
|   `-- icon.png                     Copia identica di build/icon.png, usata dalla sidebar
`-- docs/
    |-- index.html                   Landing statica IT/EN, entry point Pages
    |-- site.css                     Layout responsive, temi e controlli accessibili
    |-- preferences.js               Lingua e tema prima del primo rendering
    |-- i18n.js                      Dizionari della landing IT/EN
    |-- site.js                      Galleria, traduzioni, link al manuale e comandi
    |-- .nojekyll                    Pubblicazione statica senza trasformazioni Jekyll
    |-- assets/
    |   |-- icon.png                 Copia identica dell’icona PNG in build/
    |   `-- icon.ico                 Copia identica della favicon ICO in build/
    `-- screenshots/
        |-- plancia-dark.png         Esempio della vista scura
        |-- plancia-light.png        Esempio della vista chiara
        |-- plancia-settings.png     Impostazioni in italiano
        |-- plancia-dark-en.png      Vista scura in inglese
        |-- plancia-light-en.png     Vista chiara in inglese
        |-- plancia-settings-en.png  Impostazioni in inglese
        `-- capture.json            Versione, ambiente, isolamento e SHA-256 delle catture
```

`.github/workflows/package-windows.yml` ha un solo job Windows avviabile manualmente, senza trigger push/PR o pubblicazione automatica. È predisposto per costruire installer e portabile con nomi distinti, controlli sul runner e checksum. La run `43226304320` ha prodotto i pacchetti Windows della release v0.3.0 e ha verificato anche il portable e l'app installata. Lo step di packaging chiama `scripts/package-windows.mjs` dal checkout del workflow, così PowerShell non riceve `-c.*` né `--config.*`. `.github/workflows/package-macos.yml` è solo manuale, sul runner `macos-15`, e ha costruito i DMG e ZIP ARM64 non firmati della release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) nella run `43257940568`; smoke e ispezione hanno riguardato solo l'app scompattata. macOS ARM64 della release `v0.2.0` è stato costruito e provato localmente. La landing C4 è in `docs/`, con sorgente di pubblicazione `main:/docs`. Non è aggiunto un workflow al repository: il deploy Pages gestito da GitHub sarà necessario dopo le approvazioni. `.nojekyll` conserva i file statici; le risorse usano percorsi relativi. `config/app.config.json` è la configurazione centrale dei limiti di appunti, trascinamento e input; le preferenze di interfaccia restano in `settings.json`, fuori dal checkout. Alcuni altri limiti restano costanti nei moduli, come documentato nel modello di sicurezza e nella proposta P2.

### 2. Flusso e responsabilità

M28 mantiene tutti i terminali montati, nascondendo solo i riquadri non selezionati. `terminalStream.ts` ordina snapshot iniziale e chunk in arrivo; non filtra input o risposte di protocollo. Un terminale viene distrutto alla chiusura della sua sessione. Dopo la build, `node scripts/smoke-terminal-stream.mjs` prova il renderer con un bridge sintetico, senza shell, dati o appunti reali. Lo smoke full del pacchetto aggiunge `smoke-terminal-protocol.mjs`, con una sonda Node locale su PTY isolata.

`src/main.tsx` monta `App.tsx`. La UI usa il contratto in `src/env.d.ts`; `electron/preload.ts` espone le operazioni specifiche. `electron/main.ts` registra gli handler e delega a impostazioni, shell e sessioni. `sessions.ts` raccoglie output, titoli, schermo e processi figli e invoca la logica pura di `status.ts`. Il main pubblica gli aggiornamenti alla UI.

M7 invia solo porzioni limitate dello schermo a un singolo worker Node per le regex personalizzate; le regole integrate restano nel main. `customPatterns.ts` coalesca le richieste per sessione, cancella i lavori alla chiusura e sospende un profilo che supera il budget. Il main riceve solo i fatti di matching; la UI riceve i consueti metadati di stato e un codice di avviso localizzato. I quattro limiti `statusPatterns` sono validati da `appConfig.ts`; non servono nuovi file worker nel pacchetto perché il programma statico è incluso in main.js.

Il workflow Windows manuale esegue la suite completa, inclusi i confronti nativi PowerShell 5.1/7, prima di build e packaging.

La landing elenca le shell per piattaforma, compresa fish, con testi IT/EN in `i18n.js` e layout responsivo in `site.css`.

La landing è indipendente dalla UI Electron: `preferences.js` applica lingua e tema prima del primo rendering; gli script classici differiti caricano `i18n.js` prima di `site.js` per testi, attributi e galleria, anche nell'apertura diretta dell'HTML. Le due chiavi di localStorage appartengono al sito e non a `settings.json`. Il controllo strutturale verifica anche sintassi e riferimenti agli elementi della UI.

La UI non importa `node-pty` né accede direttamente al filesystem. I dizionari condivisi mantengono le chiavi inglesi allineate a quelle italiane tramite TypeScript. La schermata di avvio usa il dizionario italiano finché le preferenze non sono caricate; il rilevamento automatico della lingua resta la proposta P2. `src/shared/csp.ts` descrive la policy del renderer; Vite la inietta nell'HTML e il main la ripete sugli header delle risposte dell'app. `src/shared/legacyIpc.ts` decide se un messaggio precedente a M1 può raggiungere sessioni, impostazioni, dialoghi o la shell. La mappa delle responsabilità non implica che tutti i confini di sicurezza siano completi: vedere [SECURITY_MODEL.md](SECURITY_MODEL.md).

M8 separa `SettingsStore` (normalizzazione), `SettingsFile` (lettura/recupero/migrazione), `privateFile` (scrittura e backup) e `diagnostics` (metadati). I due nuovi limiti sono in `settings.maxBytes` e `diagnostics.maxBytes`. L’evento main→UI `settings:warning` non espone percorsi o contenuti e non aggiunge comandi privilegiati. I test interrompono worker reali durante scrittura/rename; lo smoke da 0.3.6 usa un guasto reale del profilo sintetico nei due temi e lingue.

Lo smoke `full` imposta HOME, appData, userData e sessionData prima del main mediante debugger su loopback; non usa profili personali, credenziali o appunti reali. Lo smoke `release` non apre quel debugger: il gemello con i fuse aperti conserva il percorso `full`, e il binario di release usa il CDP del renderer solo su `127.0.0.1`. Da 0.3.7 aggiunge i negativi IPC/CSP e i permessi. Per provare entrambi i formati macOS, dopo build e packaging: `node scripts/smoke-macos-formats.mjs release . 0.3.10`. Estrae lo ZIP, monta il DMG in sola lettura, ispeziona e avvia entrambi fuori dal checkout, poi smonta il volume. I temporanei restano per il controllo. Il workflow Windows esistente esegue lo stesso smoke su scompattato, portable e installato; quello macOS manuale include ora DMG e ZIP, senza avvio remoto quando i controlli locali sono equivalenti.

### 3. Comandi e verifiche

Da 0.3.9 `smoke-package.mjs` prova automaticamente le dieci variabili di sviluppo impostate, anche sul binario con fuse chiusi; `--development-flags` forza la prova nel solo harness. Sul gemello lo smoke prova anche il blocco effettivo di `openDevTools` e l’assenza della voce menu. `node scripts/smoke-startup-failure.mjs <eseguibile-gemello> 0.3.9` inietta guasti sintetici solo tramite debugger: controlla dialoghi IT/EN, fallback italiano, stderr senza testo grezzo e uscita 1. La chiamata nativa del dialogo è intercettata, non è una verifica visiva. I workflow manuali esistenti eseguono queste prove senza nuove attivazioni automatiche. Lo smoke Windows fotografa PID e tempo di creazione delle istanze già presenti prima del lancio: le preserva ed esclude solo quelle identità dal conteggio dei nuovi processi; PID riutilizzati restano rilevati.

| Comando | Responsabilità |
| --- | --- |
| `npm ci` | Installazione dal lockfile. Su Windows non ricompila `node-pty`; su macOS e Linux il postinstall lo ricompila per Electron. Il binario di Electron viene scaricato dal suo postinstall. |
| `npm run dev` | Server su loopback `47231` e avvio Electron. |
| `npm test` / `npm run test:watch` | Test Vitest una volta / in osservazione. |
| `npm run build` | `tsc --noEmit` e bundle Vite. |
| `npm run preview` | Anteprima web del renderer; nessun accesso PTY standalone. |
| `npm run check:site` | Verifica landing, risorse relative, icone, CSP, URL di release e dizionari IT/EN. |
| `npm run preview:site` | Serve `docs/` su loopback 4174, sotto `/Plancia-Comandi/`, senza avviare Electron. |
| `npm run rebuild` | Ricompilazione delle dipendenze applicative per Electron. |
| `npm run dist` | Bundle e pacchetto per il sistema corrente. |
| `npm run dist:mac` / `dist:win` / `dist:linux` | Bundle e pacchetto della piattaforma indicata. |

Non esistono script npm lint, typecheck separato o e2e. `scripts/package-macos.mjs` descrive DMG e ZIP ARM64 non firmati. `scripts/package-windows.mjs` passa a electron-builder le opzioni Windows senza una shell. `scripts/inspect-package.mjs` confronta i bundle distribuiti con il checkout compilato; `scripts/smoke-package.mjs` verifica il pacchetto sul sistema nativo con dati temporanei e Node.js 24. I test presenti non avviano l'app pacchettizzata e non verificano shell o un canale IPC reale. `electron-fuses.test.ts` copia il binario Electron installato, ne cambia solo il fuse wire e non lo esegue. Coprono la logica pura di stati, viste, quotatura, trascinamento, navigazione, configurazione centrale, file immagine, stringhe CSP, il cancello degli IPC precedenti a M1, la scelta di saltare la ricompilazione su Windows, le opzioni di packaging Windows e quelle macOS ARM64.

La suite M7 avvia worker Node reali con dati sintetici e verifica scadenze, errori, cancellazione e code limitate. `smoke-custom-patterns.mjs`, chiamato dallo smoke nativo per versioni da 0.3.5, verifica app/bridge reattivi durante il caso patologico, fallback, avvisi IT/EN nei due temi e recupero. Le revisioni precedenti non ricevono la fixture patologica perché prive della protezione.

### 4. File locali e generati

```text
node_modules/                     Dipendenze installate; non modificare a mano
dist/                             Renderer generato; ignorato da Git
dist-electron/                    Main e preload generati; ignorati da Git
release/                          Pacchetti generati; ignorati da Git
.vite/, out/, *.log, *.local       Cache/output/stato locale ignorati da Git
.git/                             Metadati Git; usare i comandi Git
<Electron userData>/settings.json  Preferenze fuori dal checkout, potenzialmente con percorsi privati
<Electron userData>/settings.json.bak, *.bak  Copie di recupero private, mai sovrascritte
<Electron userData>/settings.json.tmp-*      Temporanei ignorati al riavvio, possibili dopo un’interruzione
<Electron userData>/diagnostics.jsonl[.1]    Due log locali limitati con soli metadati
```

`build/` e `docs/screenshots/` contengono asset sorgente tracciati: non confonderli con output eliminabile. `package-lock.json` è generato da npm ma è tracciato; cambiarlo solo per una modifica alle dipendenze autorizzata. Le modifiche preesistenti ai due file package restano escluse dal commit documentale. Nessuna esclusione Git sostituisce un controllo dei segreti.

## English

This map describes Plancia Comandi **0.3.10** structure, module responsibilities and generated files. Update it when sources, commands, tests, workflows or documentation change.

**Contents**

- [1. ASCII structure](#1-ascii-structure)
- [2. Flow and responsibilities](#2-flow-and-responsibilities)
- [3. Commands and checks](#3-commands-and-checks)
- [4. Local and generated files](#4-local-and-generated-files)

### 1. ASCII structure

```text
Plancia-Comandi/
|-- README.md                         IT/EN introduction and startup
|-- ISTRUZIONI.md                     Italian manual
|-- INSTRUCTIONS.md                  Complete English translation
|-- QUICK-START_Desktop.md            IT/EN desktop quick start
|-- SECURITY_MODEL.md                IT/EN security controls and limitations
|-- PLAN.md                          IT/EN plan and checks
|-- MAP.md                           This IT/EN map
|-- AGENTS.md                        Operating rules for maintainers and agents
|-- STARTUP_PREFERENCES_HOME.md      Designer's HOME preferences, with the cloud-agent appendix; not repository documentation
|-- LICENSE                          Apache License 2.0
|-- package.json                     Canonical version, dependencies and npm scripts
|-- package-lock.json                Reproducible dependency resolution
|-- .gitignore                       Output, dependency and log exclusions
|-- electron-builder.json5           Package targets and contents
|-- vite.config.ts                   Local server, development CSP and main/preload/renderer bundles
|-- vitest.config.ts                 Unit tests in a Node environment
|-- tsconfig.json                    Application TypeScript checking
|-- tsconfig.node.json               TypeScript configuration for Vite
|-- index.html                       Renderer HTML document; the Vite plugin injects the CSP
|-- config/
|   `-- app.config.json              Clipboard, drag-and-drop, input and pattern limits
|-- electron/
|   |-- main.ts                      Window, lifecycle, IPC, CSP, notifications, demo
|   |-- permissions.ts              Denies Chromium permission checks and requests
|   |-- legacyIpc.ts                 Registration of the IPC channels that predate M1
|   |-- preload.ts                   Dedicated renderer API bridge
|   |-- editMenu.ts                  Edit menu and editing commands
|   |-- clipboardIpc.ts              Clipboard reads and writes
|   |-- customPatterns.ts            Single worker, bounded queue, timeout and M7 fallback
|   |-- customPatternWorker.ts       Static worker program bundled into main
|   |-- sessions.ts                  PTY creation/closing; on Windows useConptyDll and taskkill /T /F before pty.kill
|   |-- settings.ts                  Preferences, defaults, validation and migration
|   |-- settingsFile.ts              Bounded reads, .bak recovery, write protection and migration
|   |-- privateFile.ts               Regular files, exclusive temporary files, fsync and rename
|   |-- diagnostics.ts               Bounded local logs with allowlisted metadata only
|   |-- startupFailure.ts            IT/EN error, allowlisted diagnostics and deferred exit 1
|   |-- shells.ts                    Platform shell detection
|   |-- children.ts                  Child-process snapshots and timeouts
|   `-- screen.ts                    Headless terminal screen parser
|-- src/
|   |-- main.tsx                     React entry point and style imports
|   |-- App.tsx                      Workspace, session and dialog coordination
|   |-- env.d.ts                     window.plancia bridge types
|   |-- styles.css                   Layout, themes and components
|   |-- termTheme.ts                 Terminal palettes
|   |-- shortcuts.ts                 Shortcut recognition
|   |-- shortcuts.test.ts            Copy, paste and Ctrl+C tests
|   |-- terminalStream.ts            M28 snapshot/output ordering and sequence deduplication
|   |-- terminalStream.test.ts       Parsing race, fragmented queries, input and disposal
|   |-- terminalEdit.ts              Terminal copy, paste and drag-and-drop
|   |-- terminalEdit.test.ts         Paste dedup, acc/key sequence, orphan gesture and FIFO cap tests
|   |-- terminalEdit.powershell.test.ts Unicode drop and pasted-image path tests
|   |-- terminalEdit.fish.test.ts     Fish drop, image, limit and free-text tests
|   |-- test/
|   |   |-- fishQuoting.ts           Synthetic paths and expected fish escapes
|   |   |-- powershellQuoting.ts     Synthetic cases and clipboard bridge stub for PowerShell tests
|   |   |-- powershellNativeTransport.ts UTF-8/base64 protocol and native report validation
|   |   `-- powershellNativeTransport.test.ts Unicode, delimiter and invalid report tests
|   |-- cx.ts                        CSS class-name helper
|   |-- components/
|   |   |-- Sidebar.tsx              Session list, renaming and tiling
|   |   |-- TerminalView.tsx         xterm, resize, clipboard and links
|   |   |-- TerminalMenu.tsx         Copy and Paste context menu
|   |   |-- LayoutSwitcher.tsx       Icons for the four views
|   |   |-- NewSessionDialog.tsx     Name, shell and folder selection
|   |   |-- SettingsDialog.tsx       Preferences and detection parameters
|   |   `-- ConfirmDialog.tsx        Session-closing confirmation
|   `-- shared/
|       |-- types.ts                 Shared data contracts
|       |-- i18n.ts                  IT/EN dictionaries and shortcut labels
|       |-- paths.ts                 Visual path shortening
|       |-- appConfig.ts             Central-configuration validation
|       |-- ptyProbe.ts              pty.node paths, including the prebuild
|       |-- startupTrace.ts          Development-only opt-in trace
|       |-- developmentOptions.ts    Ten variables ignored in packages
|       |-- developmentOptions.test.ts Development/package matrix and aliases
|       |-- startupFailure.test.ts   Locales, privacy and exit after effect failures
|       |-- appConfig.test.ts        Configuration and default tests
|       |-- shellQuote.ts            Shell path quoting
|       |-- shellQuote.test.ts       POSIX, fish, PowerShell and cmd tests
|       |-- shellDetection.test.ts   Mocked detection of the four fish paths, without real shells
|       |-- shellQuote.native.test.ts Native API comparison and PowerShell 5.1/7 round-trip without module autoload, UTF-8/base64 files and stage diagnostics, platform conditional
|       |-- drop.ts                  Choice between dropped paths and text
|       |-- drop.test.ts             Drag-and-drop tests
|       |-- layout.ts                View availability and visible sessions
|       |-- layout.test.ts           View tests
|       |-- navigation.ts            Navigation-blocking decision
|       |-- navigation.test.ts       Allowed-navigation tests
|       |-- csp.ts                   Production and development CSP
|       |-- csp.test.ts              Policy tests, with no eval and no remote hosts
|       |-- ipcSender.ts             WebContents, mainFrame and expected document
|       |-- legacyIpc.ts             Sender and payload checks for IPC that predates M1
|       |-- ipcSender.test.ts        Missing/disposed/foreign frames and URL spoofing
|       |-- ipcRegistration.test.ts  All 16 handlers with synthetic effects
|       |-- permissions.test.ts      Both handlers, including unknown types
|       |-- legacyIpc.test.ts        Isolated negative tests for a foreign sender and an invalid payload
|       |-- settingsForm.ts          Dialog numbers and a settings update
|       |-- settingsForm.test.ts     Tests for 1e400 and a null update
|       |-- settingsStore.test.ts    Temporary files, corruption, bounds, failures and real interruption
|       |-- diagnostics.test.ts      Redaction, rotation, PTY/IPC failures and localized messages
|       |-- diagnosticMessages.ts    Warning/error codes without native text in UI
|       |-- textLimit.ts             Text cut that does not split an emoji
|       |-- textLimit.test.ts        Test of an emoji straddling the limit
|       |-- nativeInstall.test.ts    Test of the Windows prebuild or rebuild choice
|       |-- clipboardImages.ts       Image save and cleanup
|       |-- clipboardImages.test.ts  Path, permission and cleanup tests
|       |-- customPatternText.ts     Bounded copy and worker screen-row selection
|       |-- customPatternText.test.ts Bounds and 10/12-row context tests
|       |-- customPatterns.test.ts    Real workers: pathological regexes, queue, cancellation and recovery
|       |-- status.ts                Pure status and notification logic
|       `-- status.test.ts           Pure-logic tests
|-- .github/
|   `-- workflows/
|       |-- package-macos.yml         Manual macOS packaging, run for v0.3.0
|       `-- package-windows.yml      Manual Windows packaging, run for v0.3.0
|-- scripts/
|   |-- demo-codex.sh                 Bash busy/attention/idle simulation
|   |-- check-site.mjs                Landing, dictionary, resource, CSP and link checks
|   |-- site-preferences.test.ts      Language, theme, blocked storage and invalid-value tests
|   |-- inspect-package.mjs          ASAR bundle, distributed contents and conpty.dll plus OpenConsole.exe hashes
|   |-- install-native.d.mts        Types for the script, used by the tests
|   |-- install-native.mjs          Postinstall: Windows prebuild or Electron rebuild
|   |-- mac-unpacked-paths.mjs       Finds the single .app and reads CFBundleExecutable
|   |-- package-macos-cli.mjs        Starts electron-builder for macOS
|   |-- package-macos.mjs            Unsigned macOS arm64 DMG and ZIP options
|   |-- package-macos.test.ts        Options and app-path tests
|   |-- package-windows.mjs          Windows electron-builder options, no shell
|   |-- package-windows.test.ts      Tests of the booleans and artifact names
|   |-- packaging-globs.test.ts      Public minimatch APIs of both packaging consumers
|   |-- smoke-custom-patterns.mjs    M7 package smoke: timeout, warnings, bridge and recovery
|   |-- fixtures/                    Static main/preload for the M28 renderer smoke
|   |-- smoke-terminal-stream.mjs    Real renderer, synthetic bridge, DA/OSC and views
|   |-- smoke-terminal-protocol.mjs  Native PTY DA/OSC queries in full smoke from 0.3.10
|   |-- smoke-driver.mjs             Inherited environment, isolated profile and loopback debugger
|   |-- smoke-development-flags.mjs  Ten-variable probes with no product bypass
|   |-- smoke-development-flags.test.ts Version threshold and forbidden output detection
|   |-- smoke-startup-failure.mjs    Synthetic failures: IT/EN, 10 early Windows cases, stderr and exit 1
|   |-- smoke-worker.mjs             Non-debug worker defaults and ConPTY handshake fixture
|   |-- smoke-worker.test.ts         Attached-inspector regression and explicit worker options
|   |-- smoke-report.mjs             Bounded allowlisted failure metadata
|   |-- smoke-report.test.ts         Content redaction and 32-request bound
|   |-- smoke-driver.test.ts         Isolated environment and debugger discovery without stderr
|   |-- smoke-security.mjs           Live IPC, permissions and CSP in packages
|   |-- smoke-macos-formats.mjs      ZIP in a tilde path, read-only DMG, inspection and smoke
|   |-- smoke-settings.mjs           M8 smoke: save failure, IT/EN warnings and recovery
|   |-- electron-fuses.mjs           Nine fuse values, open twin and SHA-256 chain
|   |-- electron-fuses.test.ts       Flip on an Electron copy and manifest binding
|   |-- after-pack-fuses.mjs         Copies the twin and flips fuses in the package
|   |-- smoke-fuses.mjs              Fuse read and negative tests on the release binary
|   |-- fuse-smoke-cases.mjs         ELECTRON_RUN_AS_NODE outcome and exit detail
|   |-- check-fuse-wires.mjs         Prints and checks the release and twin fuses
|   |-- diagnose-fuse-variants.mjs   Clean launch with one fuse on, and the INTEGRITY read
|   |-- asar-integrity-resource.mjs  Windows INTEGRITY resource and ASAR header hash
|   |-- fuse-smoke-launch.mjs        Same profile as smoke-package, tree stop and log tail
|   |-- check-mac-bundles.mjs        Ad-hoc signature and default twin fuses, before smoke
|   |-- prepare-open-fuse-twin.mjs   Twin taken from the finished binary, fuses reset to defaults
|   |-- assert-release-fuses.mjs     Fuses on the exe: direct when it has the sentinel, otherwise the exe extracted from portable
|   |-- windows-package-exe.mjs      Extracts plancia-comandi.exe from the portable 7z wrapper
|   |-- conpty-orphans.mjs           ConPTY close with a child and the orphan check
|   |-- conpty-orphans.test.ts       Process table and unhandled rejection
|   |-- verify-sha256-manifest.mjs   The manifest names the files just hashed
|   `-- smoke-package.mjs            Isolated native package smoke, full or release
|-- build/
|   |-- icon.png                     Linux and window icon, 1024 PNG
|   |-- icon.ico                     Windows icon, 16, 24, 32, 48, 64, 128 and 256
|   `-- icon.icns                    macOS icon, 824 content on a 1024 canvas
|-- public/
|   `-- icon.png                     Identical copy of build/icon.png, used by the sidebar
`-- docs/
    |-- index.html                   IT/EN static landing, Pages entry point
    |-- site.css                     Responsive layout, themes and accessible controls
    |-- preferences.js               Language and theme before first paint
    |-- i18n.js                      IT/EN landing dictionaries
    |-- site.js                      Gallery, translations, manual links and controls
    |-- .nojekyll                    Static publication without Jekyll transformation
    |-- assets/
    |   |-- icon.png                 Identical copy of the build/ PNG icon
    |   `-- icon.ico                 Identical copy of the build/ ICO favicon
    `-- screenshots/
        |-- plancia-dark.png         Dark-view example
        |-- plancia-light.png        Light-view example
        |-- plancia-settings.png     Italian settings
        |-- plancia-dark-en.png      English dark view
        |-- plancia-light-en.png     English light view
        |-- plancia-settings-en.png  English settings
        `-- capture.json            Capture version, environment, isolation and SHA-256
```

`.github/workflows/package-windows.yml` has one manually triggered Windows job, with no push/PR trigger or automatic publication. It is set up to build distinctly named installer and portable packages, runner checks and checksums. Run `43226304320` produced the Windows packages of release v0.3.0 and also checked the portable executable and the installed app. The packaging step calls `scripts/package-windows.mjs` from the workflow checkout, so PowerShell does not receive `-c.*` or `--config.*`. `.github/workflows/package-macos.yml` is manual only, on the `macos-15` runner, and built the unsigned ARM64 DMG and ZIP of release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) in run `43257940568`; smoke tests and inspection covered only the unpacked app. The macOS ARM64 packages of release `v0.2.0` were built and tested locally. The C4 landing is in `docs/`, with `main:/docs` as the publishing source. No repository workflow is added: GitHub’s managed Pages deployment will be necessary after approvals. `.nojekyll` preserves static files; assets use relative paths. `config/app.config.json` is the central configuration for clipboard, drag-and-drop and input limits; interface preferences remain in `settings.json`, outside the checkout. Some other limits remain module constants, as recorded in the security model and proposal P2.

### 2. Flow and responsibilities

M28 keeps all terminals mounted, hiding only unselected panes. `terminalStream.ts` orders the initial snapshot and incoming chunks; it does not filter input or protocol replies. Closing a session destroys its terminal. After building, `node scripts/smoke-terminal-stream.mjs` tests the renderer with a synthetic bridge, without real shells, data or clipboard. Full package smoke also runs `smoke-terminal-protocol.mjs`, with a local Node probe on an isolated PTY.

`src/main.tsx` mounts `App.tsx`. UI uses the contract in `src/env.d.ts`; `electron/preload.ts` exposes specific operations. `electron/main.ts` registers handlers and delegates to settings, shells and sessions. `sessions.ts` collects output, titles, screen and child-process facts and invokes pure `status.ts` logic. Main publishes updates to the UI.

M7 sends only bounded screen regions to one Node worker for custom regexes; built-in rules stay in main. `customPatterns.ts` coalesces requests per session, cancels jobs on close and suspends a profile that exceeds its budget. Main receives only matching facts; UI receives the usual status metadata and a localized warning code. The four `statusPatterns` limits are validated by `appConfig.ts`; no additional worker files are needed in the package because the static program is bundled into main.js.

The manual Windows workflow runs the full suite, including native PowerShell 5.1/7 comparisons, before build and packaging.

The landing lists shells by platform, including fish, with IT/EN text in `i18n.js` and responsive layout in `site.css`.

The landing is independent of the Electron UI: `preferences.js` applies language and theme before first paint; deferred classic scripts load `i18n.js` before `site.js` for text, attributes and the gallery, including when opening the HTML directly. Its two localStorage keys belong to the site rather than `settings.json`. The structural check also validates syntax and references to UI elements.

UI does not import `node-pty` or directly access the filesystem. Shared dictionaries use TypeScript to align English keys with Italian ones. The startup screen uses the Italian dictionary until preferences load; automatic language detection remains proposal P2. `src/shared/csp.ts` describes the renderer policy; Vite injects it into the HTML and main repeats it on the app response headers. `src/shared/legacyIpc.ts` decides whether a pre-M1 message may reach sessions, settings, dialogs or the shell. Responsibility separation does not mean all security boundaries are complete: see [SECURITY_MODEL.md](SECURITY_MODEL.md).

M8 separates `SettingsStore` (normalization), `SettingsFile` (reading/recovery/migration), `privateFile` (writing/backups) and `diagnostics` (metadata). Two new limits are `settings.maxBytes` and `diagnostics.maxBytes`. The main→UI `settings:warning` event exposes no paths or contents and adds no privileged command. Tests interrupt real workers during writes/rename; smoke from 0.3.6 uses a real synthetic-profile failure in both themes and languages.

`full` smoke sets HOME, appData, userData and sessionData before main through a loopback debugger; it uses no personal profiles, credentials or real clipboard. `release` smoke does not open that debugger: the open-fuse twin keeps the `full` path, and the release binary uses renderer CDP only on `127.0.0.1`. From 0.3.7 it adds negative IPC/CSP and permission checks. To test both macOS formats after build and packaging: `node scripts/smoke-macos-formats.mjs release . 0.3.10`. It extracts ZIP, mounts DMG read-only, inspects and launches both outside the checkout, then unmounts the volume. Temporary files remain for review. The existing Windows workflow runs the same smoke on unpacked, portable and installed apps; the manual macOS workflow now includes DMG and ZIP, with no remote run when local checks are equivalent.

### 3. Commands and checks

From 0.3.9 `smoke-package.mjs` automatically sets and tests all ten development variables, including on the closed-fuse binary; `--development-flags` forces the check only in the harness. Twin smoke also tests that `openDevTools` has no effect and the menu action is absent. `node scripts/smoke-startup-failure.mjs <twin-executable> 0.3.9` injects synthetic failures only through the debugger: IT/EN dialogs, Italian fallback, stderr without raw text and exit 1. The native dialog call is intercepted, not visually verified. Existing manual workflows run these checks without new automatic triggers. Windows smoke records prelaunch instance PIDs and creation times: it preserves them and excludes only those identities from new-process counts; reused PIDs remain detectable.

| Command | Responsibility |
| --- | --- |
| `npm ci` | Lockfile installation. On Windows it does not rebuild `node-pty`; on macOS and Linux postinstall rebuilds it for Electron. Electron's own postinstall downloads the Electron binary. |
| `npm run dev` | Loopback server on `47231` and Electron startup. |
| `npm test` / `npm run test:watch` | Run Vitest once / in watch mode. |
| `npm run build` | `tsc --noEmit` and Vite bundles. |
| `npm run preview` | Renderer web preview; no standalone PTY access. |
| `npm run check:site` | Checks landing, relative assets, icons, CSP, release URLs and IT/EN dictionaries. |
| `npm run preview:site` | Serves `docs/` on loopback 4174 under `/Plancia-Comandi/`, without launching Electron. |
| `npm run rebuild` | Rebuild application dependencies for Electron. |
| `npm run dist` | Bundles and package for the current OS. |
| `npm run dist:mac` / `dist:win` / `dist:linux` | Bundles and package for the selected platform. |

There are no npm lint, separate typecheck or e2e scripts. `scripts/package-macos.mjs` describes the unsigned ARM64 DMG and ZIP. `scripts/package-windows.mjs` passes the Windows options to electron-builder without a shell. `scripts/inspect-package.mjs` compares distributed bundles with the built checkout; `scripts/smoke-package.mjs` checks a package on its native OS with temporary data and Node.js 24. Existing tests do not launch the packaged app or verify shells or a live IPC channel. `electron-fuses.test.ts` copies the installed Electron binary, changes only its fuse wire and does not run it. They cover the pure logic of status, views, quoting, drag-and-drop, navigation, central configuration, image files, CSP strings, the gate for IPC that predates M1, the choice to skip the Windows rebuild, the Windows packaging options and the macOS ARM64 options.

The M7 suite launches real Node workers with synthetic data and checks deadlines, errors, cancellation and bounded queues. `smoke-custom-patterns.mjs`, called by native smoke for versions from 0.3.5, checks app/bridge responsiveness during the pathological case, fallback, IT/EN warnings in both themes and recovery. Earlier revisions are not given the pathological fixture because they lack the protection.

### 4. Local and generated files

```text
node_modules/                     Installed dependencies; do not edit manually
dist/                             Generated renderer; ignored by Git
dist-electron/                    Generated main and preload; ignored by Git
release/                          Generated packages; ignored by Git
.vite/, out/, *.log, *.local       Ignored local cache/output/state
.git/                             Git metadata; use Git commands
<Electron userData>/settings.json  Preferences outside checkout, potentially containing private paths
<Electron userData>/settings.json.bak, *.bak  Private recovery copies, never overwritten
<Electron userData>/settings.json.tmp-*      Ignored at restart; may remain after interruption
<Electron userData>/diagnostics.jsonl[.1]    Two bounded local metadata logs
```

`build/` and `docs/screenshots/` contain tracked source assets: they are not disposable output. `package-lock.json` is generated by npm but tracked; change it only for authorized dependency work. Pre-existing changes to both package files remain excluded from the documentation commit. No Git exclusion replaces a secrets check.
