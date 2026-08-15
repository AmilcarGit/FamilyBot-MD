#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: NEURAL CLEANUP V4  💠        ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🧹 Iniciando protocolo de limpieza ultra-agresiva..."

pkill -9 -f "node" > /dev/null 2>&1

if command -v fuser > /dev/null; then
    fuser -k 3000/tcp > /dev/null 2>&1
    fuser -k 3001/tcp > /dev/null 2>&1
fi

rm -f bot.lock
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "🔋 Estabilizando sistema y liberando memoria..."
sleep 5

while true; do
    rm -f bot.lock
    
    echo "🌸 Lanzando núcleo del sistema..."
    node index.js
    
    CODIGO=$?
    
    if [ $CODIGO -ne 0 ]; then
        echo "⚠️  Falla detectada. Limpiando recursos..."
        pkill -9 -f "node" > /dev/null 2>&1
        if command -v fuser > /dev/null; then
            fuser -k 3000/tcp > /dev/null 2>&1
        fi
        sleep 8
    else
        echo "✅ Reinicio solicitado. Preparando entorno..."
        pkill -9 -f "node" > /dev/null 2>&1
        sleep 5
    fi
done
