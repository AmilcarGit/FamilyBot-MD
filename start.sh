#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: AUTO-EVOLVE V6  💠           ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

function limpiar_recursos() {
    pkill -9 -f "node" > /dev/null 2>&1
    rm -f bot.lock
    if command -v fuser > /dev/null; then
        fuser -k 3000/tcp > /dev/null 2>&1
    fi
}

function verificar_actualizacion() {
    while true; do
        sleep 300
        git fetch > /dev/null 2>&1
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse @{u})
        if [ "$LOCAL" != "$REMOTE" ]; then
            echo "🔄 Nueva versión detectada en GitHub. Aplicando..."
            pkill -9 -f "node index.js" > /dev/null 2>&1
        fi
    done
}

limpiar_recursos
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

verificar_actualizacion &
WATCHER_PID=$!

echo "🔋 Sistema optimizado. Iniciando ciclo de vida..."
sleep 3

while true; do
    echo "📥 Revisando actualizaciones pendientes..."
    git add . > /dev/null 2>&1
    git stash > /dev/null 2>&1
    git pull > /dev/null 2>&1
    git stash pop > /dev/null 2>&1
    
    echo "🔍 Verificando puerto 3000..."
    while true; do
        if command -v lsof > /dev/null; then
            if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
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
        echo "⚠️  Reinicio por inestabilidad. Limpiando..."
        limpiar_recursos
        sleep 5
    else
        echo "✅ Reinicio programado o por actualización..."
        limpiar_recursos
        sleep 3
    fi
done

trap "kill $WATCHER_PID" EXIT
