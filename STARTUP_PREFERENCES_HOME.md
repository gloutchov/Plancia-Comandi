# Startup Preferences per nuovi progetti

Questo file raccoglie le preferenze operative da applicare come standard iniziale ai nuovi progetti software. Deriva dalle convenzioni ricorrenti usate nei repository locali `truedrawing`, `myclaw`, `theNovelist` e `Cortex`.

## Principi generali

- Il progetto deve nascere con una struttura modulare, leggibile e mantenibile.
- Evitare file monolitici: ogni funzionalita' rilevante deve avere moduli, componenti, servizi, hook o helper dedicati.
- Preferire interventi piccoli, coerenti con l'architettura esistente e verificabili con test.
- Evitare refactor non richiesti durante milestone funzionali, salvo quando sono necessari per completare in modo sicuro la milestone.
- Non introdurre dipendenze senza una ragione concreta, documentata e coerente con il valore della funzionalita'.
- Tenere sempre separati dominio, accesso ai dati, UI, configurazione, sicurezza, integrazioni esterne e test.
- Ogni comportamento visibile all'utente deve essere documentato.
- Ogni comportamento security-relevant deve essere documentato in `SECURITY_MODEL.md`.

## Documenti obbligatori

Ogni nuovo progetto deve contenere almeno:

- `README.md`: pagina principale in stile GitHub, bilingue italiano/inglese, con descrizione, funzionalita', installazione, sviluppo, distribuzione, licenza e link ai documenti.
- `ISTRUZIONI.md`: manuale utente completo in italiano; riferimento per la vista italiana della landing page.
- `INSTRUCTIONS.md`: manuale utente completo in inglese, sincronizzato con `ISTRUZIONI.md`; riferimento per la vista inglese della landing page.
- `SECURITY_MODEL.md`: modello di sicurezza bilingue, con controlli implementati, limiti residui, rischi noti e raccomandazioni.
- `PLAN.md`: piano di sviluppo per milestone funzionali, versioni, branch, criteri di accettazione e checklist di chiusura.
- `MAP.md`: mappa ASCII della struttura del repository, con breve descrizione di cartelle, file principali, test, workflow e documentazione.
- `AGENTS.md`: istruzioni operative per agenti e maintainer che lavorano sul repository.
- `LICENSE`: licenza Apache License 2.0.

Se il progetto espone superfici operative diverse, aggiungere quick start dedicati, per esempio:

- `QUICK-START_CommandLine.md`
- `QUICK-START_Chat.md`
- `QUICK-START_Telegram.md`
- `QUICK-START_Desktop.md`

## Piano milestone

`PLAN.md` deve essere scritto all'inizio del progetto e mantenuto aggiornato.

Le attivita' in `PLAN.md` devono usare tre prefissi distinti:

- `P<numero>` (per esempio `P3`, "planning 3"): funzionalita' considerata ma ancora da pianificare; la sua registrazione e' facoltativa e non la rende eseguibile;
- `M<numero>` (per esempio `M7`): milestone pianificata da mettere in atto nel piano esecutivo corrente. Le milestone `M` devono essere svolte in sequenza, rispettando l'ordine numerico;
- `C<numero>` (per esempio `C7`, "completed 7"): lavoro della milestone approvato dal progettista. Dopo la prima approvazione la voce viene rinominata da `M<numero>` a `C<numero>`, conservando lo stesso numero, prima del push. Le operazioni di pubblicazione e la chiusura operativa seguono la procedura in "Branch, commit e merge".

Il percorso possibile e' `P → M → C`; `P` e' facoltativo, quindi una milestone puo' iniziare direttamente come `M`. Le numerazioni `M` e `P` sono indipendenti. Un'attivita' `P` diventa eseguibile solo dopo una decisione esplicita del progettista e la sua riclassificazione come milestone `M` nel piano corrente.

Ogni milestone deve essere funzionale, non solo tecnica: deve consegnare un comportamento verificabile dall'utente o una base tecnica chiaramente necessaria per una funzionalita' successiva.

Per ogni milestone indicare:

- numero e titolo;
- obiettivo;
- branch previsto;
- tag di checkpoint previsto;
- tipo incremento versione;
- attivita' principali;
- criteri di accettazione;
- test richiesti;
- documentazione da aggiornare;
- stato.

Dopo la prima approvazione e prima del push, registrare nella voce `C<numero>` di `PLAN.md` un riepilogo delle modifiche, delle verifiche eseguite, degli eventuali limiti residui, della versione e del tag di checkpoint previsto. Il tag identifica il commit completo a cui tornare; il riepilogo spiega cosa contiene.

La checklist minima di chiusura in `PLAN.md` deve coprire implementazione, test automatici e verifiche manuali quando necessarie, versione, documentazione, sicurezza, approvazione del progettista, aggiornamento da `M` a `C`, CI necessaria, merge, tag, push, release quando dovuta, rimozione del branch e richiesta di conferma per la pulizia locale. Per ordine, autorizzazioni e verifiche finali applicare la procedura completa in "Branch, commit e merge".

