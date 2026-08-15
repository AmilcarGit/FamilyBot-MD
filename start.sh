#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: AUTO-CLEANUP SYSTEM  💠      ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🧹 Limpiando instancias antiguas y archivos de bloqueo..."
pkill -f "node index.js" > /dev/null 2>&1
rm -f bot.lock
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "🔋 Asegúrate de que Termux esté en 'Sin Restricciones'."
sleep 2

while true; do
    echo "🌸 Iniciando núcleo del bot..."
    node index.js
    
    CODIGO=$?
    
    rm -f bot.lock
    
    if [ $CODIGO -eq 0 ]; then
        echo "✅ Bot detenido normalmente. Reiniciando en 3 segundos..."
        sleep 3
    else
        echo "⚠️ Crash detectado (Código: $CODIGO). Reiniciando en 5 segundos..."
        sleep 5
    fi
done
