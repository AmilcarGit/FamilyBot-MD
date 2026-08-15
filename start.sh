#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

termux-wake-lock

if command -v termux-api > /dev/null; then
    am start --user 0 -a android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS > /dev/null 2>&1
fi

printf "\033[1;35m"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                                                ┃"
echo "┃   💠  THE YUI-MD: NEURAL STARTUP SYSTEM  💠    ┃"
echo "┃                                                ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
printf "\033[0m"

echo "🚀 Optimizando entorno para Termux..."
echo "🔋 Por favor, si se abre una ventana, selecciona 'Sin Restricciones' para Termux."
sleep 2

while true; do
    echo "🌸 Iniciando núcleo del bot..."
    node index.js
    
    CODIGO=$?
    
    if [ $CODIGO -eq 0 ]; then
        echo "✅ Bot detenido normalmente. Reiniciando en 3 segundos..."
        sleep 3
    else
        echo "⚠️ Crash detectado (Código: $CODIGO). Aplicando autoreparación..."
        echo "⏳ Reiniciando sistema en 5 segundos..."
        sleep 5
    fi
done