## Branch, commit e merge

- All'inizio del progetto, verificare se esiste una repository Git locale; inizializzarla solo se assente. Preparare `.gitignore` e un commit iniziale che fissi la base del progetto.
- Verificare che esista un repository remoto associato al progetto; se manca, crearlo e configurarlo sull'account GitHub previsto, senza sostituire un remoto esistente. Pubblicare e verificare `main` sul remoto prima di avviare le milestone.
- Per impostazione predefinita, tutte le attivita' Git e GitHub devono essere registrate sull'utenza privata GitHub `gloutchov`, associata all'indirizzo `gloutchov@gmail.com`.
- Prima di eseguire operazioni Git o GitHub, verificare che l'identita' autore configurata e l'account GitHub autenticato corrispondano all'utenza privata prevista. La verifica si applica anche a commit, push, PR, issue, tag, release e avvii manuali di workflow.
- Usare l'utenza personale GitHub indicata per le operazioni Git previste da queste preferenze. Se il progetto richiede un'altra utenza, fermarsi e chiedere istruzioni al progettista prima di procedere.
- Se non e' possibile verificare con certezza l'identita' configurata, se le configurazioni locali e remote non coincidono oppure se vi e' qualunque dubbio sull'utenza da usare, fermarsi e chiedere conferma al progettista prima di eseguire qualsiasi operazione Git o GitHub.
- Avviare ogni milestone su un nuovo branch dedicato, per esempio `milestone/<numero>-<slug>`, creato da `main` dopo aver verificato il checkpoint remoto della milestone precedente.
- Per patch mirate usare un branch dedicato, per esempio `patch/<versione>-<slug>`.

Applicare questa procedura unica alla chiusura di ogni milestone:

1. Completare sul branch dedicato implementazione, test, documentazione e versione. Rimuovere eventuali temporanei tracciati per errore prima del commit da controllare. I commit di sviluppo restano locali e non vengono pubblicati prima dell'approvazione.
2. Congelare il branch con la voce ancora `M<numero>` in `PLAN.md`. Presentare al progettista l'hash del commit locale, il diff rispetto a `main`, i test eseguiti, i relativi esiti e gli eventuali limiti residui.
3. Attendere il controllo personale di quel preciso commit e la prima approvazione esplicita del progettista. Non presumere l'approvazione da istruzioni generiche o dall'esito dei test.
4. Solo dopo la prima approvazione, aggiornare `PLAN.md` da `M<numero>` a `C<numero>`, conservando il numero e registrando riepilogo, verifiche, limiti residui, versione e tag di checkpoint previsto. Creare un commit locale per l'aggiornamento. Presentare il nuovo hash e il relativo diff al progettista e ottenere un secondo controllo personale e una seconda approvazione esplicita prima di qualunque push, merge o tag. Ogni ulteriore modifica richiede un nuovo commit, un nuovo controllo e una nuova approvazione del commit finale.
5. Dopo la seconda approvazione, pubblicare il branch se servono una PR o una CI remota necessaria. Verificare la CI su branch o PR prima del merge; se richiede correzioni, tornare al controllo del nuovo commit prima di proseguire.
6. Eseguire il merge su `main` solo dopo aver verificato implementazione, test, documentazione e CI necessaria. Verificare che `main` contenga il commit approvato con `PLAN.md` in stato `C<numero>`, poi eseguire il push di `main` e controllare il commit sul remoto. Verificare la CI su `main` quando necessaria; se fallisce, correggere su un nuovo branch dedicato e sottoporre il nuovo commit al controllo e all'approvazione del progettista prima di un altro merge. La milestone non e' chiusa finche' queste verifiche non riescono.
7. Sul commit finale verificato di `main`, generare gli artifact della release quando applicabili, eseguire gli smoke test necessari e calcolare e verificare i checksum SHA-256 prima di creare o pubblicare i tag. Se gli artifact o le verifiche falliscono, correggere su un branch dedicato, sottoporre il nuovo commit al controllo e all'approvazione del progettista e ripetere merge, CI e verifica degli artifact. Solo dopo queste verifiche creare il tag Git annotato e univoco `milestone/C<numero>` e, se la versione e' cambiata, il tag `vX.Y.Z`. Pubblicare i tag e verificare che puntino al commit atteso sul remoto. Non spostare tag gia' pubblicati salvo richiesta esplicita.
8. Pubblicare e verificare la GitHub release prevista dalla regola "Release", allegando artifact e checksum gia' verificati quando applicabili. Eliminare il branch obsoleto solo dopo merge, tag, push, CI e, se dovuta, release verificati.
9. Dopo il push e il completamento dell'eventuale release e della rimozione del branch, individuare i file e le cartelle temporanei creati per sviluppo o test e non piu' necessari. Presentare al progettista i percorsi da eliminare e chiedere conferma esplicita prima di cancellarli. Preservare dati dell'utente, sorgenti, configurazioni locali utili e artifact da conservare o verificare. Se la conferma manca o viene negata, non cancellare nulla e segnalare i temporanei rimasti. Dopo l'eventuale pulizia, verificare e riportare lo stato del worktree senza alterare modifiche dell'utente.

