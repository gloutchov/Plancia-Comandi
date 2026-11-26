# Plancia Comandi

## Italiano

Nei sorgenti **M37/0.3.16** (M38 assorbita), `sessions` e `processSnapshot` rendono configurabili numero massimo di sessioni, backlog, intervallo di stato e timeout. I default restano invariati. Su macOS il postinstall usa la prebuild `node-pty` solo dopo verifica dell’architettura e caricamento nell’Electron di sviluppo, preparando il permesso del suo helper; assenza/incompatibilità o errore mantengono il ripiego di compilazione. Sorgenti **0.3.20** e ultima release pubblicata **0.3.19**. I sorgenti separano le identità Windows di sviluppo e distribuzione per correggere l’associazione del pulsante in Explorer. La release 0.3.19 assegna esplicitamente identità e ICO al pulsante della barra delle applicazioni Windows, usando una risorsa esterna all’ASAR. [Download e checksum](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19) verificati.

Nei sorgenti **M36/0.3.15**, incollare o trascinare testo contenente LF o CR, anche una sola riga con a capo finale, apre **Incollare più righe?** se il programma nel terminale non ha attivato il bracketed paste. Il dialogo indica la sessione senza mostrare il testo: **Annulla** è selezionato inizialmente; **Incolla** autorizza il testo già acquisito e limitato. Una riga senza a capo e il bracketed paste attivo restano immediati. C36 è pubblicata nella release 0.3.15 con pacchetti e checksum verificati.

Nella release **C32/0.3.14** il rilevamento dei processi figli condivide le interrogazioni, rispetta l’intervallo anche aprendo nuove sessioni e attende progressivamente dopo gli errori. Dopo tre errori compare un avviso IT/EN; input e altri segnali di stato restano attivi e il recupero è automatico. I quattro parametri `childPolling` sono nel file centrale. La [release 0.3.14](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.14) è pubblicata con pacchetti Windows x64/macOS ARM64 e SHA-256 verificati.

