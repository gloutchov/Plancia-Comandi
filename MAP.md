# Mappa del repository / Repository map

## Italiano

Questa mappa descrive la struttura di Plancia Comandi **0.2.0**, le responsabilità dei moduli e i file generati. Aggiornarla quando cambiano sorgenti, comandi, test, workflow o documentazione.

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
|-- vite.config.ts                   Server locale e bundle main/preload/renderer
|-- vitest.config.ts                 Unit test in ambiente Node
|-- tsconfig.json                    Controllo TypeScript applicativo
|-- tsconfig.node.json               Configurazione TypeScript per Vite
|-- index.html                       Documento HTML del renderer
|-- config/
|   `-- app.config.json              Limiti di appunti, trascinamento e input
|-- electron/
|   |-- main.ts                      Finestra, lifecycle, IPC, notifiche, demo
|   |-- preload.ts                   Bridge API dedicato al renderer
|   |-- editMenu.ts                  Menu Modifica e comandi di editing
|   |-- clipboardIpc.ts              Lettura e scrittura degli appunti
|   |-- sessions.ts                  Creazione/chiusura PTY, buffer, polling e stati
|   |-- settings.ts                  Preferenze, default, validazione e migrazione
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
|   |-- terminalEdit.ts              Copia, incolla e trascinamento nel terminale
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
|       |-- appConfig.test.ts        Test della configurazione e dei default
|       |-- shellQuote.ts            Quotatura dei percorsi per la shell
|       |-- shellQuote.test.ts       Test POSIX, PowerShell e cmd
|       |-- drop.ts                  Scelta tra percorsi e testo trascinati
|       |-- drop.test.ts             Test del trascinamento
|       |-- layout.ts                Abilitazione viste e sessioni visibili
|       |-- layout.test.ts           Test delle viste
|       |-- navigation.ts            Decisione di blocco delle navigazioni
|       |-- navigation.test.ts       Test delle navigazioni consentite
|       |-- clipboardImages.ts       Salvataggio e pulizia delle immagini
|       |-- clipboardImages.test.ts  Test di percorso, permessi e pulizia
|       |-- status.ts                Logica pura di rilevamento e notifiche
|       `-- status.test.ts           Test della logica pura
|-- scripts/
|   `-- demo-codex.sh                 Simulazione Bash busy/attention/idle
|-- build/
|   `-- icon.png                     Sorgente delle icone per il packaging
|-- public/
|   `-- icon.png                     Asset statico del renderer
`-- docs/
    `-- screenshots/
        |-- plancia-dark.png         Esempio della vista scura
        |-- plancia-light.png        Esempio della vista chiara
        `-- plancia-settings.png     Esempio delle impostazioni