Per le patch applicare i passaggi pertinenti della stessa procedura; se non esiste una voce `M` in `PLAN.md`, non occorrono il passaggio a `C`, il secondo controllo relativo a tale aggiornamento e il tag di checkpoint della milestone. In questo caso l'approvazione del commit finale della patch consente di proseguire con PR o merge. Per recuperare lo stato di una milestone o release precedente, creare un nuovo branch dal relativo tag, mantenendo intatta la cronologia di `main`.

## Versioning

Usare versionamento semantico, adattato alla scala reale del progetto:

- `+0.0.1`: patch piccola, bugfix, correzione documentale con impatto minimo o hardening circoscritto.
- `+0.1.0`: nuova funzionalita' minore o miglioramento funzionale rilevante.
- `+1.0.0`: milestone importante, cambio architetturale, nuova superficie principale o rilascio stabile.

Ogni milestone o patch per cui si pubblica una release deve aggiornare la versione. Le modifiche che non richiedono una release secondo la regola "Release" (documentazione, CI, test, refactoring senza effetti sul comportamento) lasciano invariata la versione applicativa e non creano tag `vX.Y.Z`.

Quando la versione cambia, sincronizzarla in tutti i punti canonici del progetto, per esempio:

- file `VERSION`, se presente;
- `package.json`, `pyproject.toml` o equivalente;
- modulo `__version__`, se presente;
- README e manuali;
- `PLAN.md`, `AGENTS.md`, `MAP.md`;
- note release, quando viene pubblicata una release.

I tag Git di versione devono seguire il formato `vX.Y.Z`; i tag di checkpoint delle milestone seguono il formato `milestone/C<numero>`. Un tag di checkpoint non implica la pubblicazione di una GitHub release.

## Release

- Regola unica per tutti i progetti, senza eccezioni (dal 14/11/2026): pubblicare una GitHub release solo quando la milestone o patch e' significativa per il funzionamento dell'app, cioe' modifiche al codice che cambiano il comportamento, correzioni di bug, hardening e aggiornamenti di sicurezza o di dipendenze di runtime, anche nelle prime fasi del progetto.
- Non pubblicare release per documentazione, CI, test e refactoring che non cambiano il comportamento dell'app.
- Il tipo di modifica, e quindi release si' o no, viene proposto prima della chiusura e confermato dal progettista; eventuali regole diverse nei singoli progetti sono superate da questa.
- Se il programma non e' ancora utilizzabile, contrassegnare la release come prerelease e indicarne chiaramente lo stato.
- Generare artifact per Windows e macOS quando applicabile e quando esiste una build distribuibile.
- Ogni release deve includere checksum SHA-256 degli artifact.
- Se non sono disponibili certificati o credenziali di firma, distribuire artifact non firmati e documentare chiaramente avvisi SmartScreen/Gatekeeper.
- Non configurare firma codice, notarizzazione o auto-update firmato senza credenziali esplicite e processo documentato.
- Le note release devono indicare versione, cambi principali, limiti noti, piattaforme e checksum degli artifact, se presenti.

## Architettura e struttura

Il progetto non deve diventare monolitico. La struttura iniziale deve essere razionale e crescere per responsabilita'.

Separare, quando applicabile:

- entry point applicativo;
- configurazione;
- dominio;
- servizi applicativi;
- UI;
- stato UI;
- accesso filesystem;
- persistenza/database;
- integrazioni esterne;
- client HTTP/API;
- gestione segreti;
- sicurezza;
- i18n;
- tema;
- logging;
- packaging;
- test unitari;
- test end-to-end;
- script operativi;
- workflow CI/release.

Le dipendenze tra moduli devono essere esplicite e direzionate. Evitare import circolari.

La logica riutilizzabile deve stare in moduli testabili, non sepolta nei componenti UI o negli entry point.

## Configurazione

Ogni progetto deve avere un file di configurazione centrale per parametri modificabili da utente esperto o sviluppatore.

Esempi:

- `config/app.config.json`
- `app.config.json`
- `myproject.toml`
- `.env.example` solo come template, mai con segreti reali.

Non hardcodare nei moduli funzionali parametri come:

- provider API;
- URL base;
- modelli AI;
- timeout;
- limiti dimensione payload;
- percorsi default;
- nomi file generati;
- intervalli autosave;
- dimensioni canvas/finestra;
- qualita' export;
- lingua default;
- tema default;
- limiti history;
- limiti concorrenza;
- policy rete;
- policy logging;
- valori UI modificabili dall'utente.

