#!/usr/bin/env bash
# Draws a small Codex-like screen so the status heuristic can be seen
# without the real CLI. Usage: scripts/demo-codex.sh [busy|attention|idle]
set -u
mode="${1:-busy}"

printf '\033[?1049h\033[H\033[2J'

draw_header() {
  printf '\033[38;5;245m  Plancia Comandi · Codex\033[0m\r\n'
  printf '\r\n'
  printf '\033[38;5;108m  Tu\033[0m\r\n'
  printf '  Aggiungi un indicatore di stato nella barra.\r\n'
  printf '\r\n'
  printf '\033[38;5;180m  Codex\033[0m\r\n'
  printf '  Aggiorno la riga della sessione e i colori.\r\n'
  printf '\r\n'
}

if [[ "$mode" == "attention" ]]; then
  printf '\033]0;Action required — demo\007'
  draw_header
  printf '  \033[38;5;141mAction required\033[0m\r\n'
  printf '  Allow this command?\r\n'
  printf '\r\n'
  printf '  \033[38;5;245m›\033[0m  \r\n'
  while true; do sleep 3600; done
fi

if [[ "$mode" == "idle" ]]; then
  printf '\033]0;Codex — demo\007'
  draw_header
  printf '  \033[38;5;245m›\033[0m  \r\n'
  printf '\r\n'
  printf '  \033[38;5;245mgpt · main · in attesa\033[0m\r\n'
  while true; do sleep 3600; done
fi

frames=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
i=0
while true; do
  frame="${frames[$((i % 10))]}"
  secs=$((i / 10))
  printf '\033]0;%s Working — demo\007' "$frame"
  printf '\033[H'
  draw_header
  printf '  \033[38;5;214m%s Working\033[0m  (%ss · esc to interrupt)\r\n' "$frame" "$secs"
  printf '\r\n'
  printf '  \033[38;5;245m›\033[0m  \r\n'
  i=$((i + 1))
  sleep 0.12
done
