# Piano di sviluppo / Development plan

## Italiano

Questo piano registra la base esistente di Plancia Comandi e le attività future. Versione applicativa: **0.3.1**, pubblicata il 13 novembre 2026. La milestone **C1** è stata unita a `main` sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`; i tag `milestone/C1` e `v0.2.0` e la release con i sorgenti sono presenti sul remoto. **C2** resta la voce decisa da Glauco, senza una nuova promozione. La release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) è pubblicata il 12 novembre 2026 sul commit `94ff1e44106f08fdcf961cab74171668112ad780`; i tag `v0.3.0` e `milestone/C2` puntano a quel commit. **C3** (icona nella UI e screenshot), già M3, ha ricevuto la prima approvazione di Glauco il 13 novembre 2026 sul commit `cc037278633d6b43e279eb66539c05d50d4364e8`; la seconda approvazione del commit `1155fc248acefe25ac7cc2068ca750d93150a46e` è stata ricevuta nella stessa sessione. Main, tag `milestone/C3` e `v0.3.1`, release e rimozione del branch M3 sono verificati; **C4** (landing page GitHub Pages), già M4, è pubblicata sul commit approvato `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, con sito HTTPS, checkpoint `milestone/C4`, release del sito e rimozione del branch verificati; versione desktop invariata a 0.3.1. La baseline di Vesta del 13 novembre 2026, analizzata su `e967d92` e ricontrollata su `d200abe`, è pianificata nella sezione 2.4 e non è avviata. M13 e M14 sono anticipate subito dopo C5, restano milestone separate e non sono avviate. M18 segue l'ordine numerico. Le proposte non autorizzano altri interventi sul codice.

**Sommario**