La configurazione deve essere validata all'avvio. I fallback sono ammessi solo per proteggere da configurazioni mancanti o corrotte, e devono essere documentati.

I segreti non devono mai stare nella configurazione del repository.

## Lingua e tema

Se il progetto ha UI o testi utente, deve essere bilingue italiano/inglese.

Regole:

- rilevare automaticamente la lingua di sistema;
- se la lingua di sistema non e' italiano, usare inglese;
- permettere override manuale della lingua;
- mantenere dizionari italiano e inglese sincronizzati;
- evitare stringhe user-facing hardcoded fuori dai dizionari;
- non tradurre automaticamente i contenuti creati dall'utente.

Se il progetto ha UI grafica, deve supportare tema chiaro/scuro:

- rilevare automaticamente il tema di sistema;
- default automatico chiaro/scuro basato sul sistema operativo;
- override manuale dell'utente;
- persistenza della preferenza sia per la lingua sia per il tema;
- verifica di leggibilita' di modali, checkbox, campi, dropdown, tooltip e stati disabilitati in entrambi i temi.

## Sicurezza

`SECURITY_MODEL.md` deve descrivere:

- modello operativo;
- superfici locali e remote;
- gestione segreti;
- configurazione;
- rete;
- logging;
- persistenza;
- permessi filesystem;
- IPC o bridge privilegiati, se presenti;
- validazione input;
- limiti payload;
- test di sicurezza;
- limiti residui;
- miglioramenti pianificati.

Regole minime:

- Non salvare API key, token, password o PIN in chiaro nel repository, nei file progetto, nei log, nei crash report o negli esempi.
- Usare il keychain del sistema operativo o uno storage protetto quando disponibile.
- Il renderer o la UI non devono accedere direttamente a segreti, filesystem privilegiato o API native: usare canali controllati.
- Validare input e output sui confini: IPC, CLI, HTTP, plugin, MCP, Telegram, file importati, scheduler.
- Sanitizzare errori e log prima di mostrarli o salvarli.
- Non stampare mai segreti in output.
- Limitare dati inviati a servizi remoti al minimo necessario.
- Chiedere consenso esplicito prima di inviare contenuti utente o memoria locale a provider esterni.
- Usare timeout espliciti per rete e task.
- Preferire HTTPS e non disabilitare TLS; supportare CA bundle o trust store di sistema quando serve.
- Bloccare path traversal e scritture fuori workspace.
- Le operazioni distruttive devono richiedere conferma esplicita.
- Log e audit log devono salvare metadata utili, non contenuti sensibili completi quando non necessario.
- Gli strumenti agentici, plugin, skill o server MCP sono da trattare come istruzioni/processi non fidati: non possono concedere permessi o bypassare conferme.

Per app Electron:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- `sandbox: true` quando possibile;
- preload minimale;
- IPC centralizzato e validato;
- Content Security Policy esplicita;
- blocco di navigazioni inattese e popup;
- filesystem e segreti gestiti nel main process.

Per CLI o agenti locali:

- permessi workspace espliciti, per esempio `denied`, `read-only`, `confirm`, `full-auto`;
- default conservativo;
- diff o riepilogo prima delle scritture in modalita' `confirm`;
- cancellazioni sempre confermate;
- test per path traversal, permessi e assenza leak segreti.

Per Telegram o altri controlli remoti:

- token fuori repository;
- allowlist obbligatoria di chat/user;
- autenticazione o PIN quando opportuno;
- rate limit;
- conferma separata per operazioni sensibili;
- redazione output;
- log accessi senza token e senza testo completo quando non necessario;
- blocco di modalita' pericolose da remoto salvo consenso progettuale esplicito.

## Test e qualita'

Ogni funzionalita' deve avere test ad hoc proporzionati al rischio.

Tipi di test da considerare:

- unit test per logica pura;
- integration test per servizi, storage, configurazione e adapter;
- test CLI per comandi;
- test UI per flussi principali;
- e2e Playwright o equivalente per app web/desktop;
- smoke test su build pacchettizzata quando applicabile;
- test sicurezza per segreti, permessi, IPC, path traversal, CSP, TLS e logging;
- test packaging/distribuzione;
- test negativi per input corrotti, payload troppo grandi e configurazioni invalide.

I test devono essere isolati da:

- credenziali reali;
- keychain reale, salvo test manuali espliciti;
- rete reale, salvo smoke test documentati;
- dati privati dell'utente.

