#!/data/data/com.termux/files/usr/bin/bash

set +m
cd "$(dirname "$0")"

function limpiar() {
    pkill -15 -f "node index.js" > /dev/null 2>&1
    sleep 1
    pkill -9 -f "node index.js" > /dev/null 2>&1
    rm -f bot.lock > /dev/null 2>&1
    if command -v fuser > /dev/null; then
        fuser -k 3000/tcp > /dev/null 2>&1
    fi
}

limpiar
termux-wake-lock

echo "🚀 Iniciando TheYui-MD en modo optimizado..."

while true; do
    if [ ! -d "session" ]; then
        echo "📢 Preparando entorno de sesión..."
        sleep 2
    fi

    git add . > /dev/null 2>&1
    git stash > /dev/null 2>&1
    git pull > /dev/null 2>&1
    git stash pop > /dev/null 2>&1
    
    fuser -k 3000/tcp > /dev/null 2>&1
    rm -f bot.lock > /dev/null 2>&1
    
    node index.js
    
    ESTADO=$?
    
    echo "⚠️ Reiniciando sistema neural..."
    limpiar
    sleep 3
done
