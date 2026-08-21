#!/data/data/com.termux/files/usr/bin/bash

cd ~/FamilyBot-MD

if pgrep -f "start.sh" > /dev/null; then
    exit 0
fi

if ! pgrep -f "index.js" > /dev/null; then
    termux-wake-lock
    nohup bash start.sh > logs/watchdog.log 2>&1 &
    if command -v termux-notification > /dev/null; then
        termux-notification --title "FamilyBot-MD" --content "El bot se habia caido, lo reinicie automaticamente." --priority high
    fi
fi
