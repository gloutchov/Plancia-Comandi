# Piano di sviluppo / Development plan

## Italiano

Questo piano registra la base esistente di Plancia Comandi e le attività future. Versione applicativa: **0.3.1**, pubblicata il 13 novembre 2026. La milestone **C1** è stata unita a `main` sul commit `4aabc9bc81a60b0c574221ce37578936341ae065`; i tag `milestone/C1` e `v0.2.0` e la release con i sorgenti sono presenti sul remoto. **C2** resta la voce decisa da Glauco, senza una nuova promozione. La release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) è pubblicata il 12 novembre 2026 sul commit `94ff1e44106f08fdcf961cab74171668112ad780`; i tag `v0.3.0` e `milestone/C2` puntano a quel commit. **C3** (icona nella UI e screenshot), già M3, ha ricevuto la prima approvazione di Glauco il 13 novembre 2026 sul commit `cc037278633d6b43e279eb66539c05d50d4364e8`; la seconda approvazione del commit `1155fc248acefe25ac7cc2068ca750d93150a46e` è stata ricevuta nella stessa sessione. Main, tag `milestone/C3` e `v0.3.1`, release e rimozione del branch M3 sono verificati; **C4** (landing page GitHub Pages), già M4, è pubblicata sul commit approvato `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, con sito HTTPS, checkpoint `milestone/C4`, release del sito e rimozione del branch verificati; versione desktop invariata a 0.3.1. Le proposte non autorizzano altri interventi sul codice.

**Sommario**

- [1. Base e intervento corrente](#1-base-e-intervento-corrente)
- [2. Milestone e proposte](#2-milestone-e-proposte)
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

| Voce | Obiettivo da discutere | Accettazione proposta |
| --- | --- | --- |
| P1 — Confini di sicurezza | Resta da decidere ciò che C2 non copre: timeout delle regex, scrittura atomica delle impostazioni e redazione degli errori. CSP, mittente degli IPC precedenti a M1 e tetto delle code di incolla sono C2. | Test negativi isolati e modello di sicurezza aggiornato; preservare il funzionamento delle shell. |
| P2 — Preferenze iniziali | Allineare lingua automatica e portare nel file centrale i limiti ancora nei moduli. C1 mette nel file centrale solo i parametri nuovi di appunti, trascinamento e dimensione dell'input. | Italiano per sistemi italiani, inglese negli altri casi, override persistente e configurazione validata con test. |
| P3 — Distribuzione verificata | Validare macOS, Windows e Linux, notifiche, scorciatoie, shell, PTY e pacchetti reali. | Smoke fuori dal checkout, piattaforme e architetture dichiarate, artifact e SHA-256 verificati; documentazione aggiornata. |

Versione, branch, checkpoint, attività e test dettagliati delle proposte P1–P3 saranno decisi quando una proposta sarà riclassificata come `M`. Queste righe non dichiarano controlli o piattaforme già verificati. Punto aperto, solo per la dimensione del pacchetto: non escludere le prebuild di `node-pty` delle altre piattaforme né i file `.pdb`. È un'ottimizzazione futura, non parte di C2. La landing page GitHub Pages è C4, già M4, pubblicata e verificata sul checkpoint remoto `milestone/C4`; la release del sito è distinta dai pacchetti desktop 0.3.1.

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

This plan records the existing Plancia Comandi baseline and future work. Application version: **0.3.1**, published on 13 November 2026. Milestone **C1** was merged into `main` at `4aabc9bc81a60b0c574221ce37578936341ae065`; remote tags `milestone/C1` and `v0.2.0` and the source release exist. **C2** stays the entry Glauco decided, with no further promotion. Release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) was published on 12 November 2026 at commit `94ff1e44106f08fdcf961cab74171668112ad780`; tags `v0.3.0` and `milestone/C2` point at that commit. **C3** (UI icon and screenshots), formerly M3, received Glauco's first approval on 13 November 2026 at commit `cc037278633d6b43e279eb66539c05d50d4364e8`; second approval of commit `1155fc248acefe25ac7cc2068ca750d93150a46e` was received in the same session. Main, tags `milestone/C3` and `v0.3.1`, release and M3 branch removal are verified; **C4** (GitHub Pages landing page), formerly M4, is published at approved commit `766a4aab7ef476fc1d1ac4d6af7f9cfb39a71455`, with HTTPS site, `milestone/C4` checkpoint, site release and branch removal verified; desktop version remains 0.3.1. Proposals do not authorize any other code changes.

**Contents**

- [1. Baseline and current work](#1-baseline-and-current-work)
- [2. Milestones and proposals](#2-milestones-and-proposals)
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

| Item | Goal for discussion | Proposed acceptance |
| --- | --- | --- |
| P1 — Security boundaries | Still to be decided, for what C2 does not cover: regex timeouts, atomic settings writes and error redaction. CSP, sender checks on IPC that predates M1 and the paste-queue cap are C2. | Isolated negative tests and an updated security model; preserve shell operation. |
| P2 — Initial preferences | Align automatic language selection and move limits that are still in modules into the central file. C1 puts only the new clipboard, drop and input-size parameters in that file. | Italian on Italian systems, English otherwise, persistent override and validated configuration with tests. |
| P3 — Verified distribution | Validate macOS, Windows and Linux, notifications, shortcuts, shells, PTYs and real packages. | Smoke outside the checkout, declared platforms and architectures, verified artifacts and SHA-256; updated documentation. |

Version, branch, checkpoint, detailed tasks and tests for proposals P1–P3 will be decided when a proposal becomes an `M`. These entries do not claim that controls or platforms have already been verified. Open point, package size only: do not exclude `node-pty` prebuilds for other platforms or the `.pdb` files. That is a future optimization, not part of C2. The GitHub Pages landing page is C4, formerly M4, published and verified at remote checkpoint `milestone/C4`; the site release is separate from the 0.3.1 desktop packages.

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
