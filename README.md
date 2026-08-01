# TheYui-MD 🌸🦋🫧

[![Último commit](https://img.shields.io/github/last-commit/AmilcarGit/TheYui-MD)](https://github.com/AmilcarGit/TheYui-MD/commits/main)
[![License](https://img.shields.io/github/license/AmilcarGit/TheYui-MD)](https://github.com/AmilcarGit/TheYui-MD/blob/main/LICENSE)
[![Issues abiertos](https://img.shields.io/github/issues-raw/AmilcarGit/TheYui-MD)](https://github.com/AmilcarGit/TheYui-MD/issues)
[![Node](https://img.shields.io/badge/node-18%2B-brightgreen)](#requirements)

[![Instalación](https://img.shields.io/badge/%E2%96%B6%20Instalar-Get%20Started-blue)](#instalaci%C3%B3n)
[![Iniciar](https://img.shields.io/badge/%E2%96%B6%20Iniciar-npm%20start-brightgreen)](#uso)
[![Reportar bug](https://img.shields.io/badge/%E2%9A%A0%20Reportar%20issue-Abrir-red)](https://github.com/AmilcarGit/TheYui-MD/issues/new/choose)
[![Contribuir](https://img.shields.io/badge/%E2%9C%93%20Contribuir-Pull%20Request-orange)](https://github.com/AmilcarGit/TheYui-MD/compare)

---

# TheYui-MD 🌸🦋🫧

TheYui-MD es un starter profesional y estético para crear bots de WhatsApp con @whiskeysockets/baileys (multidevice). Pensado para desarrolladores que quieren un punto de partida seguro, modular y con buen diseño.

---

## Contenido

- [Características](#-características)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Configuración](#-configuración)
- [Ejemplo index.js](#-ejemplo-básico-de-indexjs)
- [Estructura del proyecto](#-estructura-recomendada)
- [Seguridad y buenas prácticas](#-buenas-prácticas)
- [Contribuir](#-contribuciones)
- [Licencia](#-licencia)

---

## ✨ Características

- Conexión multidevice con @whiskeysockets/baileys.
- Generación de QR en consola (qrcode-terminal) para vinculación rápida.
- Persistencia ligera con lowdb (db JSON).
- Manipulación de imágenes y WebP (jimp, node-webpmux).
- Logs estructurados y coloreados (pino, chalk).
- Diseño modular: commands/, lib/, middlewares.
- Enfoque en seguridad: archivos de sesión fuera del repo, uso de env vars.

---

## 🛠 Requisitos

- Node.js 18+
- npm o yarn

---

## 🚀 Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/AmilcarGit/TheYui-MD.git
```

2. Instala dependencias:

```bash
cd TheYui-MD
npm install
```

---

## ▶️ Uso

Inicia el bot:

```bash
npm start
```

La primera ejecución mostrará un QR en consola para vincular la sesión del dispositivo. Tras escanear, las credenciales se guardan localmente (según implementación).

---

## ⚙️ Configuración

Crea `config.json` o usa variables de entorno (.env). Ejemplo mínimo `config.json`:

```json
{
  "owner": "TuNombre",
  "botName": "TheYui",
  "prefix": "!",
  "language": "es"
}
```

Asegúrate de ignorar la carpeta de sesiones (`sessions/`) en `.gitignore`.

---

## 🧾 Ejemplo básico de index.js

Este ejemplo es ilustrativo y está adaptado al estilo moderno con Baileys. Ajústalo según la versión y tu estructura.

```js
// index.js (ejemplo simplificado)
import makeWASocket from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import { writeFileSync } from 'fs'

const start = async () => {
  const sock = makeWASocket.default({
    printQRInTerminal: false
  })

  // Mostrar QR con qrcode-terminal
  sock.ev.on('connection.update', (update) => {
    const { qr, connection } = update
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'close') console.log('Conexión cerrada, intentando reconectar...')
  })

  // Guardar credenciales actualizadas
  sock.ev.on('creds.update', saveCreds => {
    try {
      writeFileSync('./sessions/auth_info.json', JSON.stringify(saveCreds, null, 2))
    } catch (e) {
      console.error('Error guardando credenciales:', e)
    }
  })

  // Escuchar mensajes entrantes
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg || !msg.message) return
    const text = msg.message.conversation || ''
    if (text.startsWith('!ping')) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Pong 🫧' })
    }
  })
}

start().catch(console.error)
```

---

## 📁 Estructura recomendada

- index.js — entrada principal
- commands/ — archivos por comando
- lib/ — helpers y utilidades
- sessions/ — sesiones y credenciales (NO subir)
- db.json — lowdb
- config.json — configuración local

---

## 🔐 Buenas prácticas

- Añadir al `.gitignore`: `sessions/`, `auth_info.json`, `.env`, `db.json`
- No subir credenciales ni sesiones a GitHub
- Usar variables de entorno para secretos
- Manejar reconexiones y límites de reintentos
- Registrar errores y métricas con pino

---

## .gitignore sugerido

```
node_modules/
sessions/
auth_info.json
.env
db.json
*.log
```

---

## 🤝 Contribuciones

¡Contribuciones bienvenidas! Abre un issue para discutir ideas o abre un pull request con una descripción clara y pasos para probar.

---

## 📝 Licencia

MIT (según package.json). ¿Quieres que añada el archivo `LICENSE` con el texto completo en este commit?

---

Made with ❤ for TheYui-MD 🌸🦋🫧
