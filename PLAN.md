# Piano di sviluppo / Development plan

## Italiano

Questo piano registra la base esistente di Plancia Comandi e le attività future. Versione applicativa: **0.3.0**. La milestone **C1** è stata unita a `main` sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`; i tag `milestone/C1` e `v0.2.0` e la release con i sorgenti sono presenti sul remoto. **C2** è registrata sul branch `milestone/2-security-paste-hardening`. Merge, tag e release di C2 attendono la fase successiva. Le proposte non autorizzano altri interventi sul codice.

**Sommario**

- [1. Base e intervento corrente](#1-base-e-intervento-corrente)
- [2. Milestone corrente e proposte](#2-milestone-corrente-e-proposte)
- [3. Convenzioni delle milestone](#3-convenzioni-delle-milestone)
- [4. Checklist di chiusura](#4-checklist-di-chiusura)
- [5. Versioni, CI e distribuzione](#5-versioni-ci-e-distribuzione)

### 1. Base e intervento corrente

Il repository contiene già un'app Electron con terminali PTY, viste singola e affiancata, rilevamento euristico degli stati, notifiche, temi e due lingue. Non si attribuiscono retroattivamente milestone completate alla cronologia importata.

| Campo | Intervento documentale del 10 novembre 2026 |
| --- | --- |
| Obiettivo | Rendere disponibili manuali completi, informazioni di sicurezza e istruzioni di manutenzione conformi a `STARTUP_PREFERENCES_HOME.md`. |
| Tipo | Patch esclusivamente documentale, fuori dalla numerazione delle milestone. |
| Base | `main`, commit `585b5842301993ba009aa3d969708273de1e187f`, verificato sul remoto prima dell'intervento. |
| Branch | `patch/0.1.0-documentation`. |
| Versione / incremento | `0.1.0`, invariata: nessuna modifica applicativa. |
| Checkpoint / release | Nessun tag di milestone o versione; nessuna release richiesta per sola documentazione. |
| Attività | README bilingue; manuali IT/EN; modello di sicurezza, mappa e piano bilingui; quick start desktop bilingue; istruzioni operative in `AGENTS.md`. |
| Accettazione | Documenti presenti, introduzione e sommario con capitoli numerati per ogni lingua; manuali equivalenti; comandi, impostazioni e limiti verificati nei sorgenti; collegamenti locali validi; nessuna modifica ai file dell'utente. |
| Verifiche richieste | Controlli locali di documenti, link, struttura, versione e corrispondenza con i sorgenti; suite esistente e build se l'ambiente le consente. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `QUICK-START_Desktop.md`. |
| Stato | Documentazione completata e verificata; pronta per il controllo del commit locale. Approvazione e pubblicazione pendenti. |

Le modifiche preesistenti a `package.json` e `package-lock.json` e il file locale `STARTUP_PREFERENCES_HOME.md` appartengono all'utente e sono esclusi dalla patch. Il file delle preferenze è un riferimento locale; le regole applicabili sono riportate in `AGENTS.md`, così il repository resta comprensibile anche senza quel file.

Riepilogo: otto documenti creati o aggiornati, manuali con dodici capitoli equivalenti, istruzioni di installazione e rimozione, configurazione completa, limiti reali di sicurezza e procedura HOME di revisione. `LICENSE` Apache-2.0 già presente, verificata e conservata.

Verifiche locali del 10 novembre 2026: controlli automatici di documenti, link/anchor, capitoli, esempi JSON, script npm, undici default/intervalli del rilevamento e allineamento strutturale dei manuali riusciti; lettura manuale confrontata con sorgenti, etichette UI e configurazioni; `git diff --check` riuscito; `npm test` **30/30**; `npm run build` riuscito con Node.js 24. La build segnala un bundle renderer oltre 500 kB, senza errori. Test e build usano le dipendenze già installate, incluso Vitest 3.2.7, relative alle modifiche utente non incluse nella patch; non è stata fatta una nuova installazione dal lockfile di `main`.

Non eseguiti smoke Electron, CLI AI reale, packaging, prove Windows/Linux, audit completo delle dipendenze o CI: l'intervento modifica solo documentazione e tali verifiche non sono necessarie per questo ambito. Restano da completare le validazioni applicative e di sicurezza delle proposte P1–P3. Gli output ignorati di build/cache sono conservati; nessuna pulizia automatica, pubblicazione, merge, tag o release effettuata.

La base di `main` per C1, avviata come M1, è il commit `05062668b528d737d5c702673657bfd2b3dbaf8e`.


#### 1.1 Integrazione dei pacchetti C1 — 11 novembre 2026

- Obiettivo: aggiungere DMG/ZIP macOS ARM64 e installer/portabile Windows x64 alla release `v0.2.0` già esistente.
- Branch: `patch/0.2.0-release-packages`. Versione applicativa invariata; nessun nuovo tag o checkpoint. I pacchetti usano esattamente il codice applicativo `4aabc9bc81a60b0c574221ce37578936341ae065`.
- Implementazione: workflow Windows solo manuale, un job, Node.js 24 e Actions fissate a hash; installazione dal lockfile, prebuild `node-pty` incluso nel pacchetto npm, nomi distinti per installer e portabile, controllo dei bundle ASAR, smoke di pacchetto/portabile/app installata, SHA-256 e artifact conservati sette giorni. Nessun trigger push/PR e nessuna pubblicazione automatica.
- Motivazione CI: questa macchina è macOS ARM64, priva di un ambiente Windows; un avvio PTY Windows non può essere verificato in modo equivalente in locale.
- Verifiche locali: `npm test` 70/70 con Vitest 3.2.4 del tag; build con Node.js 24 riuscita, avviso renderer oltre 500 kB. ZIP e DMG macOS generati; integrità DMG valida; entrambe le app estratte fuori dal checkout superano il controllo dei bundle e lo smoke di bridge, preferenze isolate, IT/EN, chiaro/scuro, PTY nativa, quattro viste e chiusura sessioni.
- Audit: zero vulnerabilità note nelle dipendenze di produzione; il toolchain del tag riporta sette moderate e due critiche di sviluppo, incluse Vitest/tinypool. Le dipendenze del tag non vengono modificate da questa patch.
- Documentazione: README, manuali IT/EN, modello di sicurezza, mappa, piano e regole operative aggiornati.
- Limiti: Windows deve ancora essere eseguito sul runner dopo il controllo del commit; macOS Intel, Linux, CLI AI reale, firma, notarizzazione e prove complete di scorciatoie/clipboard non sono coperti da queste verifiche. I pacchetti sono privi di firma di distribuzione verificata. I temporanei locali vengono conservati.
- Stato: strumenti approvati nel commit `90cfe3af09526a792d495f0d37f5fa48bc6d3ea2`, uniti a `main` con `830af0952c384ac27f0af62fac66cffe98da9dc7` (PR #3). Pacchetti macOS e SHA-256 pubblicati e riscaricati con esito positivo. Il primo run Windows `43086813880` supera installazione e build ma fallisce perché PowerShell spezza `-c.nsis.runAfterFinish=false` e electron-builder apre quel resto come file di configurazione. La PR #5 è unita in `45f6575c4f14015c6cc9cb7bc45de3604a97a87e` e sostituisce quegli argomenti con un JSON e `--config` più il solo percorso. La run `43096382710` su quel commit è `startup_failure` senza job, quindi quel comando non è stato eseguito. Il pacchetto Windows non è ancora verificato. C2 non duplica il JSON: lo step chiama `scripts/package-windows.mjs`. La PR #4 resta aperta. Pubblicazione Windows e rimozione dei branch conclusi seguono le verifiche.

### 2. Milestone corrente e proposte

C1, già M1, è integrata e pubblicata con i sorgenti. C2, già M2, è approvata per la chiusura su questo branch e resta distinta dalla patch di packaging di C1. Merge, tag `milestone/C2` e `v0.3.0`, e la release non sono ancora stati eseguiti. Le proposte sotto non diventano eseguibili da sole.

| Campo | C1 — Clipboard, trascinamento e viste |
| --- | --- |
| Numero e titolo | C1 — Clipboard, trascinamento e viste |
| Obiettivo | Rendere usabili copia, incolla e trascinamento nei terminali e aggiungere le viste Incolonnate e Griglia accanto a Una e Affiancate. |
| Branch | `milestone/1-clipboard-dnd-layouts`, creato da `main` al commit `05062668b528d737d5c702673657bfd2b3dbaf8e`. |
| Tag di checkpoint previsto | `milestone/C1` e `v0.2.0`, già pubblicati sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`. |
| Tipo incremento versione | `+0.1.0`, da 0.1.0 a **0.2.0**. La versione non cambia con il passaggio da M1 a C1. |
| Attività | Menu **Modifica** con etichette dell'app; copia e incolla, incluso l'incolla fra parentesi di xterm.js; Ctrl+C che copia solo con una selezione su Windows e Linux; menu contestuale; trascinamento di file e testo con percorsi quotati per la shell; salvataggio delle immagini degli appunti in una cartella dedicata sotto i dati utente; blocco di navigazioni e nuove finestre; icone delle viste, disabilitazione e scelta dei riquadri; `config/app.config.json` validato. |
| Criteri di accettazione | Scorciatoie, menu e viste descritti nei manuali; quotatura verificata per shell POSIX, PowerShell e cmd; Affiancate e Incolonnate disabilitate con una sessione e Griglia sotto le tre; con tre sessioni il quarto riquadro resta vuoto; se chiudendo sessioni la vista non è più possibile si torna a Una e la scelta è salvata; i file temporanei hanno nome generato, restano sotto la cartella dati e non usano un percorso scelto dal renderer. |
| Test | `npm test` **70/70** e `npm run build` riuscito sul commit approvato `5c61783817db2a33deba8393abd694a3a3270028`. Non eseguiti, perché non sostituiscono uno smoke dell'app: prova manuale su Linux, macOS e Windows 11, smoke Electron, packaging, checksum e una CLI reale. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `STARTUP_PREFERENCES_HOME.md` (copia integrale; non è documentazione del repository). |
| Stato | `C1`. Prima approvazione di Glauco l'11 novembre 2026 alle 12:33 (Europe/Rome), sulla PR #1 con head `5c61783817db2a33deba8393abd694a3a3270028`. Parole di Glauco: «M1 funziona correttamente». Seconda approvazione registrata nella PR e nelle note della release l’11 novembre 2026 alle 13:26 (Europe/Rome); merge e tag completati. Restano i pacchetti della patch sotto. |

