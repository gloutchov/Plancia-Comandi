# User manual — Plancia Comandi

This manual describes Plancia Comandi **0.3.1**, a desktop app for using multiple real terminals and following their activity. The app is in early development; the limitations listed here describe current behavior. The complete Italian version is [ISTRUZIONI.md](ISTRUZIONI.md).

**Contents**

- [1. Requirements](#1-requirements)
- [2. Installation](#2-installation)
- [3. First start](#3-first-start)
- [4. Sessions and views](#4-sessions-and-views)
- [5. Status and alerts](#5-status-and-alerts)
- [6. Configuration](#6-configuration)
- [7. Keyboard, clipboard and links](#7-keyboard-clipboard-and-links)
- [8. Practical examples](#8-practical-examples)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Updating and removal](#10-updating-and-removal)
- [11. Security and limitations](#11-security-and-limitations)
- [12. Development and distribution](#12-development-and-distribution)

## 1. Requirements

You need a desktop computer running macOS, Windows or Linux with an available shell. Minimum window size is 860 × 560. These are target platforms, not a compatibility certification for every OS version. Configured packages are DMG/ZIP for macOS, NSIS/portable x64 for Windows and AppImage/DEB for Linux; real distribution checks still need to be completed.

Running source requires Git, Node.js with npm and access to the public repository. On Windows, compiling is not required and administrator rights are not required: `node-pty` 1.1.0 includes N-API prebuilds for win32-x64 and win32-arm64. macOS and Linux still need compilation, because Linux has no prebuild and the macOS install still rebuilds the module for Electron. This documentation's local checks use Node.js 24. Electron 45.2.3 requires Node.js 22.12 or newer: that is the minimum for installing the dependencies. Electron does not need a separate installation: dependencies download it. CLIs you want to run in terminals, including AI tools, must be installed and authenticated separately.

## 2. Installation

### 2.1 Install the required software

1. Install **Git** from its [official website](https://git-scm.com/downloads), choosing your OS and following the installer. On Windows you can also install Git Bash. Open a new terminal and check `git --version`.
2. Install **Node.js 22.12** or newer, with npm, from its [official website](https://nodejs.org/en/download), choosing the OS and architecture. That is the minimum required by Electron 45.2.3. Local checks use Node.js 24. Reopen the terminal and check `node --version` and `npm --version`. npm is included in a normal Node.js installation.
3. Prepare native tools only where compilation is still required. On Windows x64 or arm64, compiling is not required and administrator rights are not required: do not install Python or the C++ Build Tools, and `npm ci` does not rebuild `node-pty`. macOS needs the Xcode development tools. Linux needs Python, `make` and a C++ compiler, because `node-pty` 1.1.0 does not include a Linux prebuild. A compiler is not required to use an already built package.
4. If you want an optional shell, install it with its own installer and restart Plancia Comandi. Windows detection looks for PowerShell 7 in `PATH` and Git Bash in standard Git directories. Windows PowerShell is the initial choice; macOS/Linux use the login shell.
5. To use an AI CLI, first complete its installation and sign-in in your normal system terminal. Plancia Comandi does not include the CLI, configure its account or manage its credentials.

To prepare native tools:

- **Windows:** do not install Python, the C++ Build Tools or the Spectre libraries. Git and Node.js with npm are enough: compiling is not required and administrator rights are not required. `npm ci` downloads Electron and uses the `node-pty` prebuilds in `prebuilds/win32-x64` or `win32-arm64` (`pty.node`, `conpty.node`, `conpty_console_list.node`). Then, from the project folder: `npm test`, `npm run build`, `npm run dev` and, for the executable, `npm run dist:win`. `release/` receives the NSIS installer and the portable `PlanciaComandi-win-0.3.1-x64.exe`; the unpacked folder, when requested, is `release/win-unpacked/plancia-comandi.exe`.
- **macOS:** on [Apple's Xcode page](https://developer.apple.com/xcode/resources/), follow the Mac App Store link, install Xcode and launch it to complete initial setup prompts. If compilation reports missing tools, check the command-line tools installation. The `node-pty` package also has macOS prebuilds, but the Plancia Comandi install still rebuilds the module for Electron.
- **Linux:** `node-pty` 1.1.0 has no Linux prebuild. On Debian and Ubuntu install `build-essential` and `python3`, then follow [Build and run on Linux](#24-build-and-run-on-linux). It has not been tested in person on Linux.

### 2.2 Get and start Plancia Comandi

With a GitHub account authorized for the repository:

```bash
git clone https://github.com/gloutchov/Plancia-Comandi.git
cd Plancia-Comandi
npm ci
npm run dev
```

If you already have a checkout, open a terminal in its folder without cloning another copy. `npm ci` installs the lockfile versions. On Windows it does not rebuild `node-pty`; on macOS and Linux it rebuilds that module for Electron. In every case it downloads the Electron binary and needs network access. Wait for it to finish before starting the app.

The desktop window opens. Vite also serves `http://127.0.0.1:47231/`, but the browser page cannot open terminals: use the Electron window. To stop the development environment, quit the app and interrupt the command in the terminal that started it.

### 2.3 Prebuilt packages

This guide does not assume that a verified installer already exists. If a release is published, use only the artifacts and SHA-256 listed in its notes: DMG/ZIP for macOS, NSIS installer or portable executable for Windows, AppImage/DEB for Linux. The Windows portable executable runs without the installer; its name does not guarantee settings are stored beside it.

After verifying the file for your OS and architecture, follow release notes: on macOS open the DMG and copy the app to Applications, or extract the app from the ZIP; on Windows run the installer and choose a folder, or use the portable executable; on Linux open the DEB with the package manager, or grant execution permission to the AppImage through file properties and launch it. These are the procedures expected for the configured targets, still awaiting verification with real packages.

Distribution is expected to be unsigned. Gatekeeper and SmartScreen may display warnings. Verify origin and checksum before following the OS opening procedure; do not disable global protections. Signing, notarization and automatic updates are not configured.

### 2.4 Build and run on Linux

It has not been tested in person on Linux.

1. Install **Git** and **Node.js 22.12** or newer, with npm, as in steps 1 and 2 of this chapter. Electron 45.2.3 does not install on an older Node.js. The checks described in these documents use Node.js 24.
2. Install the tools that compile `node-pty`. The `node-pty` 1.1.0 README asks for `make`, `python` and `build-essential`. On Debian and Ubuntu, `build-essential` already includes `make`, `gcc` and `g++`. The Python package to install is `python3`: node-gyp uses it for the rebuild that `npm ci` runs, because there is no Linux prebuild.

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

On another distribution, install the equivalents of `build-essential` and `python3`.

3. Get the sources from the public repository if you do not have them yet and, from the project folder, install, test, build and start:

```bash
git clone https://github.com/gloutchov/Plancia-Comandi.git
cd Plancia-Comandi
npm ci
npm test
npm run build
npm run dev
```

If the checkout already exists, do not clone it again: run the last four commands in its folder. `npm test` does not open a window. `npm run build` checks TypeScript and generates `dist/` and `dist-electron/`. `npm run dev` opens the desktop window.

4. The Linux package has the script `npm run dist:linux`. After the tests and the build it produces an AppImage and a DEB in `release/`, named `PlanciaComandi-linux-<version>-<arch>.AppImage` and `.deb`. It has not been tested in person on Linux.

## 3. First start

1. The window starts in the workspace with no open terminals. Click **New session** (initially **Nuova sessione** in Italian).
2. Enter an optional **Name**; leave it empty for a numbered name.
3. Choose a **Shell** and **Folder**. **Browse** opens the folder picker. The first proposed folder is your home directory; later the app offers the last used folder.
4. Click **Open** and wait for the prompt. If the folder is invalid or the terminal module cannot load, correct the displayed error.
5. Type a shell command as you would in your system terminal.

The initial language is Italian even on non-Italian systems. Open **Impostazioni** to choose **Italiano** or **English**. The initial theme follows the system; you can force **Light** or **Dark** in **Settings**. Preferences remain saved.

## 4. Sessions and views

You can keep up to **12 sessions**, including exited sessions that have not been closed. At the limit, close one before creating another.

- **Select:** click a sidebar row or inside a visible terminal. Typing goes to the active session.
- **Rename:** click the **Rename** pencil or double-click the name. Press Enter or move focus away to save; Esc cancels. Names are limited to 80 characters.
- **One:** a square icon. Shows only the selected session.
- **Side by side:** an icon of two rectangles next to each other. Shows the selected session and the next one. The button is disabled when only one session is open; the tooltip says to open at least two.
- **Stacked:** an icon of two rectangles, one above the other. Shows the same two sessions, one above the other. This button is also disabled with only one session.
- **Grid:** an icon of four squares. Available from three sessions upward. With three sessions the fourth pane stays empty. Below three sessions the button is disabled and the tooltip asks you to open at least three.
- **Which sessions you see:** the first pane is the selected session. The others follow the sidebar order. At the end of the list, counting continues from the top. A session is not shown twice.
- **Remembered view:** the choice stays saved. If too few sessions are open, you see **One** and the chosen view's button is disabled; when there are enough sessions, that view comes back on its own. If you close sessions until the view is no longer possible, the choice becomes **One** and is saved that way.
- **Tile:** the columns icon in a row, or Command-click on macOS and Ctrl-click on the other systems, selects that session and switches to **Side by side** when at least one other session exists. With only one session the button is disabled.
- **Close:** click **×** in its row. **Working** or **Action** states trigger a confirmation; other states close immediately. The terminal process is stopped.

An exited process remains visible as **Exited** with its exit code. Read its output before closing the session. Open a new session to restart work.

A full quit terminates sessions and does not restore them. Names, selection and output are not saved for the next start. The chosen view is. On macOS closing the last window normally leaves the app and its sessions running; quitting the app terminates them. There is no general quit confirmation that checks all sessions.

## 5. Status and alerts

| State | Estimated meaning |
| --- | --- |
| Starting | No output has arrived yet, within the initial grace period. |
| Working | The program produces output or there are signs of activity. |
| Idle | No recent signs of work, or a recognized prompt. |
| Action | The title or last screen lines suggest a request for input. |
| Exited | The process has exited. |

The app evaluates, in order: process exit, startup, an input request, an animated/working title, markers on the last lines, a recognized prompt, output bursts, a child process on the normal screen, and finally inactivity. A frozen working title is ignored after 3 seconds; a visible marker can hold **Working** for up to 12 seconds after output. A recognized prompt uses 280 ms; an output burst uses 900 ms. A silent child holds working for 8 seconds on the normal buffer, not in a full-screen TUI. Timings are configurable.

Action requests remain visible for at least 1.8 seconds to reduce flicker. Child-process information is polled roughly every 2.5 seconds using OS tools; it is not instantaneous.

In **Settings → Alerts**, enable **System notification** and **Dot in the sidebar** separately. The app reports a session becoming idle after sufficiently long work or requesting action, when it is not the active session with the window focused. Work shorter than 1.6 seconds does not generate an idle-again alert; an action request can still trigger one. The initial prompt does not notify.

A tiled but inactive session may still generate alerts. Its dot clears when you watch it with the window focused; clicking a notification returns to that session. System alerts depend on OS permissions and, on Linux, the available notification service.

## 6. Configuration

### 6.1 Interface preferences

Open **Settings**: changes apply and save immediately. **Terminal size** ranges from 11 to 22, initially 14. **Show why the status was chosen** adds the reason below sessions; the indicator tooltip helps explain the selected rule. **Reset timings** resets only detection parameters, including patterns, rather than every preference.

The central user preferences file is `settings.json` in the directory Electron returns as `userData`. Use **Open the configuration file** to find the actual path. Usual locations are:

| OS | Usual path |
| --- | --- |
| macOS | `~/Library/Application Support/Plancia Comandi/settings.json` |
| Windows | `%APPDATA%/Plancia Comandi/settings.json` |
| Linux | `$XDG_CONFIG_HOME/Plancia Comandi/settings.json`, otherwise `~/.config/Plancia Comandi/settings.json` |

Saved fields are `theme`, `locale`, `layout`, `fontSize`, `notifyDesktop`, `notifyBadge`, `showReasons`, `lastShellId`, `lastCwd` and `status`. Initial theme `system`, language `it`, layout `single`, both alerts enabled, reasons hidden. `layout` accepts `single`, `split`, `stack` or `grid`; an unknown value falls back to `single`. The last shell and folder are reused for new sessions; an unavailable shell identifier falls back to the first detected choice. Unix shells start as login shells (`-l`); the initial Windows choice is Windows PowerShell with `-NoLogo`.

Quit the app before editing JSON manually, keep a copy if it contains customizations, and restart after saving. The file is not reloaded automatically. A missing or unreadable/invalid file uses defaults; a nonexistent last folder falls back to home. If the current file does not exist, the app searches for and copies the file from the former `Molo`/`molo` directories, retaining the original.

### 6.2 Advanced timings and patterns

Numbers are milliseconds except for the two quantity thresholds. Names below are JSON keys inside `status`.

| Key | Default | Range | Purpose |
| --- | --- | --- | --- |
| `quietTimeoutMs` | 900 | 200–30000 | Silence after an output burst. |
| `promptIdleTimeoutMs` | 280 | 50–10000 | Wait for a recognized prompt. |
| `busyMarkerQuietMs` | 12000 | 500–120000 | Working marker still visible. |
| `childQuietTimeoutMs` | 8000 | 500–120000 | Silent child on the normal buffer. |
| `startupGraceMs` | 800 | 0–10000 | Period before the first output. |
| `titleBusyMaxMs` | 3000 | 500–60000 | Maximum trust duration for a frozen title. |
| `burstBytes` | 16 | 1–500 | Chunk-length threshold, measured by the code as string length. |
| `burstCount` | 3 | 1–20 | Number of chunks in the window. |
| `burstWindowMs` | 500 | 50–5000 | Window for counting chunks. |
| `minBusyForNotifyMs` | 1600 | 0–60000 | Minimum work duration for an idle-again alert. |
| `attentionHoldMs` | 1800 | 0–10000 | Hold duration for Action. |

Example partial file without credentials:

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

Missing fields receive defaults; numbers are rounded and clamped to the allowed range. The three lists add JavaScript regexes to the built-in rules without replacing them: up to 40 strings per list, each 1–299 characters. Idle patterns apply to the last nonempty line; busy/attention patterns to the last lines. Syntactically invalid regexes are ignored; expensive regexes have no timeout, so use simple, trusted expressions.

### 6.3 Application configuration file

`config/app.config.json`, in the application folder, holds the clipboard and drag-and-drop limits. It contains no secrets. At startup the app reads the file, ignores unknown keys and, for each missing or out-of-range value, uses the default listed here. A change requires a restart. In an installed app the same file lives in `resources/config`, outside the inner archive, so it can be edited without rebuilding.

| Key | Default | Range | Use |
| --- | --- | --- | --- |
| `clipboardImages.directoryName` | `clipboard-images` | one path segment: lowercase letters, digits and hyphens | Folder created inside the user-data directory, not an absolute path. |
| `clipboardImages.filePrefix` | `img` | an initial lowercase letter, then letters, digits or hyphens | Prefix of `prefix-time-code.png` files. |
| `clipboardImages.maxBytes` | 12582912 | 65536–33554432 | Maximum size of the clipboard image read and of the saved PNG. |
| `clipboardImages.maxEdgePx` | 8000 | 256–16000 | Maximum accepted image edge, in pixels. |
| `clipboardImages.maxKeep` | 40 | 1–200 | How many recent images to keep. |
| `clipboardImages.maxAgeHours` | 24 | 1–720 | Generated images older than this are deleted. |
| `terminal.maxWriteChars` | 200000 | 1000–1000000 | Maximum length of one write to the terminal. A paste is 12 characters shorter, so the bracketed-paste markers still fit. |
| `drop.maxFiles` | 20 | 1–50 | How many dropped files to insert. |
| `drop.maxPathChars` | 4096 | 32–32767 | Maximum length of one dropped path. |

Example without secrets:

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

## 7. Keyboard, clipboard and links

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| New session | Command+T | Ctrl+Shift+T |
| Close active | Command+W | Ctrl+Shift+W |
| One / Side by side / Stacked / Grid | Command+\ | Ctrl+Shift+D |
| Settings | Command+, | Ctrl+Shift+, |
| Tile a row | Command-click | Ctrl-click |
| Copy selection | Command+C | Ctrl+Shift+C, or Ctrl+C when text is selected |
| Paste | Command+V | Ctrl+Shift+V |
| Interrupt the command | Control+C | Ctrl+C with no selection |

On macOS the menu bar has **Edit**, with **Undo**, **Redo**, **Cut**, **Copy**, **Paste** and **Select All**. The labels follow the app language. The **View** and **Window** menus stay Electron's standard menus and follow the system language. On Windows and Linux the bar opens with Alt; **Copy** and **Paste** use Ctrl+Shift+C and Ctrl+Shift+V, so Ctrl+C stays available for the command.

Right-clicking the terminal opens **Copy** and **Paste**. **Copy** is disabled when nothing is selected. Copy and paste use the system clipboard. Paste uses xterm.js: if the program in the terminal has enabled bracketed paste, the text arrives as one block; otherwise text on several lines can run line by line. Always check what you paste. A paste burst far beyond ordinary use can insert the same text twice when the second signal arrives after the app has already forgotten the first.

On Windows and Linux, Ctrl+C copies the selection and clears it, so the next Ctrl+C interrupts the program. With no selection, Ctrl+C sends the interrupt immediately. On macOS the interrupt is Control+C; Command+C copies and does not interrupt. The copy shortcut with no selection is not sent to the program.

Dragging one or more files into the terminal inserts their paths, quoted for that session's shell and separated by a space, with one trailing space. A path that contains a line break is not inserted. Dragged text, with no files, is pasted as text. The app does not open a dropped file in place of the terminal and does not open new windows from a link.

If the clipboard holds an image and you paste, the app saves it as a PNG in its own folder inside the user-data directory and pastes the quoted path, with a trailing space. The file name is generated by the app. Images older than the configured time, and images beyond the maximum count, are deleted. If the image is not acceptable, paste uses the clipboard text.

Esc closes dialogs; otherwise it passes through to the terminal. Session shortcuts do not apply while a dialog is open. Clicked HTTP and HTTPS links in the terminal open in the external browser; other protocols are ignored.

### 7.1 Presentation page

The static page in `docs/`, prepared for GitHub Pages, presents the app and links packages and manuals; it does not run terminals in the browser. On first opening it uses Italian for an Italian preferred browser language and English otherwise. **IT** and **EN** change the language and remember it in the browser; a link with `?lang=it` or `?lang=en` overrides the saved choice for that visit. Site language is independent of the desktop app language.

The initial theme follows the system. The moon/sun control switches to the opposite theme and remembers the choice. If browser storage is unavailable, controls work for the current visit. In the gallery, **Dark theme**, **Light theme** and **Settings** change the image; arrow keys, Home and End work when a gallery control has focus. **Download** leads to Windows x64 and Apple Silicon arm64 macOS packages; compare the SHA-256 files and read the unsigned-package notices. The home icon links to `https://glaucosilvestri.it`. The project credit is centered in the footer between the app name and the GitHub, Manual and License links. Without JavaScript the page remains readable in Italian with static links, but selectors do not work. Publication still requires M4 approvals; see chapter 12 for local preview.

## 8. Practical examples

**Two tasks:** open a session named “Project” in your code folder and a “Checks” session in the same folder. Select the first and click the **Side by side** icon. Use the first for an already installed CLI and the second for the project's validation commands. Click the intended tile before typing. To give an image to a CLI that accepts a path, copy and paste it into the terminal, or drag it in: the file path appears.

**Understand a status:** enable **Show why the status was chosen**. If a program still appears working after stopping, check whether it continuously redraws the screen or leaves a working marker. Adjust timings or a specific pattern; do not use an estimated status to decide destructive operations automatically.

**Try indicators without AI**, from a checkout with Bash on macOS/Linux:

```bash
PLANCIA_DEMO=1 npm run dev
```

The demo opens an ordinary shell and one running `scripts/demo-codex.sh busy`, selects and saves the dark theme and tiles the sessions. The script simulates activity without AI calls. In a Bash shell, also try `bash scripts/demo-codex.sh attention` or `bash scripts/demo-codex.sh idle`; Ctrl+C stops the simulation. The legacy `MOLO_DEMO=1` alias remains supported. The demo does not use an isolated settings profile.

## 9. Troubleshooting

| Problem | What to do |
| --- | --- |
| Browser asks you to open the desktop window | Use Electron started with `npm run dev`, rather than the Vite page. |
| Terminal unavailable / `node-pty` error | On Windows check that `node_modules/node-pty/prebuilds/win32-x64` or `win32-arm64` contains `pty.node`, `conpty.node` and `conpty_console_list.node`, then run `npm ci` again. On macOS and Linux check the native tools, run `npm run rebuild` in the checkout, and restart. Rebuild after changing Electron. |
| Invalid folder | Use **Browse** to select an existing, accessible directory. An `app.asar` archive is not a valid working folder. |
| Shell is missing | Install it in a detected location or in `PATH` where supported, and restart. There is no arbitrary shell-command field. |
| CLI command not found | Confirm it works in the chosen shell and that its login profile configures `PATH`. The app does not install CLIs. |
| Unexpected status | Read the actual output, enable reasons and check timings and patterns. Continuous redraws and unusual prompts can produce wrong estimates. |
| No notification | Check both switches and OS permissions; the active session in a focused window does not notify. On Linux check the notification service. |
| Development port is occupied | After verifying its identity, stop the other development process using `47231`, then retry. The port is fixed and does not change automatically. |
| Edited JSON is not used | Quit the app, check syntax and path, save and restart. Invalid files use defaults; a later UI change may rewrite the file. |
| Sessions missing after restarting | Session restoration is not implemented; open new sessions. |

When reporting issues, share version, OS, reproduction steps and messages with personal data removed. Do not automatically attach screenshots, complete logs, histories or settings containing private paths.

## 10. Updating and removal

To update a checkout, finish tasks, quit the app and inspect local changes with `git status` first. Update only to the revision approved by the maintainer, preserving your files; then run `npm ci`, `npm test` and `npm run build`. Restart with `npm run dev`. Do not use destructive resets to resolve divergence.

For a package, follow the replacement/installation procedure for the verified release on the same platform and architecture. The app does not manage automatic updates. Remove a compiled app using OS tools; the Windows installer is configured to retain user data. Data remains in the directory revealed by settings: if you want to remove it, first copy useful preferences and verify the path. Do not delete working folders or credentials belonging to launched programs.

To stop using source, stop the app; retain the checkout if it contains changes or data you need. Removing the app does not remove separately installed Git, Node.js, shells or CLIs.

## 11. Security and limitations

Plancia Comandi is a local terminal running with your permissions, without workspace confinement. Do not run it with elevated privileges or treat the renderer sandbox as protection against typed commands. Shells inherit almost the entire process environment, potentially including sensitive variables.

The app does not manage API keys or a keychain and does not independently send prompts to AI providers. A launched CLI may do so under its own configuration and consent controls. Check authentication, permissions, accessible files and destinations before giving it private content. `settings.json` must not contain secrets.

Output and session names remain in memory, but shells may save history and programs may write logs, files or use the network. Notifications contain the session name; clipboard, screenshots and diagnostics can reveal data. A pasted image stays in an app folder until cleanup removes it, and any program running with your permissions can read it. The app does not guarantee automatic redaction. Backlog limits can lose older output when a view is recreated; do not use it as permanent storage.

Status detection is not a tool-control protocol. A TUI redrawing while waiting can stay **Working**; a command ending with a prompt-like line can appear **Idle** prematurely. The UI confirms only closures it considers working or awaiting action; a full quit has no such protection.

The window loads only the app's own pages. Production scripts come from the app's files, not from the Internet. xterm.js applies the terminal colors in the page, because they depend on the selected theme. With `npm run dev` the development server stays on this computer, at 127.0.0.1 port 47231; the page opened by itself in a browser does not create terminals.

Cross-platform validation of shells, IME input, PTYs, shortcuts, notifications, themes and installers remains incomplete. The previous README reported Linux demo tests: these do not establish current macOS or Windows verification. See [SECURITY_MODEL.md](SECURITY_MODEL.md) for the controls that are present and for the limits that are still open, and [PLAN.md](PLAN.md) for future proposals.

## 12. Development and distribution

```bash
npm test
npm run build
```

`npm test` runs Vitest against status logic without launching shells or Electron. `npm run build` runs TypeScript checking and generates `dist/` and `dist-electron/`. There are no dedicated lint, typecheck or e2e commands. The GitHub Actions `package-windows.yml` workflow is manual only and does not publish a release. It is set up to use Node.js 24, build the commit named by `source_sha`, and check the unpacked executable, the portable executable and the silent install on the runner. The packaging step runs `node ../tooling/scripts/package-windows.mjs`: the options stay a JavaScript object and PowerShell does not receive `-c.*` or `--config.*`. Run `43086813880` stopped because those arguments were split; run `43096382710` did not start (`startup_failure`). The Windows package of release [v0.3.0](https://github.com/gloutchov/Plancia-Comandi/releases/tag/v0.3.0) comes from run `43226304320`: the workflow checked the unpacked executable, the portable executable and the installed app. A personal trial on a Windows PC is not recorded. The `package-macos.yml` workflow is manual only, on the `macos-15` runner, and does not notarize. Run `43257940568` produced the Apple Silicon DMG and ZIP. On macOS, smoke tests and content inspection ran on the unpacked app, not on the DMG or ZIP. On macOS, `npm ci` runs postinstall, as described in the Installation chapter. Packaging-check debt is in [PLAN.md](PLAN.md). `npm run preview` shows only the renderer and does not replace the desktop window.

After verification, package on the intended OS using `npm run dist:mac`, `npm run dist:win` or `npm run dist:linux`; `npm run dist` selects the current platform. Files in `release/` start with `PlanciaComandi`. App identifier `it.plancia.comandi`, configured executable `plancia-comandi`. `node-pty` and `@xterm/headless` are unpacked from ASAR for runtime use. The Linux icon and the window icon are `build/icon.png`. Windows uses `build/icon.ico` and macOS uses `build/icon.icns`. It has not been tested in person on Linux.

Before distributing, test the package outside the checkout, check that it contains no private data and generate SHA-256 for every artifact, for example `shasum -a 256 <artifact>` on macOS, `sha256sum <artifact>` on Linux or `Get-FileHash <artifact> -Algorithm SHA256` in PowerShell, replacing `<artifact>` with the actual path. Signing and notarization require an explicit process; these commands do not authorize them implicitly.

Development-only variables: `PLANCIA_DEVTOOLS=1` opens DevTools; in demo mode `PLANCIA_SHOT_DIR` enables screenshot writes and `PLANCIA_SHOT_EXIT=1` quits after capture. Legacy aliases `MOLO_DEVTOOLS`, `MOLO_SHOT_DIR`, `MOLO_SHOT_EXIT` also exist. Screenshots include visible content and the output path is not confined: use only authorized test directories and terminals without private data. Capture also changes the saved theme.

To check an existing build, use `node scripts/inspect-package.mjs <resources-directory> <built-checkout> <version>` and, with Node.js 24, `node scripts/smoke-package.mjs <executable> <version>`. Run the smoke test on the target OS: it creates temporary preferences and shells, checks the bridge, PTY, views, languages and themes, and terminates its test processes. It does not use a real AI CLI or the existing clipboard. Local temporary files remain until cleanup is approved. It does not configure signing or notarization. Review and distribution rules are in [AGENTS.md](AGENTS.md); structure in [MAP.md](MAP.md); license in [LICENSE](LICENSE).

Preview the landing from the checkout: `npm run check:site`, then `npm run preview:site` and open `http://127.0.0.1:4174/Plancia-Comandi/`. Stop the server with Ctrl+C. Electron does not need to be launched.
