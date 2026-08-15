#!/data/data/com.termux/files/usr/bin/bash

printf "\033[1;36m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   🌌  THE YUI-MD: AUTO-INSTALLER V9  🌌        ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🚀 Iniciando configuración neural..."

cat << 'EOF' > start.sh
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
            pkill -9 -f "node index.js"
        fi
    done
}

limpiar
termux-wake-lock
update &

while true; do
    git add . > /dev/null 2>&1
    git stash > /dev/null 2>&1
    git pull > /dev/null 2>&1
    git stash pop > /dev/null 2>&1
    fuser -k 3000/tcp > /dev/null 2>&1
    rm -f bot.lock
    node index.js
    limpiar
    sleep 5
done
EOF

chmod +x start.sh

mkdir -p ~/.termux/boot
cat << 'EOF' > ~/.termux/boot/start-yui.sh
#!/data/data/com.termux/files/usr/bin/sh
sleep 15
termux-wake-lock
cd ~/TheYui-MD
bash start.sh
EOF

chmod +x ~/.termux/boot/start-yui.sh
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "✅ CONFIGURACIÓN COMPLETADA ✅"
echo "----------------------------------------"
echo "1. Auto-Update cada 5 minutos activo."
echo "2. Auto-Arranque en Termux:Boot activo."
echo "3. Wake Lock y Batería optimizados."
echo "----------------------------------------"
echo "🚀 Escribe 'npm start' para iniciar."