```

Non esiste una directory `.github/workflows/`: non sono configurati workflow CI, release o GitHub Pages. Non esiste una landing page separata. `config/app.config.json` è la configurazione centrale dei limiti di appunti, trascinamento e input; le preferenze di interfaccia restano in `settings.json`, fuori dal checkout. Alcuni altri limiti restano costanti nei moduli, come documentato nel modello di sicurezza e nella proposta P2.

### 2. Flusso e responsabilità

`src/main.tsx` monta `App.tsx`. La UI usa il contratto in `src/env.d.ts`; `electron/preload.ts` espone le operazioni specifiche. `electron/main.ts` registra gli handler e delega a impostazioni, shell e sessioni. `sessions.ts` raccoglie output, titoli, schermo e processi figli e invoca la logica pura di `status.ts`. Il main pubblica gli aggiornamenti alla UI.

La UI non importa `node-pty` né accede direttamente al filesystem. I dizionari condivisi mantengono le chiavi inglesi allineate a quelle italiane tramite TypeScript; alcuni testi iniziali restano hardcoded, come limite attuale. La mappa delle responsabilità non implica che tutti i confini di sicurezza siano completi: vedere [SECURITY_MODEL.md](SECURITY_MODEL.md).

### 3. Comandi e verifiche

| Comando | Responsabilità |
| --- | --- |
| `npm ci` | Installazione dal lockfile; il postinstall ricompila i moduli per Electron. |
| `npm run dev` | Server su loopback `47231` e avvio Electron. |
| `npm test` / `npm run test:watch` | Test Vitest una volta / in osservazione. |
| `npm run build` | `tsc --noEmit` e bundle Vite. |
| `npm run preview` | Anteprima web del renderer; nessun accesso PTY standalone. |
| `npm run rebuild` | Ricompilazione delle dipendenze applicative per Electron. |
| `npm run dist` | Bundle e pacchetto per il sistema corrente. |
| `npm run dist:mac` / `dist:win` / `dist:linux` | Bundle e pacchetto della piattaforma indicata. |

Non esistono script npm lint, typecheck separato o e2e. I test presenti non avviano Electron e non verificano pacchetti, shell o IPC reali. Coprono la logica pura di stati, viste, quotatura, trascinamento, navigazione, configurazione centrale e file immagine.

### 4. File locali e generati

```text
node_modules/                     Dipendenze installate; non modificare a mano
dist/                             Renderer generato; ignorato da Git
dist-electron/                    Main e preload generati; ignorati da Git
release/                          Pacchetti generati; ignorati da Git
.vite/, out/, *.log, *.local       Cache/output/stato locale ignorati da Git
.git/                             Metadati Git; usare i comandi Git
<Electron userData>/settings.json  Preferenze fuori dal checkout, potenzialmente con percorsi privati
```

`build/` e `docs/screenshots/` contengono asset sorgente tracciati: non confonderli con output eliminabile. `package-lock.json` è generato da npm ma è tracciato; cambiarlo solo per una modifica alle dipendenze autorizzata. Le modifiche preesistenti ai due file package restano escluse dal commit documentale. Nessuna esclusione Git sostituisce un controllo dei segreti.

## English

This map describes Plancia Comandi **0.2.0** structure, module responsibilities and generated files. Update it when sources, commands, tests, workflows or documentation change.

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
|-- vite.config.ts                   Local server and main/preload/renderer bundles
|-- vitest.config.ts                 Unit tests in a Node environment
|-- tsconfig.json                    Application TypeScript checking
|-- tsconfig.node.json               TypeScript configuration for Vite
|-- index.html                       Renderer HTML document
|-- config/
|   `-- app.config.json              Clipboard, drag-and-drop and input limits
|-- electron/
|   |-- main.ts                      Window, lifecycle, IPC, notifications, demo
|   |-- preload.ts                   Dedicated renderer API bridge
|   |-- editMenu.ts                  Edit menu and editing commands
|   |-- clipboardIpc.ts              Clipboard reads and writes
|   |-- sessions.ts                  PTY creation/closing, buffers, polling and status
|   |-- settings.ts                  Preferences, defaults, validation and migration
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
|   |-- terminalEdit.ts              Terminal copy, paste and drag-and-drop
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
|       |-- appConfig.test.ts        Configuration and default tests
|       |-- shellQuote.ts            Shell path quoting
|       |-- shellQuote.test.ts       POSIX, PowerShell and cmd tests
|       |-- drop.ts                  Choice between dropped paths and text
|       |-- drop.test.ts             Drag-and-drop tests
|       |-- layout.ts                View availability and visible sessions
|       |-- layout.test.ts           View tests
|       |-- navigation.ts            Navigation-blocking decision
|       |-- navigation.test.ts       Allowed-navigation tests
|       |-- clipboardImages.ts       Image save and cleanup
|       |-- clipboardImages.test.ts  Path, permission and cleanup tests
|       |-- status.ts                Pure status and notification logic
|       `-- status.test.ts           Pure-logic tests
|-- scripts/
|   `-- demo-codex.sh                 Bash busy/attention/idle simulation
|-- build/
|   `-- icon.png                     Packaging icon source
|-- public/
|   `-- icon.png                     Static renderer asset
`-- docs/
    `-- screenshots/
        |-- plancia-dark.png         Dark-view example
        |-- plancia-light.png        Light-view example
        `-- plancia-settings.png     Settings example
```

There is no `.github/workflows/` directory: CI, release and GitHub Pages workflows are not configured. There is no separate landing page. `config/app.config.json` is the central configuration for clipboard, drag-and-drop and input limits; interface preferences remain in `settings.json`, outside the checkout. Some other limits remain module constants, as recorded in the security model and proposal P2.

### 2. Flow and responsibilities

`src/main.tsx` mounts `App.tsx`. UI uses the contract in `src/env.d.ts`; `electron/preload.ts` exposes specific operations. `electron/main.ts` registers handlers and delegates to settings, shells and sessions. `sessions.ts` collects output, titles, screen and child-process facts and invokes pure `status.ts` logic. Main publishes updates to the UI.

UI does not import `node-pty` or directly access the filesystem. Shared dictionaries use TypeScript to align English keys with Italian ones; some startup text remains hardcoded, a current limitation. Responsibility separation does not mean all security boundaries are complete: see [SECURITY_MODEL.md](SECURITY_MODEL.md).

### 3. Commands and checks

| Command | Responsibility |
| --- | --- |
| `npm ci` | Lockfile installation; postinstall rebuilds modules for Electron. |
| `npm run dev` | Loopback server on `47231` and Electron startup. |
| `npm test` / `npm run test:watch` | Run Vitest once / in watch mode. |
| `npm run build` | `tsc --noEmit` and Vite bundles. |
| `npm run preview` | Renderer web preview; no standalone PTY access. |
| `npm run rebuild` | Rebuild application dependencies for Electron. |
| `npm run dist` | Bundles and package for the current OS. |
| `npm run dist:mac` / `dist:win` / `dist:linux` | Bundles and package for the selected platform. |

There are no npm lint, separate typecheck or e2e scripts. Existing tests do not launch Electron or verify real packages, shells or IPC. They cover the pure logic of status, views, quoting, drag-and-drop, navigation, central configuration and image files.

### 4. Local and generated files

```text
node_modules/                     Installed dependencies; do not edit manually
dist/                             Generated renderer; ignored by Git
dist-electron/                    Generated main and preload; ignored by Git
release/                          Generated packages; ignored by Git
.vite/, out/, *.log, *.local       Ignored local cache/output/state
.git/                             Git metadata; use Git commands
<Electron userData>/settings.json  Preferences outside checkout, potentially containing private paths
```

`build/` and `docs/screenshots/` contain tracked source assets: they are not disposable output. `package-lock.json` is generated by npm but tracked; change it only for authorized dependency work. Pre-existing changes to both package files remain excluded from the documentation commit. No Git exclusion replaces a secrets check.
