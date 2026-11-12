# Modello di sicurezza / Security model

## Italiano

Questo documento descrive i controlli osservabili nei sorgenti di Plancia Comandi **0.3.0** e i limiti residui. È una descrizione del comportamento implementato, non una certificazione di sicurezza.

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
| `app:boot`, `sessions:subscribe` | Solo il mittente della finestra dell'app. `app:boot` non accetta argomenti. `sessions:subscribe` accetta solo un id UUID; un id rifiutato non restituisce il backlog. |
| `sessions:create`, `sessions:rename`, `sessions:close` | Solo il mittente dell'app. Creazione: oggetto con `name`, `shellId` e `cwd` stringhe opzionali, lunghezze limitate e senza chiavi sconosciute. Chiusura e rinomina: id UUID; il nome è una stringa fino a 80 caratteri. Cartella, shell e troncamento restano nel manager. |
| `terminal:write`, `terminal:resize`, `terminal:watch` | Solo il mittente dell'app. Scrittura: id UUID e stringa; oltre `terminal.maxWriteChars` viene troncata, non scartata. Dimensioni: interi, 2–500 colonne e 2–200 righe. Osservazione: id UUID oppure `null`, e un booleano. |
| `settings:update`, `settings:reveal` | Solo il mittente dell'app. La patch è un oggetto con i campi noti e i tipi attesi; un valore non finito, come `1e400`, rifiuta l'intera patch. In quel caso il mittente dell'app riceve le impostazioni correnti, non `null`. Un mittente estraneo riceve `null` e non le impostazioni. La normalizzazione nel file avviene solo dopo una patch accettata. Reveal non accetta argomenti. |
| `dialog:directory` | Solo il mittente dell'app. Il percorso iniziale è una stringa fino a 32768 caratteri. Un payload rifiutato non apre il selettore. Il selettore nativo può creare una directory. |
| `shell:openExternal` | Solo il mittente dell'app. URL http o https lungo al massimo 4096 caratteri. Gli altri protocolli sono rifiutati prima della chiamata alla shell. |
| `clipboard:writeText`, `clipboard:readText`, `clipboard:readImage` | Solo il mittente della finestra dell'app. Testo limitato a `terminal.maxWriteChars`. L'immagine è un blob `image/*` degli appunti, rifiutata se supera i byte o il lato configurati; il renderer non invia un percorso. |
| `edit:command`, `edit:result` | Il main invia un identificatore esadecimale e un comando noto. Il renderer risponde solo con quell'identificatore e un booleano. Se il terminale non gestisce il comando, il main usa l'azione di editing della pagina. |
| Eventi main → UI | Sessioni, output terminale, preferenze, focus e tema; il testo del terminale non viene redatto. |

La finestra nega le nuove finestre con `setWindowOpenHandler`. `will-navigate` e `will-redirect` sono annullati salvo l'URL già aperto e, in sviluppo, l'origine del server Vite. Il renderer annulla `dragover` e `drop` così un file trascinato non sostituisce la pagina. Il percorso di un file trascinato si ottiene nel preload con `webUtils.getPathForFile` e viene solo quotato e incollato nel terminale.

La policy del renderer è costruita in [src/shared/csp.ts](src/shared/csp.ts). In produzione `createWindow` carica `dist/index.html` con `loadFile`, quindi un URL `file:`. In una prova manuale dell'agente su Linux con Electron 45.2.3, non automatizzata e non presente nel repository, `webRequest.onHeadersReceived` ha ricevuto le risposte `file:` di `loadFile` e l'header CSP è stato applicato. Su macOS e Windows non è verificato: lì la garanzia è il meta in `index.html`, mentre `frame-ancestors 'none'` vale solo se l'header è applicato. Il meta non include `frame-ancestors`, perché un elemento meta ignora quella direttiva e Chromium avvisa in console. L'app non mostra il renderer in un iframe. Un'app impacchettata ignora `VITE_DEV_SERVER_URL` e usa sempre il caricamento e la policy di produzione. La versione di Electron usata da questa prova è quella dichiarata in `package.json`, **45.2.3**. In sviluppo la funzione produce una policy diversa solo per l'origine HTTP di loopback: la imposta il server Vite e la ripete la sessione sulle risposte di quell'origine. Un URL di sviluppo che non è HTTP su `127.0.0.1` o `localhost` non allenta la policy.