- [1. Base e intervento corrente](#1-base-e-intervento-corrente)
- [2. Milestone e proposte](#2-milestone-e-proposte)
- [2.1 Milestone di sicurezza pianificate](#21-milestone-di-sicurezza-pianificate)
- [2.2 Correzioni desktop pianificate](#22-correzioni-desktop-pianificate)
- [2.3 Proposte e parti residue](#23-proposte-e-parti-residue)
- [2.4 Baseline Vesta del 13 novembre 2026](#24-baseline-vesta-del-13-novembre-2026)
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
- Stato: strumenti approvati nel commit `90cfe3af09526a792d495f0d37f5fa48bc6d3ea2`, uniti a `main` con `830af0952c384ac27f0af62fac66cffe98da9dc7` (PR #3). Pacchetti macOS e SHA-256 pubblicati e riscaricati con esito positivo. Il primo run Windows `43086813880` supera installazione e build ma fallisce perché PowerShell spezza `-c.nsis.runAfterFinish=false` e electron-builder apre quel resto come file di configurazione. La PR #5 è unita in `45f6575c4f14015c6cc9cb7bc45de3604a97a87e` e sostituisce quegli argomenti con un JSON e `--config` più il solo percorso. La run `43096382710` su quel commit è `startup_failure` senza job, quindi quel comando non è stato eseguito. Il pacchetto Windows di 0.2.0 non è stato pubblicato. Per 0.3.0 la run `43226304320`, con tooling `49ca65d6f5ae06ea9d6d22de4dd7af2cf38b4dba`, è riuscita e gli artifact sono nella release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). C2 non duplica il JSON: lo step chiama `scripts/package-windows.mjs`. La PR #4 è stata chiusa senza merge il 12 novembre 2026. I branch di lavoro sono stati cancellati.

### 2. Milestone e proposte

C1, già M1, è integrata e pubblicata con i sorgenti. C2, già M2, è approvata per la chiusura e resta distinta dalla patch di packaging di C1. La release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) e i tag `milestone/C2` e `v0.3.0` sono pubblicati. C3 è chiusa e pubblicata; C4 è pubblicata e usa l'icona e gli screenshot aggiornati da C3. Le proposte sotto non diventano eseguibili da sole.

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
| Stato | `C1`. Prima approvazione di Glauco l'11 novembre 2026, sulla PR #1 con head `5c61783817db2a33deba8393abd694a3a3270028`. Parole di Glauco: «M1 funziona correttamente». Seconda approvazione registrata nella PR e nelle note della release l’11 novembre 2026; merge e tag completati. Restano i pacchetti della patch sotto. |

**Riepilogo.** Copia, incolla e trascinamento nei terminali; menu Modifica e menu contestuale; immagini degli appunti salvate in una cartella dedicata; viste Una, Affiancate, Incolonnate e Griglia.

**Verifiche.** `npm test` 70/70; `npm run build` riuscito, con l'avviso del bundle renderer oltre 500 kB. Queste verifiche non sono una prova automatica su macOS o Windows.

**Limiti residui.** macOS e Windows non verificati in modo automatico; installer non firmati. Punti allora rinviati a M2 e poi registrati in C2: CSP; verifica del mittente negli IPC precedenti a C1; tetto alle code FIFO dell'incolla; test sulla sequenza alternata e sul gesto orfano; riga sul rischio residuo in `SECURITY_MODEL.md`.

**Versione e tag.** Versione **0.2.0**. I tag `v0.2.0` e `milestone/C1` sono pubblicati sul commit di merge `4aabc9bc81a60b0c574221ce37578936341ae065`, verificati sul remoto. La release esistente viene integrata con i pacchetti verificati.

| Campo | C2 — Confini del renderer e incolla |
| --- | --- |
| Numero e titolo | C2 — Confini del renderer e incolla |
| Obiettivo | Impedire al renderer di caricare contenuti remoti o script non previsti, accettare gli IPC precedenti a M1 solo dalla finestra dell'app e con payload validi, limitare la lunghezza delle code FIFO dell'incolla, e permettere su Windows installazione e pacchetto senza compilatore e senza privilegi di amministratore. |
| Branch | `milestone/2-security-paste-hardening`, creato dal commit `0b8fa43b91fe2236f2d31df2959948247348bfdf`. La pull request ha base `main` dopo il merge di C1 `4aabc9bc` e, in questa chiusura, anche dopo il merge di `45f6575c`. |
| Tag di checkpoint previsto | `milestone/C2` e `v0.3.0`, pubblicati sul commit `94ff1e44106f08fdcf961cab74171668112ad780`. |
| Tipo incremento versione | `+0.1.0`, da 0.2.0 a **0.3.0**. |
| Attività | CSP restrittiva in produzione e sul server Vite; niente `unsafe-eval`; `unsafe-inline` per gli script solo in sviluppo, per il preambolo di React Fast Refresh; `unsafe-inline` per gli stili anche in produzione perché il renderer DOM di xterm.js scrive tema e contrasto nella pagina; verifica del mittente e del payload su tutti i canali IPC precedenti a M1, sia `handle` sia `on`; tetto 64 alle code FIFO dell'incolla; test negativi isolati; su Windows uso delle prebuild N-API di `node-pty` 1.1.0, senza `node-gyp`, con `npmRebuild: false` e postinstall che ricompila solo se la prebuild Windows manca (`scripts/install-native.mjs`); icona dell'app in `build/`; packaging Windows tramite `scripts/package-windows.mjs`, senza argomenti `-c.*`. |
| Criteri di accettazione | La policy di produzione non contiene `unsafe-eval`, host remoti né `unsafe-inline` negli script. Lo sviluppo parla solo con il loopback `127.0.0.1`. Un mittente diverso dalla finestra dell'app non riceve dati e non esegue l'azione. Un payload non valido non arriva al manager, al dialogo o alla shell. Le code di incolla non superano 64 metà. Terminali e temi restano funzionanti: l'eccezione di stile è documentata. Su Windows, senza compilatore, `npm ci`, `npm test`, `npm run build`, `npm run dev` e `npm run dist:win` non invocano `node-gyp`. Linux, che non ha una prebuild, continua a ricompilare. |
| Test | `npm ci`, poi `npm test` **126/126** e `npm run build` riuscito sul branch dopo il merge di `main` `45f6575c`, con l'avviso del bundle renderer oltre 500 kB. Node.js del controllo: 22.23.4. Non eseguiti, perché non sostituiscono uno smoke dell'app: DevTools senza violazioni CSP, terminali, temi e incolla su Linux, macOS e Windows; smoke Electron; pacchetto Linux, macOS o Windows; checksum. La checklist manuale è nella pull request. Su Linux non è stata testata di persona. |
| Documentazione | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. Non esiste un `CHANGELOG`. |
| Stato | `C2`. Glauco ha approvato la chiusura di M2 il 12 novembre 2026, compresi release e pulizia dei branch. Poi: merge della PR #2, tag, release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0), PR #6 e #7 unite, PR #4 chiusa senza merge, branch di lavoro cancellati. La voce resta `C2`. |

**Riepilogo.** CSP del renderer; mittente e payload sugli IPC precedenti a M1; tetto 64 delle code di incolla; prebuild Windows di `node-pty` senza `node-gyp`; icona PNG, ICO e ICNS; procedura Linux; packaging Windows dallo script Node. File generati: `build/icon.png` 1914419 byte, `build/icon.ico` 154378 byte, `build/icon.icns` 1700498 byte.

**Verifiche.** `npm ci` riuscito su Linux e ha ricompilato `node-pty` per Electron. `npm test` 126/126. `npm run build` riuscito, con l'avviso del bundle renderer oltre 500 kB. Non è uno smoke della finestra né un pacchetto.

**Limiti residui.** Su Linux non è stata testata di persona. Il pacchetto Windows pubblicato è quello della run `43226304320`: il workflow ha controllato l'eseguibile scompattato, il portable e l'app installata. Non è registrata una prova personale su un PC Windows. Su macOS la run `43257940568`, tooling `95500826ba986a4ef4addceda8840188595ee2c7`, ha eseguito smoke e ispezione solo sull'app scompattata.

**Debito tecnico.** Note di Vulcano, registrate qui e non corrette nel codice.

- Su macOS smoke e ispezione girano solo sull'app scompattata, non sul DMG o sullo ZIP. Su Windows il workflow verifica anche il portable e l'app installata.
- `json5` non è tra le `devDependencies`.
- Lo smoke non imposta `HOME` nell'ambiente del processo.
- I test di packaging importano moduli interni di `electron-builder`.
- `mac.executableName` non è gestito in modo generale: oggi `MAC_APP_NAME` è allineato all'`executableName` di primo livello.
- Mancano i casi di test espliciti `\.git\config` e `\settings.json`.
- Il caricamento di `@electron/asar` dipende dall'hoisting di npm.
- Il test su Linux copre solo il ramo posix di `archiveEntryPath`.
- Su macOS `npm ci` esegue il postinstall: il rimando è nel [README](README.md#2-installazione-e-primo-utilizzo).

**Versione e tag.** Versione **0.3.0**. I tag `milestone/C2` e `v0.3.0` sono pubblicati sul commit `94ff1e44106f08fdcf961cab74171668112ad780`. La release è [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0).

| Campo | C3 — Icona nella UI e screenshot aggiornati |
| --- | --- |
| Numero e titolo | C3 — Icona nella UI e screenshot aggiornati |
| Obiettivo | Allineare l'icona visibile nell'app a quella introdotta nella release 0.3.0 e aggiornare le immagini del README che mostrano ancora la vecchia icona. |
| Branch previsto | `milestone/3-ui-icon-screenshots`, creato da `main` al commit `e9fb4fa273913db688f846751f05e1de8a5fc888`. Verificati sul remoto `main` e il checkpoint annotato `milestone/C2`, che risolve a `94ff1e44106f08fdcf961cab74171668112ad780`. |
| Tag di checkpoint previsto | `milestone/C3` e `v0.3.1`, annotati e pubblicati sul commit `1155fc248acefe25ac7cc2068ca750d93150a46e`, verificato anche su main remoto. |
| Tipo incremento versione | `+0.0.1`, da 0.3.0 a **0.3.1**, per la correzione visiva dell'app. Versione sincronizzata nei sorgenti e nei documenti; release [v0.3.1](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.1) pubblicata. |
| Attività | Sostituito il vecchio SVG della sidebar con `public/icon.png`, copia identica di `build/icon.png`, a 36×36 senza deformazioni, decorativo e non trascinabile. Sei nuove catture reali del renderer di produzione: scura, chiara e impostazioni, in IT e in EN. README collegato alle immagini della rispettiva lingua; provenienza, dimensioni e SHA-256 in `docs/screenshots/capture.json`. Corretto un test preesistente che assumeva separatori Unix, per eseguire la suite su Windows. |
| Criteri di accettazione | La UI mostra la stessa icona dei pacchetti 0.3.0, senza deformazioni o tagli e con leggibilità nei due temi. Tutti gli screenshot del README rappresentano la UI aggiornata; nessuno mostra il vecchio marchio o dati privati. Collegamenti e immagini funzionano in entrambe le sezioni linguistiche. |
| Test richiesti | `npm ci` riuscito con Node.js 24.18.1 e npm 12.2.1; prebuild Windows di node-pty. Runtime Electron 45.2.3 installato con il suo script, perché non presente dopo npm ci. `npm test` **136/136**; `npm run build` riuscito con avviso renderer oltre 500 kB. Electron Windows x64: icona caricata, proporzioni, testi alternativi, due temi, IT/EN, impostazioni e viewport 1440×900, 1280×820, 860×560 (12 combinazioni); nomi lunghi, focus del dialogo Nuova sessione e attributi dei tooltip. HOME, appData e userData isolati prima del main, ambiente filtrato e PTY con eseguibile dimostrativo generato; nessuna shell o credenziale reale. |
| Documentazione | README con immagini IT/EN e stato dei sorgenti distinto dalla release; manuali, quick start, mappa, modello di sicurezza e AGENTS allineati a 0.3.1; manifest delle catture. La cronologia di C1/C2 e le proposte P1–P3 restano preservate. |
| Stato | `C3`. Glauco ha provato il commit `cc037278633d6b43e279eb66539c05d50d4364e8` su Windows con un profilo separato dalla 0.3.0 in uso e il 13 novembre 2026 ha confermato «perfetto. Funziona.», autorizzando commit, merge, tag, push, release e rimozione del branch. Seconda approvazione ricevuta sul commit `1155fc248acefe25ac7cc2068ca750d93150a46e`; merge fast-forward e push su main verificati. Tag e release 0.3.1 pubblicati; branch M3 locale rimosso, senza branch M3 remoto da eliminare. Workflow Windows `43407182864` e macOS ARM64 `43407014450` riusciti sul commit approvato. Quattro pacchetti e due manifest SHA-256 scaricati dai workflow e controllati prima della pubblicazione; digest dei sei allegati GitHub verificati. Portable provato anche su Windows locale fuori dal checkout, con profilo e PTY dimostrativi; nessuna installazione locale. Non eseguiti: prove personali su macOS/Linux, CLI AI reale e aspetto dei tooltip nativi; lo smoke macOS copre l’app scompattata, non l’avvio dal DMG/ZIP. L'installazione segnala 9 vulnerabilità (7 moderate e 2 critiche) nelle dipendenze esistenti; nessun aggiornamento incluso. Pulizia dei temporanei locali (`out/m3/` e directory di prova portable) subordinata a conferma separata. |

| Campo | C4 — Landing page GitHub Pages |
| --- | --- |
| Numero e titolo | C4 — Landing page GitHub Pages |
| Obiettivo | Presentare Plancia Comandi con una landing page pubblicabile su GitHub Pages, coerente con lo stile degli altri progetti di Glauco e con riferimento a [theNovelist](https://thenovelist.glaucosilvestri.it/). |
| Dipendenza e branch previsto | Branch `milestone/4-github-pages-landing` creato da main `2f7ce38fa4b787c2c48749333bf79bf444843c61`, dopo la verifica remota del checkpoint C3 sul commit `1155fc248acefe25ac7cc2068ca750d93150a46e`. Icona e sei screenshot C3 riutilizzati senza ritocchi. |
| Tag di checkpoint previsto | `milestone/C4`, annotato e pubblicato sul commit approvato `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, verificato anche su main remoto. Nessun nuovo tag di versione desktop per la sola landing page. |
| Tipo incremento versione | Nessun incremento applicativo per sito e documentazione: resta la versione risultante da C3, prevista **0.3.1**. Nessuna nuova release desktop per questa sola milestone documentale. |
| Release del sito | Richiesta esplicitamente da Glauco il 13 novembre 2026: release `milestone/C4`, titolo «C4 — Landing page», con `PlanciaComandi-site-C4.zip` e `SHA256SUMS-Site.txt`, sorgenti statici e licenza Apache-2.0. La release desktop più recente resta v0.3.1; nessun nuovo tag semantico. Release [C4 — Landing page](https://github.com/gloutchov/Plancia-Comandi/releases/tag/milestone/C4), ID `444250016`, pubblicata il 13 novembre 2026. ZIP generato dal commit finale verificato su main; 16 file estratti corrispondenti byte per byte ai sorgenti Git e smoke isolato riuscito prima del tag. SHA-256 ZIP: `5afcd5b43087f57d2343d6ad2466d336e07f3a31181116ab141d9af8ea341f26`. Digest remoti e riscaricamento dei due allegati verificati. |
| Attività | Esaminare visivamente theNovelist e riprenderne impostazione, tipografia, spaziature e controlli adattandoli a Plancia Comandi. Preparare una pagina statica con presentazione, funzioni, screenshot con didascalie, avvio rapido, download e limiti reali. Prevedere contenuti completi IT/EN, rilevamento della lingua del browser (italiano per IT, inglese negli altri casi), selettore `IT/EN`, tema di sistema e override persistenti. Nell'header: comando sole/luna e collegamento a `https://glaucosilvestri.it` con icona casa ed etichetta accessibile; favicon PNG e ICO coerenti con l'app. |
| Collegamenti e contenuti | Collegare repository, release disponibile e manuale della lingua selezionata (`ISTRUZIONI.md` o `INSTRUCTIONS.md`). Descrivere solo funzioni implementate, distinguendo piattaforme, architetture, stato firma e limiti verificati. Repository verificato pubblico tramite API GitHub; sei URL di pacchetti e checksum verificati con richieste HEAD anonime HTTPS 200. Corretti i precedenti riferimenti documentali al repository privato, senza modificarne la visibilità. |
| Hosting e pubblicazione | Definire la cartella del sito e verificare la disponibilità di GitHub Pages con la visibilità e il piano attuali del repository, senza presumere di renderlo pubblico. Usare URL e percorsi compatibili con Pages; eventuali dominio dedicato, `CNAME` e DNS restano da definire con Glauco. Scegliere il metodo di pubblicazione minimo necessario; motivare un eventuale workflow Pages prima di introdurlo. Pubblicare solo dopo il controllo e l'approvazione del commit finale e verificare HTTPS, risorse e collegamenti sul sito effettivo. |
| Criteri di accettazione | Stile confrontato con il riferimento; pagina leggibile e senza overflow su desktop e mobile, nei due temi e nelle due lingue. Selettori persistenti, navigazione da tastiera, focus visibile e testi alternativi funzionanti. Screenshot provenienti da C3 e nessuna vecchia icona. La pagina pubblicata carica tutte le risorse e presenta correttamente i link e gli eventuali vincoli di accesso ai download. |
| Test richiesti | Anteprima locale e verifica visiva desktop/mobile IT/EN e chiaro/scuro; controlli di lingua e tema automatici e manuali, persistenza, tastiera, link, anchor, immagini e favicon. Controllare percorsi sotto il prefisso Pages e, dopo l'approvazione del deploy, HTTPS e assenza di risorse mancanti sul sito pubblico. Nessuna cattura di dati privati e nessun caricamento delle preferenze o dei terminali reali. |
| Documentazione | `README.md`, `PLAN.md`, `MAP.md`, `QUICK-START_Desktop.md`; `SECURITY_MODEL.md` per hosting, rete e storage delle preferenze del sito; manuali IT/EN e `AGENTS.md` se cambiano istruzioni o procedure operative. |
| Stato | `C4`, già M4, chiusa e pubblicata. Prima approvazione ricevuta sul commit `fbcdc832bce9697c2276e5948e3751af0d9e7355`; seconda approvazione esplicita ricevuta il 13 novembre 2026 sul commit `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, prima di merge, push e tag. Main aggiornato con fast-forward e verificato sul remoto; tag annotato `milestone/C4` allo stesso commit. Landing statica IT/EN in `docs/`, con 78 chiavi equivalenti, tema automatico e manuale, galleria C3, nuova icona e firma centrata. Script classici differiti utilizzabili anche aprendo direttamente l’HTML. `npm test` 149/149 e controllo del sito riusciti; build desktop già riuscita prima delle correzioni statiche, con avviso renderer oltre 500 kB, non ripetuta per la chiusura documentale. Verificate 40 combinazioni Chromium isolate su HTTP/file, due lingue, due temi e cinque dimensioni. Pages `main:/docs` attivato senza CNAME, DNS o workflow aggiuntivi: [deploy gestito 43431582012](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43431582012) riuscito sul commit approvato; sito [HTTPS](https://gloutchov.github.io/Plancia-Comandi/) con HTTPS obbligatorio, 14 risorse pubbliche identiche ai sorgenti e 8 combinazioni UI pubbliche riuscite. Release del sito pubblicata con ZIP e SHA-256 controllati; latest desktop resta v0.3.1. Branch M4 locale rimosso dopo tutte le verifiche; nessun branch M4 remoto era stato pubblicato. Non verificati altri browser/piattaforme; nessuna nuova build desktop, firma o notarizzazione. Temporanei e copie locali degli allegati in `out/m4/` preservati in attesa della conferma separata di pulizia. |

#### 2.1 Milestone di sicurezza pianificate

Glauco ha richiesto questa pianificazione il 13 novembre 2026 dopo la revisione dei sorgenti 0.3.1: 149 test riusciti, audit completo con 9 pacchetti segnalati nella toolchain (2 critici, 7 moderati), audit di produzione senza segnalazioni e prova isolata di regex patologica oltre 250 ms. Dettaglio e limiti nel [modello di sicurezza](SECURITY_MODEL.md#7-verifiche-e-rischi-residui). La pianificazione non corregge le vulnerabilità.

PC-03, PC-04, PC-05, PC-08, PC-11 e PC-13 della baseline Vesta sono integrate in M5–M9. M13 e M14 sono anticipate subito dopo C5 e restano milestone separate; M15–M25 restano nella sezione 2.4 e M18 segue l'ordine numerico. Eseguire M5, poi M13 e M14, poi M6 → M7 → M8 → M9, ciascuna da main dopo verifica del checkpoint remoto precedente e richiesta di avvio separata. La progressione 0.3.2–0.3.6 è prevista in assenza di release intermedie: confermare versione e tag all'avvio. Per ogni chiusura applicare i due controlli HOME, release con artifact/SHA-256 e documentazione/landing allineate alla versione pubblicata. Preferire controlli locali; motivare prima eventuale CI necessaria, usando i workflow di packaging esistenti senza nuovi automatismi per questa pianificazione.

**Vincolo comune:** firma Windows, firma macOS e notarizzazione sono escluse perché le credenziali non sono disponibili. I pacchetti non firmati e gli avvisi del sistema sono limiti dichiarati che non bloccano l'accettazione; restano necessari checksum e verifica della provenienza. Nessuna configurazione di firma, notarizzazione o auto-update è autorizzata da questo piano.

Questa patch usa `patch/0.3.1-security-roadmap`, da main `d954c2eaee23276d5c5bad43e746e56211f7bdd1` dopo verifica del checkpoint C4. Modifica solo documenti, mantiene la versione 0.3.1 e prevede il tag documentale annotato `docs/security-roadmap-2026-11-13` sul commit approvato; nessuna milestone è avviata e non è prevista una nuova release applicativa.

| Campo | M5 — Runtime Electron aggiornato |
| --- | --- |
| Numero e obiettivo | M5 — Aggiornare il runtime distribuito mantenendo terminali, bridge e preferenze funzionanti nei pacchetti supportati. |
| Segnalazione Vesta | PC-03, gravità media, verificata e già tracciata qui. Su `d200abe`, come su `e967d92`, `package.json:42` è `"electron": "45.2.3"`. Non è una seconda milestone. |
| Dipendenza e branch previsto | Dopo C4 e questa patch documentale approvata; `milestone/5-electron-runtime`. |
| Checkpoint e versione previsti | `milestone/C5`, `v0.3.2`; incremento `+0.0.1`. |
| Attività | Valutare Electron 45.3.2, disponibile alla revisione, o una release mantenuta successiva; verificare note ufficiali e correzioni Chromium/Node/V8. Vesta segnala backport di sicurezza Chromium/V8 e un fix del loop di redirect di `webRequest` in 45.3.0, e il blocco dei certificati eMudhra revocati in 45.3.1. La gravità resta media perché il renderer non carica contenuti remoti. Aggiornare package e lockfile, requisiti Node e compatibilità dei moduli nativi, poi rifare i pacchetti. |
| Accettazione | Versione scelta motivata e fissata nel lockfile; isolamento, sandbox e CSP preservati. PTY, avvio, viste, IT/EN e temi funzionano nei pacchetti verificati. L'audit `--omit=dev` non sostituisce la valutazione del runtime incorporato. |
| Test richiesti | Installazione riproducibile, suite e build; ispezione e smoke dei pacchetti Windows x64/macOS ARM64 fuori dal checkout con profilo e ambiente isolati, senza dati o shell personali. Nessuna nuova compatibilità dichiarata senza prova. |
| Documentazione | README, manuali IT/EN, quick start, SECURITY_MODEL, MAP, AGENTS per la versione; PLAN e landing/download allineati alla release verificata. |
| Stato | `M5`, solo pianificata; implementazione non avviata. |

| Campo | M6 — Toolchain con dipendenze controllate |
| --- | --- |
| Numero e obiettivo | M6 — Ridurre i rischi degli strumenti di test e packaging, mantenendo riproducibili i comandi del progetto. |
| Segnalazione Vesta | PC-04, gravità media, già tracciata e non verificata da Vesta: non ha eseguito `npm audit`. Riguarda le `devDependencies` di `package.json`. Il piano e il modello contano 9 segnalazioni di sviluppo, 2 critiche e 7 moderate, fra cui Vitest, tinypool e minimatch (GHSA-5xrq-8626-4rwp, GHSA-85c8-ppgw-ccpr). Non è una seconda milestone. |
| Dipendenza e branch previsto | Dopo C14, così M13 e M14 restano subito dopo C5 e prima di M6; `milestone/6-toolchain-security`. |
| Checkpoint e versione previsti | `milestone/C6`, `v0.3.3`; incremento `+0.0.1`. |
| Attività | Aggiornare Vitest e le dipendenze interessate, comprese Tinypool e mocker; affrontare minimatch nella catena electron-builder. Valutare avvisi, versioni mantenute e compatibilità; evitare `audit fix --force`, downgrade o override non verificati. |
| Accettazione | Audit completo e di produzione confrontati prima/dopo; nessuna segnalazione critica/alta applicabile senza soluzione. Obiettivo zero segnalazioni; eventuali residui richiedono condizioni di sfruttamento, motivazione, mitigazione e decisione esplicita di Glauco. |
| Test richiesti | `npm ci`, suite e build; verificare API usate dagli script, contenuti dei pacchetti e assenza di test runner/tool di build nell'app. Smoke degli artifact Windows x64/macOS ARM64 con dati isolati. |
| Documentazione | Requisiti e lockfile; README, manuali, quick start, SECURITY_MODEL, MAP, PLAN, riferimenti di versione e landing coerenti con la release. |
| Stato | `M6`, solo pianificata; implementazione non avviata. |

| Campo | M7 — Rilevamento resistente alle regex patologiche |
| --- | --- |
| Numero e obiettivo | M7 — Impedire che una regex aggiuntiva blocchi il processo principale e la gestione dei terminali; attua la parte regex di P1. |
| Segnalazione Vesta | PC-05, gravità media, verificata e già tracciata qui. `src/shared/status.ts:164-178`: `compilePatterns` e `matchesAny` girano nel main sull'output del terminale. Le righe sono invariate fra `e967d92` e `d200abe`. Non è una seconda milestone. |
| Dipendenza e branch previsto | Dopo C6; `milestone/7-regex-resilience`. |
| Checkpoint e versione previsti | `milestone/C7`, `v0.3.4`; incremento `+0.0.1`. |
| Attività | Separare il matching potenzialmente bloccante con budget di tempo effettivo, cancellazione e fallback, oppure adottare un motore con comportamento limitato. Conservare limiti di numero/lunghezza e validare eventuali nuovi parametri centrali. Un timer sullo stesso thread del matching non è un timeout efficace. In aggiunta, senza sostituire questa impostazione: valutare all'avvio lunghezza e quantificatori annidati, o un motore limitato come RE2, e limitare la lunghezza del testo valutato. |
| Accettazione | Pattern invalidi, troppo costosi o fuori limite non bloccano l'app; fallback e messaggio IT/EN comprensibili. Rilevamento predefinito preservato, code/worker limitati e risorse rilasciate alla chiusura. Nessuna dipendenza aggiuntiva senza motivazione. |
| Test richiesti | Caso patologico della revisione in esecuzione isolata e terminabile; input lunghi, molti pattern, cancellazione e riapertura; regressioni del rilevatore. Verificare reattività della finestra e del bridge con fixture nei due temi e lingue. |
| Documentazione | Manuali IT/EN, configurazione pertinente, SECURITY_MODEL, MAP, PLAN e riferimenti alla versione; landing se cambia un comportamento presentato. |
| Stato | `M7`, solo pianificata; implementazione non avviata. |

| Campo | M8 — Preferenze robuste e diagnostica protetta |
| --- | --- |
| Numero e obiettivo | M8 — Ridurre perdita delle preferenze e divulgazione di dati tramite errori; attua la restante parte pianificata di P1. |
| Segnalazione Vesta | PC-08, gravità bassa, verificata e già tracciata qui: `electron/settings.ts:96-103` (lettura in errore che torna ai default) e `118-126` (`writeFileSync` diretto). PC-13, gravità bassa, verificata, è solo in parte questa voce: `electron/sessions.ts:208-211` manda al renderer il messaggio grezzo dello spawn, che può contenere percorsi. Entrambe restano in M8; non si apre una milestone separata. Le righe sono invariate fra `e967d92` e `d200abe`. |
| Dipendenza e branch previsto | Dopo C7; `milestone/8-settings-diagnostics`. |
| Checkpoint e versione previsti | `milestone/C8`, `v0.3.5`; incremento `+0.0.1`. |
| Attività | Scrivere settings.json in modo atomico con temporaneo e sostituzione nella stessa directory; prima del ripiego sui default, conservare una copia `.bak` del file corrotto. Limitare la dimensione prima della lettura JSON e gestire file corrotti/errori. Definire confini e permessi; normalizzare errori/log evitando percorsi privati, variabili sensibili e contenuti utente non necessari. Per PC-13, il renderer riceve un codice d'errore; il dettaglio resta nel log locale. |
| Accettazione | Un errore di scrittura preserva l'ultima configurazione valida; file eccessivi/corrotti hanno fallback documentati. Prima del ripiego sui default si conserva una copia `.bak` del file corrotto. Per lo spawn di node-pty il renderer riceve un codice d'errore; il messaggio grezzo resta nel log locale. Errori utili e localizzati senza dettagli sensibili; nessuno storage di credenziali o invio di diagnostica a servizi esterni. |
| Test richiesti | Filesystem temporaneo: dimensioni al limite, JSON invalido, permessi negati, scrittura/sostituzione interrotte e migrazione legacy. Dati sintetici verificano redazione su UI/log; regressioni di preferenze IT/EN e chiaro/scuro. |
| Documentazione | Manuali, quick start per il recupero, SECURITY_MODEL, MAP, PLAN, riferimenti alla versione e landing se pertinente. |
| Stato | `M8`, solo pianificata; implementazione non avviata. |

| Campo | M9 — Confini IPC/CSP e pacchetti verificati |
| --- | --- |
| Numero e obiettivo | M9 — Rendere ripetibili i controlli di sicurezza sui pacchetti distribuiti e correggere le lacune circoscritte; recepisce la parte sicurezza/pacchetti di P3. |
| Segnalazione Vesta | PC-11, gravità bassa, verificata. `electron/main.ts` non chiama `setPermissionRequestHandler` né `setPermissionCheckHandler`. È già l'attività «permessi non necessari» di M9: negare di default. Non è una seconda milestone. Il file, su `d200abe`, non ha una riga nuova rispetto a `e967d92`. |
| Dipendenza e branch previsto | Dopo C8; `milestone/9-package-security`. |
| Checkpoint e versione previsti | `milestone/C9`, `v0.3.6`; incremento `+0.0.1`. |
| Attività | Provare IPC reale con mittenti, frame/origini e payload invalidi, rafforzando i controlli dove necessario. Verificare CSP applicata, blocco navigazioni/popup e permessi non necessari: per PC-11, negare di default richieste e controlli dei permessi. Rafforzare ispezione/smoke di installer/portable Windows x64 e DMG/ZIP macOS ARM64, con HOME/appData/userData isolati e senza file privati/tool di sviluppo. |
| Accettazione | Richieste rifiutate senza effetti privilegiati; ogni permesso chiesto o controllato è negato. Protezioni del renderer effettive nei pacchetti e test isolati ripetibili. Artifact/SHA-256 corrispondono al commit approvato. Firma/notarizzazione escluse; Linux, macOS Intel e ulteriori casi funzionali restano P3 se non verificati esplicitamente, senza nuove promesse di compatibilità. |
| Test richiesti | Matrice nativa Windows x64/macOS ARM64, formati distribuiti e smoke fuori dal checkout; negativi IPC/CSP e contenuti del pacchetto. Test esplicito che `setPermissionRequestHandler` e `setPermissionCheckHandler` neghino ogni permesso. Correggere i limiti noti degli script elencati nel modello di sicurezza; usare solo fixture/profili temporanei, senza credenziali o sessioni reali. |
| Documentazione | SECURITY_MODEL con evidenze/limiti per piattaforma, MAP per script/test, manuali e quick start per installazione, README/PLAN e landing per i soli pacchetti verificati. |
| Stato | `M9`, solo pianificata; implementazione non avviata. |

#### 2.2 Correzioni desktop pianificate

Glauco ha richiesto queste aggiunte al piano il 13 novembre 2026: su Windows l'app in esecuzione mostra ancora l'icona Electron; le app installate su Windows e macOS si chiamano `plancia-comandi`; su macOS la finestra della versione 0.3.1 resta al centro dello schermo e non si riesce a trascinare. Sono segnalazioni dell'utente da riprodurre sui pacchetti, non cause già dimostrate né problemi già risolti.

Eseguire M10 → M11 → M12 dopo C9, ciascuna su branch dedicato, dopo verifica del checkpoint remoto precedente e richiesta di avvio separata. Le versioni 0.3.7–0.3.9 sono indicative, in continuità con M5–M9 e in assenza di release intermedie: confermarle all'avvio. Se una milestone precedente risolve già un problema, verificarlo sul pacchetto e registrare le evidenze senza introdurre modifiche superflue. Applicare la procedura HOME di revisione e pubblicazione; ogni release applicativa richiede pacchetti verificati e SHA-256. Firma e notarizzazione restano escluse per indisponibilità delle credenziali. Questa aggiunta modifica solo il piano sul branch `patch/0.3.1-desktop-fixes-plan`, con versione applicativa invariata a 0.3.1; non avvia le tre implementazioni e non pubblica una release.

| Campo | M10 — Icona corretta nell'app Windows in esecuzione |
| --- | --- |
| Numero e obiettivo | M10 — Mostrare l'icona di Plancia Comandi anche mentre l'app Windows è aperta, eliminando l'icona Electron segnalata dall'utente. |
| Dipendenza e branch previsto | Dopo C9; `milestone/10-windows-runtime-icon`. |
| Checkpoint e versione previsti | `milestone/C10`, `v0.3.7`; incremento `+0.0.1`. |
| Attività | Riprodurre il problema su Windows x64 distinguendo finestra, barra delle applicazioni, Alt+Tab e collegamenti. Verificare l'icona incorporata nell'EXE, l'asset fornito a BrowserWindow e la sua presenza nel pacchetto, oltre alla coerenza dell'AppUserModelID. Correggere percorsi, formato o risorse dove necessario; verificare eventuali collegamenti già fissati e cache senza cancellare dati o modificare globalmente il sistema. |
| Criteri di accettazione | Installer e portable mostrano l'icona corretta durante l'esecuzione, nella barra delle applicazioni e in Alt+Tab; nessuna icona Electron nella finestra quando il sistema la visualizza. Installazione pulita verificata e comportamento dei collegamenti preesistenti documentato. Nessuna regressione dell'icona macOS, dei terminali o dei controlli della finestra. |
| Test richiesti | Suite e build; controlli automatici proporzionati su selezione/percorso delle risorse e contenuto dei pacchetti. Prova visiva nativa di installer e portable Windows fuori dal checkout, IT/EN e chiaro/scuro, con profilo e ambiente isolati; controllo della barra delle applicazioni e Alt+Tab, non solo della sidebar. Smoke macOS ARM64 per la release multipiattaforma; SHA-256 degli artifact. |
| Documentazione | README, manuali IT/EN, quick start e PLAN per esiti e limiti; MAP se cambiano risorse/script/test; SECURITY_MODEL per modifiche alla distribuzione; versione, AGENTS e landing/download allineati alla release. |
| Stato | `M10`, solo pianificata; implementazione non avviata. |

| Campo | M11 — Nome delle app installate Windows e macOS |
| --- | --- |
| Numero e obiettivo | M11 — Chiamare le app installate **Plancia Comandi** su Windows e macOS. **PlanciaComandi** è il ripiego richiesto dall'utente solo se il nome con spazio presenta un vincolo tecnico dimostrato. |
| Dipendenza e branch previsto | Dopo C10; `milestone/11-installed-app-name`. |
| Checkpoint e versione previsti | `milestone/C11`, `v0.3.8`; incremento `+0.0.1`. |
| Attività | Verificare productName, executableName e metadati generati: nome EXE, collegamenti e voce di disinstallazione Windows; nome del bundle .app, CFBundleName/CFBundleDisplayName ed eseguibile macOS. Allineare il nome visibile e aggiornare gli script di packaging/ispezione/smoke e i test che assumono `plancia-comandi` o `plancia-comandi.app`. Provare percorsi con spazi; preservare appId, accesso alle preferenze esistenti e aggiornamento/rimozione senza cancellazioni non confermate. |
| Criteri di accettazione | Dopo installazione, avvio e riavvio, il nome visibile è **Plancia Comandi** in entrambe le piattaforme: bundle in Applicazioni, Dock/menu macOS, eseguibile/collegamenti, barra delle applicazioni e voce di disinstallazione Windows dove applicabili. Portable Windows coerente. Un eventuale ripiego a **PlanciaComandi** richiede motivazione e prova del limite; non applicarlo per comodità. Preferenze conservate e assenza di installazioni duplicate non gestite nel percorso di aggiornamento documentato. |
| Test richiesti | Suite e build; test mirati di nomi e percorsi con spazi, ispezione dei metadati e ricerca delle assunzioni negli script. Installazione pulita e aggiornamento da 0.3.1 con copie di profili sintetici, avvio fuori dal checkout, collegamenti e rimozione su Windows x64/macOS ARM64; smoke di installer/portable e DMG/ZIP, verifica dell'icona M10 e SHA-256. Nessun uso o modifica delle installazioni e preferenze personali per i test automatici. |
| Documentazione | README, manuali IT/EN e quick start per nuovi nomi, percorsi e aggiornamento/rimozione; MAP per script/test; SECURITY_MODEL per distribuzione e gestione delle preferenze; PLAN, versione, AGENTS e landing/download coerenti. |
| Stato | `M11`, solo pianificata; implementazione non avviata. |

| Campo | M12 — Finestra macOS trascinabile |
| --- | --- |
| Numero e obiettivo | M12 — Permettere di spostare normalmente la finestra macOS, correggendo il blocco al centro dello schermo segnalato nella versione 0.3.1. |
| Dipendenza e branch previsto | Dopo C11; `milestone/12-macos-window-drag`. |
| Checkpoint e versione previsti | `milestone/C12`, `v0.3.9`; incremento `+0.0.1`. |
| Attività | Riprodurre il difetto con il pacchetto 0.3.1 e confrontarlo con il runtime aggiornato in M5. Verificare la barra titolo hiddenInset, le regioni drag/no-drag, le sovrapposizioni e l'interazione tra sidebar, icona e controlli della finestra. Rendere disponibile un'area di trascinamento riconoscibile; limitare le modifiche alla gestione della finestra e ai relativi stili. |
| Criteri di accettazione | La finestra si sposta dall'area di trascinamento, conserva la posizione durante l'uso e non ritorna forzatamente al centro. Verificare finestra normale e ripristino da minimizzata/massimizzata/schermo intero, senza confondere lo schermo intero nativo con una finestra trascinabile. Pulsanti macOS, click, selezione del testo nel terminale, copia/incolla e trascinamento di file continuano a funzionare; le aree interattive non spostano la finestra. Nessuna regressione Windows. |
| Test richiesti | Suite e build; test proporzionati su eventuale logica nuova e verifica manuale nativa del movimento reale della finestra macOS ARM64, con mouse/trackpad e, quando disponibile, monitor esterno. Pacchetti DMG/ZIP fuori dal checkout, profilo/ambiente isolati, IT/EN, chiaro/scuro e dimensioni desktop supportate; regressioni dei controlli e del drag-and-drop, smoke Windows x64 e SHA-256. Un test del solo DOM non dimostra lo spostamento della finestra. |
| Documentazione | Manuali IT/EN, quick start, README e PLAN per comportamento e limiti; MAP per eventuali moduli/test; SECURITY_MODEL se cambiano confini della finestra o distribuzione; versione, AGENTS, screenshot e landing se interessati dalla correzione. |
| Stato | `M12`, solo pianificata; implementazione non avviata. |

#### 2.3 Proposte e parti residue

| Voce | Obiettivo da discutere | Accettazione proposta |
| --- | --- | --- |
| P1 — Confini di sicurezza, recepita in M7–M8 | Timeout delle regex in M7; preferenze atomiche e diagnostica in M8. CSP, mittente degli IPC precedenti a M1 e tetto delle code di incolla restano C2. | Completamento da verificare attraverso C7/C8 con test negativi isolati e modello aggiornato; nessuna correzione già attribuita alla pianificazione. |
| P2 — Preferenze iniziali | Allineare lingua automatica e portare nel file centrale i limiti ancora nei moduli. C1 mette nel file centrale solo i parametri nuovi di appunti, trascinamento e dimensione dell'input. PC-09 e PC-14 hanno le milestone dedicate M17 e M20, non avviate: restano un riferimento a P2 e non la sostituiscono. | Italiano per sistemi italiani, inglese negli altri casi, override persistente e configurazione validata con test. |
| P3 — Distribuzione verificata, parte recepita in M9 | Sicurezza IPC/CSP e pacchetti Windows x64/macOS ARM64 in M9. Restano da pianificare ulteriori verifiche Linux/macOS Intel e casi funzionali non coperti di notifiche, scorciatoie, shell e PTY. Firma e notarizzazione escluse per indisponibilità delle credenziali. | Esiti distinti per piattaforma e formato, senza dichiarare compatibilità non verificata. Le parti residue richiedono una nuova decisione prima di diventare milestone. |

Versione, branch, checkpoint, attività e test di P1 e della parte sicurezza/pacchetti di P3 sono definiti in M7–M9. P2 resta una proposta: M17 e M20 ne pianificano solo PC-09 e PC-14. Le parti residue di P3 restano proposte. Queste righe non dichiarano controlli o piattaforme già verificati. Punto aperto, solo per la dimensione del pacchetto: non escludere le prebuild di `node-pty` delle altre piattaforme né i file `.pdb`. È un'ottimizzazione futura, non parte di C2. La landing page GitHub Pages è C4, già M4, pubblicata e verificata sul checkpoint remoto `milestone/C4`; la release del sito è distinta dai pacchetti desktop 0.3.1.

#### 2.4 Baseline Vesta del 13 novembre 2026

Vesta ha analizzato `main` al commit `e967d92` il 13 novembre 2026, senza eseguire build, test né `npm audit`. Il DNS del CNAME non è stato verificato. La sfruttabilità di PC-01 e PC-02 è dedotta, non provata. Le righe sono state ricontrollate su `d200abe611ef92220d9aa902f9f858192caee06b`: `git diff e967d92 d200abe` sui file citati è vuoto, quindi gli intervalli restano quelli indicati da Vesta. Due precisazioni di contenuto, sullo stesso testo: in `docs/index.html` la riga 12 è `og:image`, la riga 13 è il canonical e le righe 14-15 sono gli `hreflang`; in `.github/workflows/package-macos.yml` il runner è già `macos-15` (riga 24). `package-windows.yml` usa ancora `windows-latest` (riga 23). Il default `"0.3.0"` è alla riga 12 di entrambi i workflow e la descrizione di `package-macos.yml` (riga 7) cita ancora lo SHA della 0.3.0.

Questa patch usa `patch/0.3.1-plan-vesta-baseline`, da quel commit di main. Modifica solo `PLAN.md` e mantiene la versione applicativa 0.3.1. L'eccezione dei tag `docs/*` è una decisione di Glauco, che ha chiesto il tag documentale annotato `docs/plan-vesta-baseline-2026-11-13` per questo commit. Il tag non viene creato da questa pianificazione. Nessuna milestone sotto è avviata.

PC-03, PC-04, PC-05, PC-08, PC-13 e PC-11 restano dentro M5, M6, M7, M8 e M9. PC-11 è la parte di M9 sui permessi: `electron/main.ts` non registra `setPermissionRequestHandler` né `setPermissionCheckHandler`, e il lavoro previsto è negare di default, con un test che la negazione avvenga. Le altre tredici segnalazioni restano M13–M25, una voce ciascuna: M22, M23 e M25 non si uniscono. L'ordine di esecuzione è M5, poi M13 e M14 subito dopo C5, ciascuna milestone separata, poi M6 → M12, poi M15 → M25. M18 resta dopo C17. Ogni voce parte da main dopo la verifica del checkpoint remoto precedente e una richiesta di avvio separata. Questo ordine non autorizza l'avvio.

1. M13 e M14, ancora milestone separate, subito dopo C5. M18 segue l'ordine numerico, dopo C17, con DevTools e demo condizionati a `!app.isPackaged`.
2. Electron 45.3.2 insieme a M5 e M6.
3. Impostazioni dell'account per PC-07: Glauco può cambiarle in qualsiasi momento, senza aspettare C15. Il file `.github/dependabot.yml`, se la decisione lo include, resta il lavoro di M16.
5. Allineamento di CNAME, canonical e piano (M21) e aggiornamento della quotatura in `SECURITY_MODEL.md`, che fa parte di M13 e M14.
6. Polling adattivo di PC-06 (M15), con soglie misurabili. La Constrained Language Mode si valuta con la variabile utente `__PSLockdownPolicy=4`, da verificare su Windows 11. AppLocker è un limite dichiarato.
8. `npm audit` e lettura del lockfile in un ambiente isolato, dentro M6, con approvazione di Glauco.

I punti 4 e 7 della sezione 3 di Vesta riguardano solo ContaMì.

Le versioni `v0.3.10`–`v0.3.17` sono indicative, in assenza di release intermedie, e per le milestone che incrementano la versione restano consecutive nella serie 0.3.x. L'anticipo di M13 e M14 non riusa i numeri di M6–M12: `v0.3.10` e `v0.3.11` si confermano all'avvio. M17 è `+0.0.1`, `v0.3.13`, da confermare da Glauco: allinea la lingua iniziale allo standard. M16, M21, M22, M23 e M25 lasciano invariata la versione applicativa e hanno comunque il checkpoint `milestone/C<n>`.

**Domanda aperta per Glauco.** Le voci a versione invariata richiedono una release? HOME, righe 100 e 115: una release pubblicata aggiorna la versione; una modifica esclusivamente documentale può lasciarla invariata e non richiede una release; ogni milestone o patch conclusa, comprese le correzioni ordinarie e l'hardening, richiede invece una release. La risposta non unisce M22, M23 e M25: Glauco ha chiesto una voce per segnalazione.

**Segnalazioni già coperte**

| Segnalazione | Milestone | Checkpoint |
| --- | --- | --- |
| PC-03 | M5 | `milestone/C5` |
| PC-04 | M6 | `milestone/C6` |
| PC-05 | M7 | `milestone/C7` |
| PC-08, PC-13 | M8 | `milestone/C8` |
| PC-11 | M9 | `milestone/C9` |

**Milestone nuove**

| Voce | ID Vesta | Branch previsto | Checkpoint | Versione prevista |
| --- | --- | --- | --- | --- |
| M13 — Quotatura PowerShell | PC-01 | `milestone/13-powershell-quotes` | `milestone/C13` | `v0.3.10`, `+0.0.1` |
| M14 — Quotatura fish | PC-02 | `milestone/14-fish-quoting` | `milestone/C14` | `v0.3.11`, `+0.0.1` |
| M15 — Polling dei processi figli su Windows | PC-06 | `milestone/15-windows-child-poll` | `milestone/C15` | `v0.3.12`, `+0.0.1` |
| M16 — Avvisi e configurazione del repository | PC-07 | `milestone/16-dependabot-config` | `milestone/C16` | versione applicativa invariata |
| M17 — Lingua iniziale di sistema | PC-09 | `milestone/17-system-locale` | `milestone/C17` | `v0.3.13`, `+0.0.1`, da confermare da Glauco |
| M18 — DevTools e demo solo fuori dal pacchetto | PC-10 | `milestone/18-packaged-devtools` | `milestone/C18` | `v0.3.14`, `+0.0.1` |
| M19 — Conferma dell'incolla e del trascinamento multilinea | PC-12 | `milestone/19-multiline-paste-confirm` | `milestone/C19` | `v0.3.15`, `+0.0.1` |
| M20 — Limiti di sessione nel file centrale | PC-14 | `milestone/20-session-limits-config` | `milestone/C20` | `v0.3.16`, `+0.0.1` |
| M21 — CNAME, canonical e piano | PC-15 | `milestone/21-pages-cname` | `milestone/C21` | versione applicativa invariata |
| M22 — Default e immagini dei workflow di packaging | PC-16 | `milestone/22-packaging-defaults` | `milestone/C22` | versione applicativa invariata |
| M23 — Esclusioni Git di ambienti e chiavi | PC-17 | `milestone/23-gitignore-secrets` | `milestone/C23` | versione applicativa invariata |
| M24 — Prebuild di node-pty su macOS | PC-18 | `milestone/24-macos-pty-prebuild` | `milestone/C24` | `v0.3.17`, `+0.0.1` |
| M25 — Tag documentali e copia dello standard | PC-19 | `milestone/25-doc-tag-policy` | `milestone/C25` | versione applicativa invariata |

| Campo | M13 — Quotatura PowerShell |
| --- | --- |
| Numero e obiettivo | M13 — PC-01, gravità media, verificata; la sfruttabilità è sospetta e non è stata provata. Fare in modo che la quotatura PowerShell tratti come apice singolo anche U+2018, U+2019, U+201A e U+201B. |
| Dipendenza e branch previsto | Dopo C5 e prima di M6; `milestone/13-powershell-quotes`. Resta una milestone separata da M5 e da M14. |
| Checkpoint e versione previsti | `milestone/C13`, `v0.3.10`; incremento `+0.0.1`. |
| Attività | `quotePowerShell` in `src/shared/shellQuote.ts:17-19` raddoppia solo l'apostrofo ASCII. PowerShell tratta come apici singoli anche U+2018–U+201B. I chiamanti da coprire sono `formatDroppedPaths` in `src/shared/shellQuote.ts:50` e l'immagine incollata in `src/terminalEdit.ts:147`. Allineare la sostituzione a EscapeSingleQuotedStringContent, raddoppiando anche quei quattro caratteri. Attività di M13, non di questa pull request: in `SECURITY_MODEL.md` togliere «verificata» per la quotatura PowerShell finché il confronto su Windows PowerShell 5.1 e su pwsh 7 non è registrato. La voce storica di C1 dice «quotatura verificata per shell POSIX, PowerShell e cmd»; il modello dice che la suite copre la quotatura delle shell. Questa pull request non modifica `SECURITY_MODEL.md`. |
| Criteri di accettazione | Il payload `a’; Write-Output PWNED; ’b.txt` e le varianti con U+201A e U+201B restano un unico argomento quotato. Il percorso `C:\Users\O’Brien\…\img.png` torna identico, senza eseguire il resto. Su Windows PowerShell 5.1 e su pwsh 7 il valore tornato è identico all'argomento di partenza: senza questa verifica su entrambe le shell la milestone non si chiude. I casi già coperti di apice ASCII, POSIX e cmd restano verdi. `SECURITY_MODEL.md` non chiama più «verificata» la quotatura PowerShell finché quel confronto non è registrato. |
| Test richiesti | Test unitari del payload `a’; Write-Output PWNED; ’b.txt`, delle varianti U+201A e U+201B e del percorso `C:\Users\O’Brien\…\img.png`, attraverso `shellQuote.ts:50` e `terminalEdit.ts:147`. Verifica obbligatoria su Windows PowerShell 5.1 e su pwsh 7 che il valore torni identico. Suite e build. |
| Documentazione | `SECURITY_MODEL.md` si aggiorna in M13, non in questa pull request. Manuali IT/EN se il comportamento visibile dell'incolla cambia, MAP se cambiano i test, PLAN e riferimenti di versione. |
| Stato | `M13`, solo pianificata; implementazione non avviata. |

| Campo | M14 — Quotatura fish |
| --- | --- |
| Numero e obiettivo | M14 — PC-02, gravità media, sospetta. Quotare fish dentro gli apici singoli secondo le sue sequenze di escape. |
| Dipendenza e branch previsto | Dopo C13 e prima di M6; `milestone/14-fish-quoting`. Resta una milestone separata da M13. |
| Checkpoint e versione previsti | `milestone/C14`, `v0.3.11`; incremento `+0.0.1`. |
| Attività | `shellQuoteKind` (`src/shared/shellQuote.ts:6-15`) manda fish su POSIX; `src/shared/shellQuote.test.ts:11` si aspetta questo risultato e va aggiornato. Il rilevamento è in `electron/shells.ts:29-32`: `/opt/homebrew/bin/fish`, `/usr/local/bin/fish`, `/bin/fish` e `/usr/bin/fish`. Dentro gli apici singoli fish interpreta `\'` e `\\` come escape: un percorso con backslash finale, o con `\'`, può chiudere la stringa. Aggiungere il tipo `fish`, che dentro gli apici trasforma `\` in `\\` e `'` in `\'`. |
| Criteri di accettazione | Un percorso fish con backslash, apice e spazio resta un unico argomento. I percorsi Homebrew e di sistema sopra sono riconosciuti come fish. PowerShell, cmd e POSIX restano invariati. `SECURITY_MODEL.md` cita fish. |
| Test richiesti | Aggiornare `shellQuote.test.ts:11` e aggiungere i test di rilevamento per i quattro percorsi. Test unitari del tipo `fish`, del backslash finale e di `\'`. Suite e build. Prova manuale su macOS solo se fish è installato nell'ambiente di verifica, con dati sintetici. |
| Documentazione | `SECURITY_MODEL.md`, MAP per il test, manuali se l'elenco delle shell quotate cambia, PLAN e versione. |
| Stato | `M14`, solo pianificata; implementazione non avviata. |

| Campo | M15 — Polling dei processi figli su Windows |
| --- | --- |
| Numero e obiettivo | M15 — PC-06, gravità media, verificata; l'impatto operativo è sospetto. Ridurre il costo del rilevamento dei processi figli e rendere visibile il caso in cui Windows lo blocca. |
| Dipendenza e branch previsto | Dopo C12, così l'anticipo di M13 e M14 non la porta prima di M6; `milestone/15-windows-child-poll`. |
| Checkpoint e versione previsti | `milestone/C15`, `v0.3.12`; incremento `+0.0.1`. |
| Attività | `electron/children.ts:35-52` avvia `powershell.exe -NoProfile -NonInteractive -Command Get-CimInstance Win32_Process` a ogni giro, con timeout di 8 secondi. `electron/sessions.ts:115` programma il giro ogni 2,5 secondi. Il costo può essere di centinaia di millisecondi di CPU. Eseguire il polling solo con sessioni attive o visibili e con backoff, oppure tenere un unico PowerShell persistente. Mostrare in interfaccia che il rilevamento non è disponibile. Valutare una prova della Constrained Language Mode con la variabile utente `__PSLockdownPolicy=4`, da verificare su Windows 11. AppLocker resta un limite dichiarato, non un ambiente di test richiesto. |
| Criteri di accettazione | Senza sessioni attive o visibili, in 30 secondi non parte nessun `powershell.exe` di questo polling. Con una sessione visibile il comando non parte più spesso dell'intervallo configurato, oggi 2500 ms. Dopo un errore l'attesa successiva è almeno 10 secondi e raddoppia fino a 60 secondi. Al terzo errore consecutivo compare lo stato «rilevamento non disponibile», in italiano e in inglese, e il resto della plancia continua a funzionare. Il rilevamento sui percorsi già verificati resta disponibile quando il comando riesce. |
| Test richiesti | Test dell'intervallo, del backoff (10 s, raddoppio, tetto 60 s), dei 30 secondi senza sessioni e del messaggio al terzo errore, con un comando finto. Valutare la prova con `__PSLockdownPolicy=4` su Windows 11. AppLocker è un limite dichiarato. Suite e build. Smoke Windows x64 sul pacchetto della release, profilo isolato. |
| Documentazione | Manuali IT/EN, `SECURITY_MODEL.md`, MAP, PLAN, versione e landing se il comportamento pubblicato cambia. |
| Stato | `M15`, solo pianificata; implementazione non avviata. |

| Campo | M16 — Avvisi e configurazione del repository |
| --- | --- |
| Numero e obiettivo | M16 — PC-07, gravità media, verificata. Registrare la decisione di Glauco su Dependabot, secret scanning, push protection e protezione di `main`. L'unica attività su file è `.github/dependabot.yml`, e solo se quella decisione la include. |
| Dipendenza e branch previsto | Le impostazioni dell'account non aspettano C15: Glauco può cambiarle in qualsiasi momento. Il branch del file, se la decisione lo include, è `milestone/16-dependabot-config`, dopo C15. |
| Checkpoint e versione previsti | `milestone/C16`; versione applicativa invariata. |
| Attività | Alla data della baseline gli alert Dependabot e il secret scanning risultano disattivati, manca `dependabot.yml`, manca il code scanning e `main` non è protetto. Glauco può cambiare le impostazioni dell'account in qualsiasi momento, senza aspettare C15. Alert Dependabot, secret scanning, push protection e protezione di `main` (niente force-push né cancellazione) restano azioni sull'account e seguono la sua decisione. Se la decisione include il file, aggiungere `.github/dependabot.yml` per npm e per github-actions. |
| Criteri di accettazione | Il piano riporta la decisione. Nessuna impostazione del repository cambia prima di essa. Se il file entra nel commit, copre npm e github-actions e i workflow di packaging restano `workflow_dispatch`. |
| Test richiesti | Controllo statico del YAML, se presente. Nessun `workflow_dispatch` di prova. Nessun test applicativo aggiuntivo per le sole impostazioni. |
| Documentazione | `PLAN.md` e `SECURITY_MODEL.md` con l'esito della decisione e i limiti che restano sull'account. |
| Stato | `M16`, solo pianificata; implementazione non avviata. Decisione di Glauco ancora aperta. |

| Campo | M17 — Lingua iniziale di sistema |
| --- | --- |
| Numero e obiettivo | M17 — PC-09, gravità bassa, verificata e già indicata in P2. Rilevare la lingua di sistema al primo avvio, con ripiego sull'inglese. P2 resta una proposta: questa voce ne attua solo la parte lingua. |
| Dipendenza e branch previsto | Dopo C16; `milestone/17-system-locale`. |
| Checkpoint e versione previsti | `milestone/C17`, `v0.3.13`; incremento `+0.0.1`, da confermare da Glauco. |
| Attività | `electron/settings.ts:14` assegna `locale: 'it'` in `defaultSettings`. Lo standard chiede il rilevamento della lingua di sistema. Usare `app.getLocale()`, con ripiego `en` quando la lingua non è tra quelle tradotte, e valutare `app.getPreferredSystemLanguages()` quando l'elenco ordinato è più preciso del solo locale. L'override già salvato resta quello scelto dall'utente. |
| Criteri di accettazione | Un profilo nuovo con `it-IT` o `it-CH` apre l'interfaccia in italiano. `en-GB` e `pt-BR` aprono l'inglese. Una preferenza già scritta non viene sovrascritta. La schermata di avvio, mostrata prima del caricamento delle preferenze, resta documentata con il dizionario italiano di default. |
| Test richiesti | Test su `it-IT`, `it-CH`, `en-GB` e `pt-BR`, più un locale sconosciuto e un file di preferenze già presente. Valutare `app.getPreferredSystemLanguages()` con un elenco finto. Suite e build. Controllo manuale IT/EN e chiaro/scuro sul primo avvio con profilo isolato. |
| Documentazione | Manuali IT/EN, README, quick start, `SECURITY_MODEL.md` se cambia il dato letto dal sistema, MAP, PLAN e versione. |
| Stato | `M17`, solo pianificata; implementazione non avviata. |

| Campo | M18 — DevTools e demo solo fuori dal pacchetto |
| --- | --- |
| Numero e obiettivo | M18 — PC-10, gravità bassa, verificata. Limitare DevTools, demo e screenshot alle esecuzioni non pacchettizzate. |
| Dipendenza e branch previsto | Dopo C17; `milestone/18-packaged-devtools`. |
| Checkpoint e versione previsti | `milestone/C18`, `v0.3.14`; incremento `+0.0.1`. |
| Attività | Le variabili da condizionare a `!app.isPackaged` sono `PLANCIA_DEMO` e `MOLO_DEMO` (`electron/main.ts:35`), `PLANCIA_SHOT_DIR` e `MOLO_SHOT_DIR` (`electron/main.ts:217`), `PLANCIA_SHOT_EXIT` e `MOLO_SHOT_EXIT` (`electron/main.ts:235`), `PLANCIA_DEVTOOLS` e `MOLO_DEVTOOLS` (`electron/main.ts:281`). Coprono demo, script, screenshot e DevTools. Chi controlla l'ambiente del pacchetto può così aprire DevTools, con accesso all'API del preload. La gravità è bassa perché serve lo stesso utente. |
| Criteri di accettazione | Nel pacchetto nessuna di queste otto variabili apre DevTools, avvia la demo o scrive screenshot. In sviluppo, con le stesse variabili, demo e DevTools restano disponibili. |
| Test richiesti | Test della condizione sul flag di pacchetto per tutte e otto le variabili, impostate e assenti. Suite e build. Smoke del pacchetto Windows o macOS con le variabili impostate e profilo isolato, per la release della milestone. |
| Documentazione | `SECURITY_MODEL.md`, manuali e README per il limite sul pacchetto, MAP, PLAN e versione. |
| Stato | `M18`, solo pianificata; implementazione non avviata. |

| Campo | M19 — Conferma dell'incolla e del trascinamento multilinea |
| --- | --- |
| Numero e obiettivo | M19 — PC-12, gravità bassa, verificata. È il rischio residuo dell'incolla senza bracketed paste: chiedere conferma quando il testo contiene un a capo e la shell non ha attivato il bracketed paste. |
| Dipendenza e branch previsto | Dopo C18; `milestone/19-multiline-paste-confirm`. |
| Checkpoint e versione previsti | `milestone/C19`, `v0.3.15`; incremento `+0.0.1`. |
| Attività | `src/terminalEdit.ts:156-160` incolla il testo degli appunti e `173-190` incolla il testo trascinato. Senza bracketed paste le righe partono una dopo l'altra. Chiedere conferma, in italiano e in inglese, quando il testo contiene `\n` o `\r`, oppure è una sola riga che termina con un a capo, e la shell non ha attivato il bracketed paste. Una riga senza a capo finale e un incolla con bracketed paste attivo restano immediati. |
| Criteri di accettazione | La conferma compare per `\n`, per `\r` e per una sola riga che termina con un a capo, quando il bracketed paste non è attivo. Una riga senza a capo finale resta immediata. Annullare lascia il terminale invariato. Confermare invia il testo entro i limiti già validati. I temi, il focus e i testi lunghi della conferma sono verificati. |
| Test richiesti | Test della decisione: una riga senza a capo, una riga con a capo finale, `\n`, `\r`, più righe, bracketed paste attivo, annullamento e conferma. Suite e build. Controllo manuale IT/EN, chiaro/scuro, tastiera e dimensioni desktop supportate. |
| Documentazione | Manuali IT/EN con i nomi reali dei controlli, `SECURITY_MODEL.md`, MAP, PLAN e versione. |
| Stato | `M19`, solo pianificata; implementazione non avviata. |

| Campo | M20 — Limiti di sessione nel file centrale |
| --- | --- |
| Numero e obiettivo | M20 — PC-14, gravità bassa, verificata e già indicata in parte in P2. Spostare in `config/app.config.json` i limiti e gli intervalli ancora cablati, con clamp ai default documentati. P2 resta una proposta: questa voce ne attua solo questa parte. |
| Dipendenza e branch previsto | Dopo C19; `milestone/20-session-limits-config`. |
| Checkpoint e versione previsti | `milestone/C20`, `v0.3.16`; incremento `+0.0.1`. |
| Attività | `electron/sessions.ts:32-33` definisce `MAX_SESSIONS` e `MAX_BACKLOG`. `electron/sessions.ts:114-115` fissa gli intervalli a 400 ms e 2500 ms. I timeout di `electron/children.ts` sono 4000 ms per `ps` (riga 22) e 8000 ms per PowerShell (riga 44). Spostare limiti, intervalli e questi timeout in `config/app.config.json` e validarli all'avvio con il clamp di `src/shared/appConfig.ts:54-57`: un valore assente o di tipo sbagliato torna al predefinito; un valore fuori intervallo viene portato al limite. |
| Criteri di accettazione | Un file valido applica i nuovi limiti, gli intervalli e i timeout di `electron/children.ts`. Come in `appConfig.ts:54-57`, un valore assente o di tipo sbagliato torna al predefinito e un valore fuori intervallo viene portato al limite più vicino. L'app si avvia. I parametri già introdotti da C1 restano validati come oggi. |
| Test richiesti | Test di clamp per ogni nuovo parametro: assente, tipo sbagliato, sotto il minimo, sopra il massimo e valore interno. Il fuori intervallo deve dare il limite, non il predefinito. Suite e build. |
| Documentazione | README, manuali IT/EN, quick start, `SECURITY_MODEL.md`, MAP, PLAN e l'esempio JSON del file centrale. |
| Stato | `M20`, solo pianificata; implementazione non avviata. |

| Campo | M21 — CNAME, canonical e piano |
| --- | --- |
| Numero e obiettivo | M21 — PC-15, gravità bassa, verificata. Allineare CNAME, canonical e piano dopo la scelta del dominio, che è di Glauco. |
| Dipendenza e branch previsto | Dopo C20 e dopo la scelta esplicita del dominio; `milestone/21-pages-cname`. |
| Checkpoint e versione previsti | `milestone/C21`; versione applicativa invariata. |
| Attività | `docs/CNAME` contiene `planciacomandi.glaucosilvestri.it`, dal commit `e967d92` («Create CNAME») eseguito dall'interfaccia web direttamente su main. In `docs/index.html` la riga 12 è `og:image`, la riga 13 è il canonical e le righe 14-15 sono gli `hreflang`: puntano a `gloutchov.github.io/Plancia-Comandi/`. La voce C4 di questo piano dice che Pages `main:/docs` è stato attivato senza CNAME. Il DNS non è verificato. Glauco sceglie: verificare DNS e HTTPS su Pages e poi allineare canonical, Open Graph, `hreflang` e questa voce di piano, oppure rimuovere il CNAME e lasciare gli URL `github.io`. |
| Criteri di accettazione | Canonical, Open Graph, `hreflang`, `docs/CNAME` e la voce C4 descrivono lo stesso host. Se il dominio proprio resta, DNS e HTTPS sono verificati prima dell'allineamento. La versione desktop resta quella già pubblicata. |
| Test richiesti | Controllo di link, anchor e coerenza IT/EN del piano e della pagina. Dopo l'approvazione del deploy, controllo HTTPS dell'host scelto. Nessuna cattura di dati privati. |
| Documentazione | `PLAN.md`, `docs/index.html`, `docs/CNAME`, README e `SECURITY_MODEL.md` per l'host della landing. |
| Stato | `M21`, solo pianificata; implementazione non avviata. Scelta del dominio ancora aperta. |

| Campo | M22 — Default e immagini dei workflow di packaging |
| --- | --- |
| Numero e obiettivo | M22 — PC-16, gravità bassa, verificata. Aggiornare i default di versione e fissare l'immagine Windows. L'immagine macOS è già `macos-15`. |
| Dipendenza e branch previsto | Dopo C21; `milestone/22-packaging-defaults`. |
| Checkpoint e versione previsti | `milestone/C22`; versione applicativa invariata. |
| Attività | `package-windows.yml:12` e `package-macos.yml:12` hanno `default: "0.3.0"`. `package-macos.yml:7` descrive ancora lo SHA della 0.3.0. `package-windows.yml:23` usa `windows-latest`. `package-macos.yml:24` usa già `macos-15`, con il commento che è l'immagine Apple Silicon. Aggiornare o togliere il default di versione, aggiornare la descrizione e fissare l'immagine Windows a una versione esplicita. Lasciare `macos-15` finché un aggiornamento dell'immagine non è deciso a parte. I workflow restano `workflow_dispatch`, con `contents: read`. |
| Criteri di accettazione | Nessun default punta ancora a 0.3.0. La descrizione non cita uno SHA di una release precedente come valore operativo. L'immagine Windows è un'etichetta fissa. Un push o una pull request non avviano i workflow. |
| Test richiesti | Lettura statica dei due YAML. Nessun `workflow_dispatch` di prova. |
| Documentazione | `PLAN.md`, MAP e `SECURITY_MODEL.md` se cambia il perimetro dei workflow. |
| Stato | `M22`, solo pianificata; implementazione non avviata. |

| Campo | M23 — Esclusioni Git di ambienti e chiavi |
| --- | --- |
| Numero e obiettivo | M23 — PC-17, gravità bassa, verificata. Ignorare file di ambiente e chiavi private che oggi `.gitignore` non elenca. |
| Dipendenza e branch previsto | Dopo C22; `milestone/23-gitignore-secrets`. |
| Checkpoint e versione previsti | `milestone/C23`; versione applicativa invariata. |
| Attività | Su `d200abe` è stato verificato che `.gitignore` non contiene `.env`, `*.pem`, `*.key` né `*.p12`, e che quei nomi non risultano tracciati. Aggiungere `.env`, `.env.*` con l'eccezione `!.env.example`, `*.pem`, `*.key`, `*.p12` e `*.pfx`. Non trattare `.gitignore` come unico filtro dei segreti e non rimuovere dalla storia eventuali segreti già committati senza una decisione separata. |
| Criteri di accettazione | Gli schemi `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `*.p12` e `*.pfx` sono presenti. `.env.example` resta tracciabile. I file già voluti nel pacchetto o nei documenti restano tracciati. |
| Test richiesti | Controllo statico di `.gitignore` e di `git check-ignore` su percorsi finti, compresi `.env.local`, `.env.example` e un `*.pfx`, fuori dal contenuto reale del repository. La verifica che i nomi della baseline non fossero tracciati resta quella fatta su `d200abe`. |
| Documentazione | `SECURITY_MODEL.md` e MAP, con il limite che `.gitignore` non è un filtro dei segreti già presenti nella storia. |
| Stato | `M23`, solo pianificata; implementazione non avviata. |

| Campo | M24 — Prebuild di node-pty su macOS |
| --- | --- |
| Numero e obiettivo | M24 — PC-18, gravità bassa, sospetta. Usare una prebuild di `node-pty` su macOS quando è compatibile con l'ABI di Electron, e ricompilare solo come ripiego. |
| Dipendenza e branch previsto | Dopo C23; `milestone/24-macos-pty-prebuild`. |
| Checkpoint e versione previsti | `milestone/C24`, `v0.3.17`; incremento `+0.0.1`. |
| Attività | `scripts/install-native.mjs:40-43`: `shouldRebuildForElectron` restituisce falso solo su Windows quando le tre prebuild ci sono; su Darwin restituisce sempre vero. La ricompilazione chiede i Command Line Tools di Xcode, che di solito richiedono un amministratore. Se una prebuild pubblicata è compatibile con l'ABI di Electron, usarla; la ricompilazione resta il ripiego quando la prebuild manca o non coincide. |
| Criteri di accettazione | Su Darwin, con prebuild compatibile, lo script non lancia la ricompilazione. Senza prebuild compatibile, la ricompilazione resta il percorso documentato. Windows conserva il comportamento attuale delle tre prebuild. Il workflow macOS continua a produrre `plancia-comandi.app` senza identità di firma. |
| Test richiesti | Test dello script con prebuild presente, assente e di ABI diversa. Suite e build. Smoke del pacchetto macOS ARM64 fuori dal checkout quando la milestone pubblica una release; in assenza di un Mac locale, registrare il limite e usare il workflow solo se Glauco lo chiede. |
| Documentazione | README, manuali IT/EN, quick start, MAP, `SECURITY_MODEL.md`, PLAN e versione. |
| Stato | `M24`, solo pianificata; implementazione non avviata. |

| Campo | M25 — Tag documentali e copia dello standard |
| --- | --- |
| Numero e obiettivo | M25 — PC-19, gravità bassa, verificata. Documentare l'eccezione dei tag `docs/*` oppure citare lo standard per versione, al posto della copia committata. |
| Dipendenza e branch previsto | Dopo C24; `milestone/25-doc-tag-policy`. |
| Checkpoint e versione previsti | `milestone/C25`; versione applicativa invariata. |
| Attività | Sul remoto ci sono i tag annotati `docs/2026-11-10` (oggetto `ab100132e39d5906a833db5dca60c5cf4039ecb3`, commit `05062668b528d737d5c702673657bfd2b3dbaf8e`), `docs/security-roadmap-2026-11-13` (oggetto `08682a313eebf036136f11ab76d56f4c20b8426b`, commit `970c450add36f3036c796454d3535ca39a566c0a`) e `docs/desktop-fixes-plan-2026-11-13` (oggetto `dbd7d28b8fa1e9301d392ab45323120b8e1bbe06`, commit `d200abe611ef92220d9aa902f9f858192caee06b`). Non seguono `vX.Y.Z` né `milestone/C<n>`. Il repository contiene anche `STARTUP_PREFERENCES_HOME.md`, 38056 byte, che può divergere dall'originale. L'eccezione `docs/*` è una decisione di Glauco, che ha chiesto il tag `docs/plan-vesta-baseline-2026-11-13` per questa patch di piano. M25 documenta quell'eccezione, lasciando invariati i tag già pubblicati, oppure cita lo standard per versione al posto della copia committata. Il tag non viene creato da questa pianificazione. |
| Criteri di accettazione | Il piano e `AGENTS.md` descrivono l'eccezione `docs/*` come decisione di Glauco, compreso il tag che ha chiesto per questa patch. I tag `vX.Y.Z` e `milestone/C<n>` già pubblicati restano al loro commit. Nessun tag pubblicato viene spostato. |
| Test richiesti | `git diff --check` e controllo dei documenti obbligatori, dei link e dell'equivalenza IT/EN. Nessun test applicativo. |
| Documentazione | `PLAN.md`, `AGENTS.md` e, se si toglie la copia, i punti che oggi rimandano a `STARTUP_PREFERENCES_HOME.md`. |
| Stato | `M25`, solo pianificata; implementazione non avviata. |

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

#### 4.1 Esiti C3 (già M3) — 13 novembre 2026

- [x] Identità Git/GitHub privata, base main e checkpoint C2 remoto verificati; modifica al piano preservata nel branch M3.
- [x] Icona, sei screenshot IT/EN, versione 0.3.1 e documentazione completati; manifesto delle catture controllato.
- [x] Installazione, 136 test, build e verifiche Electron isolate completati; omissioni e vulnerabilità segnalate nella voce C3.
- [x] Commit M3 `cc037278633d6b43e279eb66539c05d50d4364e8` e diff presentati; prova personale Windows di Glauco riuscita con profilo separato.
- [x] Prima approvazione esplicita di Glauco il 13 novembre 2026; autorizzati merge, tag, push, release 0.3.1 e rimozione del branch dopo le verifiche.
- [x] Passaggio M3 → C3 registrato in IT/EN per il nuovo commit locale.
- [x] Nuovo hash `1155fc248acefe25ac7cc2068ca750d93150a46e` e diff presentati; seconda approvazione esplicita ricevuta prima di pubblicare.
- [x] Merge fast-forward e push di main verificati. Workflow macOS necessario per questa macchina Windows; workflow Windows necessario per provare l’installer in ambiente pulito, preservando la 0.3.0 locale in uso. Entrambe le run riuscite.
- [x] Installer/portable Windows x64 e DMG/ZIP macOS ARM64, smoke e SHA-256 verificati prima dei tag. Portable provato anche su Windows locale; entrambi gli EXE risultano NotSigned. ZIP macOS integro e contenuti verificati dopo il download; nel confronto con Windows, due file di testo differiscono solo nei terminatori di riga.
- [x] Tag annotati milestone/C3 e v0.3.1 verificati sul commit finale; release latest [v0.3.1](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.1) pubblicata con sei allegati e digest remoti corrispondenti ai file locali.
- [x] Branch M3 rimosso dopo le verifiche; gli altri branch preesistenti sono preservati.
- [x] Percorsi di `out/m3/` e delle due directory temporanee della prova portable presentati per conferma separata della pulizia; cancellazione subordinata alla risposta esplicita, distinta dall’approvazione della rimozione del branch.

#### 4.2 Esiti C4, già M4 — 13 novembre 2026

- [x] Identità privata, main e checkpoint C3 remoto verificati; branch M4 da main, worktree iniziale pulito.
- [x] Pagina statica, 78 chiavi IT/EN, temi, galleria, icone e link implementati; documentazione aggiornata, versione desktop 0.3.1 invariata.
- [x] 149 test, build, controllo struttura del sito, prefisso Pages e link pubblici riusciti.
- [x] Verifica locale in Electron Chromium isolato: 40 combinazioni HTTP/file, IT/EN e chiaro/scuro a cinque dimensioni, clic, tastiera, persistenza e footer. Browser integrato non disponibile; altri browser/piattaforme non verificati. Sito pubblico verificato separatamente in 8 combinazioni IT/EN, chiaro/scuro e desktop/mobile.
- [x] Commit M4 `fbcdc832bce9697c2276e5948e3751af0d9e7355` controllato e approvato da Glauco il 13 novembre 2026; operazioni di chiusura autorizzate dopo le verifiche.
- [x] Passaggio M4 → C4 con riepilogo, verifiche, limiti, versione e checkpoint in un nuovo commit locale.
- [x] Hash `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455` e diff presentati; seconda approvazione esplicita ricevuta prima di push, merge o tag.
- [x] Merge fast-forward e push main verificati; Pages `main:/docs` abilitato. Deploy gestito `43431582012` riuscito sul commit approvato; HTTPS obbligatorio e 14 risorse pubbliche verificate byte per byte.
- [x] ZIP del sito generato dal commit finale main: 16 file estratti identici ai sorgenti e smoke riuscito; SHA-256 verificato. Checkpoint annotato `milestone/C4` e release del sito `444250016` pubblicati; due allegati riscaricati e verificati, latest desktop v0.3.1 preservata.
- [x] Branch M4 locale rimosso dopo le verifiche e l’approvazione; nessun branch M4 remoto da rimuovere.
- [x] Percorso temporaneo `out/m4/` presentato per conferma separata di pulizia; contenuti preservati, compresi ZIP e checksum locali già pubblicati su GitHub.

### 5. Versioni, CI e distribuzione

Usare `+0.0.1` per patch, `+0.1.0` per funzionalità minori e `+1.0.0` per cambi principali. Una modifica esclusivamente documentale può lasciare invariata la versione e non richiede una release. Per milestone o patch applicative concluse pubblicare una release secondo le preferenze HOME; se l'app non è utilizzabile, indicarla come prerelease. Non configurare firma, notarizzazione o aggiornamenti automatici senza credenziali e processo espliciti.

Il workflow `package-windows.yml` si avvia manualmente per un tentativo di costruzione Windows non equivalente in locale. Non parte su push o PR. La run `43226304320` ha prodotto i pacchetti Windows della release v0.3.0 e ha verificato anche il portable e l'app installata. Il workflow `package-macos.yml` si avvia solo manualmente sul runner `macos-15` per DMG e ZIP ARM64 non firmati; non parte su push o PR. È stato eseguito nella run `43257940568` e gli artifact sono nella release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). Il piano di chiusura di M2 approvato il 12 novembre 2026 prevede questa build remota riproducibile per gli artifact della release v0.3.0, con SHA-256, accanto al workflow Windows: consuma minuti solo quando viene avviato. Le verifiche macOS ARM64 della release `v0.2.0` sono locali. Altri workflow richiedono una motivazione distinta. Non dichiarare un pacchetto verificato sulla sola base di `npm run build`.

## English

This plan records the existing Plancia Comandi baseline and future work. Application version: **0.3.1**, published on 13 November 2026. Milestone **C1** was merged into `main` at `4aabc9bc81a60b0c574221ce37578936341ae065`; remote tags `milestone/C1` and `v0.2.0` and the source release exist. **C2** stays the entry Glauco decided, with no further promotion. Release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) was published on 12 November 2026 at commit `94ff1e44106f08fdcf961cab74171668112ad780`; tags `v0.3.0` and `milestone/C2` point at that commit. **C3** (UI icon and screenshots), formerly M3, received Glauco's first approval on 13 November 2026 at commit `cc037278633d6b43e279eb66539c05d50d4364e8`; second approval of commit `1155fc248acefe25ac7cc2068ca750d93150a46e` was received in the same session. Main, tags `milestone/C3` and `v0.3.1`, release and M3 branch removal are verified; **C4** (GitHub Pages landing page), formerly M4, is published at approved commit `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, with HTTPS site, `milestone/C4` checkpoint, site release and branch removal verified; desktop version remains 0.3.1. Vesta's baseline of 13 November 2026, analyzed on `e967d92` and rechecked on `d200abe`, is planned in section 2.4 and has not been started. M13 and M14 are brought forward to immediately after C5, stay separate milestones and are not started. M18 follows numeric order. Proposals do not authorize any other code changes.

**Contents**

- [1. Baseline and current work](#1-baseline-and-current-work)
- [2. Milestones and proposals](#2-milestones-and-proposals)
- [2.1 Planned security milestones](#21-planned-security-milestones)
- [2.2 Planned desktop fixes](#22-planned-desktop-fixes)
- [2.3 Proposals and remaining work](#23-proposals-and-remaining-work)
- [2.4 Vesta baseline of 13 November 2026](#24-vesta-baseline-of-13-november-2026)
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
- Status: tooling approved at `90cfe3af09526a792d495f0d37f5fa48bc6d3ea2`, merged into `main` as `830af0952c384ac27f0af62fac66cffe98da9dc7` (PR #3). macOS packages and SHA-256 published and successfully downloaded again. The first Windows run, `43086813880`, passes installation and build but fails because PowerShell splits `-c.nsis.runAfterFinish=false` and electron-builder opens that remainder as a configuration file. PR #5 is merged as `45f6575c4f14015c6cc9cb7bc45de3604a97a87e` and replaces those arguments with a JSON file and `--config` plus only the path. Run `43096382710` on that commit is `startup_failure` with no jobs, so that command was not executed. The Windows package for 0.2.0 was not published. For 0.3.0, run `43226304320`, with tooling `49ca65d6f5ae06ea9d6d22de4dd7af2cf38b4dba`, succeeded and its artifacts are in release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). C2 does not duplicate the JSON: the step calls `scripts/package-windows.mjs`. PR #4 was closed without merging on 12 November 2026. The work branches were deleted.

### 2. Milestones and proposals

C1, formerly M1, is merged and published as source. C2, formerly M2, is approved for closure and stays separate from the C1 packaging patch. Release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0), tags `milestone/C2` and `v0.3.0`, are published. C3 is closed and published; C4 is published and uses the icon and screenshots updated in C3. The proposals below do not become executable on their own.

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
| Status | `C1`. Glauco's first approval on November 11, 2026, on PR #1 at head `5c61783817db2a33deba8393abd694a3a3270028`. Glauco's words: “M1 funziona correttamente”. Second approval recorded in the PR and release notes on November 11, 2026; merge and tags completed. Packages are tracked in the patch below. |

**Summary.** Copy, paste and drag-and-drop in the terminals; Edit menu and context menu; clipboard images saved in a dedicated folder; One, Side by side, Stacked and Grid views.

**Checks.** `npm test` 70/70; `npm run build` passed, with the renderer bundle warning above 500 kB. These checks are not an automatic macOS or Windows verification.

**Residual limitations.** macOS and Windows were not verified automatically; installers are unsigned. Items then deferred to M2 and later recorded in C2: CSP; sender checks on IPC channels that predate C1; a cap on the paste FIFO queues; a test of the alternating sequence and of the orphan gesture; a residual-risk line in `SECURITY_MODEL.md`.

**Version and tags.** Version **0.2.0**. Tags `v0.2.0` and `milestone/C1` are published at merge commit `4aabc9bc81a60b0c574221ce37578936341ae065`, verified remotely. Verified packages are added to the existing release.

| Field | C2 — Renderer boundaries and paste |
| --- | --- |
| Number and title | C2 — Renderer boundaries and paste |
| Goal | Stop the renderer from loading remote content or unexpected scripts, accept IPC that predates M1 only from the app window and only with a valid payload, cap the length of the paste FIFO queues, and allow Windows installation and packaging without a compiler and without administrator privileges. |
| Branch | `milestone/2-security-paste-hardening`, created from commit `0b8fa43b91fe2236f2d31df2959948247348bfdf`. The pull request is based on `main` after the C1 merge `4aabc9bc` and, in this closure, also after the merge of `45f6575c`. |
| Planned checkpoint tag | `milestone/C2` and `v0.3.0`, published at commit `94ff1e44106f08fdcf961cab74171668112ad780`. |
| Version increment | `+0.1.0`, from 0.2.0 to **0.3.0**. |
| Tasks | Restrictive CSP in production and on the Vite server; no `unsafe-eval`; `unsafe-inline` for scripts only in development, for the React Fast Refresh preamble; `unsafe-inline` for styles in production as well because xterm.js's DOM renderer writes the theme and contrast into the page; sender and payload checks on every IPC channel that predates M1, both `handle` and `on`; a cap of 64 on the paste FIFO queues; isolated negative tests; on Windows, use the N-API prebuilds in `node-pty` 1.1.0, without `node-gyp`, with `npmRebuild: false` and a postinstall that rebuilds only when the Windows prebuild is missing (`scripts/install-native.mjs`); the app icon in `build/`; Windows packaging through `scripts/package-windows.mjs`, with no `-c.*` arguments. |
| Acceptance | The production policy contains no `unsafe-eval`, no remote hosts and no `unsafe-inline` for scripts. Development talks only to the `127.0.0.1` loopback. A sender other than the app window receives no data and runs no action. An invalid payload does not reach the manager, the dialog or the shell. Paste queues do not grow past 64 halves. Terminals and themes keep working: the style exception is documented. On Windows, without a compiler, `npm ci`, `npm test`, `npm run build`, `npm run dev` and `npm run dist:win` do not invoke `node-gyp`. Linux, which has no prebuild, still compiles. |
| Tests | `npm ci`, then `npm test` **126/126** and `npm run build` passed on the branch after merging `main` `45f6575c`, with the renderer bundle warning above 500 kB. Node.js for that check: 22.23.4. Not run, because they do not replace an application smoke test: DevTools with no CSP violations, terminals, themes and paste on Linux, macOS and Windows; Electron smoke; a Linux, macOS or Windows package; checksums. The manual checklist is in the pull request. It has not been tested in person on Linux. |
| Documentation | `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `QUICK-START_Desktop.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `AGENTS.md`. There is no `CHANGELOG`. |
| Status | `C2`. Glauco approved closing M2 on November 12, 2026, including the release and branch cleanup. Afterwards: PR #2 merged, tags created, release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) published, PRs #6 and #7 merged, PR #4 closed without merging, and the work branches deleted. The entry stays `C2`. |

**Summary.** Renderer CSP; sender and payload checks on IPC that predates M1; a cap of 64 on the paste queues; Windows `node-pty` prebuilds without `node-gyp`; PNG, ICO and ICNS icons; the Linux procedure; Windows packaging from the Node script. Generated files: `build/icon.png` 1914419 bytes, `build/icon.ico` 154378 bytes, `build/icon.icns` 1700498 bytes.

**Checks.** `npm ci` passed on Linux and rebuilt `node-pty` for Electron. `npm test` 126/126. `npm run build` passed, with the renderer bundle warning above 500 kB. This is not a window smoke test or a package.

**Residual limitations.** It has not been tested in person on Linux. The published Windows package is the one from run `43226304320`: the workflow checked the unpacked executable, the portable executable and the installed app. A personal trial on a Windows PC is not recorded. On macOS, run `43257940568`, tooling `95500826ba986a4ef4addceda8840188595ee2c7`, ran smoke tests and inspection only on the unpacked app.

**Technical debt.** Notes from Vulcano, recorded here and not corrected in the code.

- On macOS, smoke tests and inspection run only on the unpacked app, not on the DMG or the ZIP. On Windows, the workflow also checks the portable executable and the installed app.
- `json5` is not in `devDependencies`.
- The smoke test does not set `HOME` in the process environment.
- Packaging tests import internal `electron-builder` modules.
- `mac.executableName` is not handled in a general way: today `MAC_APP_NAME` is aligned with the top-level `executableName`.
- Explicit test cases for the Windows entries `\.git\config` and `\settings.json` are missing.
- Loading `@electron/asar` depends on npm hoisting.
- The test run on Linux covers only the posix branch of `archiveEntryPath`.
- On macOS, `npm ci` runs postinstall: the pointer is in the [README](README.md#2-installation-and-first-use).

**Version and tags.** Version **0.3.0**. Tags `milestone/C2` and `v0.3.0` are published at commit `94ff1e44106f08fdcf961cab74171668112ad780`. The release is [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0).

| Field | C3 — UI icon and updated screenshots |
| --- | --- |
| Number and title | C3 — UI icon and updated screenshots |
| Goal | Align the icon displayed in the app with the one introduced in release 0.3.0 and update the README images that still show the old icon. |
| Planned branch | `milestone/3-ui-icon-screenshots`, created from `main` at `e9fb4fa273913db688f846751f05e1de8a5fc888`. Remotely verified `main` and annotated checkpoint `milestone/C2`, which resolves to `94ff1e44106f08fdcf961cab74171668112ad780`. |
| Planned checkpoint tag | `milestone/C3` and `v0.3.1`, annotated and published at commit `1155fc248acefe25ac7cc2068ca750d93150a46e`, also verified on remote main. |
| Version increment | `+0.0.1`, from 0.3.0 to **0.3.1**, for the app's visual correction. Version synchronized in source and documentation; release [v0.3.1](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.1) is published. |
| Tasks | Replaced the old sidebar SVG with `public/icon.png`, an identical copy of `build/icon.png`, at 36×36 without distortion, decorative and not draggable. Six new unmodified production-renderer captures: dark, light and settings, in IT and EN. README links to images in the corresponding language; provenance, dimensions and SHA-256 in `docs/screenshots/capture.json`. Corrected an existing test that assumed Unix separators so the suite runs on Windows. |
| Acceptance | The UI displays the same icon as the 0.3.0 packages, without distortion or clipping and with legibility in both themes. All README screenshots represent the updated UI; none shows the old branding or private data. Links and images work in both language sections. |
| Required tests | `npm ci` passed with Node.js 24.18.1 and npm 12.2.1; Windows node-pty prebuild. Electron 45.2.3 runtime installed through its own script because it was absent after npm ci. `npm test` **136/136**; `npm run build` passed with the renderer warning above 500 kB. Electron Windows x64: image loading, proportions, alternative text, both themes, IT/EN, settings and 1440×900, 1280×820, 860×560 viewports (12 combinations); long names, New session dialog focus and tooltip attributes. HOME, appData and userData isolated before main, filtered environment and PTY with a generated demonstration executable; no real user shell or credentials. |
| Documentation | README with IT/EN images and source status distinguished from the release; manuals, quick start, map, security model and AGENTS synchronized to 0.3.1; capture manifest. C1/C2 history and proposals P1–P3 are preserved. |
| Status | `C3`. Glauco tested commit `cc037278633d6b43e279eb66539c05d50d4364e8` on Windows with a profile separate from the running 0.3.0 instance and on 13 November 2026 confirmed “perfetto. Funziona.”, authorizing commit, merge, tags, push, release and branch removal. Second approval received for commit `1155fc248acefe25ac7cc2068ca750d93150a46e`; fast-forward merge and push to main verified. Tags and release 0.3.1 published; local M3 branch removed, with no remote M3 branch to delete. Windows workflow `43407182864` and macOS ARM64 workflow `43407014450` passed at the approved commit. Four packages and two SHA-256 manifests downloaded and checked; all six GitHub asset digests verified. Portable also tested on local Windows outside the checkout with isolated preferences and a fixture PTY; no local installation. Not run: personal macOS/Linux checks, a real AI CLI and native-tooltip appearance; macOS smoke covers the unpacked app, not launching from the DMG/ZIP. Installation reports 9 vulnerabilities (7 moderate and 2 critical) in existing dependencies; no dependency updates included. Cleanup of local temporary files (`out/m3/` and portable-test directories) requires separate confirmation. |

| Field | C4 — GitHub Pages landing page |
| --- | --- |
| Number and title | C4 — GitHub Pages landing page |
| Goal | Present Plancia Comandi through a landing page publishable on GitHub Pages, consistent with Glauco's other projects and using [theNovelist](https://thenovelist.glaucosilvestri.it/) as a reference. |
| Dependency and planned branch | Branch `milestone/4-github-pages-landing` created from main `2f7ce38fa4b787c2c48749333bf79bf444843c61`, after remotely verifying the C3 checkpoint at `1155fc248acefe25ac7cc2068ca750d93150a46e`. C3 icon and six screenshots reused without modification. |
| Planned checkpoint tag | `milestone/C4`, annotated and published at approved commit `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, also verified on remote main. No new desktop version tag for the landing page alone. |
| Version increment | No application increment for the site and documentation: retain the version resulting from C3, expected to be **0.3.1**. No new desktop release for this documentation-only milestone. |
| Site release | Explicitly requested by Glauco on 13 November 2026: `milestone/C4` release titled “C4 — Landing page”, with `PlanciaComandi-site-C4.zip` and `SHA256SUMS-Site.txt`, static source and Apache-2.0 license. Latest desktop release remains v0.3.1; no new semantic tag. Release [C4 — Landing page](https://github.com/gloutchov/Plancia-Comandi/releases/tag/milestone/C4), ID `444250016`, published on 13 November 2026. ZIP generated from the verified final main commit; 16 extracted files matched Git source bytes and isolated smoke passed before tagging. ZIP SHA-256: `5afcd5b43087f57d2343d6ad2466d336e07f3a31181116ab141d9af8ea341f26`. Remote digests and downloads of both assets verified. |
| Tasks | Visually inspect theNovelist and adapt its layout, typography, spacing and controls to Plancia Comandi. Prepare a static page with an introduction, features, captioned screenshots, quick start, downloads and actual limitations. Provide complete IT/EN content, browser-language detection (Italian for IT, English otherwise), an `IT/EN` selector, system theme and persistent overrides. In the header: a sun/moon control and a home-icon link to `https://glaucosilvestri.it` with an accessible label; PNG and ICO favicons consistent with the app. |
| Links and content | Link the repository, available release and the manual for the selected language (`ISTRUZIONI.md` or `INSTRUCTIONS.md`). Describe only implemented features, distinguishing platforms, architectures, signing status and verified limitations. Repository verified public through the GitHub API; six package and checksum URLs verified with anonymous HTTPS HEAD requests returning 200. Previous documentation references to a private repository corrected, without changing its visibility. |
| Hosting and publication | Define the site directory and verify GitHub Pages availability under the repository's current visibility and account plan, without assuming it will become public. Use Pages-compatible URLs and paths; any dedicated domain, `CNAME` and DNS remain to be defined with Glauco. Choose the minimum necessary publication method; justify any Pages workflow before introducing it. Publish only after final-commit review and approval, and verify HTTPS, assets and links on the actual site. |
| Acceptance | Style compared with the reference; readable page without overflow on desktop and mobile, in both themes and languages. Persistent selectors, keyboard navigation, visible focus and alternative text work. Screenshots come from C3 and no old icon remains. The published page loads all assets and correctly presents links and any download-access restrictions. |
| Required tests | Local preview and desktop/mobile visual checks in IT/EN and light/dark; automatic and manual language and theme controls, persistence, keyboard, links, anchors, images and favicons. Check paths under the Pages prefix and, after deployment approval, HTTPS and missing resources on the public site. No private-data captures or loading of real preferences or terminals. |
| Documentation | `README.md`, `PLAN.md`, `MAP.md`, `QUICK-START_Desktop.md`; `SECURITY_MODEL.md` for hosting, network and site-preference storage; IT/EN manuals and `AGENTS.md` if instructions or operating procedures change. |
| Status | `C4`, formerly M4, closed and published. First approval received for `fbcdc832bce9697c2276e5948e3751af0d9e7355`; second explicit approval received on 13 November 2026 for `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, before merge, push or tags. Main fast-forwarded and verified remotely; annotated `milestone/C4` tag at the same commit. Static IT/EN landing in `docs/`, with 78 matching keys, automatic and manual theme, C3 gallery, updated icon and centered credit. Deferred classic scripts also work when opening the HTML directly. `npm test` 149/149 and site checks passed; desktop build had passed before static corrections, with the renderer warning above 500 kB, and was not repeated for documentation closure. Forty isolated Chromium HTTP/file combinations checked across both languages/themes and five sizes. Pages `main:/docs` enabled without CNAME, DNS changes or additional workflows: [managed deployment 43431582012](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43431582012) passed at the approved commit; [HTTPS site](https://gloutchov.github.io/Plancia-Comandi/) with HTTPS enforced, 14 public assets identical to source and 8 public UI combinations passed. Site release published with verified ZIP and SHA-256; latest desktop remains v0.3.1. Local M4 branch removed after all checks; no remote M4 branch had been published. Other browsers/platforms unverified; no new desktop build, signing or notarization. Temporary files and local asset copies in `out/m4/` retained pending separate cleanup confirmation. |

#### 2.1 Planned security milestones

Glauco requested this plan on 13 November 2026 following the 0.3.1 source review: 149 tests passed, full audit with 9 affected toolchain packages (2 critical, 7 moderate), production audit with no findings and an isolated pathological-regex test exceeding 250 ms. Details and limitations are in the [security model](SECURITY_MODEL.md#7-checks-and-residual-risks). Planning does not fix the vulnerabilities.

PC-03, PC-04, PC-05, PC-08, PC-11 and PC-13 from the Vesta baseline are integrated into M5–M9. M13 and M14 are brought forward to immediately after C5 and stay separate milestones; M15–M25 stay in section 2.4 and M18 follows numeric order. Execute M5, then M13 and M14, then M6 → M7 → M8 → M9, each from main after verifying the preceding remote checkpoint and a separate start request. Versions 0.3.2–0.3.6 assume no intervening releases: confirm version and tags at start. Each closure follows both HOME reviews, release with assets/SHA-256 and documentation/landing aligned with the published version. Prefer local checks; justify any necessary CI beforehand, using existing packaging workflows without new automation for this plan.

**Shared constraint:** Windows signing, macOS signing and notarization are excluded because credentials are unavailable. Unsigned packages and system warnings are disclosed limitations that do not block acceptance; checksums and origin verification remain necessary. This plan authorizes no signing, notarization or automatic-update configuration.

This patch uses `patch/0.3.1-security-roadmap`, from main `d954c2eaee23276d5c5bad43e746e56211f7bdd1` after verifying the C4 checkpoint. It changes documents only, retains version 0.3.1 and plans annotated documentation tag `docs/security-roadmap-2026-11-13` at the approved commit; no milestone is started and no new application release is planned.

| Field | M5 — Updated Electron runtime |
| --- | --- |
| Number and goal | M5 — Update the shipped runtime while preserving terminals, bridge and preferences in supported packages. |
| Vesta finding | PC-03, medium severity, verified and already tracked here. On `d200abe`, as on `e967d92`, `package.json:42` is `"electron": "45.2.3"`. This is not a second milestone. |
| Dependency and planned branch | After C4 and this approved documentation patch; `milestone/5-electron-runtime`. |
| Planned checkpoint and version | `milestone/C5`, `v0.3.2`; increment `+0.0.1`. |
| Tasks | Assess Electron 45.3.2, available at review time, or a newer maintained release; inspect official notes and Chromium/Node/V8 fixes. Vesta notes Chromium/V8 security backports and a `webRequest` redirect-loop fix in 45.3.0, and blocking of revoked eMudhra certificates in 45.3.1. Severity stays medium because the renderer does not load remote content. Update package and lockfile, Node requirements and native-module compatibility, then rebuild the packages. |
| Acceptance | Chosen version justified and pinned in the lockfile; isolation, sandbox and CSP preserved. PTY, startup, layouts, IT/EN and themes work in verified packages. The `--omit=dev` audit does not replace assessment of the embedded runtime. |
| Required tests | Reproducible installation, suite and build; inspect and smoke-test Windows x64/macOS ARM64 packages outside the checkout with isolated profiles and environments, without personal data or shells. No additional compatibility claims without evidence. |
| Documentation | README, IT/EN manuals, quick start, SECURITY_MODEL, MAP, AGENTS version references; PLAN and landing/downloads aligned with the verified release. |
| Status | `M5`, planned only; implementation not started. |

| Field | M6 — Toolchain dependency security |
| --- | --- |
| Number and goal | M6 — Reduce test and packaging tool risks while keeping project commands reproducible. |
| Vesta finding | PC-04, medium severity, already tracked and not verified by Vesta: Vesta did not run `npm audit`. It concerns `package.json` devDependencies. The plan and the security model count 9 development findings, 2 critical and 7 moderate, including Vitest, tinypool and minimatch (GHSA-5xrq-8626-4rwp, GHSA-85c8-ppgw-ccpr). This is not a second milestone. |
| Dependency and planned branch | After C14, so M13 and M14 stay immediately after C5 and before M6; `milestone/6-toolchain-security`. |
| Planned checkpoint and version | `milestone/C6`, `v0.3.3`; increment `+0.0.1`. |
| Tasks | Update Vitest and affected dependencies, including Tinypool and mocker; address minimatch in the electron-builder chain. Assess advisories, maintained versions and compatibility; avoid unverified `audit fix --force`, downgrades or overrides. |
| Acceptance | Compare full and production audits before/after; no applicable critical/high finding left unaddressed. Target zero findings; any residual requires exploit conditions, rationale, mitigation and Glauco's explicit decision. |
| Required tests | `npm ci`, suite and build; check script APIs, package contents and absence of test runners/build tools from the app. Smoke-test Windows x64/macOS ARM64 assets with isolated data. |
| Documentation | Requirements and lockfile; README, manuals, quick start, SECURITY_MODEL, MAP, PLAN, version references and landing consistent with the release. |
| Status | `M6`, planned only; implementation not started. |

| Field | M7 — Detection resilient to pathological regexes |
| --- | --- |
| Number and goal | M7 — Prevent an additional regex from blocking main and terminal management; implement the regex portion of P1. |
| Vesta finding | PC-05, medium severity, verified and already tracked here. `src/shared/status.ts:164-178`: `compilePatterns` and `matchesAny` run in main on terminal output. Those lines are unchanged from `e967d92` to `d200abe`. This is not a second milestone. |
| Dependency and planned branch | After C6; `milestone/7-regex-resilience`. |
| Planned checkpoint and version | `milestone/C7`, `v0.3.4`; increment `+0.0.1`. |
| Tasks | Isolate potentially blocking matching with an effective time budget, cancellation and fallback, or adopt a bounded engine. Preserve count/length limits and validate any new central parameters. A timer on the matching thread is not an effective timeout. In addition, without replacing this approach: consider validating length and nested quantifiers at startup, or a bounded engine such as RE2, and limit the length of text that is evaluated. |
| Acceptance | Invalid, expensive or oversized patterns do not freeze the app; understandable fallback and IT/EN message. Default detection preserved, queues/workers bounded and resources released on close. No additional dependency without justification. |
| Required tests | Review's pathological case in isolated, terminable execution; long input, many patterns, cancellation and reopening; detector regressions. Check window and bridge responsiveness with fixtures in both themes/languages. |
| Documentation | IT/EN manuals, relevant configuration, SECURITY_MODEL, MAP, PLAN and version references; landing if a presented behavior changes. |
| Status | `M7`, planned only; implementation not started. |

| Field | M8 — Robust preferences and protected diagnostics |
| --- | --- |
| Number and goal | M8 — Reduce preference loss and data disclosure through errors; implement the remaining planned portion of P1. |
| Vesta finding | PC-08, low severity, verified and already tracked here: `electron/settings.ts:96-103` (a read error returns the defaults) and `118-126` (direct `writeFileSync`). PC-13, low severity, verified, is only partly this entry: `electron/sessions.ts:208-211` sends the raw node-pty spawn message to the renderer, and that message can contain paths. Both stay in M8; there is no separate milestone. The lines are unchanged from `e967d92` to `d200abe`. |
| Dependency and planned branch | After C7; `milestone/8-settings-diagnostics`. |
| Planned checkpoint and version | `milestone/C8`, `v0.3.5`; increment `+0.0.1`. |
| Tasks | Write settings.json atomically with a temporary file and replacement in the same directory; before falling back to the defaults, keep a `.bak` copy of the corrupt file. Bound size before JSON reading and handle corrupt files/errors. Define boundaries and permissions; normalize errors/logs to avoid private paths, sensitive variables and unnecessary user content. For PC-13, the renderer receives an error code; the detail stays in the local log. |
| Acceptance | A write failure preserves the last valid configuration; oversized/corrupt files have documented fallbacks. Before falling back to the defaults, a `.bak` copy of the corrupt file is kept. For a node-pty spawn failure the renderer receives an error code; the raw message stays in the local log. Useful localized errors without sensitive details; no credential storage or diagnostic upload to external services. |
| Required tests | Temporary filesystem: size boundaries, invalid JSON, denied permissions, interrupted writes/replacements and legacy migration. Synthetic data checks UI/log redaction; IT/EN and light/dark preference regressions. |
| Documentation | Manuals, recovery quick start, SECURITY_MODEL, MAP, PLAN, version references and landing where relevant. |
| Status | `M8`, planned only; implementation not started. |

| Field | M9 — Verified IPC/CSP boundaries and packages |
| --- | --- |
| Number and goal | M9 — Make security checks on distributed packages repeatable and fix scoped gaps; incorporate the security/package portion of P3. |
| Vesta finding | PC-11, low severity, verified. `electron/main.ts` does not call `setPermissionRequestHandler` or `setPermissionCheckHandler`. That is already M9's "unnecessary permissions" task: deny by default. This is not a second milestone. On `d200abe` the file has no new line for this compared with `e967d92`. |
| Dependency and planned branch | After C8; `milestone/9-package-security`. |
| Planned checkpoint and version | `milestone/C9`, `v0.3.6`; increment `+0.0.1`. |
| Tasks | Test live IPC with invalid senders, frames/origins and payloads, strengthening checks where needed. Verify enforced CSP, navigation/popup blocking and unnecessary permissions: for PC-11, deny permission requests and checks by default. Strengthen Windows x64 installer/portable and macOS ARM64 DMG/ZIP inspection/smoke, with isolated HOME/appData/userData and no private files/development tools. |
| Acceptance | Rejected requests have no privileged effects; every requested or checked permission is denied. Renderer protections work in packages and isolated tests are repeatable. Assets/SHA-256 match the approved commit. Signing/notarization excluded; Linux, Intel macOS and further functional cases remain P3 unless explicitly verified, with no new compatibility promises. |
| Required tests | Native Windows x64/macOS ARM64 matrix, distributed formats and smoke outside the checkout; negative IPC/CSP and package-content cases. An explicit test that `setPermissionRequestHandler` and `setPermissionCheckHandler` deny every permission. Address known script limitations listed in the security model; use only fixtures/temporary profiles, without credentials or real sessions. |
| Documentation | SECURITY_MODEL with platform evidence/limitations, MAP scripts/tests, installation manuals/quick start, README/PLAN and landing for verified packages only. |
| Status | `M9`, planned only; implementation not started. |

#### 2.2 Planned desktop fixes

Glauco requested these additions to the plan on 13 November 2026: on Windows the running app still shows the Electron icon; installed Windows and macOS apps are named `plancia-comandi`; on macOS the 0.3.1 window stays at the center of the screen and cannot be dragged. These are user reports to reproduce against the packages, not proven causes or resolved issues.

Execute M10 → M11 → M12 after C9, each on a dedicated branch after verifying the preceding remote checkpoint and a separate start request. Versions 0.3.7–0.3.9 are tentative, following M5–M9 with no intervening releases: confirm them at start. If an earlier milestone already resolves an issue, verify it in the package and record the evidence without unnecessary changes. Follow HOME review and publication; each application release requires verified packages and SHA-256. Signing and notarization remain excluded because credentials are unavailable. This addition changes only the plan on `patch/0.3.1-desktop-fixes-plan`, retaining application version 0.3.1; it does not start the three implementations or publish a release.

| Field | M10 — Correct icon in the running Windows app |
| --- | --- |
| Number and goal | M10 — Show the Plancia Comandi icon while the Windows app is running, replacing the Electron icon reported by the user. |
| Dependency and planned branch | After C9; `milestone/10-windows-runtime-icon`. |
| Planned checkpoint and version | `milestone/C10`, `v0.3.7`; increment `+0.0.1`. |
| Tasks | Reproduce on Windows x64, distinguishing the window, taskbar, Alt+Tab and shortcuts. Check the icon embedded in the EXE, the asset supplied to BrowserWindow and its inclusion in the package, plus AppUserModelID consistency. Correct paths, format or resources as necessary; check existing pinned shortcuts and caching without deleting data or making global system changes. |
| Acceptance | Installer and portable show the correct icon while running, in the taskbar and Alt+Tab; no Electron icon in the window where the system displays one. Clean installation verified and existing-shortcut behavior documented. No regression in the macOS icon, terminals or window controls. |
| Required tests | Suite and build; proportionate automatic checks of resource selection/paths and package contents. Native visual checks of the Windows installer and portable outside the checkout, IT/EN and light/dark, with isolated profile/environment; check taskbar and Alt+Tab, beyond the sidebar alone. macOS ARM64 smoke for the cross-platform release; artifact SHA-256. |
| Documentation | README, IT/EN manuals, quick start and PLAN for results/limitations; MAP if resources/scripts/tests change; SECURITY_MODEL for distribution changes; version, AGENTS and landing/downloads aligned with the release. |
| Status | `M10`, planned only; implementation not started. |

| Field | M11 — Installed Windows and macOS app names |
| --- | --- |
| Number and goal | M11 — Name installed apps **Plancia Comandi** on Windows and macOS. **PlanciaComandi** is the user's requested fallback only if the spaced name has a demonstrated technical limitation. |
| Dependency and planned branch | After C10; `milestone/11-installed-app-name`. |
| Planned checkpoint and version | `milestone/C11`, `v0.3.8`; increment `+0.0.1`. |
| Tasks | Check productName, executableName and generated metadata: EXE name, shortcuts and Windows uninstall entry; .app bundle name, CFBundleName/CFBundleDisplayName and macOS executable. Align the visible name and update packaging/inspection/smoke scripts and tests assuming `plancia-comandi` or `plancia-comandi.app`. Test paths with spaces; preserve appId, access to existing preferences and upgrade/removal without unconfirmed deletion. |
| Acceptance | After installation, launch and relaunch, the visible name is **Plancia Comandi** on both platforms: Applications bundle, macOS Dock/menu, Windows executable/shortcuts, taskbar and uninstall entry where applicable. Windows portable is consistent. Any fallback to **PlanciaComandi** requires a reason and evidence of the limitation; do not use it for convenience. Preferences retained and no unmanaged duplicate installations in the documented upgrade path. |
| Required tests | Suite and build; targeted name/path-with-spaces tests, metadata inspection and a search for assumptions in scripts. Clean install and upgrade from 0.3.1 using copies of synthetic profiles, launch outside checkout, shortcuts and removal on Windows x64/macOS ARM64; installer/portable and DMG/ZIP smoke, M10 icon check and SHA-256. Automatic tests must not use or modify personal installations or preferences. |
| Documentation | README, IT/EN manuals and quick start for new names, paths and upgrade/removal; MAP for scripts/tests; SECURITY_MODEL for distribution and preference handling; consistent PLAN, version, AGENTS and landing/downloads. |
| Status | `M11`, planned only; implementation not started. |

| Field | M12 — Draggable macOS window |
| --- | --- |
| Number and goal | M12 — Allow normal movement of the macOS window, correcting the fixed-at-center behavior reported in version 0.3.1. |
| Dependency and planned branch | After C11; `milestone/12-macos-window-drag`. |
| Planned checkpoint and version | `milestone/C12`, `v0.3.9`; increment `+0.0.1`. |
| Tasks | Reproduce the defect using the 0.3.1 package and compare against the runtime updated in M5. Check the hiddenInset title bar, drag/no-drag regions, overlays and interactions between sidebar, icon and window controls. Provide a recognizable drag area; limit changes to window management and related styles. |
| Acceptance | The window moves using the drag area, retains its position during use and does not forcibly return to the center. Check normal mode and restoration from minimized/maximized/full-screen states, distinguishing native full-screen mode from a draggable window. macOS buttons, clicks, terminal text selection, copy/paste and file drag-and-drop continue to work; interactive areas do not move the window. No Windows regression. |
| Required tests | Suite and build; proportionate tests for any new logic and native manual checks of actual macOS ARM64 window movement, with mouse/trackpad and an external display when available. DMG/ZIP packages outside checkout, isolated profile/environment, IT/EN, light/dark and supported desktop sizes; window-control and drag-and-drop regressions, Windows x64 smoke and SHA-256. A DOM-only test does not establish window movement. |
| Documentation | IT/EN manuals, quick start, README and PLAN for behavior/limitations; MAP for any modules/tests; SECURITY_MODEL if window boundaries or distribution change; version, AGENTS, screenshots and landing if affected. |
| Status | `M12`, planned only; implementation not started. |

#### 2.3 Proposals and remaining work

| Item | Goal for discussion | Proposed acceptance |
| --- | --- | --- |
| P1 — Security boundaries, incorporated into M7–M8 | Regex timeouts in M7; atomic preferences and diagnostics in M8. CSP, sender checks on IPC that predates M1 and the paste-queue cap remain C2. | Completion to be verified through C7/C8 with isolated negative tests and an updated model; no fixes attributed to planning. |
| P2 — Initial preferences | Align automatic language selection and move limits that are still in modules into the central file. C1 puts only the new clipboard, drop and input-size parameters in that file. PC-09 and PC-14 have dedicated milestones M17 and M20, not started: they still refer to P2 and do not replace it. | Italian on Italian systems, English otherwise, persistent override and validated configuration with tests. |
| P3 — Verified distribution, partly incorporated into M9 | IPC/CSP security and Windows x64/macOS ARM64 packages in M9. Further Linux/Intel macOS verification and uncovered notification, shortcut, shell and PTY cases still require planning. Signing and notarization excluded because credentials are unavailable. | Results separated by platform and format, without unverified compatibility claims. Remaining portions require a new decision before becoming milestones. |

Version, branch, checkpoint, tasks and tests for P1 and the security/package portion of P3 are defined in M7–M9. P2 stays a proposal: M17 and M20 plan only PC-09 and PC-14. The remaining portions of P3 stay proposals. These entries do not claim that controls or platforms have already been verified. Open point, package size only: do not exclude `node-pty` prebuilds for other platforms or the `.pdb` files. That is a future optimization, not part of C2. The GitHub Pages landing page is C4, formerly M4, published and verified at remote checkpoint `milestone/C4`; the site release is separate from the 0.3.1 desktop packages.

#### 2.4 Vesta baseline of 13 November 2026

Vesta analyzed `main` at `e967d92` on 13 November 2026 and did not run a build, the test suite, or `npm audit`. CNAME DNS was not verified. Exploitability of PC-01 and PC-02 is inferred, not demonstrated. The cited lines were rechecked on `d200abe611ef92220d9aa902f9f858192caee06b`: `git diff e967d92 d200abe` for those files is empty, so the ranges stay as Vesta cited them. Two content notes on that same text: in `docs/index.html`, line 12 is `og:image`, line 13 is the canonical link and lines 14-15 are the `hreflang` links; in `.github/workflows/package-macos.yml` the runner is already `macos-15` (line 24). `package-windows.yml` still uses `windows-latest` (line 23). The `"0.3.0"` default is line 12 of both workflows, and the `package-macos.yml` description (line 7) still cites the 0.3.0 SHA.

This patch uses `patch/0.3.1-plan-vesta-baseline`, from that main commit. It changes only `PLAN.md` and keeps application version 0.3.1. The `docs/*` tag exception is Glauco's decision: he asked for the annotated documentation tag `docs/plan-vesta-baseline-2026-11-13` on this commit. This planning step does not create the tag. None of the milestones below is started.

PC-03, PC-04, PC-05, PC-08, PC-13 and PC-11 stay inside M5, M6, M7, M8 and M9. PC-11 is the M9 permissions part: `electron/main.ts` does not register `setPermissionRequestHandler` or `setPermissionCheckHandler`, and the planned work is to deny by default, with a test that the denial happens. The other thirteen findings stay M13–M25, one entry each: M22, M23 and M25 are not merged. The execution order is M5, then M13 and M14 immediately after C5, each a separate milestone, then M6 → M12, then M15 → M25. M18 stays after C17. Each entry starts from main after verifying the preceding remote checkpoint and a separate start request. This order does not authorize a start.

1. M13 and M14, still separate milestones, immediately after C5. M18 follows numeric order, after C17, with DevTools and the demo gated on `!app.isPackaged`.
2. Electron 45.3.2 together with M5 and M6.
3. Account settings for PC-07: Glauco can change them at any time, without waiting for C15. The file `.github/dependabot.yml`, if the decision includes it, stays the work of M16.
5. Alignment of CNAME, canonical URLs and this plan (M21), and the quoting update in `SECURITY_MODEL.md`, which belongs to M13 and M14.
6. Adaptive polling for PC-06 (M15), with measurable thresholds. Constrained Language Mode is assessed with the user variable `__PSLockdownPolicy=4`, to be checked on Windows 11. AppLocker is a declared limit.
8. `npm audit` and a lockfile reading in an isolated environment, inside M6, with Glauco's approval.

Points 4 and 7 of Vesta's section 3 concern ContaMì only.

Versions `v0.3.10`–`v0.3.17` are indicative, assuming no intermediate releases, and stay consecutive in the 0.3.x series for the milestones that increment the version. Bringing M13 and M14 forward does not reuse the M6–M12 numbers: `v0.3.10` and `v0.3.11` are confirmed at start. M17 is `+0.0.1`, `v0.3.13`, to be confirmed by Glauco: it aligns the initial language with the standard. M16, M21, M22, M23 and M25 leave the application version unchanged and still have checkpoint `milestone/C<n>`.

**Open question for Glauco.** Do the entries whose version stays unchanged require a release? HOME, lines 100 and 115: a published release updates the version; an exclusively documentary change may leave the version unchanged and does not require a release; every completed milestone or patch, including ordinary fixes and hardening, does require a release. The answer does not merge M22, M23 and M25: Glauco asked for one entry per finding.

**Findings already covered**

| Finding | Milestone | Checkpoint |
| --- | --- | --- |
| PC-03 | M5 | `milestone/C5` |
| PC-04 | M6 | `milestone/C6` |
| PC-05 | M7 | `milestone/C7` |
| PC-08, PC-13 | M8 | `milestone/C8` |
| PC-11 | M9 | `milestone/C9` |

**New milestones**

| Entry | Vesta ID | Planned branch | Checkpoint | Planned version |
| --- | --- | --- | --- | --- |
| M13 — PowerShell quoting | PC-01 | `milestone/13-powershell-quotes` | `milestone/C13` | `v0.3.10`, `+0.0.1` |
| M14 — fish quoting | PC-02 | `milestone/14-fish-quoting` | `milestone/C14` | `v0.3.11`, `+0.0.1` |
| M15 — Windows child-process polling | PC-06 | `milestone/15-windows-child-poll` | `milestone/C15` | `v0.3.12`, `+0.0.1` |
| M16 — Repository alerts and configuration | PC-07 | `milestone/16-dependabot-config` | `milestone/C16` | application version unchanged |
| M17 — Initial system language | PC-09 | `milestone/17-system-locale` | `milestone/C17` | `v0.3.13`, `+0.0.1`, to be confirmed by Glauco |
| M18 — DevTools and demo only outside the package | PC-10 | `milestone/18-packaged-devtools` | `milestone/C18` | `v0.3.14`, `+0.0.1` |
| M19 — Confirm multiline paste and drop | PC-12 | `milestone/19-multiline-paste-confirm` | `milestone/C19` | `v0.3.15`, `+0.0.1` |
| M20 — Session limits in the central file | PC-14 | `milestone/20-session-limits-config` | `milestone/C20` | `v0.3.16`, `+0.0.1` |
| M21 — CNAME, canonical URLs and plan | PC-15 | `milestone/21-pages-cname` | `milestone/C21` | application version unchanged |
| M22 — Packaging workflow defaults and images | PC-16 | `milestone/22-packaging-defaults` | `milestone/C22` | application version unchanged |
| M23 — Git exclusions for env files and keys | PC-17 | `milestone/23-gitignore-secrets` | `milestone/C23` | application version unchanged |
| M24 — node-pty prebuild on macOS | PC-18 | `milestone/24-macos-pty-prebuild` | `milestone/C24` | `v0.3.17`, `+0.0.1` |
| M25 — Documentation tags and the committed standard | PC-19 | `milestone/25-doc-tag-policy` | `milestone/C25` | application version unchanged |

| Field | M13 — PowerShell quoting |
| --- | --- |
| Number and goal | M13 — PC-01, medium severity, verified; exploitability is suspected and was not demonstrated. Make PowerShell quoting treat U+2018, U+2019, U+201A and U+201B as single quotes as well. |
| Dependency and planned branch | After C5 and before M6; `milestone/13-powershell-quotes`. It stays a milestone separate from M5 and from M14. |
| Planned checkpoint and version | `milestone/C13`, `v0.3.10`; increment `+0.0.1`. |
| Tasks | `quotePowerShell` in `src/shared/shellQuote.ts:17-19` doubles only the ASCII apostrophe. PowerShell also treats U+2018–U+201B as single quotes. The callers to cover are `formatDroppedPaths` in `src/shared/shellQuote.ts:50` and the pasted image in `src/terminalEdit.ts:147`. Align the replacement with EscapeSingleQuotedStringContent, doubling those four characters as well. An M13 task, not a task of this pull request: in `SECURITY_MODEL.md`, remove «verified» for PowerShell quoting until the comparison on Windows PowerShell 5.1 and on pwsh 7 is recorded. The historical C1 row says, in Italian, «quotatura verificata per shell POSIX, PowerShell e cmd», and in English «quoting checked for POSIX shells, PowerShell and cmd». The model says the suite covers shell quoting. This pull request does not modify `SECURITY_MODEL.md`. |
| Acceptance | The payload `a’; Write-Output PWNED; ’b.txt` and the U+201A and U+201B variants stay one quoted argument. The path `C:\Users\O’Brien\…\img.png` comes back identical, without running the rest. On Windows PowerShell 5.1 and on pwsh 7 the returned value is identical to the original argument: without this check on both shells the milestone does not close. Existing ASCII-apostrophe, POSIX and cmd cases stay green. `SECURITY_MODEL.md` no longer calls PowerShell quoting «verified» until that comparison is recorded. |
| Required tests | Unit tests of the payload `a’; Write-Output PWNED; ’b.txt`, of the U+201A and U+201B variants and of the path `C:\Users\O’Brien\…\img.png`, through `shellQuote.ts:50` and `terminalEdit.ts:147`. Mandatory check on Windows PowerShell 5.1 and on pwsh 7 that the value comes back identical. Suite and build. |
| Documentation | `SECURITY_MODEL.md` is updated in M13, not in this pull request. IT/EN manuals if visible paste behavior changes, MAP if tests change, PLAN and version references. |
| Status | `M13`, planned only; implementation not started. |

| Field | M14 — fish quoting |
| --- | --- |
| Number and goal | M14 — PC-02, medium severity, suspected. Quote fish inside single quotes according to its escape sequences. |
| Dependency and planned branch | After C13 and before M6; `milestone/14-fish-quoting`. It stays a milestone separate from M13. |
| Planned checkpoint and version | `milestone/C14`, `v0.3.11`; increment `+0.0.1`. |
| Tasks | `shellQuoteKind` (`src/shared/shellQuote.ts:6-15`) maps fish to POSIX; `src/shared/shellQuote.test.ts:11` expects that result and is to be updated. Detection is in `electron/shells.ts:29-32`: `/opt/homebrew/bin/fish`, `/usr/local/bin/fish`, `/bin/fish` and `/usr/bin/fish`. Inside single quotes fish treats `\'` and `\\` as escapes: a path with a trailing backslash, or with `\'`, can close the string. Add a `fish` kind that, inside quotes, turns `\` into `\\` and `'` into `\'`. |
| Acceptance | A fish path with a backslash, an apostrophe and a space stays one argument. The Homebrew and system paths above are recognized as fish. PowerShell, cmd and POSIX stay unchanged. `SECURITY_MODEL.md` mentions fish. |
| Required tests | Update `shellQuote.test.ts:11` and add detection tests for the four paths. Unit tests for the `fish` kind, a trailing backslash and `\'`. Suite and build. A manual check on macOS only when fish is installed in the verification environment, with synthetic data. |
| Documentation | `SECURITY_MODEL.md`, MAP for the test, manuals if the list of quoted shells changes, PLAN and version. |
| Status | `M14`, planned only; implementation not started. |

| Field | M15 — Windows child-process polling |
| --- | --- |
| Number and goal | M15 — PC-06, medium severity, verified; the operational impact is suspected. Lower the cost of child-process detection and make it visible when Windows blocks that detection. |
| Dependency and planned branch | After C12, so bringing M13 and M14 forward does not place this milestone before M6; `milestone/15-windows-child-poll`. |
| Planned checkpoint and version | `milestone/C15`, `v0.3.12`; increment `+0.0.1`. |
| Tasks | `electron/children.ts:35-52` starts `powershell.exe -NoProfile -NonInteractive -Command Get-CimInstance Win32_Process` on every pass, with an 8-second timeout. `electron/sessions.ts:115` schedules the pass every 2.5 seconds. The cost can be hundreds of milliseconds of CPU. Poll only while sessions are active or visible, with backoff, or keep a single persistent PowerShell. Show in the interface that detection is unavailable. Assess a Constrained Language Mode trial with the user variable `__PSLockdownPolicy=4`, to be checked on Windows 11. AppLocker stays a declared limit, not a required test environment. |
| Acceptance | With no active or visible sessions, no `powershell.exe` from this polling starts within 30 seconds. With a visible session the command does not start more often than the configured interval, 2500 ms today. After an error the next wait is at least 10 seconds and doubles up to 60 seconds. On the third consecutive error the state «detection unavailable» appears, in Italian and English, and the rest of the dashboard keeps working. Detection on paths already verified stays available when the command succeeds. |
| Required tests | Tests of the interval, the backoff (10 s, doubling, 60 s cap), the 30 seconds with no sessions and the message on the third error, with a fake command. Assess the `__PSLockdownPolicy=4` trial on Windows 11. AppLocker is a declared limit. Suite and build. Windows x64 smoke on the milestone release package, isolated profile. |
| Documentation | IT/EN manuals, `SECURITY_MODEL.md`, MAP, PLAN, version and the landing page if published behavior changes. |
| Status | `M15`, planned only; implementation not started. |

| Field | M16 — Repository alerts and configuration |
| --- | --- |
| Number and goal | M16 — PC-07, medium severity, verified. Record Glauco's decision on Dependabot, secret scanning, push protection and protection of `main`. The only file activity is `.github/dependabot.yml`, and only when that decision includes it. |
| Dependency and planned branch | Account settings do not wait for C15: Glauco can change them at any time. The file branch, if the decision includes the file, is `milestone/16-dependabot-config`, after C15. |
| Planned checkpoint and version | `milestone/C16`; application version unchanged. |
| Tasks | At the baseline date, Dependabot alerts and secret scanning are off, `dependabot.yml` is absent, code scanning is absent and `main` is unprotected. Glauco can change the account settings at any time, without waiting for C15. Dependabot alerts, secret scanning, push protection and protection of `main` (no force-push and no deletion) stay account actions and follow his decision. If the decision includes the file, add `.github/dependabot.yml` for npm and for github-actions. |
| Acceptance | The plan records the decision. No repository setting changes before it. If the file is part of the commit, it covers npm and github-actions and the packaging workflows stay `workflow_dispatch`. |
| Required tests | Static check of the YAML, when present. No trial `workflow_dispatch`. No extra application test for settings alone. |
| Documentation | `PLAN.md` and `SECURITY_MODEL.md` with the decision outcome and the limits that remain on the account. |
| Status | `M16`, planned only; implementation not started. Glauco's decision is still open. |

| Field | M17 — Initial system language |
| --- | --- |
| Number and goal | M17 — PC-09, low severity, verified and already listed under P2. Detect the system language on first launch, with English as the fallback. P2 stays a proposal: this entry carries out only the language part. |
| Dependency and planned branch | After C16; `milestone/17-system-locale`. |
| Planned checkpoint and version | `milestone/C17`, `v0.3.13`; increment `+0.0.1`, to be confirmed by Glauco. |
| Tasks | `electron/settings.ts:14` sets `locale: 'it'` in `defaultSettings`. The standard asks for system-language detection. Use `app.getLocale()`, with fallback `en` when the language is not one of the translated ones, and assess `app.getPreferredSystemLanguages()` when the ordered list is more precise than the locale alone. An override already saved stays the user's choice. |
| Acceptance | A new profile with `it-IT` or `it-CH` opens the interface in Italian. `en-GB` and `pt-BR` open English. A preference already written is left as stored. The startup screen, shown before preferences load, stays documented on the default Italian dictionary. |
| Required tests | Tests for `it-IT`, `it-CH`, `en-GB` and `pt-BR`, plus an unknown locale and an existing preferences file. Assess `app.getPreferredSystemLanguages()` with a fake list. Suite and build. Manual IT/EN and light/dark check of first launch with an isolated profile. |
| Documentation | IT/EN manuals, README, quick start, `SECURITY_MODEL.md` if the data read from the system changes, MAP, PLAN and version. |
| Status | `M17`, planned only; implementation not started. |

| Field | M18 — DevTools and demo only outside the package |
| --- | --- |
| Number and goal | M18 — PC-10, low severity, verified. Limit DevTools, the demo and screenshots to unpackaged runs. |
| Dependency and planned branch | After C17; `milestone/18-packaged-devtools`. |
| Planned checkpoint and version | `milestone/C18`, `v0.3.14`; increment `+0.0.1`. |
| Tasks | The variables to gate on `!app.isPackaged` are `PLANCIA_DEMO` and `MOLO_DEMO` (`electron/main.ts:35`), `PLANCIA_SHOT_DIR` and `MOLO_SHOT_DIR` (`electron/main.ts:217`), `PLANCIA_SHOT_EXIT` and `MOLO_SHOT_EXIT` (`electron/main.ts:235`), `PLANCIA_DEVTOOLS` and `MOLO_DEVTOOLS` (`electron/main.ts:281`). They cover the demo, the script, screenshots and DevTools. Whoever controls the packaged environment can open DevTools, with access to the preload API. Severity is low because it requires the same user. |
| Acceptance | In the package none of these eight variables opens DevTools, starts the demo or writes screenshots. In development, with the same variables, the demo and DevTools stay available. |
| Required tests | Tests of the packaged flag for all eight variables, set and unset. Suite and build. Smoke of the Windows or macOS package with the variables set and an isolated profile, for the milestone release. |
| Documentation | `SECURITY_MODEL.md`, manuals and README for the packaged limit, MAP, PLAN and version. |
| Status | `M18`, planned only; implementation not started. |

| Field | M19 — Confirm multiline paste and drop |
| --- | --- |
| Number and goal | M19 — PC-12, low severity, verified. This is the residual risk of paste without bracketed paste: ask for confirmation when the text contains a newline and the shell has not enabled bracketed paste. |
| Dependency and planned branch | After C18; `milestone/19-multiline-paste-confirm`. |
| Planned checkpoint and version | `milestone/C19`, `v0.3.15`; increment `+0.0.1`. |
| Tasks | `src/terminalEdit.ts:156-160` pastes clipboard text and `173-190` pastes dropped text. Without bracketed paste the lines run one after another. Ask for confirmation, in Italian and English, when the text contains `\n` or `\r`, or is a single line that ends with a newline, and the shell has not enabled bracketed paste. A line with no trailing newline and a paste with bracketed paste already enabled stay immediate. |
| Acceptance | The confirmation appears for `\n`, for `\r` and for a single line that ends with a newline, when bracketed paste is not enabled. A line with no trailing newline stays immediate. Cancelling leaves the terminal unchanged. Confirming sends the text within the limits already validated. Themes, focus and long confirmation text are checked. |
| Required tests | Tests of the decision: one line with no newline, one line with a trailing newline, `\n`, `\r`, several lines, bracketed paste enabled, cancel and confirm. Suite and build. Manual check in IT/EN, light/dark, keyboard and supported desktop sizes. |
| Documentation | IT/EN manuals with the real control names, `SECURITY_MODEL.md`, MAP, PLAN and version. |
| Status | `M19`, planned only; implementation not started. |

| Field | M20 — Session limits in the central file |
| --- | --- |
| Number and goal | M20 — PC-14, low severity, verified and already partly listed under P2. Move the limits and intervals that are still hard-coded into `config/app.config.json`, clamped to the documented defaults. P2 stays a proposal: this entry carries out only this part. |
| Dependency and planned branch | After C19; `milestone/20-session-limits-config`. |
| Planned checkpoint and version | `milestone/C20`, `v0.3.16`; increment `+0.0.1`. |
| Tasks | `electron/sessions.ts:32-33` defines `MAX_SESSIONS` and `MAX_BACKLOG`. `electron/sessions.ts:114-115` fixes the intervals at 400 ms and 2500 ms. The timeouts in `electron/children.ts` are 4000 ms for `ps` (line 22) and 8000 ms for PowerShell (line 44). Move the limits, the intervals and these timeouts into `config/app.config.json` and validate them at startup with the clamp in `src/shared/appConfig.ts:54-57`: a missing value or a value of the wrong type returns to the default; a value out of range is brought to the bound. |
| Acceptance | A valid file applies the new limits, the intervals and the `electron/children.ts` timeouts. As in `appConfig.ts:54-57`, a missing value or a value of the wrong type returns to the default and a value out of range is brought to the nearest bound. The app starts. Parameters already introduced by C1 stay validated as they are today. |
| Required tests | Clamp tests for each new parameter: missing, wrong type, below the minimum, above the maximum and an in-range value. Out of range must yield the bound, not the default. Suite and build. |
| Documentation | README, IT/EN manuals, quick start, `SECURITY_MODEL.md`, MAP, PLAN and the JSON example of the central file. |
| Status | `M20`, planned only; implementation not started. |

| Field | M21 — CNAME, canonical URLs and plan |
| --- | --- |
| Number and goal | M21 — PC-15, low severity, verified. Align CNAME, canonical URLs and this plan after the domain choice, which is Glauco's. |
| Dependency and planned branch | After C20 and after the explicit domain choice; `milestone/21-pages-cname`. |
| Planned checkpoint and version | `milestone/C21`; application version unchanged. |
| Tasks | `docs/CNAME` contains `planciacomandi.glaucosilvestri.it`, from commit `e967d92` ("Create CNAME") made through the web UI directly on main. In `docs/index.html`, line 12 is `og:image`, line 13 is the canonical link and lines 14-15 are the `hreflang` links: they point at `gloutchov.github.io/Plancia-Comandi/`. The C4 entry in this plan says Pages `main:/docs` was enabled without a CNAME. DNS was not verified. Glauco chooses: verify DNS and HTTPS on Pages and then align canonical, Open Graph, `hreflang` and this plan entry, or remove the CNAME and keep the `github.io` URLs. |
| Acceptance | Canonical, Open Graph, `hreflang`, `docs/CNAME` and the C4 entry describe the same host. If the custom domain stays, DNS and HTTPS are verified before alignment. The desktop version stays the one already published. |
| Required tests | Check of links, anchors and IT/EN equivalence of the plan and the page. After deploy approval, an HTTPS check of the chosen host. No private-data captures. |
| Documentation | `PLAN.md`, `docs/index.html`, `docs/CNAME`, README and `SECURITY_MODEL.md` for the landing host. |
| Status | `M21`, planned only; implementation not started. The domain choice is still open. |

| Field | M22 — Packaging workflow defaults and images |
| --- | --- |
| Number and goal | M22 — PC-16, low severity, verified. Update the version defaults and pin the Windows image. The macOS image is already `macos-15`. |
| Dependency and planned branch | After C21; `milestone/22-packaging-defaults`. |
| Planned checkpoint and version | `milestone/C22`; application version unchanged. |
| Tasks | `package-windows.yml:12` and `package-macos.yml:12` have `default: "0.3.0"`. `package-macos.yml:7` still describes the 0.3.0 SHA. `package-windows.yml:23` uses `windows-latest`. `package-macos.yml:24` already uses `macos-15`, with the comment that it is the Apple Silicon image. Update or remove the version default, update the description and pin the Windows image to an explicit label. Leave `macos-15` until an image update is decided separately. The workflows stay `workflow_dispatch`, with `contents: read`. |
| Acceptance | No default still points at 0.3.0. The description does not cite a previous release SHA as an operational value. The Windows image is a fixed label. A push or a pull request does not start the workflows. |
| Required tests | Static reading of both YAML files. No trial `workflow_dispatch`. |
| Documentation | `PLAN.md`, MAP and `SECURITY_MODEL.md` if the workflow perimeter changes. |
| Status | `M22`, planned only; implementation not started. |

| Field | M23 — Git exclusions for env files and keys |
| --- | --- |
| Number and goal | M23 — PC-17, low severity, verified. Ignore environment files and private keys that `.gitignore` does not list today. |
| Dependency and planned branch | After C22; `milestone/23-gitignore-secrets`. |
| Planned checkpoint and version | `milestone/C23`; application version unchanged. |
| Tasks | On `d200abe` it was checked that `.gitignore` contains neither `.env`, `*.pem`, `*.key` nor `*.p12`, and that those names are not tracked. Add `.env`, `.env.*` with the exception `!.env.example`, `*.pem`, `*.key`, `*.p12` and `*.pfx`. `.gitignore` stays short of a filter for secrets, and secrets already committed are not removed from history without a separate decision. |
| Acceptance | The patterns `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `*.p12` and `*.pfx` are present. `.env.example` stays trackable. Files already intended for the package or the documents stay tracked. |
| Required tests | Static check of `.gitignore` and `git check-ignore` on fake paths, including `.env.local`, `.env.example` and a `*.pfx`, outside the repository's real content. The check that the baseline names were not tracked remains the one done on `d200abe`. |
| Documentation | `SECURITY_MODEL.md` and MAP, with the limit that `.gitignore` is not a filter for secrets already in history. |
| Status | `M23`, planned only; implementation not started. |

| Field | M24 — node-pty prebuild on macOS |
| --- | --- |
| Number and goal | M24 — PC-18, low severity, suspected. Use a `node-pty` prebuild on macOS when it matches Electron's ABI, and rebuild only as the fallback. |
| Dependency and planned branch | After C23; `milestone/24-macos-pty-prebuild`. |
| Planned checkpoint and version | `milestone/C24`, `v0.3.17`; increment `+0.0.1`. |
| Tasks | `scripts/install-native.mjs:40-43`: `shouldRebuildForElectron` returns false only on Windows when all three prebuilds are present; on Darwin it always returns true. The rebuild needs the Xcode Command Line Tools, which usually require an administrator. When a published prebuild matches Electron's ABI, use it; the rebuild stays the fallback when the prebuild is missing or does not match. |
| Acceptance | On Darwin, with a compatible prebuild, the script does not start a rebuild. Without a compatible prebuild, the rebuild stays the documented path. Windows keeps the current three-prebuild behavior. The macOS workflow still produces `plancia-comandi.app` with no signing identity. |
| Required tests | Script tests with a prebuild present, absent and of a different ABI. Suite and build. macOS ARM64 package smoke outside the checkout when the milestone publishes a release; without a local Mac, record the limit and use the workflow only if Glauco asks for it. |
| Documentation | README, IT/EN manuals, quick start, MAP, `SECURITY_MODEL.md`, PLAN and version. |
| Status | `M24`, planned only; implementation not started. |

| Field | M25 — Documentation tags and the committed standard |
| --- | --- |
| Number and goal | M25 — PC-19, low severity, verified. Document the exception for `docs/*` tags, or cite the standard by version instead of the committed copy. |
| Dependency and planned branch | After C24; `milestone/25-doc-tag-policy`. |
| Planned checkpoint and version | `milestone/C25`; application version unchanged. |
| Tasks | The remote has annotated tags `docs/2026-11-10` (object `ab100132e39d5906a833db5dca60c5cf4039ecb3`, commit `05062668b528d737d5c702673657bfd2b3dbaf8e`), `docs/security-roadmap-2026-11-13` (object `08682a313eebf036136f11ab76d56f4c20b8426b`, commit `970c450add36f3036c796454d3535ca39a566c0a`) and `docs/desktop-fixes-plan-2026-11-13` (object `dbd7d28b8fa1e9301d392ab45323120b8e1bbe06`, commit `d200abe611ef92220d9aa902f9f858192caee06b`). They follow neither `vX.Y.Z` nor `milestone/C<n>`. The repository also contains `STARTUP_PREFERENCES_HOME.md`, 38056 bytes, which can drift from the original. The `docs/*` exception is Glauco's decision: he asked for the tag `docs/plan-vesta-baseline-2026-11-13` for this plan patch. M25 documents that exception, leaving published tags where they are, or cites the standard by version instead of the committed copy. This planning step does not create the tag. |
| Acceptance | The plan and `AGENTS.md` describe the `docs/*` exception as Glauco's decision, including the tag he asked for this patch. Published `vX.Y.Z` and `milestone/C<n>` tags stay on their commit. No published tag is moved. |
| Required tests | `git diff --check` and a check of the required documents, links and IT/EN equivalence. No application test. |
| Documentation | `PLAN.md`, `AGENTS.md` and, if the copy is removed, the places that currently point at `STARTUP_PREFERENCES_HOME.md`. |
| Status | `M25`, planned only; implementation not started. |

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

#### 4.1 C3 results (formerly M3) — 13 November 2026

- [x] Private Git/GitHub identity, main baseline and remote C2 checkpoint verified; planning edit preserved on the M3 branch.
- [x] Icon, six IT/EN screenshots, version 0.3.1 and documentation completed; capture manifest checked.
- [x] Installation, 136 tests, build and isolated Electron checks completed; omissions and dependency findings recorded in C3.
- [x] M3 commit `cc037278633d6b43e279eb66539c05d50d4364e8` and diff presented; Glauco's personal Windows test passed with a separate profile.
- [x] Glauco's first explicit approval on 13 November 2026; merge, tags, push, release 0.3.1 and branch removal authorized after checks.
- [x] M3 → C3 transition recorded in IT/EN for the new local commit.
- [x] New hash `1155fc248acefe25ac7cc2068ca750d93150a46e` and diff presented; second explicit approval received before publication.
- [x] Fast-forward merge and main push verified. macOS workflow needed on this Windows machine; Windows workflow needed for a clean installer test, preserving the running local 0.3.0. Both runs passed.
- [x] Windows x64 installer/portable and macOS ARM64 DMG/ZIP, smoke tests and SHA-256 verified before tagging. Portable also tested on local Windows; both EXEs report NotSigned. macOS ZIP integrity and contents checked after download; two text files differ from Windows only in line endings.
- [x] Annotated tags milestone/C3 and v0.3.1 verified at the final commit; latest release [v0.3.1](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.1) published with six assets and remote digests matching local files.
- [x] M3 branch removed after verification; other pre-existing branches preserved.
- [x] Paths of `out/m3/` and the two portable-test temporary directories presented for separate cleanup confirmation; deletion requires an explicit answer distinct from branch-removal approval.

#### 4.2 C4 results, formerly M4 — 13 November 2026

- [x] Private identity, main and remote C3 checkpoint verified; M4 branch from main, initially clean worktree.
- [x] Static page, 78 IT/EN keys, themes, gallery, icons and links implemented; documentation updated, desktop version unchanged at 0.3.1.
- [x] 149 tests, build, site structure, Pages prefix and public link checks passed.
- [x] Local checks in isolated Electron Chromium: 40 HTTP/file, IT/EN and light/dark combinations at five sizes, pointer clicks, keyboard, persistence and footer. Integrated browser unavailable; other browsers/platforms unverified. Public site checked separately in 8 IT/EN, light/dark and desktop/mobile combinations.
- [x] M4 commit `fbcdc832bce9697c2276e5948e3751af0d9e7355` reviewed and approved by Glauco on 13 November 2026; closure operations authorized after checks.
- [x] M4 → C4 transition with summary, checks, limitations, version and checkpoint in a new local commit.
- [x] Hash `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455` and diff presented; second explicit approval received before push, merge or tags.
- [x] Fast-forward merge and main push verified; Pages `main:/docs` enabled. Managed deployment `43431582012` passed at the approved commit; HTTPS enforced and 14 public assets verified byte for byte.
- [x] Site ZIP generated from final main commit: 16 extracted files matched source and smoke passed; SHA-256 verified. Annotated `milestone/C4` checkpoint and site release `444250016` published; both assets downloaded and verified, latest desktop v0.3.1 preserved.
- [x] Local M4 branch removed after checks and approval; no remote M4 branch to remove.
- [x] Temporary path `out/m4/` presented for separate cleanup confirmation; contents retained, including local ZIP and checksum copies already published on GitHub.

### 5. Versions, CI and distribution

Use `+0.0.1` for patches, `+0.1.0` for minor features and `+1.0.0` for major changes. Documentation-only work may keep the version unchanged and does not require a release. For completed application milestones or patches, publish a release under HOME preferences; mark it as a prerelease if the app is not usable. Do not configure signing, notarization or automatic updates without explicit credentials and a process.

The `package-windows.yml` workflow is manually triggered for a Windows build attempt that cannot be performed equivalently locally. It does not run on push or PR. Run `43226304320` produced the Windows packages of release v0.3.0 and also checked the portable executable and the installed app. The `package-macos.yml` workflow is manual only, on the `macos-15` runner, for unsigned ARM64 DMG and ZIP files; it does not run on push or PR. It ran as `43257940568` and the artifacts are in release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). The M2 closing plan approved on 12 November 2026 includes this reproducible remote macOS build for the v0.3.0 release assets, with SHA-256, alongside the Windows workflow: it spends minutes only when launched. The macOS ARM64 checks for release `v0.2.0` run locally. Additional workflows require a separate justification. `npm run build` alone does not establish that a package has been verified.
