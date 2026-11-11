# Piano di sviluppo / Development plan

## Italiano

Questo piano registra la base esistente di Plancia Comandi e le attività future. Versione applicativa: **0.3.0**. La milestone **C1** ha ricevuto la prima approvazione di Glauco l'11 novembre 2026 alle 12:33 (Europe/Rome). Merge, tag e release di C1 restano in attesa della seconda approvazione. **M2** è la milestone in corso, sul branch creato dal commit di C1, perché C1 non è ancora su `main`. Le proposte non autorizzano altri interventi sul codice.

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

### 2. Milestone corrente e proposte

M2 è la milestone in corso. C1, già M1, ha la prima approvazione; merge, tag e release di C1 attendono la seconda approvazione di Glauco. Le proposte sotto non diventano eseguibili da sole.

| Campo | C1 — Clipboard, trascinamento e viste |
| --- | --- |
| Numero e titolo | C1 — Clipboard, trascinamento e viste |
| Obiettivo | Rendere usabili copia, incolla e trascinamento nei terminali e aggiungere le viste Incolonnate e Griglia accanto a Una e Affiancate. |
| Branch | `milestone/1-clipboard-dnd-layouts`, creato da `main` al commit `05062668b528d737d5c702673657bfd2b3dbaf8e`. |
| Tag di checkpoint previsto | `milestone/C1`. Non creato. Il tag di versione previsto è `v0.2.0`: va creato solo dopo la seconda approvazione di Glauco. |
| Tipo incremento versione | `+0.1.0`, da 0.1.0 a **0.2.0**. La versione non cambia con il passaggio da M1 a C1. |
| Attività | Menu **Modifica** con etichette dell'app; copia e incolla, incluso l'incolla fra parentesi di xterm.js; Ctrl+C che copia solo con una selezione su Windows e Linux; menu contestuale; trascinamento di file e testo con percorsi quotati per la shell; salvataggio delle immagini degli appunti in una cartella dedicata sotto i dati utente; blocco di navigazioni e nuove finestre; icone delle viste, disabilitazione e scelta dei riquadri; `config/app.config.json` validato. |
| Criteri di accettazione | Scorciatoie, menu e viste descritti nei manuali; quotatura verificata per shell POSIX, PowerShell e cmd; Affiancate e Incolonnate disabilitate con una sessione e Griglia sotto le tre; con tre sessioni il quarto riquadro resta vuoto; se chiudendo sessioni la vista non è più possibile si torna a Una e la scelta è salvata; i file temporanei hanno nome generato, restano sotto la cartella dati e non usano un percorso scelto dal renderer. |
| Test | `npm test` **70/70** e `npm run build` riuscito sul commit approvato `5c61783817db2a33deba8393abd694a3a3270028`. Non eseguiti, perché non sostituiscono uno smoke dell'app: prova manuale su Linux, macOS e Windows 11, smoke Electron, packaging, checksum e una CLI reale. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `STARTUP_PREFERENCES_HOME.md` (copia integrale; non è documentazione del repository). |
| Stato | `C1`. Prima approvazione di Glauco l'11 novembre 2026 alle 12:33 (Europe/Rome), sulla PR #1 con head `5c61783817db2a33deba8393abd694a3a3270028`. Parole di Glauco: «M1 funziona correttamente». In attesa della seconda approvazione prima di merge, tag e release. |

**Riepilogo.** Copia, incolla e trascinamento nei terminali; menu Modifica e menu contestuale; immagini degli appunti salvate in una cartella dedicata; viste Una, Affiancate, Incolonnate e Griglia.

**Verifiche.** `npm test` 70/70; `npm run build` riuscito, con l'avviso del bundle renderer oltre 500 kB. Queste verifiche non sono una prova automatica su macOS o Windows.

**Limiti residui.** macOS e Windows non verificati in modo automatico; installer non firmati. Punti rinviati a M2: CSP; verifica del mittente negli IPC precedenti a C1; tetto alle code FIFO dell'incolla; test sulla sequenza alternata e sul gesto orfano; riga sul rischio residuo in `SECURITY_MODEL.md`.

**Versione e tag.** Versione **0.2.0**. Il tag `v0.2.0` è previsto e va creato solo dopo la seconda approvazione di Glauco. Il checkpoint `milestone/C1` non è stato creato.