Produzione: `default-src 'none'`; script solo `'self'`; niente `unsafe-eval`; niente `unsafe-inline` per gli script; `script-src-attr 'none'`; `connect-src 'none'`; immagini solo `'self'`; nessun host remoto e nessun carattere jolly. `style-src-elem` e `style-src-attr` includono `'unsafe-inline'` perché xterm.js 5 disegna con il renderer DOM: scrive tavolozza, font e animazioni del cursore in un elemento `<style>`, e il contrasto di ogni cella con `setAttribute('style', ...)`. Quei valori dipendono dal tema e dalla cella e non possono essere un foglio statico con hash. Le assegnazioni `element.style` usate per il layout non sono una sorgente CSP. Il polyfill modulepreload di Vite è disattivato, così il HTML di produzione non aggiunge uno script inline.

Sviluppo: `script-src` aggiunge `'unsafe-inline'` soltanto per il preambolo inline che `@vitejs/plugin-react` inietta per React Fast Refresh. Non c'è `unsafe-eval`. Vite inietta anche i CSS come elementi `<style>` durante il ricaricamento: l'eccezione di stile sopra lo consente già. `connect-src` è `'self'`, `http://127.0.0.1:47231` e `ws://127.0.0.1:47231`. `script-src-attr` resta `'none'`, quindi i gestori di evento inline restano bloccati.

**Limiti:** la CSP non confina la shell. I canali aggiunti in M1 controllavano già il mittente. Un mittente accettato è il renderer dell'app: CSP e controllo del mittente non impediscono al codice già in esecuzione nella pagina di usare i canali leciti. La validazione non è uno schema completo di ogni messaggio futuro, non copre timeout delle regex né la scrittura atomica delle impostazioni. Quei punti restano nella proposta P1.

La conferma di chiusura vive nella UI e si applica solo a stati `busy`/`attention`; il main può chiudere direttamente una sessione. L'uscita dall'app termina le PTY senza una conferma complessiva. Un processo discendente che si distacca non è soggetto a una garanzia di terminazione dell'intero albero.

### 5. Input, limiti e filesystem

| Confine | Limite / fallback implementato |
| --- | --- |
| Sessioni | Massimo 12, incluse le terminate non rimosse. |
| Nome | Trim e troncamento a 80 unità di lunghezza stringa; nome automatico se vuoto alla creazione. |
| Cartella | Deve esistere ed essere una directory; percorsi contenenti/terminanti in `app.asar` sono respinti. Non c'è canonicalizzazione o confinamento a una workspace. |
| Shell | Scelta tra quelle rilevate; ID non trovato ripiega sulla prima. Nessun comando shell arbitrario nel campo UI. Il percorso scelto nell'ambiente di login è comunque fidato. |
| Input PTY | Una scrittura viene troncata a `terminal.maxWriteChars` (default 200000, intervallo 1000–1000000), sia nel manager sia al confine IPC. Non c'è rate limit complessivo. |
| Incolla | Il testo incollato è più corto di 12 caratteri rispetto a `maxWriteChars`, così i marcatori dell'incolla fra parentesi (`ESC [200~` e `ESC [201~`) restano dentro il limite e il testo non sparisce. |
| Code di incolla | Ogni coda FIFO, scorciatoie e acceleratori, tiene al massimo 64 metà non accoppiate. Oltre il tetto si scarta la più vecchia. |
| Trascinamento | Al massimo `drop.maxFiles` percorsi, ciascuno fino a `drop.maxPathChars`. I percorsi con NUL o a capo sono scartati e non vengono troncati. Il testo senza file è troncato al limite di incolla. |
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

