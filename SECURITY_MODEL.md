# Modello di sicurezza / Security model

## Italiano

Questo documento descrive i controlli osservabili nei sorgenti di Plancia Comandi **0.2.0** e i limiti residui. È una descrizione del comportamento implementato, non una certificazione di sicurezza.

**Sommario**

- [1. Modello operativo e confini](#1-modello-operativo-e-confini)
- [2. Segreti, AI e rete](#2-segreti-ai-e-rete)
- [3. Persistenza, logging e privacy](#3-persistenza-logging-e-privacy)
- [4. Electron e IPC](#4-electron-e-ipc)
- [5. Input, limiti e filesystem](#5-input-limiti-e-filesystem)
- [6. Distribuzione e dipendenze](#6-distribuzione-e-dipendenze)
- [7. Verifiche e rischi residui](#7-verifiche-e-rischi-residui)

### 1. Modello operativo e confini

Plancia Comandi è un terminale desktop per un utente locale. Il processo main gestisce shell, PTY, configurazione, notifiche e operazioni native; il renderer visualizza i terminali e chiede operazioni attraverso un preload dedicato. La logica euristica degli stati è separata dalle operazioni privilegiate.

```text
Utente -> Renderer React/xterm -> API preload -> IPC -> Main Electron
                                                        |-> Shell / PTY -> programmi, file, rete
                                                        |-> settings.json
                                                        |-> notifiche / selettore cartelle / browser
PTY -> parser titoli + schermo headless -> rilevamento stati -> Renderer
```

La shell è un confine di fiducia essenziale: esegue comandi con i permessi del processo app. Non esiste confinamento del terminale a una root workspace, controllo delle cancellazioni o modalità read-only/confirm/full-auto imposta da Plancia Comandi. Il sandbox del renderer non limita i comandi avviati tramite PTY. L'app non è un servizio remoto multiutente e non fornisce autenticazione o controllo remoto.

File di riferimento: [main](electron/main.ts), [preload](electron/preload.ts), [sessioni](electron/sessions.ts), [stati](src/shared/status.ts).

### 2. Segreti, AI e rete

- Non ci sono provider AI, client API AI, gestione di API key, keychain o campi credenziali integrati. L'app non invia autonomamente il terminale a un modello.
- Una CLI avviata può accedere a file e credenziali ed effettuare chiamate esterne. Il suo consenso, la sua autenticazione e le sue policy sono indipendenti dall'app. L'app non intercetta né approva le richieste API dei processi figli.
- Le shell ereditano quasi tutte le variabili del processo, escluso `ELECTRON_RUN_AS_NODE`; vengono impostate variabili di terminale e un fallback di lingua. Variabili sensibili già presenti possono quindi arrivare ai processi figli.
- Il runtime applicativo non implementa telemetria, upload di output o un backend remoto. I link HTTP e HTTPS cliccati vengono aperti nel browser esterno dopo il controllo del protocollo; HTTP resta ammesso. Non c'è una allowlist di host.
- In sviluppo Vite ascolta su `127.0.0.1:47231`, con porta fissa. Non esporre quel server su una rete non fidata. Installazione e packaging possono scaricare dipendenze e strumenti; non sono operazioni offline.
- Non c'è una policy di timeout o TLS applicata alle connessioni dei programmi nel terminale. L'app non configura un bypass TLS nei suoi sorgenti, ma non governa la rete delle shell.

Non inserire segreti in JSON, esempi, log o repository. Per una futura integrazione AI serviranno storage protetto, consenso esplicito per contenuti utente e consenso separato per memoria o contenuti di progetto, provider configurabili, timeout, cancellazione e redazione, con test dedicati. Questi controlli non sono implementati perché tale integrazione non esiste.

### 3. Persistenza, logging e privacy

| Dato / superficie | Comportamento attuale |
| --- | --- |
| Preferenze | JSON non cifrato in `app.getPath('userData')/settings.json`: lingua, tema, vista, font, avvisi, ultima shell/cartella e rilevamento. Non è uno storage segreti. |
| Migrazione | Se manca il file attuale, copia il JSON da `Molo` o `molo` nella cartella dati; conserva l'originale. |
| Sessioni e output | Stato, nomi, titoli e backlog in memoria; nessun ripristino persistente gestito dall'app dopo l'uscita. Il renderer contiene output visibile e scrollback. |
| Shell e programmi | Possono salvare cronologie, credenziali, file e log indipendentemente dall'app. |
| Diagnostica | Errori su console per preload, moduli, scrittura PTY, processi figli o avvio; alcune eccezioni possono mostrare dettagli originali alla UI. Nessun audit log o sistema centralizzato di redazione. |
| Notifiche | Titolo dello stato e nome sessione al sistema operativo; possono comparire fuori dalla finestra, anche sullo schermo bloccato secondo le impostazioni OS. |
| Clipboard | Copia e incolla passano dal modulo `clipboard` del processo main. Il testo non è redatto né mostrato in anteprima. Un'immagine accettata viene scritta come PNG sotto la cartella dati utente e nel terminale viene incollato solo il percorso quotato. |
| Immagini temporanee | Directory e prefisso arrivano da `config/app.config.json`, validati come un solo tratto di percorso. Il nome del file è generato nel main. Scrittura su file temporaneo e poi rinomina. Su Unix la cartella è `0700` e il file `0600`; su Windows valgono i permessi della cartella dati, perché i bit POSIX non sono un confine affidabile. Età e numero massimo eliminano i file generati che corrispondono al prefisso. Gli altri file nella cartella non vengono toccati. |
| Schermate demo | `PLANCIA_SHOT_DIR`/alias legacy scrive PNG della finestra nel percorso indicato. La cattura può includere dati visibili e modifica il tema persistente. |

Il salvataggio delle preferenze usa una scrittura diretta, senza sostituzione atomica, backup integrato o permessi restrittivi impostati esplicitamente. Si applicano i permessi ordinari del sistema/umask. La lettura invalida ripiega sui default; un successivo salvataggio può sovrascrivere un file corrotto. Non è imposto un limite di dimensione prima della lettura JSON.

Non è configurato un servizio di invio crash report nei sorgenti. Questo non esclude cache o diagnostica ordinaria di Electron/sistema operativo. Prima di condividere log, schermate o configurazioni controllare manualmente contenuti, nomi e percorsi.

### 4. Electron e IPC

In [electron/main.ts](electron/main.ts) sono impostati **`contextIsolation: true`**, **`nodeIntegration: false`** e **`sandbox: true`**. Il preload espone metodi specifici, non l'oggetto `ipcRenderer` generico. PTY, filesystem di configurazione e API native rimangono nel main.

| Canali | Controlli osservabili |
| --- | --- |
| `app:boot`, `sessions:subscribe` | Informazioni di avvio e snapshot; l'ID sottoscritto deve essere una stringa e una sessione presente. |
| `sessions:create`, `sessions:rename`, `sessions:close` | Campi primitivi filtrati; controlli di cartella, disponibilità shell e lunghezza del nome nel manager. |
| `terminal:write`, `terminal:resize`, `terminal:watch` | Tipi primitivi; limiti di scrittura/dimensioni nel manager; stato di visione aggiornato. |
| `settings:update`, `settings:reveal` | Patch oggetto con normalizzazione dei campi noti; reveal del file noto. |
| `dialog:directory` | Selettore nativo, con possibilità di creare una directory; path iniziale accettato se stringa. |
| `shell:openExternal` | URL valido e protocollo HTTP/HTTPS. |
| `clipboard:writeText`, `clipboard:readText`, `clipboard:readImage` | Solo il mittente della finestra dell'app. Testo limitato a `terminal.maxWriteChars`. L'immagine è un blob `image/*` degli appunti, rifiutata se supera i byte o il lato configurati; il renderer non invia un percorso. |
| `edit:command`, `edit:result` | Il main invia un identificatore esadecimale e un comando noto. Il renderer risponde solo con quell'identificatore e un booleano. Se il terminale non gestisce il comando, il main usa l'azione di editing della pagina. |
| Eventi main → UI | Sessioni, output terminale, preferenze, focus e tema; il testo del terminale non viene redatto. |

La finestra nega le nuove finestre con `setWindowOpenHandler`. `will-navigate` e `will-redirect` sono annullati salvo l'URL già aperto e, in sviluppo, l'origine del server Vite. Il renderer annulla `dragover` e `drop` così un file trascinato non sostituisce la pagina. Il percorso di un file trascinato si ottiene nel preload con `webUtils.getPathForFile` e viene solo quotato e incollato nel terminale.

**Limiti:** non c'è una CSP esplicita in [index.html](index.html) o negli header configurati. I canali IPC precedenti a M1 non verificano l'origine o il frame del mittente. La normalizzazione dei tipi non equivale a una validazione completa di schema, autenticità e dimensione di tutti i messaggi. Queste difese restano la proposta P1.

La conferma di chiusura vive nella UI e si applica solo a stati `busy`/`attention`; il main può chiudere direttamente una sessione. L'uscita dall'app termina le PTY senza una conferma complessiva. Un processo discendente che si distacca non è soggetto a una garanzia di terminazione dell'intero albero.

### 5. Input, limiti e filesystem

| Confine | Limite / fallback implementato |
| --- | --- |
| Sessioni | Massimo 12, incluse le terminate non rimosse. |
| Nome | Trim e troncamento a 80 unità di lunghezza stringa; nome automatico se vuoto alla creazione. |
| Cartella | Deve esistere ed essere una directory; percorsi contenenti/terminanti in `app.asar` sono respinti. Non c'è canonicalizzazione o confinamento a una workspace. |
| Shell | Scelta tra quelle rilevate; ID non trovato ripiega sulla prima. Nessun comando shell arbitrario nel campo UI. Il percorso scelto nell'ambiente di login è comunque fidato. |
| Input PTY | Una scrittura viene troncata a `terminal.maxWriteChars` (default 200000, intervallo 1000–1000000). Non c'è rate limit complessivo. |
| Trascinamento | Al massimo `drop.maxFiles` percorsi, ciascuno fino a `drop.maxPathChars`. I percorsi con NUL o a capo sono scartati e non vengono troncati. Il testo senza file è troncato al limite di scrittura. |
| Immagini appunti | Byte, lato, età, quantità, cartella e prefisso da `config/app.config.json`. Valori invalidi tornano ai default documentati. |
| Resize | Interi: 2–500 colonne, 2–200 righe. |
| Output main | Oltre 300000 unità stringa, conserva le ultime 250000 nel backlog. Il chunk live non ha un limite equivalente per messaggio. |
| Schermi | Scrollback headless 200 righe; renderer 8000 righe. Non sono garanzie globali contro esaurimento memoria o code di output. |
| Font | Valore intero limitato a 11–22; fallback 14. |
| Parametri stato | Default, arrotondamento e intervalli definiti in `clampStatusConfig`. |
| Regex aggiuntive | Massimo 40 stringhe per lista e lunghezza 1–299; regex non valide ignorate. Nessun timeout di esecuzione o protezione da regex patologiche. |
| Processi figli | Snapshot PID/PPID; timeout 4 s Unix, 8 s Windows, buffer subprocesso massimo 4000000 byte. Ricerca shell Windows: timeout 3 s per comando `where`. |

Il main scrive preferenze, le immagini generate degli appunti nella cartella dati e, solo nella modalità di cattura demo, screenshot nel percorso configurato. La cartella delle immagini è un tratto di percorso validato sotto `userData`, non un percorso ricevuto dal renderer. Le directory di lavoro dei terminali sono liberamente selezionabili tra quelle accessibili; path assoluti e segmenti relativi non sono trattati come una policy di autorizzazione. Il selettore può creare cartelle fuori dal checkout. Non dichiarare protezioni anti-path-traversal che il prodotto non implementa al di fuori della cartella delle immagini incollate.

### 6. Distribuzione e dipendenze

Il lockfile fissa le dipendenze; installazione e rebuild possono eseguire script e compilare codice nativo. Electron, `node-pty` e i parser terminale sono parte della superficie fidata. Non introdurre aggiornamenti o dipendenze senza motivazione e verifiche.

I pacchetti includono i bundle, `package.json` e le dipendenze secondo [electron-builder.json5](electron-builder.json5); `node-pty` e `@xterm/headless` sono estratti dall'ASAR. ASAR non è un confine di sicurezza. macOS ha `identity: null`; Windows non ha certificati configurati. Non sono configurati notarizzazione, auto-update o workflow di release.

Per una release occorrono controllo del commit, approvazione esplicita, test e smoke della build reale su piattaforme dichiarate, controllo dei contenuti dei pacchetti, SHA-256 e verifica di tag/release sul remoto. Mai allegare credenziali, preferenze personali, log o screenshot privati. La release `v0.2.0` esiste già sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`; i nuovi pacchetti sono costruiti da quel commit. Il workflow Windows è solo manuale, ha permessi `contents: read`, Actions fissate a hash e nessun accesso a credenziali di firma o pubblicazione. Usa il prebuild Windows N-API incluso in `node-pty` e salta il rebuild nativo durante il packaging. Gli artifact sono conservati sette giorni; la pubblicazione richiede la verifica locale dei download e dei checksum.

### 7. Verifiche e rischi residui

La suite in `src/**/*.test.ts` copre stati, configurazione del rilevamento, burst, titoli, stabilizzazione, notifiche, viste, quotatura delle shell, trascinamento, decisione di navigazione, validazione di `config/app.config.json` e la policy dei file immagine. Non copre IPC reale, shell native, CSP, la finestra Electron, pacchetti o rete. Test e build non dimostrano l'assenza di vulnerabilità.

La documentazione viene verificata contro i sorgenti. Gli esiti di M1 e dell’integrazione pacchetti sono registrati in [PLAN.md](PLAN.md). Lo smoke dedicato usa preferenze temporanee precompilate e controlla l’isolamento prima di modificarle. Avvia solo comandi di prova con un ambiente filtrato e, su macOS, una directory di configurazione zsh vuota. Il debug Chromium è limitato al loopback durante la prova; il processo viene terminato alla fine e i temporanei locali restano per il controllo. Non legge gli appunti e non usa CLI AI o credenziali reali. Non sono stati usati keychain, credenziali o contenuti privati per esercitare l'app.

Usare l'app come terminale fidato di un utente ordinario, limitare l'ambiente ereditato quando contiene segreti, usare regex semplici e proteggere la directory dati con i permessi del sistema. Limiti residui di M1, oltre a CSP e alla verifica del mittente sui canali IPC precedenti (proposta P1, non parte di questa milestone):

- I tooltip degli attributi `title` sono quelli del sistema operativo e non usano i colori del tema dell'app.
- La pulizia delle immagini incollate elimina solo i file il cui nome corrisponde al prefisso configurato.
- Su Windows `chmod` non è un confine: contano le ACL della cartella dati utente.
- Senza bracketed paste, un incolla su più righe può essere eseguito dal programma nel terminale.

Le immagini incollate restano leggibili da shell e programmi dello stesso utente finché la pulizia non le rimuove. Evitare output non fidato e controllare ogni comando o incolla prima di eseguirlo. Disattivare notifiche se i nomi delle sessioni sono sensibili.

La proposta **P1** resta aperta per CSP e verifica del mittente sui canali precedenti. **P2** resta aperta per la lingua automatica e per i limiti ancora nei moduli. **P3** resta la verifica multipiattaforma. Non sono attività già completate.

## English

This document describes controls observable in Plancia Comandi **0.2.0** source and remaining limitations. It documents implemented behavior rather than certifying security.

**Contents**

- [1. Operating model and boundaries](#1-operating-model-and-boundaries)
- [2. Secrets, AI and networking](#2-secrets-ai-and-networking)
- [3. Persistence, logging and privacy](#3-persistence-logging-and-privacy)
- [4. Electron and IPC](#4-electron-and-ipc)
- [5. Input, limits and filesystem](#5-input-limits-and-filesystem)
- [6. Distribution and dependencies](#6-distribution-and-dependencies)
- [7. Checks and residual risks](#7-checks-and-residual-risks)

### 1. Operating model and boundaries

Plancia Comandi is a desktop terminal for a local user. The main process manages shells, PTYs, configuration, notifications and native operations; the renderer displays terminals and requests operations through a dedicated preload. Heuristic status logic is separate from privileged operations.

```text
User -> React/xterm renderer -> preload API -> IPC -> Electron main
                                                      |-> Shell / PTY -> programs, files, network
                                                      |-> settings.json
                                                      |-> notifications / folder picker / browser
PTY -> title parser + headless screen -> status detection -> Renderer
```

The shell is a key trust boundary: commands run with the app process's permissions. Plancia Comandi imposes no terminal workspace root, deletion checks or read-only/confirm/full-auto modes. The renderer sandbox does not restrict commands launched through the PTY. The app is not a remote multiuser service and provides no authentication or remote control.

Source references: [main](electron/main.ts), [preload](electron/preload.ts), [sessions](electron/sessions.ts), [status](src/shared/status.ts).

### 2. Secrets, AI and networking

- There are no integrated AI providers, AI API clients, API-key management, keychain or credential fields. The app does not independently send terminal content to a model.
- A launched CLI may access files and credentials and make external calls. Its consent, authentication and policies are independent of this app. The app neither intercepts nor approves child-process API requests.
- Shells inherit almost all process variables except `ELECTRON_RUN_AS_NODE`; terminal variables and a locale fallback are set. Existing sensitive variables can therefore reach child processes.
- The app runtime implements no telemetry, output upload or remote backend. Clicked HTTP and HTTPS links open in the external browser after a protocol check; HTTP remains allowed. There is no host allowlist.
- In development Vite listens on `127.0.0.1:47231`, a fixed port. Do not expose it to an untrusted network. Installation and packaging may download dependencies and tools; they are not offline operations.
- No timeout or TLS policy is applied to connections made by terminal programs. The app source does not configure a TLS bypass, but it does not control shell networking.

Do not place secrets in JSON, examples, logs or the repository. A future AI integration would require protected storage, explicit consent for user content and separate consent for memory or project content, configurable providers, timeouts, cancellation and redaction, with dedicated tests. These controls are not implemented because that integration does not exist.

### 3. Persistence, logging and privacy

| Data / surface | Current behavior |
| --- | --- |
| Preferences | Unencrypted JSON in `app.getPath('userData')/settings.json`: language, theme, layout, font, alerts, last shell/folder and detection. This is not secret storage. |
| Migration | If the current file is missing, copies JSON from the `Molo` or `molo` data folder, retaining the original. |
| Sessions and output | State, names, titles and backlog in memory; no app-managed persistent restoration after quitting. The renderer contains visible output and scrollback. |
| Shells and programs | May save history, credentials, files and logs independently of the app. |
| Diagnostics | Console errors for preload, modules, PTY writes, child processes or startup; some exceptions may show original details in the UI. No audit log or centralized redaction system. |
| Notifications | State title and session name sent to the OS; may appear outside the window, including on a locked screen depending on OS settings. |
| Clipboard | Copy and paste go through the main-process `clipboard` module. Text is not redacted or previewed. An accepted image is written as a PNG under the user-data directory and only its quoted path is pasted into the terminal. |
| Temporary images | Directory and prefix come from `config/app.config.json` and are validated as a single path segment. The file name is generated in main. The write uses a temporary file and then a rename. On Unix the directory is `0700` and the file `0600`; on Windows the user-data directory ACL is the boundary, because POSIX mode bits are not a reliable boundary there. Age and maximum count delete generated files that match the prefix. Other files in the folder are left untouched. |
| Demo screenshots | `PLANCIA_SHOT_DIR`/legacy alias writes window PNGs to the specified path. Capture can include visible data and changes the persistent theme. |

Preferences use a direct write without atomic replacement, integrated backup or explicitly restrictive permissions. Ordinary OS/umask permissions apply. Invalid reads fall back to defaults; a later save may overwrite a corrupt file. No size limit is imposed before reading JSON.

No crash-report upload service is configured in the source. This does not exclude ordinary Electron/OS caches or diagnostics. Manually check content, names and paths before sharing logs, screenshots or settings.

### 4. Electron and IPC

[electron/main.ts](electron/main.ts) sets **`contextIsolation: true`**, **`nodeIntegration: false`** and **`sandbox: true`**. Preload exposes specific methods rather than the generic `ipcRenderer` object. PTYs, settings filesystem access and native APIs remain in main.

| Channels | Observable checks |
| --- | --- |
| `app:boot`, `sessions:subscribe` | Boot information and snapshots; subscribed ID must be a string and refer to an existing session. |
| `sessions:create`, `sessions:rename`, `sessions:close` | Primitive fields filtered; folder, shell availability and name-length checks in the manager. |
| `terminal:write`, `terminal:resize`, `terminal:watch` | Primitive types; write/dimension limits in the manager; viewing state updated. |
| `settings:update`, `settings:reveal` | Object patch with known-field normalization; reveal of the known settings file. |
| `dialog:directory` | Native picker, including directory creation; initial path accepted when a string. |
| `shell:openExternal` | Valid URL and HTTP/HTTPS protocol. |
| `clipboard:writeText`, `clipboard:readText`, `clipboard:readImage` | Only the app window's sender. Text is limited to `terminal.maxWriteChars`. An image is an `image/*` clipboard blob, rejected when it exceeds the configured bytes or edge; the renderer does not send a path. |
| `edit:command`, `edit:result` | Main sends a hexadecimal identifier and a known command. The renderer replies only with that identifier and a boolean. If the terminal does not handle the command, main uses the page editing action. |
| Main → UI events | Sessions, terminal output, preferences, focus and theme; terminal text is not redacted. |

The window denies new windows with `setWindowOpenHandler`. `will-navigate` and `will-redirect` are cancelled except for the URL already open and, in development, the Vite server origin. The renderer cancels `dragover` and `drop` so a dropped file does not replace the page. A dropped file's path is obtained in the preload with `webUtils.getPathForFile` and is only quoted and pasted into the terminal.

**Limitations:** there is no explicit CSP in [index.html](index.html) or configured headers. IPC channels that predate M1 do not verify sender origin or frame. Type normalization is not complete schema, authenticity and size validation for all messages. Those defenses remain proposal P1.

Closing confirmation lives in the UI and applies only to `busy`/`attention` states; main can close a session directly. Quitting terminates PTYs without an overall confirmation. A detached descendant is not covered by a guarantee that the entire process tree will terminate.

### 5. Input, limits and filesystem

| Boundary | Implemented limit / fallback |
| --- | --- |
| Sessions | Maximum 12, including exited sessions not removed. |
| Name | Trimmed and truncated to 80 string-length units; automatic name if empty at creation. |
| Folder | Must exist and be a directory; paths containing/ending in `app.asar` are rejected. No canonicalization or workspace confinement. |
| Shell | Chosen from detected entries; an unknown ID falls back to the first. No arbitrary shell command field in the UI. The path chosen from the login environment is still trusted. |
| PTY input | A write is truncated to `terminal.maxWriteChars` (default 200000, range 1000–1000000). There is no overall rate limit. |
| Drag and drop | At most `drop.maxFiles` paths, each up to `drop.maxPathChars`. Paths containing NUL or a line break are discarded and are not truncated. Text without files is truncated to the write limit. |
| Clipboard images | Bytes, edge, age, count, directory and prefix come from `config/app.config.json`. Invalid values fall back to the documented defaults. |
| Resize | Integers: 2–500 columns, 2–200 rows. |
| Main output | Above 300000 string units, keeps the latest 250000 in the backlog. Live chunks have no equivalent per-message bound. |
| Screens | Headless scrollback 200 lines; renderer 8000 lines. These are not global memory-exhaustion or output-queue guarantees. |
| Font | Integer clamped to 11–22; fallback 14. |
| Status parameters | Defaults, rounding and ranges defined in `clampStatusConfig`. |
| Extra regexes | Up to 40 strings per list, length 1–299; invalid regexes ignored. No execution timeout or protection against pathological regexes. |
| Child processes | PID/PPID snapshot; timeout 4 s Unix, 8 s Windows, subprocess buffer at most 4000000 bytes. Windows shell search: 3 s timeout per `where` command. |

Main writes preferences, generated clipboard images in the data directory and, only in demo capture mode, screenshots to the configured path. The image folder is a validated path segment under `userData`, not a path received from the renderer. Terminal working directories can be freely selected among accessible directories; absolute paths and relative segments are not treated as an authorization policy. The picker can create directories outside the checkout. Do not claim path-traversal protections the product does not implement outside the pasted-image folder.

### 6. Distribution and dependencies

The lockfile pins dependencies; installation and rebuild may execute scripts and compile native code. Electron, `node-pty` and terminal parsers are part of the trusted surface. Do not introduce dependency changes without justification and checks.

Packages include bundles, `package.json` and dependencies under [electron-builder.json5](electron-builder.json5); `node-pty` and `@xterm/headless` are unpacked from ASAR. ASAR is not a security boundary. macOS has `identity: null`; Windows has no configured certificates. Notarization, automatic updates and release workflows are not configured.

A release requires commit review, explicit approval, tests and real-build smoke on declared platforms, package-content checks, SHA-256 and remote tag/release verification. Never attach credentials, personal preferences, logs or private screenshots. Release `v0.2.0` already exists at commit `4aabc9bc81a60b0c574221ce37578936341ae065`; new packages are built from that commit. The Windows workflow is manual only, uses `contents: read`, pins Actions to hashes and has no signing or publishing credentials. It uses the Windows N-API prebuild shipped in `node-pty` and skips native rebuild during packaging. Artifacts are retained for seven days; publishing requires local download and checksum verification.

### 7. Checks and residual risks

The suite in `src/**/*.test.ts` covers status, detection configuration, bursts, titles, stabilization, notifications, views, shell quoting, drag-and-drop, the navigation decision, `config/app.config.json` validation and the image-file policy. It does not cover real IPC, native shells, CSP, the Electron window, packages or networking. Tests and build do not establish the absence of vulnerabilities.

Documentation is checked against source. M1 and package-integration results are recorded in [PLAN.md](PLAN.md). The dedicated smoke test uses preseeded temporary preferences and verifies isolation before changing them. It runs only fixture commands with a filtered environment and, on macOS, an empty zsh configuration directory. Chromium debugging is limited to loopback during the test; the process terminates afterward and local temporary files remain for inspection. It does not read the clipboard or use real AI CLIs or credentials. No keychain, credentials or private content were used to exercise the app.

Use the app as a trusted terminal under an ordinary user account, limit inherited environments containing secrets, use simple regexes and protect the data directory with OS permissions. Residual limits of M1, besides CSP and sender checks on IPC channels that predate it (proposal P1, not part of this milestone):

- `title` tooltips are drawn by the operating system and do not use the app theme colors.
- Cleanup of pasted images deletes only files whose names match the configured prefix.
- On Windows `chmod` is not a boundary: the user-data directory ACLs are what apply.
- Without bracketed paste, a multiline paste can be executed by the program in the terminal.

Pasted images remain readable by shells and programs of the same user until cleanup removes them. Avoid untrusted output and inspect commands or pasted text before executing them. Disable notifications if session names are sensitive.

Proposal **P1** remains open for CSP and sender checks on the older channels. **P2** remains open for automatic language selection and for limits that are still in modules. **P3** remains the cross-platform verification. They are not completed work.