| Campo | M2 — Confini del renderer e incolla |
| --- | --- |
| Numero e titolo | M2 — Confini del renderer e incolla |
| Obiettivo | Impedire al renderer di caricare contenuti remoti o script non previsti, accettare gli IPC precedenti a M1 solo dalla finestra dell'app e con payload validi, e limitare la lunghezza delle code FIFO dell'incolla. |
| Branch | `milestone/2-security-paste-hardening`, creato dal commit `0b8fa43b91fe2236f2d31df2959948247348bfdf` di `milestone/1-clipboard-dnd-layouts`. Non parte da `main`: C1 non è ancora unita. |
| Tag di checkpoint previsto | `milestone/C2`. Non creato. Il tag di versione previsto è `v0.3.0`: va creato solo dopo le approvazioni. |
| Tipo incremento versione | `+0.1.0`, da 0.2.0 a **0.3.0**. |
| Attività | CSP restrittiva in produzione e sul server Vite; niente `unsafe-eval`; `unsafe-inline` per gli script solo in sviluppo, per il preambolo di React Fast Refresh; `unsafe-inline` per gli stili anche in produzione perché il renderer DOM di xterm.js scrive tema e contrasto nella pagina; verifica del mittente e del payload su tutti i canali IPC precedenti a M1, sia `handle` sia `on`; tetto 64 alle code FIFO dell'incolla; test negativi isolati. |
| Criteri di accettazione | La policy di produzione non contiene `unsafe-eval`, host remoti né `unsafe-inline` negli script. Lo sviluppo parla solo con il loopback `127.0.0.1`. Un mittente diverso dalla finestra dell'app non riceve dati e non esegue l'azione. Un payload non valido non arriva al manager, al dialogo o alla shell. Le code di incolla non superano 64 metà. Terminali e temi restano funzionanti: l'eccezione di stile è documentata. |
| Test | `npm test` **117/117** e `npm run build` riuscito su questo branch, con l'avviso del bundle renderer oltre 500 kB. Non eseguiti, perché non sostituiscono uno smoke dell'app: DevTools senza violazioni CSP, terminali, temi e incolla su Linux, macOS e Windows; smoke Electron; packaging; checksum. La checklist manuale è nella pull request. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. |
| Stato | `M`. In attesa del controllo di Glauco sulla pull request. Merge, tag e release non sono autorizzati. La pull request ha base `milestone/1-clipboard-dnd-layouts` e va riportata su `main` dopo il merge di M1. |

| Voce | Obiettivo da discutere | Accettazione proposta |
| --- | --- | --- |
| P1 — Confini di sicurezza | Resta da decidere ciò che M2 non copre: timeout delle regex, scrittura atomica delle impostazioni e redazione degli errori. CSP, mittente degli IPC precedenti a M1 e tetto delle code di incolla sono M2. | Test negativi isolati e modello di sicurezza aggiornato; preservare il funzionamento delle shell. |
| P2 — Preferenze iniziali | Allineare lingua automatica e portare nel file centrale i limiti ancora nei moduli. C1 mette nel file centrale solo i parametri nuovi di appunti, trascinamento e dimensione dell'input. | Italiano per sistemi italiani, inglese negli altri casi, override persistente e configurazione validata con test. |
| P3 — Distribuzione verificata | Validare macOS, Windows e Linux, notifiche, scorciatoie, shell, PTY e pacchetti reali. | Smoke fuori dal checkout, piattaforme e architetture dichiarate, artifact e SHA-256 verificati; documentazione aggiornata. |

Versione, branch, checkpoint, attività e test dettagliati saranno decisi quando una proposta sarà riclassificata come `M`. Queste righe non dichiarano controlli o piattaforme già verificati. La landing page GitHub Pages non è stata richiesta e non è inclusa.

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

Al momento non esistono workflow GitHub Actions. Per questa patch bastano verifiche locali; non crearne o avviarne. Valutare la CI futura solo se serve una verifica non equivalente in locale, contenendo job e piattaforme. Non dichiarare un pacchetto verificato sulla sola base di `npm run build`.

## English

This plan records the existing Plancia Comandi baseline and future work. Application version: **0.3.0**. Milestone **C1** received Glauco's first approval on 11 November 2026 at 12:33 (Europe/Rome). C1's merge, tags and release wait for the second approval. **M2** is the milestone in progress, on the branch created from C1's commit, because C1 is not on `main` yet. Proposals do not authorize any other code changes.

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

### 2. Current milestone and proposals

M2 is the milestone in progress. C1, formerly M1, has its first approval; C1's merge, tags and release wait for Glauco's second approval. The proposals below do not become executable on their own.