Il lockfile fissa le dipendenze; installazione e rebuild possono eseguire script e compilare codice nativo. Electron, `node-pty` e i parser terminale sono parte della superficie fidata. Non introdurre aggiornamenti o dipendenze senza motivazione e verifiche. Su Windows `node-pty` 1.1.0 fornisce prebuild N-API (`pty.node`, `conpty.node`, `conpty_console_list.node`) e `scripts/install-native.mjs` non chiama `node-gyp`. Su Linux non c'è una prebuild, quindi il postinstall ricompila per Electron. Su macOS le prebuild esistono, ma l'installazione ricompila comunque. `npmRebuild` è disattivato in electron-builder, così il pacchetto non avvia una seconda compilazione e si appoggia al postinstall: un packaging per un'altra architettura, per esempio `--linux --arm64` da una macchina x64, non ricompila `node-pty`. Il postinstall di Electron, che scarica il binario, non è stato modificato.

I pacchetti includono i bundle, `package.json` e le dipendenze secondo [electron-builder.json5](electron-builder.json5); `node-pty` e `@xterm/headless` sono estratti dall'ASAR. ASAR non è un confine di sicurezza. macOS ha `identity: null`; Windows non ha certificati configurati. Non sono configurati notarizzazione, auto-update o workflow di release.

