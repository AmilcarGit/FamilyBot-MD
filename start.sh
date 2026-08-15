#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: NEURAL CLEANUP V3  💠        ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🧹 Iniciando protocolo de limpieza profunda..."

pkill -9 -f "node index.js" > /dev/null 2>&1

if command -v fuser > /dev/null; then
    fuser -k 3000/tcp > /dev/null 2>&1
fi

if command -v lsof > /dev/null; then
    PORT_PID=$(lsof -t -i:3000)
    if [ ! -z "$PORT_PID" ]; then
        kill -9 $PORT_PID > /dev/null 2>&1
    fi
fi

rm -f bot.lock
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "🔋 Optimizando energía y liberando recursos..."
sleep 3

while true; do
    rm -f bot.lock
    
    echo "🌸 Lanzando núcleo del sistema..."
    node index.js
    
    CODIGO=$?
    
    if [ $CODIGO -ne 0 ]; then
        echo "⚠️  Inestabilidad detectada. Limpiando puerto 3000..."
        if command -v fuser > /dev/null; then
            fuser -k 3000/tcp > /dev/null 2>&1
        fi
        pkill -9 -f "node index.js" > /dev/null 2>&1
        sleep 5
    else
        echo "✅ Sesión finalizada. Reiniciando núcleo..."
        sleep 3
    fi
done
