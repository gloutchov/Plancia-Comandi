# Manuale utente — Plancia Comandi

Questo manuale descrive Plancia Comandi **0.3.0**, un'app desktop per usare più terminali reali e seguirne l'attività. L'app è in sviluppo iniziale; i limiti indicati qui sono parte del comportamento attuale. La traduzione completa è in [INSTRUCTIONS.md](INSTRUCTIONS.md).

**Sommario**

- [1. Requisiti](#1-requisiti)
- [2. Installazione](#2-installazione)
- [3. Primo avvio](#3-primo-avvio)
- [4. Sessioni e viste](#4-sessioni-e-viste)
- [5. Stati e avvisi](#5-stati-e-avvisi)
- [6. Configurazione](#6-configurazione)
- [7. Tastiera, clipboard e collegamenti](#7-tastiera-clipboard-e-collegamenti)
- [8. Esempi pratici](#8-esempi-pratici)
- [9. Risoluzione dei problemi](#9-risoluzione-dei-problemi)
- [10. Aggiornamento e rimozione](#10-aggiornamento-e-rimozione)
- [11. Sicurezza e limiti](#11-sicurezza-e-limiti)
- [12. Sviluppo e distribuzione](#12-sviluppo-e-distribuzione)

## 1. Requisiti

Serve un computer desktop con macOS, Windows o Linux e una shell utilizzabile. La finestra ha dimensione minima 860 × 560. Queste sono piattaforme target, non una certificazione di compatibilità per ogni versione del sistema. I pacchetti configurati sono DMG/ZIP per macOS, NSIS/portabile x64 per Windows e AppImage/DEB per Linux; le verifiche reali di distribuzione sono ancora da completare.

Per eseguire i sorgenti servono Git, Node.js con npm, accesso autorizzato al repository privato e strumenti per compilare `node-pty`. Le verifiche locali di questa documentazione usano Node.js 24. Non serve installare Electron separatamente: viene scaricato tra le dipendenze. Le CLI che vuoi usare nei terminali, incluse quelle AI, vanno installate e autenticate separatamente.

## 2. Installazione

### 2.1 Installare il software necessario

1. Installa **Git** dal [sito ufficiale](https://git-scm.com/downloads), scegliendo il tuo sistema operativo e seguendo l'installer. Su Windows puoi installare anche Git Bash. Apri un nuovo terminale e verifica `git --version`.
2. Installa **Node.js 24** con npm dal [sito ufficiale](https://nodejs.org/en/download), scegliendo versione, sistema e architettura appropriati. Riapri il terminale e controlla `node --version` e `npm --version`. npm fa parte della normale installazione Node.js.
3. Prepara gli strumenti nativi se la compilazione li richiede: su macOS gli strumenti di sviluppo Xcode; su Windows Python e gli strumenti C++/Windows SDK di Visual Studio; su Linux Python, `make` e un compilatore C++. Segui i requisiti della versione di `node-pty` usata dal progetto, consultabili anche in `node_modules/node-pty/README.md` dopo il download delle dipendenze. Non occorre installare questi strumenti per usare un futuro pacchetto già compilato.
4. Se vuoi una shell opzionale, installala con il suo installer e riavvia Plancia Comandi. Su Windows vengono cercati PowerShell 7 nel `PATH` e Git Bash nelle cartelle standard di Git. La normale Windows PowerShell è la scelta iniziale; su macOS/Linux si usa la shell di login.
5. Se vuoi usare una CLI AI, completa prima la sua installazione e il suo accesso nel normale terminale di sistema. Plancia Comandi non include la CLI, non ne configura l'account e non gestisce le sue credenziali.

Per preparare gli strumenti nativi:

- **macOS:** dalla pagina [Xcode di Apple](https://developer.apple.com/xcode/resources/) apri il collegamento al Mac App Store, installa Xcode e avvialo per completare le richieste iniziali. Se la compilazione segnala strumenti mancanti, verifica l'installazione degli strumenti da riga di comando.
- **Windows:** scarica e installa [Python](https://www.python.org/downloads/) e i [Build Tools C++ di Microsoft](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Nell'installer dei Build Tools seleziona gli strumenti per lo sviluppo desktop C++ e un Windows SDK. Riapri il terminale e verifica che Python sia disponibile. Se compare l'errore sulle librerie Spectre, aggiungi il componente corrispondente al compilatore tramite Visual Studio Installer, come indicato nel README di `node-pty`.
- **Linux:** usa il gestore pacchetti della tua distribuzione per installare Python 3, `make` e il compilatore C++ con i relativi strumenti di sviluppo; nomi e procedura dipendono dalla distribuzione. Poi ripeti `npm ci` dalla cartella del progetto.

### 2.2 Ottenere e avviare Plancia Comandi

Con un account GitHub autorizzato al repository:

```bash
git clone https://github.com/gloutchov/Plancia-Comandi.git
cd Plancia-Comandi
npm ci
npm run dev
```

Se il checkout esiste già, apri il terminale nella sua cartella senza clonare un'altra copia. `npm ci` installa le versioni del lockfile ed esegue la ricompilazione nativa per Electron; richiede accesso alla rete. Attendi il completamento prima di avviare l'app.

Si apre la finestra desktop. Vite serve anche `http://127.0.0.1:47231/`, ma la pagina nel browser non può aprire terminali: usa la finestra Electron. Per terminare l'ambiente di sviluppo, esci dall'app e interrompi il comando nel terminale che l'ha avviata.

### 2.3 Pacchetti compilati

Questa guida non presuppone che esista già un installer verificato. Se viene pubblicata una release, usa solo gli artifact e gli SHA-256 indicati nelle sue note: DMG/ZIP per macOS, installer NSIS o portabile per Windows, AppImage/DEB per Linux. Il portabile Windows si esegue senza l'installer; il suo nome non garantisce che le impostazioni siano salvate accanto all'eseguibile.

Dopo avere verificato il file per il tuo sistema e la tua architettura, segui le note della release: su macOS apri il DMG e copia l'app in Applicazioni, oppure estrai l'app dallo ZIP; su Windows avvia l'installer e scegli la cartella oppure usa l'eseguibile portabile; su Linux apri il DEB con il gestore pacchetti o assegna all'AppImage il permesso di esecuzione tramite le proprietà del file e avvialo. Queste sono le procedure previste dai target configurati, ancora da verificare sui pacchetti reali.

La distribuzione prevista è non firmata. Gatekeeper e SmartScreen possono mostrare avvisi. Verifica origine e checksum prima di seguire le procedure di apertura previste dal sistema; non disattivare le protezioni globali. Firma, notarizzazione e aggiornamenti automatici non sono configurati.

## 3. Primo avvio

1. La finestra parte dall'area di lavoro, senza terminali aperti. Premi **Nuova sessione**.
2. Inserisci un **Nome** facoltativo; se lo lasci vuoto, l'app usa un nome numerato.
3. Scegli la **Shell** e la **Cartella**. **Sfoglia** apre il selettore di cartelle. La prima cartella proposta è la home; in seguito viene riproposta l'ultima usata.
4. Premi **Apri** e attendi il prompt. Se la cartella non è valida o il modulo terminale non si carica, correggi l'errore mostrato.
5. Digita un comando nella shell, come faresti nel terminale di sistema.

La lingua iniziale è italiana anche sui sistemi non italiani. In **Impostazioni** puoi scegliere **Italiano** o **English**. Il tema iniziale segue il sistema; puoi forzare **Chiaro** o **Scuro**. Le preferenze restano salvate.

## 4. Sessioni e viste

Puoi tenere fino a **12 sessioni**, contando anche quelle terminate ma non ancora chiuse. Se raggiungi il limite, chiudine una prima di crearne un'altra.

- **Selezionare:** clicca una riga nella barra laterale o dentro un terminale visibile. La tastiera è indirizzata alla sessione attiva.
- **Rinominare:** premi la matita **Rinomina** o fai doppio clic sul nome. Premi Invio o sposta il focus per salvare; Esc annulla. Il nome è limitato a 80 caratteri.
- **Vista Una:** icona di un quadrato. Mostra solo la sessione selezionata.
- **Vista Affiancate:** icona di due rettangoli affiancati. Mostra la sessione selezionata e la successiva. Il pulsante è disattivato se c'è una sola sessione; il tooltip dice di aprirne almeno due.
- **Vista Incolonnate:** icona di due rettangoli uno sopra l'altro. Mostra le stesse due sessioni, una sopra l'altra. Anche questo pulsante è disattivato con una sola sessione.
- **Vista Griglia:** icona di quattro quadrati. Si attiva da tre sessioni in su. Con tre sessioni il quarto riquadro resta vuoto. Sotto le tre sessioni il pulsante è disattivato e il tooltip chiede di aprirne almeno tre.
- **Quali sessioni si vedono:** il primo riquadro è la sessione selezionata. Gli altri seguono l'ordine della barra laterale. Arrivati in fondo all'elenco, si ricomincia dall'inizio. Una sessione non compare due volte.
- **Vista ricordata:** la scelta resta salvata. Se le sessioni aperte non bastano, vedi **Una** e il pulsante della vista scelta è disattivato; quando le sessioni diventano sufficienti, quella vista torna da sola. Se invece chiudi sessioni e la vista non è più possibile, la scelta diventa **Una** e viene salvata così.
- **Affianca:** l'icona delle colonne nella riga, oppure Command-clic su macOS o Ctrl-clic sugli altri sistemi, seleziona quella sessione e passa ad **Affiancate**, se esiste almeno un'altra sessione. Con una sola sessione il pulsante è disattivato.
- **Chiudere:** premi **×** nella riga. Se lo stato è **Al lavoro** o **Azione**, compare una conferma; negli altri stati la chiusura è immediata. Il processo del terminale viene interrotto.

Un processo uscito lascia visibile **Terminata** con il codice di uscita. Puoi leggere l'output prima di chiudere la sessione. Per riavviare il lavoro apri una nuova sessione.

All'uscita completa le sessioni vengono terminate e non sono ripristinate. Nomi, selezione e output non sono salvati per il prossimo avvio. La vista scelta sì. Su macOS chiudere l'ultima finestra lascia normalmente attiva l'app e le sue sessioni; uscire dall'app le termina. Non c'è una conferma generale di uscita che controlli tutte le sessioni.

## 5. Stati e avvisi

| Stato | Significato stimato |
| --- | --- |
| Avvio | Non è ancora arrivato output, entro il tempo iniziale previsto. |
| Al lavoro | Il programma produce output o ci sono segnali di lavoro. |
| In attesa | Non ci sono segnali recenti di lavoro, oppure è riconosciuto un prompt. |
| Azione | Il titolo o le ultime righe suggeriscono una richiesta di intervento. |
| Terminata | Il processo è uscito. |

L'app valuta in ordine: uscita del processo, fase iniziale, richiesta di intervento, titolo animato/di lavoro, indicatori nelle ultime righe, prompt riconosciuto, burst di output, processo figlio sullo schermo normale e infine assenza di attività. Un titolo di lavoro fermo viene ignorato dopo 3 secondi; un indicatore ancora visibile può mantenere **Al lavoro** fino a 12 secondi dall'output. Un prompt riconosciuto usa 280 ms; un burst di output usa 900 ms. Il processo figlio silenzioso mantiene il lavoro per 8 secondi nel buffer normale, non nel TUI a schermo intero. I tempi sono modificabili.

La richiesta di azione resta visibile almeno 1,8 secondi per ridurre lo sfarfallio. Le informazioni sui processi figli sono rilevate circa ogni 2,5 secondi con strumenti del sistema; non sono istantanee.

In **Impostazioni → Avvisi** puoi attivare separatamente **Notifica di sistema** e **Pallino nella barra**. L'app segnala una sessione che torna in attesa dopo un lavoro abbastanza lungo o che richiede un'azione, se non è quella attiva con finestra a fuoco. Il lavoro più breve di 1,6 secondi non genera l'avviso di ritorno in attesa; una richiesta di azione può segnalarlo comunque. Il primo prompt non genera notifiche.

Una sessione affiancata ma non attiva può ancora generare avvisi. Il pallino si azzera quando guardi la sessione con la finestra a fuoco; cliccare una notifica riporta alla sessione. Gli avvisi di sistema dipendono dalle autorizzazioni del sistema operativo e, su Linux, dal servizio notifiche disponibile.

## 6. Configurazione

### 6.1 Preferenze dell'interfaccia

Apri **Impostazioni**: le modifiche si applicano e si salvano subito. **Corpo del terminale** va da 11 a 22, con valore iniziale 14. **Mostra il motivo dello stato** aggiunge il motivo sotto le sessioni; il tooltip dell'indicatore aiuta a capire la regola scelta. **Ripristina i tempi** ripristina solo i parametri del rilevamento, inclusi i pattern, non tutte le preferenze.

Il file centrale delle preferenze utente è `settings.json` nella directory restituita da Electron come `userData`. Usa **Apri il file di configurazione** per trovare il percorso effettivo. Le posizioni ordinarie sono:

| Sistema | Percorso ordinario |
| --- | --- |
| macOS | `~/Library/Application Support/Plancia Comandi/settings.json` |
| Windows | `%APPDATA%/Plancia Comandi/settings.json` |
| Linux | `$XDG_CONFIG_HOME/Plancia Comandi/settings.json`, oppure `~/.config/Plancia Comandi/settings.json` |

Sono salvati `theme`, `locale`, `layout`, `fontSize`, `notifyDesktop`, `notifyBadge`, `showReasons`, `lastShellId`, `lastCwd` e `status`. Tema iniziale `system`, lingua `it`, vista `single`, avvisi entrambi attivi, motivo nascosto. `layout` accetta `single`, `split`, `stack` o `grid`; un valore sconosciuto torna a `single`. L'ultima shell e cartella sono riutilizzate per nuove sessioni; un identificatore di shell non disponibile ripiega sulla prima scelta rilevata. Le shell Unix vengono avviate come login shell (`-l`); su Windows la scelta iniziale è Windows PowerShell con `-NoLogo`.

Chiudi l'app prima di modificare il JSON a mano, conserva una copia se contiene personalizzazioni e riavvia dopo il salvataggio. Non c'è ricaricamento automatico del file. Un file mancante o illeggibile/non valido usa i valori predefiniti; un'ultima cartella inesistente ripiega sulla home. Se non esiste il file attuale, l'app cerca e copia quello delle vecchie cartelle `Molo`/`molo`, lasciando l'originale.

### 6.2 Tempi e pattern avanzati

Valori numerici in millisecondi, salvo le due soglie di quantità. I nomi sotto corrispondono alle chiavi JSON dentro `status`.

| Chiave | Default | Intervallo | Uso |
| --- | --- | --- | --- |
| `quietTimeoutMs` | 900 | 200–30000 | Silenzio dopo un burst. |
| `promptIdleTimeoutMs` | 280 | 50–10000 | Attesa per prompt riconosciuto. |
| `busyMarkerQuietMs` | 12000 | 500–120000 | Indicatore di lavoro ancora visibile. |
| `childQuietTimeoutMs` | 8000 | 500–120000 | Figlio silenzioso nel buffer normale. |
| `startupGraceMs` | 800 | 0–10000 | Fase precedente al primo output. |
| `titleBusyMaxMs` | 3000 | 500–60000 | Durata massima di fiducia in un titolo fermo. |
| `burstBytes` | 16 | 1–500 | Soglia di lunghezza del chunk, misurata dal codice come lunghezza della stringa. |
| `burstCount` | 3 | 1–20 | Numero di chunk nella finestra. |
| `burstWindowMs` | 500 | 50–5000 | Finestra per contare i chunk. |
| `minBusyForNotifyMs` | 1600 | 0–60000 | Lavoro minimo per l'avviso di ritorno in attesa. |
| `attentionHoldMs` | 1800 | 0–10000 | Tenuta dello stato Azione. |

Esempio di file parziale senza credenziali:

```json
{
  "theme": "system",
  "locale": "it",
  "status": {
    "quietTimeoutMs": 900,
    "extraIdlePatterns": ["^ready>"],
    "extraBusyPatterns": ["compiling"],
    "extraAttentionPatterns": ["allow this edit"]
  }
}
```

I campi mancanti ricevono valori predefiniti; i numeri vengono arrotondati e limitati all'intervallo. Le tre liste aggiungono regex JavaScript alle regole integrate, senza sostituirle: massimo 40 stringhe per lista, ciascuna da 1 a 299 caratteri. I pattern idle si applicano all'ultima riga non vuota; busy/attention alle ultime righe. Le regex sintatticamente errate vengono ignorate; non esiste un timeout per regex costose, quindi usa espressioni semplici e fidate.

### 6.3 File di configurazione dell'app

`config/app.config.json`, nella cartella dell'applicazione, raccoglie i limiti di appunti e trascinamento. Non contiene segreti. All'avvio l'app legge il file, ignora le chiavi sconosciute e, per ogni valore assente o fuori intervallo, usa il default indicato qui. Una modifica richiede il riavvio. Nell'app installata lo stesso file sta nella cartella `resources/config`, fuori dall'archivio interno, così si può modificare senza ricompilare.

| Chiave | Default | Intervallo | Uso |
| --- | --- | --- | --- |
| `clipboardImages.directoryName` | `clipboard-images` | un solo tratto di percorso: lettere minuscole, cifre e trattini | Cartella creata dentro i dati utente, non un percorso assoluto. |
| `clipboardImages.filePrefix` | `img` | lettera minuscola iniziale, poi lettere, cifre o trattini | Prefisso dei file `prefisso-tempo-codice.png`. |
| `clipboardImages.maxBytes` | 12582912 | 65536–33554432 | Dimensione massima dell'immagine letta dagli appunti e del PNG salvato. |
| `clipboardImages.maxEdgePx` | 8000 | 256–16000 | Lato massimo, in pixel, dell'immagine accettata. |
| `clipboardImages.maxKeep` | 40 | 1–200 | Quante immagini recenti tenere. |
| `clipboardImages.maxAgeHours` | 24 | 1–720 | Dopo questo tempo le immagini generate vengono eliminate. |
| `terminal.maxWriteChars` | 200000 | 1000–1000000 | Lunghezza massima di una scrittura al terminale. L'incolla è più corto di 12 caratteri, così i marcatori dell'incolla fra parentesi ci stanno. |
| `drop.maxFiles` | 20 | 1–50 | Quanti file trascinati inserire. |
| `drop.maxPathChars` | 4096 | 32–32767 | Lunghezza massima di un singolo percorso trascinato. |

Esempio senza segreti:

```json
{
  "clipboardImages": {
    "directoryName": "clipboard-images",
    "filePrefix": "img",
    "maxBytes": 12582912,
    "maxEdgePx": 8000,
    "maxKeep": 40,
    "maxAgeHours": 24
  },
  "terminal": { "maxWriteChars": 200000 },
  "drop": { "maxFiles": 20, "maxPathChars": 4096 }
}
```

## 7. Tastiera, clipboard e collegamenti

| Azione | macOS | Windows / Linux |
| --- | --- | --- |
| Nuova sessione | Command+T | Ctrl+Shift+T |
| Chiudi attiva | Command+W | Ctrl+Shift+W |
| Una / Affiancate / Incolonnate / Griglia | Command+\ | Ctrl+Shift+D |
| Impostazioni | Command+, | Ctrl+Shift+, |
| Affianca una riga | Command-clic | Ctrl-clic |
| Copia selezione | Command+C | Ctrl+Shift+C, oppure Ctrl+C se c'è una selezione |
| Incolla | Command+V | Ctrl+Shift+V |
| Interrompi il comando | Control+C | Ctrl+C senza selezione |

Su macOS la barra dei menu ha **Modifica**, con **Annulla**, **Ripeti**, **Taglia**, **Copia**, **Incolla** e **Seleziona tutto**. Le etichette seguono la lingua dell'app. I menu **Vista** e **Finestra** restano quelli standard di Electron e seguono la lingua del sistema. Su Windows e Linux la barra si apre con Alt; **Copia** e **Incolla** usano Ctrl+Shift+C e Ctrl+Shift+V, così Ctrl+C resta libero per il comando.

Il tasto destro sul terminale apre **Copia** e **Incolla**. **Copia** è disattivata se non c'è una selezione. Copia e incolla passano dagli appunti di sistema. L'incolla usa la funzione di xterm.js: se il programma nel terminale ha attivato l'incolla fra parentesi (bracketed paste), il testo arriva come un blocco unico; altrimenti un testo su più righe può essere eseguito riga per riga. Controlla sempre ciò che incolli. Una raffica di incolla molto oltre l'uso normale può inserire due volte un testo il cui secondo segnale arriva dopo che l'app ha già dimenticato il primo.

Su Windows e Linux, Ctrl+C copia la selezione e la toglie, così il Ctrl+C successivo interrompe il programma. Senza selezione, Ctrl+C invia subito l'interruzione. Su macOS l'interruzione è Control+C; Command+C copia e non interrompe. La scorciatoia di copia senza selezione non viene inviata al programma.

Trascinare uno o più file nel terminale inserisce i loro percorsi, fra virgolette adatte alla shell della sessione e separati da uno spazio, con uno spazio finale. Un percorso con un a capo non viene inserito. Il testo trascinato, senza file, viene incollato come testo. L'app non apre il file trascinato al posto del terminale e non apre nuove finestre da un link.

Se negli appunti c'è un'immagine e incolli, l'app la salva come PNG in una cartella sua dentro i dati utente e incolla il percorso quotato, con uno spazio finale. Il nome del file è generato dall'app. Le immagini più vecchie del tempo configurato, e quelle oltre il numero massimo, vengono eliminate. Se l'immagine non è accettabile, l'incolla usa il testo degli appunti.

Esc chiude i dialoghi; negli altri casi passa al terminale. Le scorciatoie di sessione non si applicano mentre un dialogo è aperto. I collegamenti HTTP/HTTPS cliccati nel terminale vengono aperti nel browser esterno; gli altri protocolli vengono ignorati.

## 8. Esempi pratici

**Due attività:** apri una sessione chiamata “Progetto” nella cartella del tuo codice e una “Controlli” nella stessa cartella. Seleziona la prima e premi l'icona **Affiancate**. Usa la prima per una CLI già installata e la seconda per i comandi di verifica del progetto. Clicca ogni volta nella tessera a cui vuoi inviare i tasti. Per mettere un'immagine in una CLI che accetta un percorso, copiala e incollala nel terminale, oppure trascinala: compare il percorso del file.

**Capire uno stato:** attiva **Mostra il motivo dello stato**. Se un programma appare al lavoro anche dopo essersi fermato, controlla se ridisegna continuamente lo schermo o lascia un indicatore di lavoro. Regola i tempi o un pattern specifico; non usare lo stato stimato per decidere automaticamente operazioni distruttive.

**Provare gli indicatori senza AI**, da un checkout con Bash su macOS/Linux:

```bash
PLANCIA_DEMO=1 npm run dev
```

La demo apre una shell ordinaria e una con `scripts/demo-codex.sh busy`, imposta e salva il tema scuro e affianca le sessioni. Lo script simula l'attività, senza chiamate AI. In una shell Bash puoi provare anche `bash scripts/demo-codex.sh attention` o `bash scripts/demo-codex.sh idle`; Ctrl+C interrompe la simulazione. L'alias storico `MOLO_DEMO=1` resta accettato. La demo non usa un profilo impostazioni isolato.

## 9. Risoluzione dei problemi

| Problema | Cosa fare |
| --- | --- |
| Il browser chiede di aprire la finestra desktop | Usa Electron avviato con `npm run dev`, non la pagina Vite. |
| Il terminale non è disponibile / errore `node-pty` | Controlla gli strumenti nativi, esegui `npm run rebuild` nel checkout e riavvia. Ricompila dopo aver cambiato Electron. |
| Cartella non valida | Usa **Sfoglia** e scegli una directory esistente accessibile. Un archivio `app.asar` non è una cartella di lavoro valida. |
| Una shell non compare | Installala nei percorsi rilevati o nel `PATH` dove previsto e riavvia l'app. Non c'è un campo per comandi shell arbitrari. |
| Una CLI non viene trovata | Verifica che funzioni nella shell scelta e che il profilo di login configuri il `PATH`. L'app non installa le CLI. |
| Stato inatteso | Leggi l'output reale, attiva il motivo, verifica tempi e pattern. Ridisegni continui e prompt insoliti possono produrre stime errate. |
| Nessuna notifica | Controlla entrambi gli interruttori e i permessi del sistema; la sessione attiva con finestra a fuoco non notifica. Su Linux verifica il servizio notifiche. |
| La porta di sviluppo è occupata | Chiudi l'altro processo di sviluppo che usa `47231`, dopo averne verificato l'identità, poi riprova. La porta è fissa e non viene cambiata automaticamente. |
| Il JSON modificato non viene usato | Chiudi l'app, verifica sintassi e percorso, salva e riavvia. Un file invalido usa i default; una successiva modifica UI può riscriverlo. |
| Sessioni mancanti dopo il riavvio | Il ripristino delle sessioni non è implementato; aprine di nuove. |

Nelle segnalazioni condividi versione, sistema, passi e messaggi ripuliti da dati personali. Non allegare automaticamente screenshot, log completi, cronologie o impostazioni contenenti percorsi privati.

## 10. Aggiornamento e rimozione

Per aggiornare un checkout, termina le attività, esci dall'app e controlla prima eventuali modifiche locali con `git status`. Aggiorna solo alla revisione approvata dal maintainer, preservando i tuoi file; quindi esegui `npm ci`, `npm test` e `npm run build`. Riavvia con `npm run dev`. Non usare reset distruttivi per risolvere divergenze.

Per un pacchetto, usa la procedura di sostituzione/installazione della release verificata sulla stessa piattaforma e architettura. Non c'è un aggiornamento automatico gestito dall'app. Per rimuovere l'app compilata usa gli strumenti del sistema operativo; l'installer Windows è configurato per mantenere i dati utente. I dati restano nella directory mostrata dalle impostazioni: se vuoi rimuoverli, prima fai una copia delle preferenze utili e verifica il percorso. Non eliminare le cartelle di lavoro o le credenziali dei programmi avviati.

Per smettere di usare i sorgenti basta interrompere l'app; conserva il checkout se contiene modifiche o dati da tenere. La rimozione dell'app non rimuove Git, Node.js, shell o CLI installate separatamente.

## 11. Sicurezza e limiti

Plancia Comandi è un terminale locale con i tuoi permessi, senza confinamento a una workspace. Non eseguirlo con privilegi elevati e non considerare il sandbox del renderer una protezione dai comandi digitati. Le shell ereditano quasi tutto l'ambiente del processo, potenzialmente incluse variabili sensibili.

L'app non gestisce API key o un keychain e non invia autonomamente prompt a provider AI. Una CLI avviata può farlo secondo la propria configurazione e i propri consensi. Controlla autenticazione, permessi, file accessibili e destinazioni prima di darle contenuti privati. `settings.json` non deve contenere segreti.

Output e nomi delle sessioni sono in memoria, ma la shell può salvare la cronologia e i programmi possono scrivere log, file o usare la rete. Le notifiche contengono il nome della sessione; clipboard, screenshot e diagnostica possono rivelare dati. Un'immagine incollata resta in una cartella dell'app finché la pulizia non la elimina, e qualunque programma con i tuoi permessi può leggerla. L'app non garantisce la redazione automatica. I limiti del backlog possono perdere output precedente quando una vista viene ricreata; non usarlo come archivio permanente.

Il rilevamento degli stati non è un protocollo di controllo dei tool. Un TUI che ridisegna mentre aspetta può restare **Al lavoro**; un comando con una riga simile a un prompt può sembrare **In attesa** prematuramente. La UI chiede conferma solo per le chiusure che considera attive o in attesa di azione; l'uscita completa non ha quella protezione.

La finestra carica solo le pagine dell'app. Gli script di produzione arrivano dai file dell'app, non da Internet. I colori del terminale li applica xterm.js nella pagina, perché dipendono dal tema scelto. Con `npm run dev` il server di sviluppo resta su questo computer, all'indirizzo 127.0.0.1 porta 47231; la pagina aperta da sola nel browser non crea terminali.

La validazione multipiattaforma di shell, input IME, PTY, scorciatoie, notifiche, temi e installer resta da completare. Il precedente README riportava prove della demo su Linux: non costituiscono una verifica corrente su macOS o Windows. Vedi [SECURITY_MODEL.md](SECURITY_MODEL.md) per i controlli presenti e per i limiti ancora aperti, e [PLAN.md](PLAN.md) per le proposte future.

## 12. Sviluppo e distribuzione

```bash
npm test
npm run build
```

`npm test` esegue Vitest sulla logica degli stati senza avviare shell o Electron. `npm run build` esegue il controllo TypeScript e genera `dist/` e `dist-electron/`. Non sono presenti comandi dedicati lint, typecheck, e2e o workflow GitHub Actions. `npm run preview` mostra soltanto il renderer, non sostituisce la finestra desktop.

Per il packaging, dopo le verifiche, usa sul sistema interessato `npm run dist:mac`, `npm run dist:win` oppure `npm run dist:linux`; `npm run dist` seleziona la piattaforma corrente. I file in `release/` iniziano con `PlanciaComandi`. Identificatore app `it.plancia.comandi`, eseguibile configurato `plancia-comandi`. `node-pty` e `@xterm/headless` sono estratti dall'ASAR per il runtime. Le icone derivano da `build/icon.png`.

Prima di distribuire occorre provare il pacchetto fuori dal checkout, controllare che non includa dati privati e generare SHA-256 per ogni artifact, per esempio `shasum -a 256 <artifact>` su macOS, `sha256sum <artifact>` su Linux o `Get-FileHash <artifact> -Algorithm SHA256` in PowerShell, sostituendo `<artifact>` con il percorso reale. Firma e notarizzazione richiedono un processo esplicito, non sono un passo implicito di questi comandi.

Variabili riservate allo sviluppo: `PLANCIA_DEVTOOLS=1` apre DevTools; in modalità demo `PLANCIA_SHOT_DIR` abilita la scrittura di screenshot e `PLANCIA_SHOT_EXIT=1` esce dopo la cattura. Esistono gli alias storici `MOLO_DEVTOOLS`, `MOLO_SHOT_DIR`, `MOLO_SHOT_EXIT`. Gli screenshot includono ciò che è visibile e il percorso di output non è confinato: usare solo cartelle di test autorizzate e terminali senza dati privati. La cattura cambia anche il tema salvato.

La patch documentale non genera installer, non configura firma e non prova una CLI AI reale. Regole di revisione e distribuzione in [AGENTS.md](AGENTS.md); struttura in [MAP.md](MAP.md); licenza in [LICENSE](LICENSE).
