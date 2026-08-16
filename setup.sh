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

    fuser -k 3000/tcp > /dev/null 2>&1
    rm -f bot.lock > /dev/null 2>&1

    node --max-old-space-size=250 index.js

    ESTADO=$?

    echo "⚠️ Reiniciando sistema neural..."
    limpiar
    sleep 3
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

cat << 'EOF' > watchdog.sh
#!/data/data/com.termux/files/usr/bin/bash

cd ~/TheYui-MD

if ! pgrep -f "node --max-old-space-size=250 index.js" > /dev/null; then
    termux-wake-lock
    nohup bash start.sh > logs/watchdog.log 2>&1 &
    if command -v termux-notification > /dev/null; then
        termux-notification --title "TheYui-MD" --content "El bot se habia caido, lo reinicie automaticamente." --priority high
    fi
fi
EOF

chmod +x watchdog.sh

if command -v termux-job-scheduler > /dev/null; then
    termux-job-scheduler --script "$HOME/TheYui-MD/watchdog.sh" --period-ms 900000 --persisted true
    echo "🐕 Watchdog programado cada 15 minutos con termux-job-scheduler."
else
    echo "⚠️ No se encontró termux-job-scheduler. Instala Termux:API (pkg install termux-api) para activar el watchdog automático."
fi

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "✅ CONFIGURACIÓN COMPLETADA ✅"
echo "----------------------------------------"
echo "1. Auto-Update seguro cada 5 minutos activo (desde el bot)."
echo "2. Auto-Arranque en Termux:Boot activo."
echo "3. Wake Lock y Batería optimizados."
echo "----------------------------------------"
echo "🚀 Escribe 'npm start' para iniciar."