**Riepilogo.** Copia, incolla e trascinamento nei terminali; menu Modifica e menu contestuale; immagini degli appunti salvate in una cartella dedicata; viste Una, Affiancate, Incolonnate e Griglia.

**Verifiche.** `npm test` 70/70; `npm run build` riuscito, con l'avviso del bundle renderer oltre 500 kB. Queste verifiche non sono una prova automatica su macOS o Windows.

**Limiti residui.** macOS e Windows non verificati in modo automatico; installer non firmati. Punti allora rinviati a M2 e poi registrati in C2: CSP; verifica del mittente negli IPC precedenti a C1; tetto alle code FIFO dell'incolla; test sulla sequenza alternata e sul gesto orfano; riga sul rischio residuo in `SECURITY_MODEL.md`.

**Versione e tag.** Versione **0.2.0**. I tag `v0.2.0` e `milestone/C1` sono pubblicati sul commit di merge `4aabc9bc81a60b0c574221ce37578936341ae065`, verificati sul remoto. La release esistente viene integrata con i pacchetti verificati.

| Campo | C2 — Confini del renderer e incolla |
| --- | --- |
| Numero e titolo | C2 — Confini del renderer e incolla |
| Obiettivo | Impedire al renderer di caricare contenuti remoti o script non previsti, accettare gli IPC precedenti a M1 solo dalla finestra dell'app e con payload validi, limitare la lunghezza delle code FIFO dell'incolla, e permettere su Windows installazione e pacchetto senza compilatore e senza privilegi di amministratore. |
| Branch | `milestone/2-security-paste-hardening`, creato dal commit `0b8fa43b91fe2236f2d31df2959948247348bfdf`. La pull request ha base `main` dopo il merge di C1 `4aabc9bc` e, in questa chiusura, anche dopo il merge di `45f6575c`. |
| Tag di checkpoint previsto | `milestone/C2`. Non creato. Il tag di versione previsto è `v0.3.0`. Nessuno dei due è stato creato: merge, tag e release attendono la fase successiva. |
| Tipo incremento versione | `+0.1.0`, da 0.2.0 a **0.3.0**. |
| Attività | CSP restrittiva in produzione e sul server Vite; niente `unsafe-eval`; `unsafe-inline` per gli script solo in sviluppo, per il preambolo di React Fast Refresh; `unsafe-inline` per gli stili anche in produzione perché il renderer DOM di xterm.js scrive tema e contrasto nella pagina; verifica del mittente e del payload su tutti i canali IPC precedenti a M1, sia `handle` sia `on`; tetto 64 alle code FIFO dell'incolla; test negativi isolati; su Windows uso delle prebuild N-API di `node-pty` 1.1.0, senza `node-gyp`, con `npmRebuild: false` e postinstall che ricompila solo se la prebuild Windows manca (`scripts/install-native.mjs`); icona dell'app in `build/`; packaging Windows tramite `scripts/package-windows.mjs`, senza argomenti `-c.*`. |
| Criteri di accettazione | La policy di produzione non contiene `unsafe-eval`, host remoti né `unsafe-inline` negli script. Lo sviluppo parla solo con il loopback `127.0.0.1`. Un mittente diverso dalla finestra dell'app non riceve dati e non esegue l'azione. Un payload non valido non arriva al manager, al dialogo o alla shell. Le code di incolla non superano 64 metà. Terminali e temi restano funzionanti: l'eccezione di stile è documentata. Su Windows, senza compilatore, `npm ci`, `npm test`, `npm run build`, `npm run dev` e `npm run dist:win` non invocano `node-gyp`. Linux, che non ha una prebuild, continua a ricompilare. |
| Test | `npm ci`, poi `npm test` **126/126** e `npm run build` riuscito sul branch dopo il merge di `main` `45f6575c`, con l'avviso del bundle renderer oltre 500 kB. Node.js del controllo: 22.23.4. Non eseguiti, perché non sostituiscono uno smoke dell'app: DevTools senza violazioni CSP, terminali, temi e incolla su Linux, macOS e Windows; smoke Electron; pacchetto Linux, macOS o Windows; checksum. La checklist manuale è nella pull request. Su Linux non è stata testata di persona. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. Non esiste un `CHANGELOG`. |
| Stato | `C2`. Glauco ha approvato la chiusura di M2, compresi commit, push e aggiornamento della pull request. Merge, tag, release, avvio del workflow, chiusura della PR #4 e cancellazione dei branch restano alla fase successiva. |

