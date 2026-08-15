
#!/data/data/com.termux/files/usr/bin/bash

set +m
cd "$(dirname "$0")"

echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: SYSTEM STABLE V11  💠        ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"

termux-wake-lock

while true; do
    echo "🧹 Limpiando procesos e instancias antiguas..."
    pkill -9 -f "node index.js" > /dev/null 2>&1
    rm -f bot.lock > /dev/null 2>&1
    if command -v fuser > /dev/null; then
        fuser -k 3000/tcp > /dev/null 2>&1
    fi
    
    echo "📥 Verificando actualizaciones en GitHub..."
    git add . > /dev/null 2>&1
    git stash > /dev/null 2>&1
    git pull > /dev/null 2>&1
    git stash pop > /dev/null 2>&1
    
    echo "🌸 Lanzando núcleo del sistema..."
    node index.js
    
    echo "⚠️ El bot se ha detenido. Reiniciando en 5 segundos..."
    sleep 5
done