| Field | C1 — Clipboard, drag-and-drop and views |
| --- | --- |
| Number and title | C1 — Clipboard, drag-and-drop and views |
| Goal | Make copy, paste and drag-and-drop usable in the terminals, and add Stacked and Grid views beside One and Side by side. |
| Branch | `milestone/1-clipboard-dnd-layouts`, created from `main` at commit `05062668b528d737d5c702673657bfd2b3dbaf8e`. |
| Planned checkpoint tag | `milestone/C1`. Not created. The planned version tag is `v0.2.0`: create it only after Glauco's second approval. |
| Version increment | `+0.1.0`, from 0.1.0 to **0.2.0**. The version does not change with the move from M1 to C1. |
| Tasks | **Edit** menu with the app's labels; copy and paste, including xterm.js bracketed paste; Ctrl+C copies only when text is selected on Windows and Linux; context menu; file and text drag-and-drop with shell-quoted paths; clipboard images saved in a dedicated folder under the user-data directory; blocked navigations and new windows; view icons, disabled states and pane selection; validated `config/app.config.json`. |
| Acceptance | Shortcuts, menus and views described in the manuals; quoting checked for POSIX shells, PowerShell and cmd; Side by side and Stacked disabled with one session, and Grid below three; with three sessions the fourth pane stays empty; closing sessions until the view is impossible returns to One and saves that choice; temporary files use generated names, stay under the data directory and never use a renderer-chosen path. |
| Tests | `npm test` **70/70** and `npm run build` passed on the approved commit `5c61783817db2a33deba8393abd694a3a3270028`. Not run, because they do not replace an application smoke test: manual checks on Linux, macOS and Windows 11, Electron smoke, packaging, checksums and a real CLI. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`, `STARTUP_PREFERENCES_HOME.md` (complete copy; not repository documentation). |
| Status | `C1`. Glauco's first approval on 11 November 2026 at 12:33 (Europe/Rome), on PR #1 at head `5c61783817db2a33deba8393abd694a3a3270028`. Glauco's words: “M1 funziona correttamente”. Waiting for the second approval before any merge, tag or release. |

**Summary.** Copy, paste and drag-and-drop in the terminals; Edit menu and context menu; clipboard images saved in a dedicated folder; One, Side by side, Stacked and Grid views.

**Checks.** `npm test` 70/70; `npm run build` passed, with the renderer bundle warning above 500 kB. These checks are not an automatic macOS or Windows verification.

**Residual limitations.** macOS and Windows were not verified automatically; installers are unsigned. Deferred to M2: CSP; sender checks on IPC channels that predate C1; a cap on the paste FIFO queues; a test of the alternating sequence and of the orphan gesture; a residual-risk line in `SECURITY_MODEL.md`.

**Version and tags.** Version **0.2.0**. Tag `v0.2.0` is planned and is to be created only after Glauco's second approval. The `milestone/C1` checkpoint has not been created.

| Field | M2 — Renderer boundaries and paste |
| --- | --- |
| Number and title | M2 — Renderer boundaries and paste |
| Goal | Stop the renderer from loading remote content or unexpected scripts, accept IPC that predates M1 only from the app window and only with a valid payload, and cap the length of the paste FIFO queues. |
| Branch | `milestone/2-security-paste-hardening`, created from commit `0b8fa43b91fe2236f2d31df2959948247348bfdf` of `milestone/1-clipboard-dnd-layouts`. It does not start from `main`: C1 is not merged yet. |
| Planned checkpoint tag | `milestone/C2`. Not created. The planned version tag is `v0.3.0`: create it only after the approvals. |
| Version increment | `+0.1.0`, from 0.2.0 to **0.3.0**. |
| Tasks | Restrictive CSP in production and on the Vite server; no `unsafe-eval`; `unsafe-inline` for scripts only in development, for the React Fast Refresh preamble; `unsafe-inline` for styles in production as well because xterm.js's DOM renderer writes the theme and contrast into the page; sender and payload checks on every IPC channel that predates M1, both `handle` and `on`; a cap of 64 on the paste FIFO queues; isolated negative tests. |
| Acceptance | The production policy contains no `unsafe-eval`, no remote hosts and no `unsafe-inline` for scripts. Development talks only to the `127.0.0.1` loopback. A sender other than the app window receives no data and runs no action. An invalid payload does not reach the manager, the dialog or the shell. Paste queues do not grow past 64 halves. Terminals and themes keep working: the style exception is documented. |
| Tests | `npm test` **117/117** and `npm run build` passed on this branch, with the renderer bundle warning above 500 kB. Not run, because they do not replace an application smoke test: DevTools with no CSP violations, terminals, themes and paste on Linux, macOS and Windows; Electron smoke; packaging; checksums. The manual checklist is in the pull request. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. |
| Status | `M`. Waiting for Glauco's review on the pull request. Merge, tags and release are not authorized. The pull request is based on `milestone/1-clipboard-dnd-layouts` and must be retargeted to `main` after M1 merges. |

| Item | Goal for discussion | Proposed acceptance |
| --- | --- | --- |
| P1 — Security boundaries | Still to be decided, for what M2 does not cover: regex timeouts, atomic settings writes and error redaction. CSP, sender checks on IPC that predates M1 and the paste-queue cap are M2. | Isolated negative tests and an updated security model; preserve shell operation. |
| P2 — Initial preferences | Align automatic language selection and move limits that are still in modules into the central file. C1 puts only the new clipboard, drop and input-size parameters in that file. | Italian on Italian systems, English otherwise, persistent override and validated configuration with tests. |
| P3 — Verified distribution | Validate macOS, Windows and Linux, notifications, shortcuts, shells, PTYs and real packages. | Smoke outside the checkout, declared platforms and architectures, verified artifacts and SHA-256; updated documentation. |

Version, branch, checkpoint, detailed tasks and tests will be decided when a proposal becomes an `M`. These entries do not claim that controls or platforms have already been verified. A GitHub Pages landing page was not requested and is not included.

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

There are currently no GitHub Actions workflows. Local checks suffice for this patch; do not create or start workflows. Assess future CI only when local checks cannot provide equivalent verification, keeping jobs and platforms limited. `npm run build` alone does not establish that a package has been verified.