Per una release occorrono controllo del commit, approvazione esplicita, test e smoke della build reale su piattaforme dichiarate, controllo dei contenuti dei pacchetti, SHA-256 e verifica di tag/release sul remoto. Mai allegare credenziali, preferenze personali, log o screenshot privati. La release `v0.2.0` esiste già sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`. La release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) è pubblicata il 12 novembre 2026 sul commit `94ff1e44106f08fdcf961cab74171668112ad780`. Il workflow Windows è solo manuale, ha permessi `contents: read`, Actions fissate a hash e nessun accesso a credenziali di firma o pubblicazione. È predisposto per usare il prebuild Windows N-API di `node-pty` e per non ricompilare durante il packaging. Lo step chiama `scripts/package-windows.mjs` e non passa `-c.*` né `--config.*` alla shell. Le run `43086813880` e `43096382710` non hanno prodotto un pacchetto; la run `43226304320` sì, e quei file sono nella release. Gli artifact di una run restano sette giorni; la pubblicazione richiede la verifica locale dei download e dei checksum. Il workflow `package-macos.yml` è solo manuale, ha gli stessi permessi `contents: read` e Actions fissate a hash, non usa segreti e non firma né notarizza. La run `43257940568` ha costruito i pacchetti della release e ha controllato solo l'app scompattata.

### 7. Verifiche e rischi residui

La suite in `src/**/*.test.ts` e `scripts/**/*.test.ts` copre stati, configurazione del rilevamento, burst, titoli, stabilizzazione, notifiche, viste, quotatura delle shell, trascinamento, decisione di navigazione, validazione di `config/app.config.json`, la policy dei file immagine, le stringhe della CSP, il cancello degli IPC precedenti a M1 e le opzioni di packaging Windows. Per ogni canale `handle` e `on` di quel gruppo i test rifiutano un mittente estraneo e un payload non valido senza chiamare gli effetti. Non coprono un canale IPC Electron reale, shell native, l'applicazione della CSP nel browser, la finestra Electron, pacchetti o rete. Test e build non dimostrano l'assenza di vulnerabilità.

La documentazione viene verificata contro i sorgenti. Gli esiti di M1 e dell’integrazione pacchetti sono registrati in [PLAN.md](PLAN.md). Lo smoke dedicato usa preferenze temporanee precompilate e controlla l’isolamento prima di modificarle. Avvia solo comandi di prova con un ambiente filtrato e, su macOS, una directory di configurazione zsh vuota. Il debug Chromium è limitato al loopback durante la prova; il processo viene terminato alla fine e i temporanei locali restano per il controllo. Non legge gli appunti e non usa CLI AI o credenziali reali. Non sono stati usati keychain, credenziali o contenuti privati per esercitare l'app.

Usare l'app come terminale fidato di un utente ordinario, limitare l'ambiente ereditato quando contiene segreti, usare regex semplici e proteggere la directory dati con i permessi del sistema. Se una raffica di incolla supera le 64 metà non accoppiate in una coda, la metà scartata non ha più un compagno e il compagno tardivo può incollare una seconda volta. Limiti residui, oltre a quelli già descritti:

- I tooltip degli attributi `title` sono quelli del sistema operativo e non usano i colori del tema dell'app.
- La pulizia delle immagini incollate elimina solo i file il cui nome corrisponde al prefisso configurato.
- Su Windows `chmod` non è un confine: contano le ACL della cartella dati utente.
- Senza bracketed paste, un incolla su più righe può essere eseguito dal programma nel terminale.

Il debito dei controlli di pacchetto non è corretto nel codice; l'elenco è in [PLAN.md](PLAN.md). In sintesi: su macOS smoke e ispezione non aprono il DMG o lo ZIP, e lo smoke non imposta `HOME`; i test importano moduli interni di `electron-builder`; `json5` e `@electron/asar` arrivano per hoisting di npm; `MAC_APP_NAME` non copre un `mac.executableName` distinto; mancano i casi `\.git\config` e `\settings.json`; su Linux il ramo reale di `archiveEntryPath` è solo posix.

Le immagini incollate restano leggibili da shell e programmi dello stesso utente finché la pulizia non le rimuove. Evitare output non fidato e controllare ogni comando o incolla prima di eseguirlo. Disattivare notifiche se i nomi delle sessioni sono sensibili.

La proposta **P1** resta aperta per il timeout delle regex, la scrittura atomica delle impostazioni e la redazione degli errori. CSP, verifica del mittente sugli IPC precedenti a M1 e tetto delle code di incolla sono C2, non il completamento di tutta P1. **P2** resta aperta per la lingua automatica e per i limiti ancora nei moduli. **P3** resta la verifica multipiattaforma. Non sono attività già completate.

## English

This document describes controls observable in Plancia Comandi **0.3.0** source and remaining limitations. It documents implemented behavior rather than certifying security.

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
| `app:boot`, `sessions:subscribe` | Only the app window's sender. `app:boot` takes no arguments. `sessions:subscribe` accepts only a UUID; a rejected id does not return the backlog. |
| `sessions:create`, `sessions:rename`, `sessions:close` | Only the app sender. Creation: an object with optional `name`, `shellId` and `cwd` strings, bounded lengths and no unknown keys. Close and rename: a UUID; the name is a string of at most 80 characters. Folder, shell and truncation remain in the manager. |
| `terminal:write`, `terminal:resize`, `terminal:watch` | Only the app sender. Write: a UUID and a string; past `terminal.maxWriteChars` it is truncated, not discarded. Size: integers, 2–500 columns and 2–200 rows. Watch: a UUID or `null`, and a boolean. |
| `settings:update`, `settings:reveal` | Only the app sender. The patch is an object with the known fields and expected types; a non-finite value, such as `1e400`, rejects the whole patch. The app sender then receives the current settings, not `null`. A foreign sender receives `null` and not the settings. File normalization happens only after an accepted patch. Reveal takes no arguments. |
| `dialog:directory` | Only the app sender. The initial path is a string of at most 32768 characters. A rejected payload does not open the picker. The native picker can create a directory. |
| `shell:openExternal` | Only the app sender. An http or https URL of at most 4096 characters. Other protocols are rejected before the shell is called. |
| `clipboard:writeText`, `clipboard:readText`, `clipboard:readImage` | Only the app window's sender. Text is limited to `terminal.maxWriteChars`. An image is an `image/*` clipboard blob, rejected when it exceeds the configured bytes or edge; the renderer does not send a path. |
| `edit:command`, `edit:result` | Main sends a hexadecimal identifier and a known command. The renderer replies only with that identifier and a boolean. If the terminal does not handle the command, main uses the page editing action. |
| Main → UI events | Sessions, terminal output, preferences, focus and theme; terminal text is not redacted. |

The window denies new windows with `setWindowOpenHandler`. `will-navigate` and `will-redirect` are cancelled except for the URL already open and, in development, the Vite server origin. The renderer cancels `dragover` and `drop` so a dropped file does not replace the page. A dropped file's path is obtained in the preload with `webUtils.getPathForFile` and is only quoted and pasted into the terminal.

The renderer policy is built in [src/shared/csp.ts](src/shared/csp.ts). In production `createWindow` loads `dist/index.html` with `loadFile`, a `file:` URL. In a manual check by the agent on Linux with Electron 45.2.3, not automated and not in the repository, `webRequest.onHeadersReceived` received the `file:` responses from `loadFile` and the CSP header was enforced. It is not verified on macOS or Windows: there the guarantee is the meta tag in `index.html`, and `frame-ancestors 'none'` applies only if the header is enforced. The meta tag omits `frame-ancestors`, because a meta element ignores that directive and Chromium would log a console warning. The app does not show the renderer in an iframe. A packaged app ignores `VITE_DEV_SERVER_URL` and always uses the production load and policy. The Electron version used for that check is the one declared in `package.json`, **45.2.3**. In development the function builds a different policy only for the loopback HTTP origin: the Vite server sets it and the session repeats it on responses from that origin. A development URL that is not HTTP on `127.0.0.1` or `localhost` does not loosen the policy.

Production: `default-src 'none'`; scripts are `'self'` only; no `unsafe-eval`; no `unsafe-inline` for scripts; `script-src-attr 'none'`; `connect-src 'none'`; images are `'self'` only; no remote host and no wildcard. `style-src-elem` and `style-src-attr` include `'unsafe-inline'` because xterm.js 5 draws with the DOM renderer: it writes the palette, font and cursor animations into a `<style>` element, and each cell's contrast with `setAttribute('style', ...)`. Those values depend on the theme and the cell and cannot be a static hashed sheet. `element.style` assignments used for layout are not a CSP style source. Vite's module-preload polyfill is disabled, so the production HTML does not add an inline script.

Development: `script-src` adds `'unsafe-inline'` only for the inline preamble `@vitejs/plugin-react` injects for React Fast Refresh. There is no `unsafe-eval`. Vite also injects CSS as `<style>` elements during reload; the style exception above already allows that. `connect-src` is `'self'`, `http://127.0.0.1:47231` and `ws://127.0.0.1:47231`. `script-src-attr` stays `'none'`, so inline event handlers stay blocked.

**Limitations:** the CSP does not confine the shell. Channels added in M1 already checked the sender. An accepted sender is the app renderer: CSP and the sender check do not stop code already running in the page from using the allowed channels. Validation is not a complete schema for every future message, and it does not cover regex timeouts or atomic settings writes. Those points remain proposal P1.

Closing confirmation lives in the UI and applies only to `busy`/`attention` states; main can close a session directly. Quitting terminates PTYs without an overall confirmation. A detached descendant is not covered by a guarantee that the entire process tree will terminate.

### 5. Input, limits and filesystem

| Boundary | Implemented limit / fallback |
| --- | --- |
| Sessions | Maximum 12, including exited sessions not removed. |
| Name | Trimmed and truncated to 80 string-length units; automatic name if empty at creation. |
| Folder | Must exist and be a directory; paths containing/ending in `app.asar` are rejected. No canonicalization or workspace confinement. |
| Shell | Chosen from detected entries; an unknown ID falls back to the first. No arbitrary shell command field in the UI. The path chosen from the login environment is still trusted. |
| PTY input | A write is truncated to `terminal.maxWriteChars` (default 200000, range 1000–1000000), both in the manager and at the IPC boundary. There is no overall rate limit. |
| Paste | Pasted text is 12 characters shorter than `maxWriteChars`, so the bracketed-paste markers (`ESC [200~` and `ESC [201~`) stay inside the limit and the text is not dropped. |
| Paste queues | Each FIFO queue, shortcuts and accelerators, keeps at most 64 unmatched halves. Past the cap, the oldest is discarded. |
| Drag and drop | At most `drop.maxFiles` paths, each up to `drop.maxPathChars`. Paths containing NUL or a line break are discarded and are not truncated. Text without files is truncated to the paste limit. |
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

The lockfile pins dependencies; installation and rebuild may execute scripts and compile native code. Electron, `node-pty` and terminal parsers are part of the trusted surface. Do not introduce dependency changes without justification and checks. On Windows `node-pty` 1.1.0 supplies N-API prebuilds (`pty.node`, `conpty.node`, `conpty_console_list.node`) and `scripts/install-native.mjs` does not call `node-gyp`. Linux has no prebuild, so postinstall rebuilds for Electron. macOS prebuilds exist, but the install still rebuilds. `npmRebuild` is off in electron-builder, so packaging does not start a second compilation and relies on postinstall: packaging for another architecture, for example `--linux --arm64` from an x64 machine, does not rebuild `node-pty`. Electron's own postinstall, which downloads the binary, was not changed.

Packages include bundles, `package.json` and dependencies under [electron-builder.json5](electron-builder.json5); `node-pty` and `@xterm/headless` are unpacked from ASAR. ASAR is not a security boundary. macOS has `identity: null`; Windows has no configured certificates. Notarization, automatic updates and release workflows are not configured.

A release requires commit review, explicit approval, tests and real-build smoke on declared platforms, package-content checks, SHA-256 and remote tag/release verification. Never attach credentials, personal preferences, logs or private screenshots. Release `v0.2.0` already exists at commit `4aabc9bc81a60b0c574221ce37578936341ae065`. Release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) was published on 12 November 2026 at commit `94ff1e44106f08fdcf961cab74171668112ad780`. The Windows workflow is manual only, uses `contents: read`, pins Actions to hashes and has no signing or publishing credentials. It is set up to use the Windows N-API prebuild shipped in `node-pty` and to skip native rebuild during packaging. The step calls `scripts/package-windows.mjs` and does not pass `-c.*` or `--config.*` to the shell. Runs `43086813880` and `43096382710` did not produce a package; run `43226304320` did, and those files are in the release. A run's artifacts are kept for seven days; publishing requires local download and checksum verification. The `package-macos.yml` workflow is manual only, uses the same `contents: read` permission and hash-pinned Actions, uses no secrets, and does not sign or notarize. Run `43257940568` built the release packages and checked only the unpacked app.

### 7. Checks and residual risks

The suite in `src/**/*.test.ts` and `scripts/**/*.test.ts` covers status, detection configuration, bursts, titles, stabilization, notifications, views, shell quoting, drag-and-drop, the navigation decision, `config/app.config.json` validation, the image-file policy, the CSP strings, the gate for IPC that predates M1 and the Windows packaging options. For every `handle` and `on` channel in that group the tests reject a foreign sender and an invalid payload without calling the effects. They do not cover a live Electron IPC channel, native shells, browser enforcement of the CSP, the Electron window, packages or networking. Tests and build do not establish the absence of vulnerabilities.

Documentation is checked against source. M1 and package-integration results are recorded in [PLAN.md](PLAN.md). The dedicated smoke test uses preseeded temporary preferences and verifies isolation before changing them. It runs only fixture commands with a filtered environment and, on macOS, an empty zsh configuration directory. Chromium debugging is limited to loopback during the test; the process terminates afterward and local temporary files remain for inspection. It does not read the clipboard or use real AI CLIs or credentials. No keychain, credentials or private content were used to exercise the app.

Use the app as a trusted terminal under an ordinary user account, limit inherited environments containing secrets, use simple regexes and protect the data directory with OS permissions. If a paste burst exceeds 64 unmatched halves in one queue, the discarded half no longer has a partner and the late partner can paste a second time. Residual limits, besides those already described:

- `title` tooltips are drawn by the operating system and do not use the app theme colors.
- Cleanup of pasted images deletes only files whose names match the configured prefix.
- On Windows `chmod` is not a boundary: the user-data directory ACLs are what apply.
- Without bracketed paste, a multiline paste can be executed by the program in the terminal.

Packaging-check debt is not corrected in the code; the list is in [PLAN.md](PLAN.md). In short: on macOS, smoke tests and inspection do not open the DMG or ZIP, and the smoke test does not set `HOME`; tests import internal `electron-builder` modules; `json5` and `@electron/asar` arrive through npm hoisting; `MAC_APP_NAME` does not cover a distinct `mac.executableName`; the `\.git\config` and `\settings.json` cases are missing; on Linux the live `archiveEntryPath` branch is posix only.

Pasted images remain readable by shells and programs of the same user until cleanup removes them. Avoid untrusted output and inspect commands or pasted text before executing them. Disable notifications if session names are sensitive.

Proposal **P1** remains open for regex timeouts, atomic settings writes and error redaction. CSP, sender checks on IPC that predates M1 and the paste-queue cap are C2, not the completion of all of P1. **P2** remains open for automatic language selection and for limits that are still in modules. **P3** remains the cross-platform verification. They are not completed work.