La landing segue automaticamente l’[ultima release stabile](https://github.com/gloutchov/Plancia-Comandi/releases/latest): legge solo i metadati pubblici GitHub all’apertura e aggiorna i collegamenti ai quattro pacchetti e ai due checksum. Se la richiesta fallisce o JavaScript è disabilitato, i collegamenti aprono la pagina dell’ultima release. Non servono account o credenziali; non vengono inviati contenuti dei terminali. L’anteprima usa `vite.site.config.ts`, separata dalla configurazione Electron.

La precedente release **0.3.13** completa C33, con M34/M35 assorbite: nome installato **Plancia Comandi**, risorsa ICO ufficiale per la finestra Windows e lingua iniziale dal sistema, con preferenze salvate conservate. Pacchetti Windows x64/macOS ARM64 e checksum verificati; controllo visivo nativo Windows rimandato con autorizzazione e dichiarato nelle note.

Sono mantenuti il trascinamento della barra superiore macOS, i pulsanti delle viste cliccabili e i menu coerenti con la lingua IT/EN dell’app, senza Reload, Force Reload o Toggle Developer Tools.

Plancia Comandi riunisce più terminali reali in una finestra desktop. Puoi lavorare con shell e CLI per programmare con l'AI, vedere quali sessioni stanno lavorando o attendono un intervento e affiancare i terminali che ti servono.

**Sorgenti 0.3.20 · sviluppo iniziale · target macOS, Windows e Linux · Apache-2.0.** L’ultima release pubblicata è la [0.3.19](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19). Il runtime resta Electron **45.4.1**, pin esatto, con fuse C27. Fit 0.11 usa la larghezza reale della scrollbar. I tool eseguiti nei terminali si installano separatamente.

![Icona aggiornata e due terminali affiancati nel tema scuro](docs/screenshots/plancia-dark.png)

Schermate della versione sorgenti 0.3.1 su Windows, con dati dimostrativi e preferenze isolate; [provenienza delle catture](docs/screenshots/capture.json). La release [0.3.18](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.18) è disponibile con installer/portable Windows x64 e DMG/ZIP macOS ARM64 non firmati e checksum SHA-256.

**Sommario**

- [1. Funzioni principali](#1-funzioni-principali)
- [2. Installazione e primo utilizzo](#2-installazione-e-primo-utilizzo)
- [3. Impostazioni](#3-impostazioni)
- [4. Sicurezza e privacy](#4-sicurezza-e-privacy)
- [5. Sviluppo e verifiche](#5-sviluppo-e-verifiche)
- [6. Distribuzione](#6-distribuzione)
- [7. Documentazione e licenza](#7-documentazione-e-licenza)

### 1. Funzioni principali

- Fino a 12 sessioni con i default, configurabili da 1 a 32, con scelta della shell e della cartella iniziale.
- Viste **Una**, **Affiancate**, **Incolonnate** e **Griglia**, con icone, rinomina e chiusura delle sessioni.
- Stati **Avvio**, **Al lavoro**, **In attesa**, **Azione** e **Terminata**, stimati dall'output, dal titolo e dai processi figli.
- Pallini nella barra e notifiche di sistema per sessioni che richiedono attenzione.
- Tema di sistema, chiaro o scuro; interfaccia italiana o inglese; dimensione del testo e tempi configurabili.
- Copia, incolla, trascinamento di file e testo, collegamenti nel browser e scorciatoie adatte alla piattaforma. Conferma prima dell’incolla o del trascinamento multilinea senza bracketed paste; **Annulla**, Esc o clic fuori dal dialogo non inviano il testo. Tab/Shift+Tab restano sui due pulsanti, Invio attiva quello selezionato. Durante la scelta altri incolla non si accodano; alla chiusura della sessione la richiesta viene annullata.

Le shell dipendono dal computer: **Windows PowerShell**, **PowerShell 7**, **Prompt dei comandi** e **Git Bash** su Windows; **Shell di login**, **zsh**, **bash** e **fish** su macOS/Linux, quando presenti nei percorsi rilevati. La landing riporta lo stesso elenco per piattaforma.

Il rilevamento è euristico, pensato soprattutto per le schermate di Codex CLI: non legge lo stato interno dei programmi. Non sostituisce il controllo del terminale. Da 0.3.13, senza una lingua valida già salvata, la prima lingua preferita dal sistema determina l’interfaccia: italiano per `it`, inglese negli altri casi. La scelta manuale resta prioritaria; la schermata prima del caricamento delle preferenze usa ancora l’italiano. Le sessioni non vengono ripristinate dopo l'uscita dall'app.

![Vista affiancata nel tema chiaro](docs/screenshots/plancia-light.png)

Nei sorgenti 0.3.5, se i pattern personalizzati sono troppo lenti o non disponibili, un avviso indica che resta attivo il rilevamento standard; i terminali continuano a ricevere input e output.

### 2. Installazione e primo utilizzo

Per l'avvio dai sorgenti servono Git e Node.js 22.12+ della serie 22, 24.x oppure 26+ con npm, secondo i requisiti della toolchain; Electron 45.4.1 richiede almeno Node.js 22.12. Su Windows non serve compilare e non servono diritti di amministratore: `node-pty` 1.1.0 include prebuild N-API. Su macOS gli strumenti di compilazione servono solo come ripiego se la prebuild non è compatibile/preparabile; Linux li richiede. Le istruzioni complete sono nel capitolo [Installazione](ISTRUZIONI.md#2-installazione). Le verifiche locali di questa documentazione usano Node.js 24.

```bash
git clone https://github.com/gloutchov/Plancia-Comandi.git
cd Plancia-Comandi
npm ci
npm run dev
```

Il repository è pubblico; per il clone in lettura non è necessario un account GitHub. `npm ci` scarica dipendenze ed Electron. Su macOS verifica la prebuild nel vero Electron e prepara il suo helper, ricompilando solo come ripiego; Linux ricompila e Windows conserva le prebuild. Si apre una finestra desktop: la pagina web di sviluppo, da sola, non può creare terminali.

1. Premi **Nuova sessione**.
2. Scegli shell e cartella, inserisci un nome facoltativo e premi **Apri**.
3. Usa il terminale come quello di sistema. Con almeno due sessioni, le icone in alto a destra scelgono **Affiancate** o **Incolonnate**; da tre sessioni è disponibile anche la **Griglia**.

Vedi il [quick start desktop](QUICK-START_Desktop.md) e il [manuale italiano](ISTRUZIONI.md).

#### Compilare ed eseguire su Linux

Su Linux non è stata testata di persona.

1. Installa Git e Node.js 22.12+ della serie 22, 24.x oppure 26+ con npm, secondo i requisiti della toolchain. I controlli descritti in questi documenti usano Node.js 24.
2. Installa gli strumenti per compilare `node-pty`. La versione 1.1.0 non ha una prebuild Linux e `npm ci` la ricompila per Electron con node-gyp. Il README di `node-pty` chiede `make`, `python` e `build-essential`. Su Debian e Ubuntu `build-essential` include già `make`, `gcc` e `g++`; il pacchetto Python da installare è `python3`.

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

Su un'altra distribuzione servono gli equivalenti di `build-essential` e `python3`.

3. Dalla cartella del progetto esegui installazione, test, build e avvio:

```bash
npm ci
npm test
npm run build
npm run dev
```

4. Il pacchetto Linux ha uno script: `npm run dist:linux`. Produce un AppImage e un DEB in `release/`, con nomi `PlanciaComandi-linux-<versione>-<arch>.AppImage` e `.deb`. Va eseguito dopo test e build, sul sistema Linux di destinazione. Su Linux non è stata testata di persona.

### 3. Impostazioni

Apri **Impostazioni** per lingua, tema, corpo del terminale, avvisi e tempi del rilevamento. Le modifiche effettuate nell'interfaccia si applicano subito e restano sul computer in `settings.json`, nella cartella dati dell'app. **Apri il file di configurazione** mostra il file nel gestore dei file; dopo una modifica manuale riavvia l'app.

Dalla versione 0.3.6, un avviso indica recupero delle preferenze o modifiche non salvate. I file `.bak` e i log locali sono descritti nel [manuale](ISTRUZIONI.md#6-configurazione); chiudi l’app prima di recuperare o modificare manualmente il JSON.

Il tema predefinito segue il sistema. Le impostazioni non contengono credenziali né ripristinano le sessioni. Valori mancanti o non validi ricevono i valori predefiniti o sono limitati all'intervallo ammesso. I limiti di appunti, trascinamento e lunghezza dell'input stanno in [`config/app.config.json`](config/app.config.json); dopo una modifica di quel file riavvia l'app. Vedi la [configurazione completa](ISTRUZIONI.md#6-configurazione).

![Impostazioni di aspetto, avvisi e rilevamento](docs/screenshots/plancia-settings.png)

### 4. Sicurezza e privacy

I comandi hanno gli stessi permessi dell'utente che avvia l'app e possono leggere o modificare file e usare la rete. L'app non integra un provider AI, non gestisce API key e non impone il consenso o i permessi dei tool avviati: autenticazione e invio dei dati dipendono da quei tool.

Le preferenze salvano anche l'ultima cartella utilizzata. L'output del terminale resta nei buffer di memoria dell'app; shell e programmi avviati possono scrivere cronologia e log propri. Notifiche, clipboard, schermate e messaggi diagnostici possono esporre informazioni. La finestra non carica script da Internet. Il modello descrive [controlli implementati e limiti residui](SECURITY_MODEL.md): la shell resta con i permessi dell'utente e i pacchetti non sono firmati.

### 5. Sviluppo e verifiche

**Release 0.3.19 pubblicata, 25 novembre 2026.** Aggiunge identità e risorsa ICO esplicite al pulsante nella barra delle applicazioni Windows. [Release e SHA-256](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19) sul commit `6b77a70d018eeaa59ad64ffc63f913baea5e4b37`; [Windows 45595863728](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45595863728) e [macOS ARM64 45597077290](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45597077290) riuscite. Windows: 613 test/5 saltati, PowerShell 5.1/7, sonda nativa dell’icona, installer/portatile e aggiornamento verificati. macOS: build e smoke dei DMG/ZIP reali. Portatile provato anche su Windows locale. Quattro pacchetti e due manifest riscaricati, SHA-256 e sei URL pubblici verificati; ZIP/TAR sorgenti confrontati con 224 file Git. Nessuna firma di distribuzione o notarizzazione; Linux, macOS Intel e icone di collegamenti personali già fissati non verificati. Dettagli nel [piano](PLAN.md).

**Release 0.3.18 pubblicata, 23 novembre 2026.** Fit 0.11, web-links 0.12 e React/ReactDOM 19.3.1 sono inclusi nella [release](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.18) sul commit `16d87d7c0c9944424870f572dcdc3907232483c3`, con Electron 45.4.1. Le run [Windows 45228957575](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45228957575) e [macOS ARM64 45228965581](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45228965581) sono riuscite; le note registrano smoke dei pacchetti, geometria del terminale e checksum verificati. Sono allegati installer/portable Windows x64, DMG/ZIP macOS ARM64 e due manifest SHA-256. Le prove sono sui runner GitHub: nessuna firma di distribuzione o notarizzazione, nessun pacchetto Linux o macOS Intel e nessuna nuova prova visiva su macchine personali. La successiva [PR #26](https://github.com/gloutchov/Plancia-Comandi/pull/26), integrata il 24 novembre, aggiorna solo la toolchain a Vitest 5.1.1; versione e pacchetti della release restano invariati. Dettagli nel [piano](PLAN.md).

M36/0.3.15: suite locale con Node 24, 582 test riusciti e 3 saltati; build e check del sito riusciti. La regressione `node scripts/smoke-multiline-paste.mjs .` usa renderer/xterm reali, appunti sintetici, IT/EN, due temi e tre dimensioni desktop; non accede agli appunti o alle shell personali. Prima pubblicazione e verifica Windows restano subordinate al controllo del commit. Dettagli e limiti nel [piano](PLAN.md).

**C33 pubblicata, 20 novembre 2026 — release 0.3.13 (M34/M35 assorbite).** Nome installato **Plancia Comandi**, ICO ufficiale Windows e lingua iniziale dal sistema, con override e preferenze conservati. Commit `6bab754c79ced9e530e73e30f8bca59fd55c4ffc`, tag annotati `milestone/C33` e `v0.3.13`, [release 0.3.13](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.13), ID `453136648`, pubblicata alle 21:17:23 (Europe/Rome). [Windows 44792620689](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44792620689): 513 test/4 saltati, PowerShell 5.1/7 e upgrade/rimozione 0.3.1 verificati. macOS ARM64: 514 test/3 saltati, otto primi avvii, upgrade e smoke finali dei pacchetti riusciti. Quattro binari senza certificato di firma e due manifest SHA-256 riscaricati e confrontati; sei URL pubblici HTTP 200, archivi sorgente identici ai 199 file Git. Branch M33 rimosso. Prova visiva nativa Windows rimandata su autorizzazione esplicita e dichiarata nelle note; Linux, macOS Intel e Gatekeeper su download in quarantena non verificati. Dettagli nel [piano](PLAN.md).

**C31 pubblicata, 20 novembre 2026 — release 0.3.12.** Barra superiore macOS trascinabile; Reload, Force Reload e DevTools rimossi dal menu; menu IT/EN aggiornati subito con le preferenze. Commit `eb038ff2fed3e02c195a6e88e83f03dc9c9f48a0`, tag annotati `milestone/C31` e `v0.3.12`, [release 0.3.12](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.12), ID `452884831`, pubblicata alle 16:56:54 (Europe/Rome). Windows [44763826255](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44763826255): 491 test/4 saltati, PowerShell 5.1/7, 194 scenari terminali e otto chrome; scompattato, portable e installato verificati. macOS: 492 test/3 saltati, otto scenari ASAR, smoke completi, fuse, errori di avvio, ZIP/DMG fuori dal checkout e SHA-256. Quattro binari non firmati e due manifest scaricati e confrontati con i locali; dopo pubblicazione ID, dimensioni e digest invariati, sei URL pubblici HTTP 200. ZIP/TAR sorgenti coincidono con i 191 file Git. Branch M31 rimosso localmente e sul remoto. Ripristini nativi macOS e monitor esterni non verificati separatamente; Windows provato sul runner, macOS Intel/Linux e Gatekeeper su download in quarantena non verificati. Dettagli nel [piano](PLAN.md).

**C29 pubblicata, 20 novembre 2026 — release 0.3.11, M30 assorbita.** Scorrimento e area utile del terminale corretti; selezionare un riquadro visibile conserva posizione, dimensioni e titolo, con bordo attivo interno di 2 px. Commit `023b93414489bd2facdb124d56617ee0faf0600a`, [Windows 44728165795](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44728165795) riuscita: 474 test/4 POSIX saltati, PowerShell 5.1/7, 194 controlli del renderer, fuse e smoke di scompattato/portable/app installata. macOS ARM64: suite locale 475/3 saltati, 194 controlli sui sorgenti e 194 sull’ASAR, build e smoke nativi dei DMG/ZIP finali. Tag annotati `milestone/C29` e `v0.3.11`, main remoto e [release 0.3.11](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.11) verificati. Quattro pacchetti senza firma con certificato e due manifest SHA-256 riscaricati e confrontati con i digest; sei link pubblici HTTP 200. ZIP/TAR sorgenti corrispondono ai 187 file Git del tag. Branch M29 rimosso localmente e sul remoto. Windows verificato sul runner; prove fisiche mouse/trackpad, Codex CLI reale, Linux, macOS Intel e Gatekeeper su download in quarantena non documentati separatamente. Dettagli e limiti nel [piano](PLAN.md).

**C28 pubblicata, 19 novembre 2026 — release 0.3.10.** Cambio sessione e vista conservano lo stesso terminale, con snapshot e output concorrente ordinati. Commit `593394a79aadd0e5e33a9acc25962a99f421fc72`, [Windows 44544442665](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44544442665) e [macOS ARM64 44544449320](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44544449320) verificati. Windows: 474 test riusciti/4 POSIX saltati, PowerShell 5.1/7 e scompattato/portable/app installata; macOS: build e smoke nativi di scompattato/DMG/ZIP. Portable finale provato anche su Windows locale con profilo sintetico. Quattro pacchetti non firmati e due manifest SHA-256 nella [release pubblicata](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.10), riscaricati e confrontati con i digest verificati. Verifiche e limiti nel [piano](PLAN.md).

**C9 completata, 16 novembre 2026 — release 0.3.7.** I 16 canali in ingresso accettano solo la finestra dell’app, il suo frame principale e l’URL esatto del documento previsto; frame mancanti, eliminati o estranei e payload non validi sono rifiutati. I permessi Chromium sono negati sia nei controlli sia nelle richieste; copia/incolla e notifiche native continuano attraverso il main. Suite macOS: 378 test riusciti, 2 PowerShell nativi saltati; build riuscita. ZIP estratto e DMG ARM64 in sola lettura: ispezione e smoke reali con profili isolati prima del main, IPC negativi, CSP, navigazione/popup e permessi negati. La [run Windows 43823173153](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43823173153) sul commit `3c3fb5efef8053df0514b44ef32f85ee723b0077` è verde, portable e app installata compresi. C9 è pubblicata nella [release 0.3.7](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.7). Dettagli nel [piano](PLAN.md).

**C8 completata, 15 novembre 2026 — release 0.3.6.** Preferenze salvate con sostituzione atomica e recupero in `.bak`; lettura bloccata o salvataggio fallito lasciano le modifiche utilizzabili solo per la sessione, con avvisi IT/EN. La diagnostica locale conserva solo eventi e codici/operazioni ammessi, senza messaggi grezzi, stack, percorsi o contenuti. Suite macOS: 340 test riusciti, 2 PowerShell nativi saltati. La [run Windows 43739270116](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43739270116) ha superato 339 test, con 3 casi POSIX saltati e 46 confronti per ciascun motore PowerShell 5.1/7; ispezione e smoke scompattato/portable/installato riusciti, inclusi guasto e recupero delle preferenze. DMG/ZIP ARM64 finali ispezionati e provati con profili isolati prima del main, due lingue, due temi e avvii corrotti/eccessivi/bloccati. [Release 0.3.6](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.6), quattro pacchetti e due manifest SHA-256 pubblicati e riscaricati, byte e digest verificati; sorgenti ZIP/TAR identici ai 132 file del commit. Main, checkpoint `milestone/C8` e tag `v0.3.6` verificati su `7e8b91e71b7391fde256f3a2b6af5b7fde40284a`; branch milestone rimosso. Esiti e limiti nel [piano](PLAN.md).

**C7 completata, 15 novembre 2026 — release 0.3.5.** I pattern personalizzati vengono esaminati in un worker cancellabile, con un budget di tempo. Un pattern non valido viene ignorato; dopo timeout o indisponibilità le tre liste personalizzate sono sospese e prosegue il rilevamento standard, con avviso IT/EN. Per svuotare le liste usa **Impostazioni → Ripristina i tempi**. Suite macOS: 292 test riusciti, 2 PowerShell nativi saltati; [Windows 43726467574](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43726467574): 294 test riusciti senza salti, inclusi i confronti PowerShell 5.1/7, e smoke scompattato/portable/installato. DMG/ZIP ARM64 finali ispezionati e provati con profili isolati, IT/EN, entrambi i temi, fallback e ripristino. [Release 0.3.5](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.5), quattro pacchetti e due manifest SHA-256 pubblicati e riscaricati: byte e digest verificati. Checkpoint `milestone/C7` e tag `v0.3.5` sul commit `641e129e76afe0cf0f6638ae456c70908a35bf95`; dettagli e limiti nel [piano](PLAN.md).

**C6 completata, 15 novembre 2026.** Vitest 5.1.0 sostituisce 3.2.4; electron-builder resta 26.18.0. L’override minimatch 11.0.1 è limitato alle precedenti versioni vulnerabili 7–11.0.0. Audit completo da 9 segnalazioni a zero, produzione sempre a zero; dipendenze runtime e bundle applicativi invariati. Versione 0.3.4 invariata, checkpoint `milestone/C6` pubblicato, nessuna nuova release. La [run Windows 43714263852](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43714263852) ha superato tutti i 282 test, inclusi 46 casi per ciascun motore PowerShell, build, ispezione e smoke scompattato/portable/installato; artifact scaricati e SHA-256 verificati. Su macOS: 280 test riusciti, 2 PowerShell nativi saltati, ispezione e smoke DMG/ZIP ARM64 con profili isolati. La landing con le shell, compresa fish, è pubblicata e verificata. Esiti e limiti nel [piano](PLAN.md) e nel [modello di sicurezza](SECURITY_MODEL.md).

Stack: Electron 45, React 19, TypeScript, Vite 6, xterm.js, `@xterm/headless` e `node-pty`. La UI è in `src/`, l'accesso a PTY e sistema in `electron/`, la logica pura degli stati in `src/shared/status.ts`. Vedi [MAP.md](MAP.md) e [AGENTS.md](AGENTS.md).

```bash
npm test
npm run build
```

Vitest verifica rilevamento degli stati, burst, titoli, stabilizzazione, notifiche, la policy del renderer e il controllo dei messaggi IPC precedenti a M1; non avvia Electron. La build esegue TypeScript e genera i bundle. Non esistono comandi npm dedicati a lint, typecheck o e2e. Il workflow manuale `package-windows.yml` non parte su push o PR e non pubblica una release. La run `43226304320` ha costruito i pacchetti Windows di 0.3.0, tooling `49ca65d6f5ae06ea9d6d22de4dd7af2cf38b4dba`, e ha verificato l'eseguibile scompattato, il portable e l'app installata. Il workflow manuale `package-macos.yml` non parte su push o PR. La run `43257940568`, tooling `95500826ba986a4ef4addceda8840188595ee2c7`, ha costruito il DMG e lo ZIP Apple Silicon non firmati e ha eseguito smoke e ispezione solo sull'app scompattata. La release è [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). La build non verifica una shell reale o un installer.

C13 aggiunge test dei percorsi per PowerShell: su Windows `npm test -- src/shared/shellQuote.native.test.ts` deve eseguire Windows PowerShell 5.1 e pwsh 7. Su macOS/Linux il confronto pwsh 7 è esplicito: `PLANCIA_TEST_PWSH=/percorso/pwsh npm test -- src/shared/shellQuote.native.test.ts`; senza il percorso entrambi i test nativi sono saltati. I test usano valori sintetici, profili temporanei e `-NoProfile`, senza appunti reali. Il workflow Windows manuale esistente esegue il confronto prima della build; non è avviato prima del controllo del commit. La verifica locale con pwsh 7.7.0 è riuscita; la [run Windows 43646412449](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43646412449) ha superato 46 casi per ciascuno dei motori 5.1.26100.33648 e 7.6.9. Suite locale: 232 test riusciti e 1 saltato; build, pacchetti, smoke e SHA-256 della release verificati.

C14, 15 novembre 2026: 274 test locali riusciti e 2 PowerShell nativi saltati su macOS; 17 confronti fish 4.9.3 riusciti. La [run Windows 43697244486](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43697244486) ha superato 46 casi per ciascuno dei motori PowerShell 5.1.26100.33648 e 7.6.9 e verificato app scompattata, portable e installata. DMG montato in sola lettura e ZIP macOS ARM64 estratto sono stati ispezionati e provati fuori dal checkout, con profili isolati prima del main. Tutti i sei allegati sono stati riscaricati e confrontati con SHA-256 e digest GitHub; gli archivi sorgente ZIP/TAR coincidono con i 118 file del commit rilasciato. Non è una prova personale su PC Windows, Linux, macOS Intel o Gatekeeper su download in quarantena.

La landing di presentazione è in [`docs/index.html`](docs/index.html), con IT/EN, tema automatico e manuale, galleria delle sei catture C3 e link ai pacchetti verificati 0.3.13. La milestone C4 ne registra verifiche e pubblicazione. Per controllarla dal checkout:

```bash
npm run check:site
npm run preview:site
```

Apri `http://127.0.0.1:4174/Plancia-Comandi/`; Ctrl+C arresta l'anteprima. Il server serve solo la pagina statica, senza avviare Electron. La sorgente di pubblicazione prevista da C4 è `main` e `/docs`, con `.nojekyll` e i due controlli del commit prima del push; non è aggiunto un workflow al repository. GitHub esegue comunque il deploy Pages gestito, necessario per il sito richiesto. Il dominio pubblico è `https://planciacomandi.glaucosilvestri.it/`, già configurato e confermato da Glauco per M40. DNS e HTTPS sono verificati; CNAME, canonical, Open Graph e hreflang usano questo host. Le risorse restano relative, utilizzabili anche nell’anteprima locale. Procedura: [sorgente di pubblicazione Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Per una dimostrazione da un checkout con Bash, su macOS/Linux:

```bash
PLANCIA_DEMO=1 npm run dev
```

La demo apre due shell, avvia un indicatore simulato e imposta il tema scuro, salvandolo nelle preferenze correnti. Non usa un modello AI. Il manuale descrive demo, variabili di sviluppo e limiti.

### 6. Distribuzione

Per preparare pacchetti con i workflow manuali, inserisci ogni volta lo SHA completo del commit approvato e la versione attesa: non è precompilata una versione di release. Windows usa `windows-2025`, macOS ARM64 conserva `macos-15`. I workflow non partono su push o pull request e non pubblicano release.

Eseguire prima test e build, poi creare il pacchetto sul sistema di destinazione:

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Eseguire solo il comando per la piattaforma interessata. `npm run dist` usa quella corrente. `release/` riceve DMG/ZIP su macOS, installer NSIS/eseguibile portabile x64 su Windows, AppImage/DEB su Linux. Su Windows il pacchetto usa le prebuild di `node-pty` e non ricompila. Su macOS `npm ci` verifica la prebuild in Electron e prepara l’helper, con compilazione di ripiego; Linux ricompila. `npm run rebuild` forza la compilazione.

La configurazione macOS disabilita la firma; su Windows non è configurato un certificato. Per questo progetto la distribuzione prevista è non firmata, senza notarizzazione o aggiornamento automatico configurati. Il pacchetto macOS di questo workflow è solo Apple Silicon (arm64): Intel non è supportato. Gatekeeper e SmartScreen possono mostrare avvisi. Al primo avvio di un download, fai clic destro sull'app e scegli **Apri**. Non modificare le protezioni del sistema per aprire artifact di origine o integrità non verificate.

**Firma e notarizzazione non disponibili:** Glauco ha confermato il 13 novembre 2026 di non disporre dei certificati e delle credenziali necessari per la firma Windows e per la firma/notarizzazione macOS. Queste attività sono escluse dalle milestone di sicurezza M5–M9 e non ne bloccano la chiusura. I pacchetti restano non firmati; ogni release deve dichiararlo e includere SHA-256. Il checksum permette di verificare l'integrità rispetto al manifest pubblicato, ma non autentica l'editore come una firma digitale. La configurazione di firma potrà essere rivalutata solo se saranno disponibili le credenziali e una nuova richiesta esplicita. Gli interventi applicativi ancora da eseguire sono nel [piano di sicurezza](PLAN.md#21-milestone-di-sicurezza-pianificate).

Prima di pubblicare una release occorrono approvazione del commit, verifiche sulla piattaforma reale, smoke fuori dal checkout e checksum SHA-256 degli artifact. La release `v0.2.0` esiste già con i sorgenti e con i pacchetti macOS ARM64. La release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) è pubblicata il 12 novembre 2026 sul commit `94ff1e44106f08fdcf961cab74171668112ad780`, con i pacchetti Windows della run `43226304320` e i pacchetti macOS della run `43257940568`. Le PR #6 e #7 sono unite; la PR #4 è chiusa senza merge; i branch di lavoro sono cancellati. Su Linux non è stata testata di persona. Il debito tecnico dei controlli di pacchetto è in [PLAN.md](PLAN.md). Per i download disponibili fanno fede gli allegati e i checksum della release.

### 7. Documentazione e licenza

| Documento | Contenuto |
| --- | --- |
| [ISTRUZIONI.md](ISTRUZIONI.md) | Manuale completo in italiano. |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) | Traduzione inglese completa del manuale. |
| [QUICK-START_Desktop.md](QUICK-START_Desktop.md) | Avvio rapido desktop IT/EN. |
| [SECURITY_MODEL.md](SECURITY_MODEL.md) | Sicurezza, privacy, controlli e rischi IT/EN. |
| [MAP.md](MAP.md) | Struttura e responsabilità del repository IT/EN. |
| [PLAN.md](PLAN.md) | Piano, verifiche e procedura di chiusura IT/EN. |
| [AGENTS.md](AGENTS.md) | Regole operative per agenti e maintainer. |
| [docs/index.html](docs/index.html) | Sorgenti della landing IT/EN di C4. |

Licenza **Apache License 2.0**: testo completo in [LICENSE](LICENSE).

## English

In **M37/0.3.16 source** (M38 absorbed), `sessions` and `processSnapshot` make maximum sessions, backlog, status interval and snapshot timeouts configurable. Defaults stay unchanged. On macOS postinstall uses the `node-pty` prebuild only after architecture and development-Electron load checks, preparing its helper permission; absence/incompatibility or errors retain the compilation fallback. Source **0.3.20** and latest published release **0.3.19**. The source separates Windows development and distribution identities to correct the taskbar button association in Explorer. Release 0.3.19 explicitly assigns the identity and ICO to the Windows taskbar button, using a resource outside ASAR. [Downloads and checksums](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19) verified.

In **M36/0.3.15 source**, pasting or dropping text containing LF or CR, including one line with a trailing newline, opens **Paste multiple lines?** when the program in the terminal has not enabled bracketed paste. The dialog names the session without showing the text: **Cancel** is initially focused; **Paste** authorizes the text already captured and limited. A line without a newline and enabled bracketed paste remain immediate. C36 is published in release 0.3.15 with verified packages and checksums.

In **C32/0.3.14**, child-process detection shares queries, respects the interval even when opening sessions and backs off after errors. Three failures show an IT/EN warning; input and other status signals stay active, with automatic recovery. The four `childPolling` parameters live in the central file. [Release 0.3.14](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.14) is published with verified Windows x64/macOS ARM64 packages and SHA-256.

The landing automatically follows the [latest stable release](https://github.com/gloutchov/Plancia-Comandi/releases/latest): it reads only public GitHub metadata on page load and updates links to the four packages and two checksums. If the request fails or JavaScript is disabled, links open the latest release page. No account or credentials are needed; terminal contents are not sent. Preview uses `vite.site.config.ts`, separate from the Electron configuration.

Previous release **0.3.13** completes C33, absorbing M34/M35: installed name **Plancia Comandi**, official ICO resource for the Windows window and initial system language, preserving saved preferences. Windows x64/macOS ARM64 packages and checksums verified; native Windows visual checks explicitly deferred and disclosed in the notes.

Draggable macOS top bar, clickable view buttons and menus matching the app IT/EN language are preserved, without Reload, Force Reload or Toggle Developer Tools.

Plancia Comandi brings several real terminals into one desktop window. Work with shells and AI coding CLIs, see which sessions are working or waiting for input, and tile the terminals you need.

**Source 0.3.20 · early development · macOS, Windows and Linux targets · Apache-2.0.** The latest published release is [0.3.19](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19). The runtime remains Electron **45.4.1**, an exact pin, with C27 fuses. Fit 0.11 uses the real scrollbar width. Install terminal tools separately.

![Updated icon and two side-by-side terminals in the dark theme](docs/screenshots/plancia-dark-en.png)

Screenshots of source version 0.3.1 on Windows, using demonstration data and isolated preferences; [capture provenance](docs/screenshots/capture.json). Release [0.3.18](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.18) is available with unsigned Windows x64 installer/portable and macOS ARM64 DMG/ZIP packages and SHA-256 checksums.

**Contents**

- [1. Main features](#1-main-features)
- [2. Installation and first use](#2-installation-and-first-use)
- [3. Settings](#3-settings)
- [4. Security and privacy](#4-security-and-privacy)
- [5. Development and checks](#5-development-and-checks)
- [6. Distribution](#6-distribution)
- [7. Documentation and license](#7-documentation-and-license)

### 1. Main features

- Up to 12 sessions by default, configurable from 1 to 32, with a choice of shell and starting folder.
- **One**, **Side by side**, **Stacked** and **Grid** views, with icons, plus session renaming and closing.
- **Starting**, **Working**, **Idle**, **Action** and **Exited** states estimated from output, titles and child processes.
- Sidebar dots and system notifications for sessions requiring attention.
- System, light or dark theme; Italian or English interface; configurable text size and detection timings.
- Copy, paste, file and text drag-and-drop, browser links and platform-specific shortcuts. Confirmation before multiline paste or drop without bracketed paste; **Cancel**, Esc or a click outside the dialog send no text. Tab/Shift+Tab stay on the two buttons; Enter activates the focused one. Other pastes are not queued during the decision; closing the session cancels the request.

Shells depend on the computer: **Windows PowerShell**, **PowerShell 7**, **Command Prompt** and **Git Bash** on Windows; **Login shell**, **zsh**, **bash** and **fish** on macOS/Linux, when present in detected locations. The landing shows the same list by platform.

Detection is heuristic and mainly designed around Codex CLI screens: it does not read programs' internal state. Check the terminal itself. From 0.3.13, without a valid saved language, the first preferred system language determines the interface: Italian for `it`, English otherwise. Manual selection takes precedence; the screen before preferences load still uses Italian. Sessions are not restored after quitting the app.

![Side-by-side view in the light theme](docs/screenshots/plancia-light-en.png)

In version 0.3.5 source, a warning explains when slow or unavailable custom patterns fall back to standard detection; terminals continue receiving input and output.

### 2. Installation and first use

Running from source requires Git and Node.js 22.12+ on the 22.x line, 24.x, or 26+ with npm, as required by the toolchain; Electron 45.4.1 requires at least Node.js 22.12. On Windows, compiling is not required and administrator rights are not required: `node-pty` 1.1.0 includes N-API prebuilds. macOS needs build tools only as fallback without a compatible/preparable prebuild; Linux requires them. Complete installation steps are in the [Installation](INSTRUCTIONS.md#2-installation) chapter. This documentation's local checks use Node.js 24.

```bash
git clone https://github.com/gloutchov/Plancia-Comandi.git
cd Plancia-Comandi
npm ci
npm run dev
```

This repository is public; read-only cloning does not require a GitHub account. `npm ci` downloads dependencies and Electron. On macOS it checks the prebuild in actual Electron and prepares its helper, rebuilding only as fallback; Linux rebuilds and Windows retains prebuilds. A desktop window opens: the development web page cannot create terminals on its own.

1. Click **New session**.
2. Choose a shell and folder, optionally enter a name, and click **Open**.
3. Use it like your system terminal. With at least two sessions, the icons at the top right choose **Side by side** or **Stacked**; from three sessions **Grid** is available too.

See the [desktop quick start](QUICK-START_Desktop.md) and [English manual](INSTRUCTIONS.md). To change the initial Italian interface, open **Impostazioni** and choose **English**.

#### Build and run on Linux

It has not been tested in person on Linux.

1. Install Git and Node.js 22.12+ on the 22.x line, 24.x, or 26+ with npm, as required by the toolchain. The checks described in these documents use Node.js 24.
2. Install the tools that compile `node-pty`. Version 1.1.0 has no Linux prebuild, and `npm ci` rebuilds it for Electron with node-gyp. The `node-pty` README asks for `make`, `python` and `build-essential`. On Debian and Ubuntu, `build-essential` already includes `make`, `gcc` and `g++`; the Python package to install is `python3`.

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

On another distribution, install the equivalents of `build-essential` and `python3`.

3. From the project folder, install, test, build and start:

```bash
npm ci
npm test
npm run build
npm run dev
```

4. The Linux package has a script: `npm run dist:linux`. It produces an AppImage and a DEB in `release/`, named `PlanciaComandi-linux-<version>-<arch>.AppImage` and `.deb`. Run it after the tests and the build, on the target Linux system. It has not been tested in person on Linux.

### 3. Settings

Open **Settings** for language, theme, terminal size, alerts and detection timings. Interface changes apply immediately and remain on this computer in `settings.json`, in the app's data directory. **Open the configuration file** reveals the file in the file manager; restart the app after editing it manually.

From version 0.3.6, a warning reports preference recovery or unsaved changes. Backups and local logs are described in the [manual](INSTRUCTIONS.md#6-configuration); close the app before recovering or manually editing JSON.

The default theme follows the system. Settings do not store credentials or restore sessions. Missing or invalid values receive defaults or are clamped to their allowed range. Clipboard, drag-and-drop and input-length limits live in [`config/app.config.json`](config/app.config.json); restart the app after editing that file. See the [full configuration](INSTRUCTIONS.md#6-configuration).

![Appearance, alert and detection settings](docs/screenshots/plancia-settings-en.png)

### 4. Security and privacy

Commands run with the permissions of the user starting the app and can read or change files and use the network. The app has no integrated AI provider, does not manage API keys, and does not enforce consent or permissions for launched tools: those tools control authentication and data transmission.

Preferences also store the last used folder. Terminal output remains in the app's memory buffers; shells and launched programs may write their own history and logs. Notifications, clipboard, screenshots and diagnostics can expose information. The window does not load scripts from the Internet. The security model describes [implemented controls and remaining limitations](SECURITY_MODEL.md): the shell still runs with the user's permissions and the packages are unsigned.

### 5. Development and checks

**Release 0.3.19 published, 25 November 2026.** Adds an explicit identity and ICO resource to the Windows taskbar button. [Release and SHA-256](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.19) at commit `6b77a70d018eeaa59ad64ffc63f913baea5e4b37`; [Windows 45595863728](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45595863728) and [macOS ARM64 45597077290](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45597077290) passed. Windows: 613 tests/5 skipped, PowerShell 5.1/7, native icon probe, installer/portable and upgrade verified. macOS: build and real DMG/ZIP smoke. Portable also tested on local Windows. Four packages and two manifests downloaded again, SHA-256 and six public URLs verified; source ZIP/TAR compared with 224 Git files. No distribution signing or notarization; Linux, Intel macOS and existing personal pinned shortcut icons unverified. Details in the [plan](PLAN.md).

**Release 0.3.18 published, 23 November 2026.** Fit 0.11, web-links 0.12 and React/ReactDOM 19.3.1 are included in the [release](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.18) at `16d87d7c0c9944424870f572dcdc3907232483c3`, with Electron 45.4.1. [Windows 45228957575](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45228957575) and [macOS ARM64 45228965581](https://github.com/gloutchov/Plancia-Comandi/actions/runs/45228965581) succeeded; the notes record package smoke, terminal geometry and verified checksums. Attached are Windows x64 installer/portable, macOS ARM64 DMG/ZIP and two SHA-256 manifests. Checks ran on GitHub runners: no distribution signing or notarization, no Linux or Intel macOS package and no new visual checks on personal machines. The subsequent [PR #26](https://github.com/gloutchov/Plancia-Comandi/pull/26), integrated on 24 November, updates only the toolchain to Vitest 5.1.1; the release version and packages are unchanged. Details in the [plan](PLAN.md).

M36/0.3.15: local Node 24 suite, 582 passed and 3 skipped tests; build and site check passed. The `node scripts/smoke-multiline-paste.mjs .` regression uses real renderer/xterm, synthetic clipboard, IT/EN, both themes and three desktop sizes; it does not access personal clipboard or shells. First publication and Windows checks remain subject to commit review. Details and limits in the [plan](PLAN.md).

**C33 published, 20 November 2026 — release 0.3.13 (M34/M35 absorbed).** Installed name **Plancia Comandi**, official Windows ICO and initial system language, preserving overrides and preferences. Commit `6bab754c79ced9e530e73e30f8bca59fd55c4ffc`, annotated `milestone/C33` and `v0.3.13` tags, [release 0.3.13](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.13), ID `453136648`, published at 21:17:23 (Europe/Rome). [Windows 44792620689](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44792620689): 513 tests/4 skipped, PowerShell 5.1/7 and 0.3.1 upgrade/removal verified. macOS ARM64: 514 tests/3 skipped, eight first launches, upgrade and final package smoke passed. Four binaries without a distribution signing certificate and two SHA-256 manifests downloaded and compared; six public URLs HTTP 200, source archives match all 199 Git files. M33 branch removed. Native Windows visual checks explicitly deferred and disclosed in the notes; Linux, Intel macOS and Gatekeeper on quarantined downloads unverified. Details in the [plan](PLAN.md).

**C31 published, 20 November 2026 — release 0.3.12.** Draggable macOS top bar; Reload, Force Reload and DevTools removed from the menu; immediate IT/EN menu updates with preferences. Commit `eb038ff2fed3e02c195a6e88e83f03dc9c9f48a0`, annotated `milestone/C31` and `v0.3.12` tags, [release 0.3.12](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.12), ID `452884831`, published at 16:56:54 (Europe/Rome). Windows [44763826255](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44763826255): 491 tests/4 skipped, PowerShell 5.1/7, 194 terminal and eight chrome scenarios; unpacked, portable and installed apps verified. macOS: 492 tests/3 skipped, eight ASAR scenarios, full smoke, fuses, startup failures, ZIP/DMG outside checkout and SHA-256. Four unsigned binaries and two manifests downloaded and compared with local files; after publication IDs, sizes and digests unchanged, six public URLs HTTP 200. Source ZIP/TAR match all 191 Git files. M31 branch removed locally and remotely. Native macOS restoration and external displays not separately verified; Windows tested on the runner, Intel macOS/Linux and Gatekeeper on quarantined downloads not verified. Details in the [plan](PLAN.md).

**C29 published, 20 November 2026 — release 0.3.11, M30 absorbed.** Corrected terminal scrolling and display area; selecting a visible pane preserves position, size and title, with a 2 px internal active outline. Commit `023b93414489bd2facdb124d56617ee0faf0600a`, successful [Windows 44728165795](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44728165795): 474 tests/4 POSIX skips, PowerShell 5.1/7, 194 renderer checks, fuses and unpacked/portable/installed-app smoke. macOS ARM64: local suite 475/3 skips, 194 source and 194 ASAR checks, native build and smoke of final DMG/ZIP. Annotated `milestone/C29` and `v0.3.11` tags, remote main and [release 0.3.11](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.11) verified. Four packages without certificate signing and two SHA-256 manifests downloaded again and compared with digests; six public links HTTP 200. Source ZIP/TAR match the tag’s 187 Git files. M29 branch removed locally and remotely. Windows verified on the runner; physical mouse/trackpad, real Codex CLI, Linux, Intel macOS and Gatekeeper on quarantined downloads not separately documented. Details and limits in the [plan](PLAN.md).

**C28 published, 19 November 2026 — release 0.3.10.** Session and view changes preserve the same terminal, with ordered snapshot and concurrent output. Commit `593394a79aadd0e5e33a9acc25962a99f421fc72`, [Windows 44544442665](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44544442665) and [macOS ARM64 44544449320](https://github.com/gloutchov/Plancia-Comandi/actions/runs/44544449320) verified. Windows: 474 tests passed/4 POSIX skips, PowerShell 5.1/7 and unpacked/portable/installed app; macOS: native build/smoke of unpacked/DMG/ZIP. The final portable also passed local Windows smoke with a synthetic profile. Four unsigned packages and two SHA-256 manifests in the [published release](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.10), downloaded again and compared with verified digests. Checks and limits in the [plan](PLAN.md).

**C9 completed, 16 November 2026 — release 0.3.7.** All 16 inbound channels accept only the app window, its main frame and the exact expected document URL; missing, disposed or foreign frames and invalid payloads are rejected. Chromium permissions are denied for both checks and requests; native copy/paste and notifications continue through main. macOS suite: 378 tests passed, 2 native PowerShell tests skipped; build passed. Extracted ZIP and read-only ARM64 DMG: inspection and live smoke with profiles isolated before main, negative IPC, CSP, navigation/popup and denied permissions. [Windows run 43823173153](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43823173153) at commit `3c3fb5efef8053df0514b44ef32f85ee723b0077` is green, including portable and installed. C9 is published in [release 0.3.7](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.7). Details in the [plan](PLAN.md).

**C8 completed, 15 November 2026 — release 0.3.6.** Preferences saved using atomic replacement and `.bak` recovery; blocked reading or failed saves leave changes usable only for the session, with IT/EN warnings. Local diagnostics retain only static events and allowlisted codes/operations, without raw messages, stacks, paths or contents. macOS suite: 340 tests passed, 2 native PowerShell tests skipped. [Windows run 43739270116](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43739270116) passed 339 tests, with 3 POSIX cases skipped and 46 comparisons on each PowerShell 5.1/7 engine; inspection and unpacked/portable/installed smoke passed, including preference failure and recovery. Final ARM64 DMG/ZIP inspected and tested with profiles isolated before main, two languages, both themes and corrupt/oversized/blocked startups. [Release 0.3.6](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.6), four packages and two SHA-256 manifests published and downloaded again, bytes and digests verified; ZIP/TAR source archives match all 132 commit files. Main, checkpoint `milestone/C8` and tag `v0.3.6` verified at `7e8b91e71b7391fde256f3a2b6af5b7fde40284a`; milestone branch removed. Results and limits in the [plan](PLAN.md).

**C7 completed, 15 November 2026 — release 0.3.5.** Custom patterns run in a cancellable worker with a time budget. Invalid patterns are ignored; after timeout or unavailability all three custom lists are suspended and standard detection continues, with an IT/EN warning. Use **Settings → Reset timings** to clear the lists. macOS suite: 292 tests passed, 2 native PowerShell tests skipped; [Windows 43726467574](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43726467574): 294 tests passed without skips, including PowerShell 5.1/7 comparisons, and unpacked/portable/installed smoke. Final ARM64 DMG/ZIP inspected and tested with isolated profiles, IT/EN, both themes, fallback and recovery. [Release 0.3.5](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.5), four packages and two SHA-256 manifests published and downloaded again: bytes and digests verified. Checkpoint `milestone/C7` and tag `v0.3.5` at commit `641e129e76afe0cf0f6638ae456c70908a35bf95`; details and limits in the [plan](PLAN.md).

**C6 completed, 15 November 2026.** Vitest 5.1.0 replaces 3.2.4; electron-builder stays at 26.18.0. The minimatch 11.0.1 override is limited to previously vulnerable versions 7–11.0.0. Full audit goes from 9 findings to zero, production stays at zero; runtime dependencies and application bundles are unchanged. Version 0.3.4 unchanged, `milestone/C6` checkpoint published, no new release. [Windows run 43714263852](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43714263852) passed all 282 tests, including 46 cases per PowerShell engine, build, inspection and unpacked/portable/installed smoke; artifacts downloaded and SHA-256 verified. On macOS: 280 tests passed, 2 native PowerShell tests skipped, ARM64 DMG/ZIP inspection and smoke with isolated profiles. The landing with shells, including fish, is published and verified. Results and limits in the [plan](PLAN.md) and [security model](SECURITY_MODEL.md).

Stack: Electron 45, React 19, TypeScript, Vite 6, xterm.js, `@xterm/headless` and `node-pty`. UI lives in `src/`, PTY and system access in `electron/`, and pure status logic in `src/shared/status.ts`. See [MAP.md](MAP.md) and [AGENTS.md](AGENTS.md).

```bash
npm test
npm run build
```

Vitest checks status detection, output bursts, titles, stabilization, notifications, the renderer policy and the checks on IPC messages that predate M1; it does not launch Electron. The build runs TypeScript and generates bundles. There are no dedicated npm lint, typecheck or e2e commands. The manual `package-windows.yml` workflow does not run on push or PR and does not publish a release. Run `43226304320` built the Windows packages for 0.3.0, tooling `49ca65d6f5ae06ea9d6d22de4dd7af2cf38b4dba`, and checked the unpacked executable, the portable executable and the installed app. The manual `package-macos.yml` workflow does not run on push or PR. Run `43257940568`, tooling `95500826ba986a4ef4addceda8840188595ee2c7`, built the unsigned Apple Silicon DMG and ZIP and ran smoke tests and inspection only on the unpacked app. The release is [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0). Building does not verify a real shell or installer.

C13 adds PowerShell path tests: on Windows, `npm test -- src/shared/shellQuote.native.test.ts` must run Windows PowerShell 5.1 and pwsh 7. On macOS/Linux, pwsh 7 comparison is explicit: `PLANCIA_TEST_PWSH=/path/to/pwsh npm test -- src/shared/shellQuote.native.test.ts`; without that path both native tests are skipped. Tests use synthetic values, temporary profiles and `-NoProfile`, without the real clipboard. The existing manual Windows workflow runs the comparison before the build; it is not started before commit review. Local pwsh 7.7.0 verification passed; [Windows run 43646412449](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43646412449) passed 46 cases per engine, versions 5.1.26100.33648 and 7.6.9. Local suite: 232 passed and 1 skipped; release build, packages, smoke and SHA-256 verified.

C14, 15 November 2026: 274 local tests passed and 2 native PowerShell tests skipped on macOS; 17 fish 4.9.3 comparisons passed. [Windows run 43697244486](https://github.com/gloutchov/Plancia-Comandi/actions/runs/43697244486) passed 46 cases per engine, PowerShell 5.1.26100.33648 and 7.6.9, and checked the unpacked, portable and installed app. The read-only mounted DMG and extracted macOS ARM64 ZIP were inspected and tested outside the checkout, with profiles isolated before main. All six assets were downloaded again and compared with SHA-256 and GitHub digests; ZIP/TAR source archives match the released commit’s 118 files. This does not establish a personal Windows PC, Linux, Intel macOS or Gatekeeper check on quarantined downloads.

The presentation landing page is in [`docs/index.html`](docs/index.html), with IT/EN, automatic and manual theme, the six C3 screenshots and links to the verified 0.3.13 packages. Milestone C4 records its checks and publication. To check it from the checkout:

```bash
npm run check:site
npm run preview:site
```

Open `http://127.0.0.1:4174/Plancia-Comandi/`; Ctrl+C stops the preview. The server serves only the static page and does not launch Electron. The planned publishing source is `main` and `/docs`, with `.nojekyll`, with both commit reviews before pushing; no repository workflow is added. GitHub still runs its managed Pages deployment, which is necessary for the requested site. The public domain is `https://planciacomandi.glaucosilvestri.it/`, already configured and confirmed by Glauco for M40. DNS and HTTPS are verified; CNAME, canonical, Open Graph and hreflang use this host. Assets remain relative and work in local previews too. Procedure: [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

For a demo from a checkout with Bash on macOS/Linux:

```bash
PLANCIA_DEMO=1 npm run dev
```

The demo opens two shells, runs a simulated indicator and selects the dark theme, saving it to current preferences. It uses no AI model. The manual covers the demo, development variables and limitations.

### 6. Distribution

To prepare packages with the manual workflows, enter the full approved commit SHA and expected version each time: no release version is prefilled. Windows uses `windows-2025`, macOS ARM64 keeps `macos-15`. Workflows do not run on push or pull request and do not publish releases.

Run tests and build first, then create the package on its target OS:

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Run only the command for the intended platform. `npm run dist` uses the current OS. `release/` receives DMG/ZIP on macOS, an NSIS installer/x64 portable executable on Windows, and AppImage/DEB on Linux. On Windows the package uses the `node-pty` prebuilds and does not compile. On macOS `npm ci` checks the prebuild in Electron and prepares its helper, compiling only as fallback; Linux rebuilds. `npm run rebuild` forces compilation.

macOS configuration disables signing; Windows has no configured certificate. Distribution for this project is expected to be unsigned, with no notarization or automatic updates configured. The macOS package from this workflow is Apple Silicon (arm64) only: Intel is not supported. Gatekeeper and SmartScreen may display warnings. The first time you open a download, right-click the app and choose **Open**. Do not change system protections to open artifacts whose origin or integrity has not been verified.

**Signing and notarization unavailable:** on 13 November 2026 Glauco confirmed that the certificates and credentials required for Windows signing and macOS signing/notarization are unavailable. These activities are excluded from security milestones M5–M9 and do not block their closure. Packages remain unsigned; every release must disclose this and include SHA-256. The checksum verifies integrity against the published manifest but does not authenticate the publisher as a digital signature does. Signing configuration may be reconsidered only when credentials are available and a new explicit request is made. Application work still to be carried out is listed in the [security plan](PLAN.md#21-planned-security-milestones).

Publishing a release requires commit approval, checks on the real platform, smoke outside the checkout and artifact SHA-256 checksums. The `v0.2.0` release already exists with the sources and the macOS ARM64 packages. Release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) was published on 12 November 2026 at commit `94ff1e44106f08fdcf961cab74171668112ad780`, with the Windows packages from run `43226304320` and the macOS packages from run `43257940568`. PRs #6 and #7 are merged; PR #4 is closed without a merge; the work branches are deleted. It has not been tested in person on Linux. Packaging-check debt is in [PLAN.md](PLAN.md). Available downloads are identified by the release assets and checksums.

### 7. Documentation and license

| Document | Contents |
| --- | --- |
| [ISTRUZIONI.md](ISTRUZIONI.md) | Complete Italian manual. |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) | Complete English translation of the manual. |
| [QUICK-START_Desktop.md](QUICK-START_Desktop.md) | IT/EN desktop quick start. |
| [SECURITY_MODEL.md](SECURITY_MODEL.md) | IT/EN security, privacy, controls and risks. |
| [MAP.md](MAP.md) | IT/EN repository structure and responsibilities. |
| [PLAN.md](PLAN.md) | IT/EN plan, checks and closure procedure. |
| [AGENTS.md](AGENTS.md) | Operating rules for agents and maintainers. |
| [docs/index.html](docs/index.html) | C4 IT/EN landing source. |

Licensed under the **Apache License 2.0**: see the full text in [LICENSE](LICENSE).
