#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: ULTRA-CLEANUP V2  💠         ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🧹 Liberando puerto 3000 e instancias antiguas..."

# Intentar liberar el puerto 3000 si está ocupado
if command -v fuser > /dev/null; then
    fuser -k 3000/tcp > /dev/null 2>&1
fi

# Matar procesos de node que puedan estar colgados
pkill -9 -f "node index.js" > /dev/null 2>&1
rm -f bot.lock
termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

echo "🔋 Asegúrate de que Termux esté en 'Sin Restricciones'."
sleep 2

while true; do
    # Limpieza extra antes de cada inicio
    rm -f bot.lock
    
    echo "🌸 Iniciando núcleo del bot..."
    node index.js
    
    CODIGO=$?
    
    # Si el bot cae por puerto ocupado, intentar limpiar de nuevo
    if [ $CODIGO -ne 0 ]; then
        echo "⚠️ Error detectado. Limpiando puerto y reintentando..."
        if command -v fuser > /dev/null; then
            fuser -k 3000/tcp > /dev/null 2>&1
        fi
        pkill -9 -f "node index.js" > /dev/null 2>&1
        sleep 5
    else
        echo "✅ Bot detenido normalmente. Reiniciando en 3 segundos..."
        sleep 3
    fi
done
