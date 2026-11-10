# Avvio rapido desktop / Desktop quick start

## Italiano

Questa guida porta dal checkout al primo terminale di Plancia Comandi **0.1.0**. Per installare i prerequisiti segui prima il capitolo [Installazione](ISTRUZIONI.md#2-installazione).

**Sommario**

- [1. Avviare](#1-avviare)
- [2. Aprire e affiancare terminali](#2-aprire-e-affiancare-terminali)
- [3. Regolare e chiudere](#3-regolare-e-chiudere)

### 1. Avviare

Nella cartella del repository, con Git, Node.js/npm e strumenti nativi già installati:

```bash
npm ci
npm run dev
```

Usa la finestra desktop che si apre. Il sito di sviluppo nel browser non dispone del terminale. Il primo avvio usa l'italiano e il tema del sistema.

### 2. Aprire e affiancare terminali

1. Premi **Nuova sessione**, scegli una **Shell** e una **Cartella**, poi **Apri**.
2. Esegui un comando ordinario nella shell. Per usare una CLI AI, installala e configurala separatamente.
3. Apri una seconda sessione. Premi **Affianca**, l'icona delle colonne nella riga di ciascuna sessione da mostrare.
4. Clicca nel terminale da usare: la tastiera scrive nella sessione selezionata. **Una** ritorna alla vista singola.

**Al lavoro**, **In attesa** e **Azione** sono stime: leggi il terminale prima di decidere se un comando è terminato. I comandi possono modificare file e usare la rete con i tuoi permessi.

### 3. Regolare e chiudere

In **Impostazioni** scegli lingua, tema, corpo del terminale e avvisi; le preferenze sono salvate automaticamente. Usa la matita o il doppio clic sul nome per rinominare una sessione.

Per chiuderla premi **×** nella sua riga. L'app chiede conferma se la considera al lavoro o in attesa di un'azione. Termina e salva il lavoro prima di uscire dall'app: le sessioni non vengono ripristinate e l'uscita completa non ha una conferma generale per tutte le sessioni.

Per errori del modulo terminale, esegui `npm run rebuild` e riavvia. Approfondimenti nel [manuale](ISTRUZIONI.md) e nel [modello di sicurezza](SECURITY_MODEL.md).

## English

This guide takes you from the checkout to your first terminal in Plancia Comandi **0.1.0**. Install prerequisites first by following the [Installation](INSTRUCTIONS.md#2-installation) chapter.

**Contents**

- [1. Start](#1-start)
- [2. Open and tile terminals](#2-open-and-tile-terminals)
- [3. Adjust and close](#3-adjust-and-close)

### 1. Start

In the repository folder, with Git, Node.js/npm and native build tools installed:

```bash
npm ci
npm run dev
```

Use the desktop window that opens. The development website in a browser has no terminal access. The first start uses Italian and the system theme; open **Impostazioni** and choose **English** to switch language.

### 2. Open and tile terminals

1. Click **New session**, choose a **Shell** and **Folder**, then **Open**.
2. Run an ordinary shell command. To use an AI CLI, install and configure it separately.
3. Open a second session. Click **Tile**, the columns icon in each session row you want to display.
4. Click inside the terminal you want to use: typing goes to the selected session. **One** returns to the single view.

**Working**, **Idle** and **Action** are estimates: read the terminal before deciding whether a command has finished. Commands can change files and use the network with your permissions.

### 3. Adjust and close

In **Settings**, choose language, theme, terminal size and alerts; preferences are saved automatically. Use the pencil or double-click a session name to rename it.

To close a session, click **×** in its row. The app asks for confirmation when it considers it working or waiting for action. Finish and save your work before quitting the app: sessions are not restored and a full quit has no general confirmation for all sessions.

For terminal-module errors, run `npm run rebuild` and restart. See the [manual](INSTRUCTIONS.md) and [security model](SECURITY_MODEL.md) for details.