La checklist di verifica va adattata allo stack. Esempi:

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:e2e:electron
npm run build
```

```powershell
python -B -m pytest -p no:cacheprovider
python -m pip_audit . --progress-spinner off
python -m bandit -q -c pyproject.toml -r src
python -m myproject security audit .
```

Riportare sempre eventuali test non eseguiti e il motivo.

## CI

GitHub Actions deve essere usato solo quando e' realmente necessario, in modo proporzionato al rischio e al valore della modifica e con attenzione al budget disponibile.

Regole operative:

- preferire test, lint, typecheck, build e controlli di sicurezza eseguiti localmente quando offrono una verifica equivalente;
- non creare, abilitare, avviare manualmente o rieseguire workflow per attivita' che possono essere verificate adeguatamente in locale;
- evitare push intermedi e modifiche ripetute che attivano workflow senza produrre un incremento verificabile;
- raggruppare modifiche coerenti prima del push, senza sacrificare leggibilita', sicurezza o possibilita' di revisione;
- limitare matrici, piattaforme, job e frequenza di esecuzione allo stretto necessario per il progetto e per la milestone;
- usare cache, cancellazione dei run obsoleti e filtri su branch o percorsi quando permettono di ridurre consumi senza indebolire le verifiche richieste;
- prima di un'operazione che avvia GitHub Actions, verificare che il run sia necessario; in caso di dubbio, chiedere conferma al progettista.

Quando l'uso di GitHub Actions e' necessario, la CI deve coprire in modo proporzionato almeno:

- installazione dipendenze;
- controllo documenti obbligatori;
- lint/typecheck;
- test automatici;
- build;
- controlli sicurezza leggeri;
- packaging smoke quando applicabile.

Per progetti multipiattaforma, testare Windows e macOS quando entrambe le piattaforme sono supportate e la verifica non puo' essere sostituita in modo affidabile da controlli locali; aggiungere Linux se supportato e necessario.

Dopo ogni push rilevante che attiva una CI necessaria:

- verificare la CI;
- se fallisce, leggere i log;
- correggere il problema se in scope;
- sottoporre il nuovo commit al controllo e all'approvazione del progettista secondo la procedura in "Branch, commit e merge" prima di pubblicare il fix;
- dopo l'approvazione, pubblicare il fix;
- ricontrollare la CI.

## Packaging multipiattaforma

Se il progetto e' distribuibile come app o tool:

- supportare Windows e macOS quando applicabile;
- documentare prerequisiti;
- documentare installazione, aggiornamento e rimozione;
- evitare artefatti locali privati nei pacchetti;
- verificare che l'app funzioni fuori dal checkout sorgente;
- generare checksum SHA-256;
- documentare chiaramente se gli artifact non sono firmati.

Se il progetto e' Python-only, preferire installazione isolata con `pipx`, `uv tool` o wheel.

Se il progetto e' Electron, gestire con attenzione moduli nativi, rebuild per target Electron/Node e smoke test del pacchetto reale.

## Documentazione utente

Il README deve presentare l'app a chi visita il repository GitHub: spiegare subito a cosa serve, quali sono le funzioni principali e come iniziare, con linguaggio chiaro e screenshot rappresentativi quando disponibili. I dettagli per sviluppatori devono seguire le informazioni utili agli utenti.

Il README deve contenere:

- nome progetto;
- descrizione breve;
- stato del progetto;
- versione;
- piattaforme;
- licenza;
- funzionalita' principali;
- installazione;
- uso rapido;
- configurazione;
- sicurezza e privacy in forma sintetica;
- sviluppo locale;
- test;
- packaging/release;
- link a `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `SECURITY_MODEL.md`, `MAP.md`.

`ISTRUZIONI.md` e `INSTRUCTIONS.md` devono contenere:

- requisiti;
- installazione;
- primo avvio;
- flussi principali;
- configurazione;
- comandi o controlli UI;
- esempi pratici;
- troubleshooting;
- note sicurezza;
- limiti noti.

I manuali e gli eventuali quick start devono guidare una persona che non conosce il codice. Usare parole semplici, descrivere i menu, i pulsanti e le funzioni come compaiono nel programma, e spiegare passo per passo le operazioni che l'utente deve svolgere. Non sostituire le istruzioni d'uso con dettagli di implementazione.

Mantenere `ISTRUZIONI.md` e `INSTRUCTIONS.md` sincronizzati nei contenuti e nella struttura: il secondo deve essere la traduzione inglese completa del primo.

Se l'app richiede software da installare separatamente, inserire prima delle istruzioni operative un capitolo numerato `Installazione` in `ISTRUZIONI.md` che spieghi come ottenere e installare ciascun programma richiesto e, quando necessario, come collegarlo o configurarlo per l'uso con l'app principale. Prevedere il capitolo equivalente `Installation` in `INSTRUCTIONS.md`.

La documentazione deve evitare esempi con segreti reali.

## Documentazione del repository

Per "documentazione del repository" si intendono `README.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md` e gli eventuali file `QUICK-START*.md`. `AGENTS.md` resta un documento operativo distinto.

`README.md`, `SECURITY_MODEL.md`, `MAP.md`, `PLAN.md` e gli eventuali `QUICK-START*.md` devono contenere una versione completa in italiano seguita da una versione completa in inglese, senza alternare le lingue paragrafo per paragrafo. `ISTRUZIONI.md` contiene solo l'italiano; `INSTRUCTIONS.md` contiene solo l'inglese.

