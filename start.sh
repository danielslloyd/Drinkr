#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Drinkr..."
echo "Open http://localhost:5173 in your browser"
echo "On the same WiFi? Use http://$(hostname -I | awk '{print $1}'):5173"
echo ""
npm run dev
