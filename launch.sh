#!/usr/bin/env bash
# Drinkr launcher — starts the dev server silently and opens the browser.
# Safe to double-click multiple times; kills the previous instance first.

DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.drinkr.pid"
LOG_FILE="$DIR/.drinkr.log"
PORT=5173

# ── Kill previous instance ─────────────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

# ── Install deps on first run ──────────────────────────────────────────────
if [ ! -d "$DIR/node_modules" ]; then
  notify-send "Drinkr" "First-time setup, please wait..." 2>/dev/null || true
  npm --prefix "$DIR" install --silent > "$LOG_FILE" 2>&1
fi

# ── Start Vite dev server in background ───────────────────────────────────
nohup npm --prefix "$DIR" run dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# ── Wait until server responds (up to 10 s) ───────────────────────────────
for i in $(seq 1 20); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# ── Open browser ──────────────────────────────────────────────────────────
URL="http://localhost:$PORT"
if command -v xdg-open  &>/dev/null; then xdg-open  "$URL"
elif command -v gnome-open &>/dev/null; then gnome-open "$URL"
elif command -v kde-open  &>/dev/null; then kde-open  "$URL"
elif command -v open      &>/dev/null; then open      "$URL"  # macOS fallback
fi