In ogni documento della documentazione del repository, dopo l'eventuale titolo e l'indicazione della lingua, inserire nell'ordine una breve introduzione, il sommario dei capitoli e i capitoli numerati. Nei documenti bilingui, applicare questa struttura a ciascuna lingua, mantenendo coerenti numeri, titoli e collegamenti del sommario.

I file Markdown della memoria wiki e quelli necessari al funzionamento dell'app non sono documentazione del repository e seguono le rispettive regole specifiche. Quando il progettista chiede genericamente di modificare i file `.md`, intendere la documentazione del repository, salvo che indichi esplicitamente altri file o percorsi.

## Landing page GitHub

Se richiesta per il progetto, creare una landing page pubblicabile con GitHub Pages, con grafica moderna e facile da comprendere. Deve presentare il progetto e le sue funzioni principali senza richiedere conoscenze del codice.

La landing page deve:

- avere contenuti completi in italiano e in inglese; rilevare la lingua preferita del browser o del sistema, mostrando l'italiano ai visitatori con lingua italiana e l'inglese agli altri;
- offrire nell'header un comando `IT/EN` per cambiare lingua manualmente, rispettando la scelta dell'utente anche dopo il rilevamento automatico;
- seguire automaticamente il tema chiaro/scuro del sistema e offrire nell'header un comando manuale con icona sole/luna coerente con la modalita' mostrata;
- avere nell'header un link a `https://glaucosilvestri.it` rappresentato da un'icona a forma di casa, con etichetta accessibile;
- includere una favicon ispirata alla funzione del programma, disponibile e collegata alla pagina sia in formato PNG sia in formato ICO;
- mostrare screenshot aggiornati delle funzioni principali dell'app, con didascalie comprensibili;
- collegare il repository GitHub e, quando esiste, la release piu' recente dell'app; prima della prima release, indicare chiaramente che non e' ancora disponibile;
- collegare `ISTRUZIONI.md` nella vista italiana e `INSTRUCTIONS.md` nella vista inglese;
- funzionare e restare leggibile su desktop e mobile, in entrambi i temi e in entrambe le lingue.

## Mappa repository

`MAP.md` deve contenere una mappa ASCII aggiornata della struttura del repository.

La mappa deve includere:

- cartelle principali;
- file sorgente principali;
- configurazione;
- script;
- test;
- workflow GitHub;
- documentazione;
- file generati o locali da non modificare manualmente.

Ogni voce rilevante deve avere una breve descrizione.

Aggiornare `MAP.md` nella stessa milestone che aggiunge, rimuove, rinomina o sposta file/moduli rilevanti.

## UI e UX

Se il progetto ha UI:

- aprire direttamente sull'esperienza utile, non su una landing page, salvo progetti esplicitamente web/marketing;
- usare pattern coerenti con il framework e il design esistente;
- evitare card annidate e decorazioni inutili;
- garantire leggibilita' sulle piattaforme e dimensioni dello schermo supportate; per le web app, verificare sia desktop sia mobile;
- verificare overflow, modali, pulsanti, tooltip e testi lunghi;
- usare controlli appropriati: toggle per booleani, slider/input per numeri, menu per opzioni, tab per viste, icone per azioni comuni;
- rendere visibili stati di caricamento, errore, vuoto e successo;
- non inserire testi in-app che descrivono ovvieta' tecniche o istruzioni che appartengono al manuale.

## AI, provider esterni e privacy

Se il progetto usa AI:

- AI disattivata per default quando tratta contenuti utente sensibili, salvo scelta progettuale esplicita;
- provider e modelli configurabili;
- separare provider remoti da provider locali;
- salvare API key nel keychain;
- esporre alla UI solo stato della chiave, mai il valore;
- richiedere consenso per chiamate API esterne;
- richiedere consenso separato per inviare memoria locale o contenuti progetto a provider esterni;
- documentare quali dati vengono inviati, a chi, quando e con quale logica;
- gestire timeout, cancellazione e fallback;
- sanitizzare errori provider;
- testare assenza di segreti in prompt, log, config e fixture.

## Memoria wiki e knowledge base LLM

Se viene richiesto un sistema di "memoria wiki", knowledge base personale, wiki mantenuta da LLM o archivio incrementale di conoscenza, usare queste direttive come standard iniziale. Le direttive derivano da `llm-wiki.md` e devono essere adattate al dominio specifico del progetto.

I file `.md` della memoria wiki, inclusi `index.md`, `log.md` e le pagine di conoscenza, non rientrano nella documentazione del repository definita sopra. Seguono le convenzioni della wiki e non i requisiti di bilinguismo, introduzione, sommario e capitoli numerati previsti per la documentazione del repository.

