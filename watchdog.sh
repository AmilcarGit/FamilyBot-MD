#!/data/data/com.termux/files/usr/bin/bash

cd ~/TheYui-MD

if ! pgrep -f "node --max-old-space-size=250 index.js" > /dev/null; then
    termux-wake-lock
    nohup bash start.sh > logs/watchdog.log 2>&1 &
    if command -v termux-notification > /dev/null; then
        termux-notification --title "TheYui-MD" --content "El bot se habia caido, lo reinicie automaticamente." --priority high
    fi
fi