**Riepilogo.** CSP del renderer; mittente e payload sugli IPC precedenti a M1; tetto 64 delle code di incolla; prebuild Windows di `node-pty` senza `node-gyp`; icona PNG, ICO e ICNS; procedura Linux; packaging Windows dallo script Node. File generati: `build/icon.png` 1914419 byte, `build/icon.ico` 154378 byte, `build/icon.icns` 1700498 byte.

**Verifiche.** `npm ci` riuscito su Linux e ha ricompilato `node-pty` per Electron. `npm test` 126/126. `npm run build` riuscito, con l'avviso del bundle renderer oltre 500 kB. Non è uno smoke della finestra né un pacchetto.

**Limiti residui.** Su Linux non è stata testata di persona. Il pacchetto Windows non è ancora verificato. Le icone non sono state provate dentro un DMG, uno ZIP o un installer. Merge, tag `milestone/C2` e `v0.3.0`, e la release `v0.3.0` non sono stati eseguiti.

**Versione e tag.** Versione **0.3.0**. Checkpoint previsto `milestone/C2`. Tag di versione previsto `v0.3.0`. Nessuno dei due è stato creato.

| Voce | Obiettivo da discutere | Accettazione proposta |
| --- | --- | --- |
| P1 — Confini di sicurezza | Resta da decidere ciò che C2 non copre: timeout delle regex, scrittura atomica delle impostazioni e redazione degli errori. CSP, mittente degli IPC precedenti a M1 e tetto delle code di incolla sono C2. | Test negativi isolati e modello di sicurezza aggiornato; preservare il funzionamento delle shell. |
| P2 — Preferenze iniziali | Allineare lingua automatica e portare nel file centrale i limiti ancora nei moduli. C1 mette nel file centrale solo i parametri nuovi di appunti, trascinamento e dimensione dell'input. | Italiano per sistemi italiani, inglese negli altri casi, override persistente e configurazione validata con test. |
| P3 — Distribuzione verificata | Validare macOS, Windows e Linux, notifiche, scorciatoie, shell, PTY e pacchetti reali. | Smoke fuori dal checkout, piattaforme e architetture dichiarate, artifact e SHA-256 verificati; documentazione aggiornata. |