L'idea centrale e' costruire una wiki persistente e cumulativa, non un semplice sistema RAG che recupera chunk grezzi a ogni domanda. L'LLM deve leggere le fonti, estrarre conoscenza, integrarla in pagine markdown strutturate, aggiornare collegamenti e sintesi esistenti, segnalare contraddizioni e mantenere il patrimonio informativo nel tempo.

La struttura deve distinguere tre livelli:

- fonti raw: documenti, articoli, paper, immagini, dati e note originali; sono immutabili e restano la fonte di verita';
- wiki: directory di file markdown generati e mantenuti dall'LLM, con pagine di sintesi, entita', concetti, confronti, overview e analisi;
- schema operativo: documento di regole, per esempio `AGENTS.md` o un file dedicato, che descrive struttura, convenzioni, workflow, formati pagina e criteri di manutenzione.

Le fonti raw non devono essere modificate dall'LLM. La wiki e' invece un artefatto mantenuto dall'LLM: l'utente cura le fonti, guida l'analisi e fa domande; l'LLM esegue sintesi, cross-reference, aggiornamenti, filing e bookkeeping.

Workflow minimi:

- ingest: quando arriva una nuova fonte, leggerla, discuterne i punti chiave se utile, creare o aggiornare una pagina di sintesi, aggiornare indice, pagine entita'/concetto correlate, collegamenti incrociati e log;
- query: per rispondere a domande, leggere prima l'indice, poi le pagine rilevanti, sintetizzare con citazioni verso fonti o pagine wiki; quando una risposta produce valore duraturo, salvarla come nuova pagina o aggiornare pagine esistenti;
- lint: periodicamente controllare contraddizioni, claim obsoleti, pagine orfane, concetti importanti senza pagina dedicata, cross-reference mancanti, lacune informative e possibili nuove fonti da cercare.

La wiki deve includere almeno:

- `index.md`: catalogo orientato al contenuto, con link a ogni pagina, riassunto di una riga, categoria e metadati utili come data o numero fonti;
- `log.md`: registro cronologico append-only di ingest, query, lint e manutenzioni, con prefissi coerenti e parseabili, per esempio `## [2026-04-02] ingest | Titolo fonte`;
- directory o convenzioni chiare per fonti, entita', concetti, sintesi, confronti, asset e output derivati.

Regole operative:

- preferire ingest una fonte alla volta quando serve supervisione qualitativa;
- consentire batch ingest solo se il workflow e i controlli sono documentati;
- mantenere citazioni e provenienza delle affermazioni importanti;
- segnalare esplicitamente contraddizioni tra fonti o tra nuove fonti e pagine esistenti;
- aggiornare pagine esistenti invece di duplicare conoscenza;
- usare link markdown/Obsidian coerenti e mantenere pagine collegate;
- usare YAML frontmatter solo se utile per tag, date, conteggi fonte o viste dinamiche;
- trattare immagini e asset come fonti locali quando disponibili, scaricandoli in una cartella stabile se il progetto lo prevede;
- documentare nel modello di sicurezza cosa viene letto, salvato, indicizzato o inviato a provider AI esterni.

Strumenti opzionali:

- Obsidian puo' essere usato come interfaccia di lettura, navigazione, graph view e revisione;
- Obsidian Web Clipper puo' essere usato per acquisire articoli in markdown;
- Marp puo' essere usato per generare presentazioni markdown dalla wiki;
- Dataview puo' essere usato se le pagine hanno frontmatter strutturato;
- strumenti locali come `qmd` o una ricerca markdown dedicata possono essere aggiunti quando `index.md` non basta piu'.

La wiki deve essere trattata come un repository markdown versionabile: usare Git quando possibile, conservare cronologia, evitare riscritture distruttive non richieste e aggiornare schema, indice e log insieme alle pagine modificate.

## File locali e workspace

Se il progetto opera su file dell'utente:

- definire una root workspace;
- risolvere tutti i path rispetto alla root;
- rifiutare path assoluti non autorizzati e segmenti `..`;
- distinguere lettura, scrittura, cancellazione e operazioni distruttive;
- usare conferme per scritture rischiose;
- usare salvataggi atomici quando possibile;
- mantenere audit log minimale per operazioni rilevanti;
- documentare cosa viene salvato localmente e cosa puo' contenere dati sensibili.

## Checklist iniziale per nuovo progetto

Prima di iniziare lo sviluppo effettivo:

- inizializzare la repository Git locale se non esiste gia' e aggiungere la licenza Apache 2.0;
- scegliere stack e piattaforme target;
- creare struttura modulare iniziale;
- creare file configurazione centrale senza segreti;
- creare `README.md` bilingue;
- creare `ISTRUZIONI.md` e `INSTRUCTIONS.md`;
- creare `SECURITY_MODEL.md`;
- creare `MAP.md`;
- creare `AGENTS.md`;
- creare `PLAN.md` con milestone funzionali;
- se richiesta, pianificare la landing page GitHub Pages e i relativi screenshot e favicon;
- configurare test minimi;
- configurare una CI minima solo quando realmente necessaria e proporzionata al progetto;
- definire strategia versioning;
- definire artifact e modalita' di pubblicazione delle release secondo la sezione "Release";
- verificare che `.gitignore` escluda segreti, log, build output, cache e stato locale;
- creare il repository remoto se assente, configurarlo, pubblicare il commit iniziale su `main` e verificare che sia presente sul remoto.

