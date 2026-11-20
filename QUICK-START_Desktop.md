# Avvio rapido desktop / Desktop quick start

## Italiano

Nei sorgenti 0.3.11 puoi scorrere la cronologia disponibile con rotella/trackpad o trascinando la barra, anche in vista Una. Non serve cambiare vista. Una CLI a schermo intero può usare un buffer alternativo senza cronologia: usa i suoi comandi di scorrimento.

Questa guida porta dal checkout al primo terminale di Plancia Comandi **0.3.11**. Per installare i prerequisiti segui prima il capitolo [Installazione](ISTRUZIONI.md#2-installazione).

**Sommario**

- [1. Avviare](#1-avviare)
- [2. Aprire e affiancare terminali](#2-aprire-e-affiancare-terminali)
- [3. Regolare e chiudere](#3-regolare-e-chiudere)

### 1. Avviare

Nella cartella del repository, con Git, Node.js 22.12+ della serie 22, 24.x oppure 26+, npm e strumenti nativi già installati:

```bash
npm ci
npm run dev
```

La landing statica in `docs/` presenta funzioni, shell apribili per piattaforma (inclusa fish), download e manuali; ha sorgenti predisposti per GitHub Pages (C4). Non crea terminali nel browser.

Usa la finestra desktop che si apre. Il sito di sviluppo nel browser non dispone del terminale. Il primo avvio usa l'italiano e il tema del sistema.

### 2. Aprire e affiancare terminali

1. Premi **Nuova sessione**, scegli una **Shell** e una **Cartella**, poi **Apri**.
2. Esegui un comando ordinario nella shell. Per usare una CLI AI, installala e configurala separatamente.
3. Apri una seconda sessione. Premi l'icona **Affiancate**, i due rettangoli uno accanto all'altro. **Incolonnate** mette le stesse due sessioni una sopra l'altra. Da tre sessioni, **Griglia** ne mostra fino a quattro.
4. Clicca nel terminale da usare: il bordo colorato più spesso lo evidenzia e la tastiera scrive nella sessione selezionata. Nelle viste multiple i riquadri restano al loro posto. **Una**, il quadrato, torna alla vista singola finché non ci sono abbastanza sessioni per la vista che avevi scelto.

**Al lavoro**, **In attesa** e **Azione** sono stime: leggi il terminale prima di decidere se un comando è terminato. I comandi possono modificare file e usare la rete con i tuoi permessi.

### 3. Regolare e chiudere

In **Impostazioni** scegli lingua, tema, corpo del terminale e avvisi; le preferenze sono salvate automaticamente. Usa la matita o il doppio clic sul nome per rinominare una sessione.

Per chiuderla premi **×** nella sua riga. L'app chiede conferma se la considera al lavoro o in attesa di un'azione. Termina e salva il lavoro prima di uscire dall'app: le sessioni non vengono ripristinate e l'uscita completa non ha una conferma generale per tutte le sessioni.

Per errori del modulo terminale, su macOS e Linux esegui `npm run rebuild` e riavvia. Su Windows, se il terminale non parte, ripeti `npm ci`. Approfondimenti nel [manuale](ISTRUZIONI.md) e nel [modello di sicurezza](SECURITY_MODEL.md).

Nella release 0.3.6, un avviso sui pattern personalizzati indica che il rilevamento standard continua. Per svuotare le liste personalizzate e ripristinare il rilevamento usa **Impostazioni → Ripristina i tempi**. La [release 0.3.6](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.6) è pubblicata con pacchetti Windows x64/macOS ARM64 non firmati e checksum verificati.

Dalla versione 0.3.6, se compare un avviso sulle preferenze, le modifiche possono valere solo per la sessione. Chiudi l’app prima del recupero manuale; conserva `settings.json.bak` e consulta il [manuale](ISTRUZIONI.md#6-configurazione). I log locali contengono solo metadati consentiti; nessun invio remoto.

Dai sorgenti 0.3.7 i permessi web non necessari (per esempio posizione e fotocamera) sono negati automaticamente. Non occorre concederli per usare terminali, copia/incolla o notifiche native. Finestre o documenti estranei non possono usare il bridge privilegiato dell’app; le shell mantengono i permessi dell’utente.

Nei pacchetti 0.3.9 demo, DevTools, screenshot e traccia di sviluppo sono disabilitati. Un errore gestito di avvio mostra `STARTUP_FAILED` in un avviso nativo; chiudilo e riprova.

## English

In source 0.3.11, scroll available history with the wheel/trackpad or by dragging the bar, including in One. No layout change is needed. A full-screen CLI may use an alternate buffer without history: use its own scrolling commands.

This guide takes you from the checkout to your first terminal in Plancia Comandi **0.3.11**. Install prerequisites first by following the [Installation](INSTRUCTIONS.md#2-installation) chapter.

**Contents**

- [1. Start](#1-start)
- [2. Open and tile terminals](#2-open-and-tile-terminals)
- [3. Adjust and close](#3-adjust-and-close)

### 1. Start

In the repository folder, with Git, Node.js 22.12+ on the 22.x line, 24.x, or 26+, npm and native build tools installed:

```bash
npm ci
npm run dev
```

The static landing page in `docs/` presents features, launchable shells by platform (including fish), downloads and manuals; its source is prepared for GitHub Pages (C4). It does not create browser terminals.

Use the desktop window that opens. The development website in a browser has no terminal access. The first start uses Italian and the system theme; open **Impostazioni** and choose **English** to switch language.

### 2. Open and tile terminals

1. Click **New session**, choose a **Shell** and **Folder**, then **Open**.
2. Run an ordinary shell command. To use an AI CLI, install and configure it separately.
3. Open a second session. Click the **Side by side** icon, two rectangles next to each other. **Stacked** places the same two sessions one above the other. From three sessions, **Grid** shows up to four.
4. Click inside the terminal you want to use: a thicker colored border highlights it and typing goes to the selected session. In multiple views, panes stay in place. **One**, the square, returns to the single view until there are enough sessions for the view you had chosen.

**Working**, **Idle** and **Action** are estimates: read the terminal before deciding whether a command has finished. Commands can change files and use the network with your permissions.

### 3. Adjust and close

In **Settings**, choose language, theme, terminal size and alerts; preferences are saved automatically. Use the pencil or double-click a session name to rename it.

To close a session, click **×** in its row. The app asks for confirmation when it considers it working or waiting for action. Finish and save your work before quitting the app: sessions are not restored and a full quit has no general confirmation for all sessions.

For terminal-module errors on macOS and Linux, run `npm run rebuild` and restart. On Windows, if the terminal does not start, run `npm ci` again. See the [manual](INSTRUCTIONS.md) and [security model](SECURITY_MODEL.md) for details.

In release 0.3.6, a custom-pattern warning means standard detection continues. To empty custom lists and reset detection, use **Settings → Reset timings**. [Release 0.3.6](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.6) is published with unsigned Windows x64/macOS ARM64 packages and verified checksums.

From version 0.3.6, a preference warning may mean changes apply only to the session. Close the app before manual recovery; retain `settings.json.bak` and consult the [manual](INSTRUCTIONS.md#6-configuration). Local logs contain only allowlisted metadata; no remote upload.

From version 0.3.7 source, unnecessary web permissions (for example location and camera) are denied automatically. They are not needed for terminals, copy/paste or native notifications. Foreign windows or documents cannot use the app’s privileged bridge; shells retain the user’s permissions.

In 0.3.9 packages the demo, DevTools, screenshots and development tracing are disabled. A handled startup failure shows `STARTUP_FAILED` in a native dialog; close it and retry.
