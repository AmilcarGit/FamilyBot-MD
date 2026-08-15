#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"

function limpiar() {
    pkill -9 -f "node" > /dev/null 2>&1
    rm -f bot.lock
    if command -v fuser > /dev/null; then
        fuser -k 3000/tcp > /dev/null 2>&1
    fi
}

function update() {
    while true; do
        sleep 300
        git fetch > /dev/null 2>&1
        L=$(git rev-parse HEAD)
        R=$(git rev-parse @{u})
        if [ "$L" != "$R" ]; then
            pkill -9 -f "node index.js" > /dev/null 2>&1
        fi
    done
}

limpiar
termux-wake-lock
update &

while true; do
    if [ ! -d "session" ]; then
        echo "📢 Sesión no encontrada. Prepara tu código de vinculación."
        sleep 2
    fi

    git add . > /dev/null 2>&1
    git stash > /dev/null 2>&1
    git pull > /dev/null 2>&1
    git stash pop > /dev/null 2>&1
    
    fuser -k 3000/tcp > /dev/null 2>&1
    rm -f bot.lock
    
    (node index.js)
    
    limpiar
    sleep 5
done