## Checklist prima di chiudere una milestone

- Worktree controllato.
- Modifiche proprie comprese e isolate.
- Nessuna modifica utente revertita.
- Funzionalita' completata.
- Test mirati aggiunti o aggiornati.
- Test automatici eseguiti.
- Verifica manuale eseguita se necessaria.
- Configurazione aggiornata e validata.
- Nessun parametro utile lasciato hardcoded senza motivo.
- Nessun segreto tracciato.
- Documentazione aggiornata.
- Landing page, screenshot e link aggiornati se la landing page e' presente e la milestone cambia le funzioni o la release mostrata.
- `MAP.md` aggiornato se cambia struttura.
- `SECURITY_MODEL.md` aggiornato se cambia superficie di rischio.
- Versione aggiornata se previsto.
- Procedura completa di chiusura descritta in "Branch, commit e merge" seguita e relativi esiti registrati in `PLAN.md`.

## Preferenze operative per agenti

- Leggere prima `AGENTS.md`, `PLAN.md`, `README.md`, `MAP.md` e `SECURITY_MODEL.md`.
- Controllare lo stato del worktree prima di modificare.
- Non revertire modifiche non proprie.
- Usare strumenti di ricerca rapidi come `rg`.
- Usare patch piccole e leggibili.
- Aggiornare documentazione insieme al codice.
- Non aggiungere dipendenze o workflow senza motivazione.
- Quando un task tocca UI, verificare layout e tema.
- Quando un task tocca sicurezza, aggiornare test e `SECURITY_MODEL.md`.
- Quando un task chiude una milestone, seguire integralmente la procedura in "Branch, commit e merge".
## Appendice – Lavoro con agenti cloud / Appendix – Working with cloud agents

Questa appendice adatta le regole del file al lavoro svolto da agenti cloud (Cursor) che operano direttamente su GitHub. In caso di dubbio vale sempre l'opzione più prudente.
This appendix adapts the rules above to work done by cloud agents (Cursor) operating directly on GitHub. When in doubt, the most prudent option always applies.

1. **Presentazione tramite PR / Presentation via PR.** L'agente cloud pubblica il branch (`milestone/<n>-<slug>` o `patch/<versione>-<slug>`) e apre una pull request: la PR vale come presentazione di hash e diff. La voce in PLAN.md resta **M** finché il progettista non approva nella PR. Dopo la prima approvazione l'agente fa il commit M→C sullo stesso branch; la seconda approvazione del progettista precede qualsiasi merge.
   The cloud agent pushes the branch and opens a PR, which counts as presenting hash and diff. The PLAN.md entry stays **M** until the designer approves in the PR; the M→C commit follows on the same branch, and the designer's second approval precedes any merge.
2. **Workflow automatici / Automatic workflows.** Prima di pubblicare, l'agente controlla `.github/workflows`: se un push o una PR avvierebbero un workflow, non pubblica e riporta hash e diff per istruzioni.
   Before pushing, the agent checks `.github/workflows`; if a push or PR would trigger a workflow, it does not publish and reports hash and diff for instructions.
3. **Identità Git / Git identity.** Commit firmati "Cursor Agent" con `Co-authored-by: gloutchov <gloutchov@gmail.com>` sono considerati equivalenti all'identità richiesta.
   Commits authored by "Cursor Agent" with a `Co-authored-by: gloutchov` trailer are accepted as equivalent.
4. **Merge, tag, release.** Gli agenti non fanno merge, tag, release né cancellano branch di propria iniziativa. Possono preparare tag, release, artifact e checksum SHA-256 solo dopo un sì esplicito del progettista per quella specifica release.
   Agents never merge, tag, release or delete branches on their own; they may prepare tags, releases, artifacts and SHA-256 checksums only after the designer's explicit yes for that specific release.
5. **Revisione tecnica / Technical review.** La revisione dell'agente revisore (sola lettura) è solo tecnica e non sostituisce le approvazioni del progettista.
   The reviewer agent's read-only review is technical only and never replaces the designer's approvals.
6. **Nuovi repository / New repositories.** Li crea il progettista; l'agente lavora poi sul repository esistente.
   New repositories are created by the designer.
7. **Pulizia file temporanei / Temp cleanup.** Non si applica all'ambiente cloud, che non lascia file sul computer del progettista; resta valida per i file temporanei creati dall'app stessa.
   Does not apply to the cloud environment; still applies to temp files created by the app itself.
