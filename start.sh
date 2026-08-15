#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: NEURAL SYSTEM V5  💠         ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🧹 Iniciando protocolo de limpieza neural..."

pkill -9 -f "node" > /dev/null 2>&1
rm -f bot.lock

if command -v fuser > /dev/null; then
    fuser -k 3000/tcp > /dev/null 2>&1
fi

termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "🔋 Optimizando energía y recursos..."
sleep 3

while true; do
    echo "🔍 Verificando estado del puerto 3000..."
    
    while true; do
        if command -v lsof > /dev/null; then
            if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
                echo "⚠️  Puerto ocupado. Limpiando y esperando..."
                fuser -k 3000/tcp > /dev/null 2>&1
                pkill -9 -f "node" > /dev/null 2>&1
                sleep 2
            else
                break
            fi
        else
            break
        fi
    done

    rm -f bot.lock
    
    echo "🌸 Lanzando núcleo del sistema..."
    node index.js
    
    CODIGO=$?
    
    if [ $CODIGO -ne 0 ]; then
        echo "⚠️  Inestabilidad detectada (Código: $CODIGO). Limpiando..."
        pkill -9 -f "node" > /dev/null 2>&1
        if command -v fuser > /dev/null; then
            fuser -k 3000/tcp > /dev/null 2>&1
        fi
        sleep 5
    else
        echo "✅ Reinicio exitoso. Preparando nuevo ciclo..."
        pkill -9 -f "node" > /dev/null 2>&1
        sleep 3
    fi
done
