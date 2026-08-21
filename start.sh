#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"

termux-wake-lock

while true; do
  rm -f bot.lock
  echo "🌸 Iniciando FamilyBot-MD..."
  node --max-old-space-size=250 index.js
  CODIGO=$?
  echo "⚠️ El bot se detuvo (código $CODIGO). Reiniciando en 5 segundos..."
  sleep 5
done