Versione, branch, checkpoint, attività e test dettagliati saranno decisi quando una proposta sarà riclassificata come `M`. Queste righe non dichiarano controlli o piattaforme già verificati. Punto aperto, solo per la dimensione del pacchetto: non escludere le prebuild di `node-pty` delle altre piattaforme né i file `.pdb`. È un'ottimizzazione futura, non parte di C2. La landing page GitHub Pages non è stata richiesta e non è inclusa.

### 3. Convenzioni delle milestone

- `P<n>`: proposta facoltativa, non eseguibile senza decisione esplicita del progettista.
- `M<n>`: milestone approvata per il piano corrente, eseguita in ordine numerico su `milestone/<n>-<slug>` da `main`, dopo la verifica del precedente checkpoint remoto.
- `C<n>`: lavoro approvato dal progettista, con lo stesso numero della relativa `M`; pubblicazione e chiusura operativa possono essere ancora pendenti.

Le numerazioni `P` e `M` sono indipendenti. Ogni futura `M` deve specificare obiettivo funzionale, branch, checkpoint `milestone/C<n>`, incremento di versione, attività, criteri di accettazione, test, documenti e stato. Non iniziare la milestone successiva finché `main` e il checkpoint della precedente non sono verificati sul remoto.

### 4. Checklist di chiusura

Applicare la procedura completa in [AGENTS.md](AGENTS.md). Per ogni futura milestone copiare e compilare questa checklist:

- [ ] Identità privata GitHub verificata; worktree e modifiche utente preservati; checkpoint precedente verificato.
- [ ] Branch dedicato creato; implementazione, configurazione e test proporzionati completati.
- [ ] Test automatici e smoke/manuali necessari eseguiti; omissioni e limiti registrati.
- [ ] Versione sincronizzata quando prevista; nessun segreto o temporaneo tracciato per errore.
- [ ] README, manuali IT/EN e piano aggiornati; sicurezza, mappa e regole operative aggiornate quando interessate.
- [ ] Commit locali creati solo sul branch dedicato; branch congelato con voce ancora `M`.
- [ ] Hash, diff rispetto a `main`, test, esiti e limiti presentati; primo controllo e approvazione esplicita ottenuti.
- [ ] Solo dopo la prima approvazione: voce `M` rinominata `C`, riepilogo, verifiche, limiti, versione e checkpoint registrati in un nuovo commit locale.
- [ ] Nuovo hash e diff presentati; secondo controllo e approvazione esplicita ottenuti prima di push, merge o tag.
- [ ] Branch/PR pubblicati solo se necessari; CI necessaria verificata prima del merge. Ogni fix sottoposto a nuova approvazione.
- [ ] Merge su `main`, push e commit remoto verificati; CI su `main` verificata quando necessaria.
- [ ] Artifact e smoke della release, se dovuti, e relativi SHA-256 verificati sul commit finale prima dei tag.
- [ ] Checkpoint annotato `milestone/C<n>` e tag versione se cambiata creati e verificati sul remoto.
- [ ] Release prevista pubblicata e verificata; branch obsoleto rimosso solo dopo le verifiche e l'approvazione.
- [ ] Percorsi temporanei presentati per conferma separata prima della pulizia; worktree finale controllato.

Per una patch senza voce `M`, non inventare una milestone: si applicano congelamento, controllo del commit finale e approvazione, ma non il passaggio `M` → `C`, il secondo controllo dovuto a quel passaggio o il checkpoint di milestone. Ogni modifica successiva al controllo richiede nuova approvazione.

### 5. Versioni, CI e distribuzione

Usare `+0.0.1` per patch, `+0.1.0` per funzionalità minori e `+1.0.0` per cambi principali. Una modifica esclusivamente documentale può lasciare invariata la versione e non richiede una release. Per milestone o patch applicative concluse pubblicare una release secondo le preferenze HOME; se l'app non è utilizzabile, indicarla come prerelease. Non configurare firma, notarizzazione o aggiornamenti automatici senza credenziali e processo espliciti.

Il solo workflow `package-windows.yml` si avvia manualmente per un tentativo di costruzione Windows non equivalente in locale. Non parte su push o PR. Il pacchetto Windows non è ancora verificato. Le verifiche macOS ARM64 della release `v0.2.0` sono locali; non esiste un workflow macOS. Altri workflow richiedono una motivazione distinta. Non dichiarare un pacchetto verificato sulla sola base di `npm run build`.

## English

This plan records the existing Plancia Comandi baseline and future work. Application version: **0.3.0**. Milestone **C1** was merged into `main` at `4aabc9bc81a60b0c574221ce37578936341ae065`; remote tags `milestone/C1` and `v0.2.0` and the source release exist. **C2** is recorded on branch `milestone/2-security-paste-hardening`. C2's merge, tags and release wait for the next phase. Proposals do not authorize any other code changes.

**Contents**

- [1. Baseline and current work](#1-baseline-and-current-work)
- [2. Current milestone and proposals](#2-current-milestone-and-proposals)
- [3. Milestone conventions](#3-milestone-conventions)
- [4. Closure checklist](#4-closure-checklist)
- [5. Versions, CI and distribution](#5-versions-ci-and-distribution)

### 1. Baseline and current work

The repository already contains an Electron app with PTY terminals, single and tiled views, heuristic status detection, notifications, themes and two languages. No completed milestones are assigned retroactively to the imported history.

| Field | Documentation work dated 10 November 2026 |
| --- | --- |
| Goal | Provide complete manuals, security information and maintenance instructions following `STARTUP_PREFERENCES_HOME.md`. |
| Type | Documentation-only patch outside milestone numbering. |
| Baseline | `main`, commit `585b5842301993ba009aa3d969708273de1e187f`, verified on the remote before starting. |
| Branch | `patch/0.1.0-documentation`. |
| Version / increment | `0.1.0`, unchanged: no application changes. |
| Checkpoint / release | No milestone or version tag; documentation alone does not require a release. |
| Work | Bilingual README; IT/EN manuals; bilingual security model, map and plan; bilingual desktop quick start; operating instructions in `AGENTS.md`. |
| Acceptance | Documents exist with an introduction, contents and numbered chapters for each language; equivalent manuals; commands, settings and limits checked against source; valid local links; no changes to user files. |
| Required checks | Local document, link, structure, version and source-consistency checks; existing suite and build if the environment supports them. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `QUICK-START_Desktop.md`. |
| Status | Documentation completed and checked; ready for local-commit review. Approval and publication pending. |

Pre-existing changes to `package.json` and `package-lock.json` and the local `STARTUP_PREFERENCES_HOME.md` belong to the user and are excluded from this patch. The preferences file is a local reference; applicable rules are recorded in `AGENTS.md` so that the repository remains understandable without it.

Summary: eight documents created or updated, manuals with twelve equivalent chapters, installation and removal instructions, full configuration, actual security limitations and the HOME review procedure. The existing Apache-2.0 `LICENSE` was checked and retained.

Local checks on 10 November 2026: automated document, link/anchor, chapter, JSON example, npm script, eleven detection default/range and manual-structure checks passed; manual reading compared with source, UI labels and configuration; `git diff --check` passed; `npm test` **30/30**; `npm run build` passed using Node.js 24. The build warns about a renderer bundle above 500 kB, with no errors. Tests and build use already installed dependencies, including Vitest 3.2.7, corresponding to user changes excluded from the patch; no fresh installation from the `main` lockfile was performed.

Electron smoke, a real AI CLI, packaging, Windows/Linux tests, a complete dependency audit and CI were not run: this is documentation-only work and these checks are unnecessary for its scope. Application and security validation under proposals P1–P3 remains outstanding. Ignored build/cache output is retained; no automatic cleanup, publication, merge, tag or release was performed.

C1, started as M1, uses `main` commit `05062668b528d737d5c702673657bfd2b3dbaf8e` as its baseline.


#### 1.1 C1 package integration — 11 November 2026

- Goal: add macOS ARM64 DMG/ZIP and Windows x64 installer/portable packages to the existing `v0.2.0` release.
- Branch: `patch/0.2.0-release-packages`. Application version unchanged; no new tag or checkpoint. Packages use application code exactly at `4aabc9bc81a60b0c574221ce37578936341ae065`.
- Implementation: manual-only Windows workflow, one job, Node.js 24 and Actions pinned to hashes; lockfile install, `node-pty` prebuild included in its npm package, distinct installer/portable names, ASAR bundle inspection, unpacked/portable/installed smoke tests, SHA-256 and seven-day artifact retention. No push/PR trigger or automatic publishing.
- CI rationale: this machine is macOS ARM64 without a Windows environment; a Windows PTY launch cannot be verified equivalently locally.
- Local checks: `npm test` 70/70 using the tag’s Vitest 3.2.4; Node.js 24 build passed with the renderer warning above 500 kB. macOS ZIP and DMG generated; DMG integrity passed; both apps extracted outside the checkout passed bundle inspection and smoke tests for bridge, isolated preferences, IT/EN, light/dark, native PTY, four layouts and session closing.
- Audit: zero known production-dependency vulnerabilities; the tag’s development toolchain reports seven moderate and two critical findings, including Vitest/tinypool. This patch does not change tag dependencies.
- Documentation: README, IT/EN manuals, security model, map, plan and operating rules updated.
- Limitations: Windows still requires a runner execution after commit review; macOS Intel, Linux, a real AI CLI, signing, notarization and full shortcut/clipboard checks are not covered. Packages have no verified distribution signature. Local temporary files are retained.
- Status: tooling approved at `90cfe3af09526a792d495f0d37f5fa48bc6d3ea2`, merged into `main` as `830af0952c384ac27f0af62fac66cffe98da9dc7` (PR #3). macOS packages and SHA-256 published and successfully downloaded again. The first Windows run, `43086813880`, passes installation and build but fails because PowerShell splits `-c.nsis.runAfterFinish=false` and electron-builder opens that remainder as a configuration file. PR #5 is merged as `45f6575c4f14015c6cc9cb7bc45de3604a97a87e` and replaces those arguments with a JSON file and `--config` plus only the path. Run `43096382710` on that commit is `startup_failure` with no jobs, so that command was not executed. The Windows package is not yet verified. C2 does not duplicate the JSON: the step calls `scripts/package-windows.mjs`. PR #4 stays open. Windows publication and removal of finished branches follow verification.

### 2. Current milestone and proposals

C1, formerly M1, is merged and published as source. C2, formerly M2, is approved for closure on this branch and stays separate from the C1 packaging patch. The merge, tags `milestone/C2` and `v0.3.0`, and the release have not been performed. The proposals below do not become executable on their own.

| Field | C1 — Clipboard, drag-and-drop and views |
| --- | --- |
| Number and title | C1 — Clipboard, drag-and-drop and views |
| Goal | Make copy, paste and drag-and-drop usable in the terminals, and add Stacked and Grid views beside One and Side by side. |
| Branch | `milestone/1-clipboard-dnd-layouts`, created from `main` at commit `05062668b528d737d5c702673657bfd2b3dbaf8e`. |
| Planned checkpoint tag | `milestone/C1` and `v0.2.0`, already published at `4aabc9bc81a60b0c574221ce37578936341ae065`. |
| Version increment | `+0.1.0`, from 0.1.0 to **0.2.0**. The version does not change with the move from M1 to C1. |
| Tasks | **Edit** menu with the app's labels; copy and paste, including xterm.js bracketed paste; Ctrl+C copies only when text is selected on Windows and Linux; context menu; file and text drag-and-drop with shell-quoted paths; clipboard images saved in a dedicated folder under the user-data directory; blocked navigations and new windows; view icons, disabled states and pane selection; validated `config/app.config.json`. |
| Acceptance | Shortcuts, menus and views described in the manuals; quoting checked for POSIX shells, PowerShell and cmd; Side by side and Stacked disabled with one session, and Grid below three; with three sessions the fourth pane stays empty; closing sessions until the view is impossible returns to One and saves that choice; temporary files use generated names, stay under the data directory and never use a renderer-chosen path. |
| Tests | `npm test` **70/70** and `npm run build` passed on the approved commit `5c61783817db2a33deba8393abd694a3a3270028`. Not run, because they do not replace an application smoke test: manual checks on Linux, macOS and Windows 11, Electron smoke, packaging, checksums and a real CLI. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `STARTUP_PREFERENCES_HOME.md` (complete copy; not repository documentation). |
| Status | `C1`. Glauco's first approval on 11 November 2026 at 12:33 (Europe/Rome), on PR #1 at head `5c61783817db2a33deba8393abd694a3a3270028`. Glauco's words: “M1 funziona correttamente”. Second approval recorded in the PR and release notes on 11 November 2026 at 13:26 (Europe/Rome); merge and tags completed. Packages are tracked in the patch below. |

**Summary.** Copy, paste and drag-and-drop in the terminals; Edit menu and context menu; clipboard images saved in a dedicated folder; One, Side by side, Stacked and Grid views.

**Checks.** `npm test` 70/70; `npm run build` passed, with the renderer bundle warning above 500 kB. These checks are not an automatic macOS or Windows verification.

**Residual limitations.** macOS and Windows were not verified automatically; installers are unsigned. Items then deferred to M2 and later recorded in C2: CSP; sender checks on IPC channels that predate C1; a cap on the paste FIFO queues; a test of the alternating sequence and of the orphan gesture; a residual-risk line in `SECURITY_MODEL.md`.

**Version and tags.** Version **0.2.0**. Tags `v0.2.0` and `milestone/C1` are published at merge commit `4aabc9bc81a60b0c574221ce37578936341ae065`, verified remotely. Verified packages are added to the existing release.

| Field | C2 — Renderer boundaries and paste |
| --- | --- |
| Number and title | C2 — Renderer boundaries and paste |
| Goal | Stop the renderer from loading remote content or unexpected scripts, accept IPC that predates M1 only from the app window and only with a valid payload, cap the length of the paste FIFO queues, and allow Windows installation and packaging without a compiler and without administrator privileges. |
| Branch | `milestone/2-security-paste-hardening`, created from commit `0b8fa43b91fe2236f2d31df2959948247348bfdf`. The pull request is based on `main` after the C1 merge `4aabc9bc` and, in this closure, also after the merge of `45f6575c`. |
| Planned checkpoint tag | `milestone/C2`. Not created. The planned version tag is `v0.3.0`. Neither has been created: merge, tags and release wait for the next phase. |
| Version increment | `+0.1.0`, from 0.2.0 to **0.3.0**. |
| Tasks | Restrictive CSP in production and on the Vite server; no `unsafe-eval`; `unsafe-inline` for scripts only in development, for the React Fast Refresh preamble; `unsafe-inline` for styles in production as well because xterm.js's DOM renderer writes the theme and contrast into the page; sender and payload checks on every IPC channel that predates M1, both `handle` and `on`; a cap of 64 on the paste FIFO queues; isolated negative tests; on Windows, use the N-API prebuilds in `node-pty` 1.1.0, without `node-gyp`, with `npmRebuild: false` and a postinstall that rebuilds only when the Windows prebuild is missing (`scripts/install-native.mjs`); the app icon in `build/`; Windows packaging through `scripts/package-windows.mjs`, with no `-c.*` arguments. |
| Acceptance | The production policy contains no `unsafe-eval`, no remote hosts and no `unsafe-inline` for scripts. Development talks only to the `127.0.0.1` loopback. A sender other than the app window receives no data and runs no action. An invalid payload does not reach the manager, the dialog or the shell. Paste queues do not grow past 64 halves. Terminals and themes keep working: the style exception is documented. On Windows, without a compiler, `npm ci`, `npm test`, `npm run build`, `npm run dev` and `npm run dist:win` do not invoke `node-gyp`. Linux, which has no prebuild, still compiles. |
| Tests | `npm ci`, then `npm test` **126/126** and `npm run build` passed on the branch after merging `main` `45f6575c`, with the renderer bundle warning above 500 kB. Node.js for that check: 22.23.4. Not run, because they do not replace an application smoke test: DevTools with no CSP violations, terminals, themes and paste on Linux, macOS and Windows; Electron smoke; a Linux, macOS or Windows package; checksums. The manual checklist is in the pull request. It has not been tested in person on Linux. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. There is no `CHANGELOG`. |
| Status | `C2`. Glauco approved closing M2, including the commit, the push and the pull-request update. Merge, tags, release, starting the workflow, closing PR #4 and deleting branches wait for the next phase. |

**Summary.** Renderer CSP; sender and payload checks on IPC that predates M1; a cap of 64 on the paste queues; Windows `node-pty` prebuilds without `node-gyp`; PNG, ICO and ICNS icons; the Linux procedure; Windows packaging from the Node script. Generated files: `build/icon.png` 1914419 bytes, `build/icon.ico` 154378 bytes, `build/icon.icns` 1700498 bytes.

**Checks.** `npm ci` passed on Linux and rebuilt `node-pty` for Electron. `npm test` 126/126. `npm run build` passed, with the renderer bundle warning above 500 kB. This is not a window smoke test or a package.

**Residual limitations.** It has not been tested in person on Linux. The Windows package is not yet verified. The icons have not been tried inside a DMG, a ZIP or an installer. The merge, tags `milestone/C2` and `v0.3.0`, and release `v0.3.0` have not been performed.

**Version and tags.** Version **0.3.0**. Planned checkpoint `milestone/C2`. Planned version tag `v0.3.0`. Neither has been created.

| Item | Goal for discussion | Proposed acceptance |
| --- | --- | --- |
| P1 — Security boundaries | Still to be decided, for what C2 does not cover: regex timeouts, atomic settings writes and error redaction. CSP, sender checks on IPC that predates M1 and the paste-queue cap are C2. | Isolated negative tests and an updated security model; preserve shell operation. |
| P2 — Initial preferences | Align automatic language selection and move limits that are still in modules into the central file. C1 puts only the new clipboard, drop and input-size parameters in that file. | Italian on Italian systems, English otherwise, persistent override and validated configuration with tests. |
| P3 — Verified distribution | Validate macOS, Windows and Linux, notifications, shortcuts, shells, PTYs and real packages. | Smoke outside the checkout, declared platforms and architectures, verified artifacts and SHA-256; updated documentation. |

Version, branch, checkpoint, detailed tasks and tests will be decided when a proposal becomes an `M`. These entries do not claim that controls or platforms have already been verified. Open point, package size only: do not exclude `node-pty` prebuilds for other platforms or the `.pdb` files. That is a future optimization, not part of C2. A GitHub Pages landing page was not requested and is not included.

### 3. Milestone conventions

- `P<n>`: optional proposal, not executable without an explicit designer decision.
- `M<n>`: milestone authorized for the current plan, executed in numeric order on `milestone/<n>-<slug>` from `main`, after verifying the preceding remote checkpoint.
- `C<n>`: work approved by the designer, retaining its `M` number; publication and operational closure may still be pending.

`P` and `M` numbering is independent. Each future `M` must specify a functional goal, branch, `milestone/C<n>` checkpoint, version increment, tasks, acceptance criteria, tests, documentation and status. Do not start the next milestone until the preceding `main` and checkpoint are verified on the remote.

### 4. Closure checklist

Follow the complete procedure in [AGENTS.md](AGENTS.md). Copy and complete this checklist for every future milestone:

- [ ] Private GitHub identity checked; worktree and user changes preserved; previous checkpoint verified.
- [ ] Dedicated branch created; implementation, configuration and proportionate tests completed.
- [ ] Required automatic tests and smoke/manual checks run; omissions and limitations recorded.
- [ ] Version synchronized when required; no secrets or accidental tracked temporary files.
- [ ] README, IT/EN manuals and plan updated; security, map and operating rules updated when affected.
- [ ] Local commits created only on the dedicated branch; branch frozen with the entry still marked `M`.
- [ ] Hash, diff against `main`, tests, results and limitations presented; first personal review and explicit approval obtained.
- [ ] Only after first approval: `M` renamed to `C`, with summary, checks, limitations, version and checkpoint recorded in a new local commit.
- [ ] New hash and diff presented; second personal review and explicit approval obtained before any push, merge or tag.
- [ ] Branch/PR published only when needed; necessary CI verified before merging. Any fix receives new approval.
- [ ] Merge to `main`, push and remote commit verified; CI on `main` verified when necessary.
- [ ] Release artifacts and smoke tests, when required, and SHA-256 verified on the final commit before tagging.
- [ ] Annotated `milestone/C<n>` checkpoint and version tag if changed created and verified on the remote.
- [ ] Required release published and verified; obsolete branch removed only after verification and approval.
- [ ] Temporary paths presented for separate confirmation before cleanup; final worktree checked.

For a patch without an `M` entry, do not invent a milestone: freezing, final-commit review and approval apply, but the `M` → `C` transition, the second review caused by that transition and the milestone checkpoint do not. Any change after review requires new approval.

### 5. Versions, CI and distribution

Use `+0.0.1` for patches, `+0.1.0` for minor features and `+1.0.0` for major changes. Documentation-only work may keep the version unchanged and does not require a release. For completed application milestones or patches, publish a release under HOME preferences; mark it as a prerelease if the app is not usable. Do not configure signing, notarization or automatic updates without explicit credentials and a process.

The only workflow, `package-windows.yml`, is manually triggered for a Windows build attempt that cannot be performed equivalently locally. It does not run on push or PR. The Windows package is not yet verified. The macOS ARM64 checks for release `v0.2.0` run locally; there is no macOS workflow. Additional workflows require a separate justification. `npm run build` alone does not establish that a package has been verified.
