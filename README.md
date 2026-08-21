<div align="center">

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
<img src="https://i.postimg.cc/m2zZMSYw/file-000000007e3481f582fd4e0467fe5966.png" width="100%" alt="FamilyBot-MD">
</a>

<br><br>

# 🌿 FamilyBot-MD

### 🤖 WhatsApp Multi-Device · Modular · Potente · Personalizable

<p>
<a href="https://github.com/AmilcarGit/FamilyBot-MD"><img src="https://img.shields.io/badge/📦%20Repositorio-181717?style=for-the-badge&logo=github&logoColor=white" alt="Repositorio"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers"><img src="https://img.shields.io/github/stars/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Stars" alt="Stars"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/forks"><img src="https://img.shields.io/github/forks/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Forks" alt="Forks"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/issues"><img src="https://img.shields.io/github/issues/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Issues" alt="Issues"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AmilcarGit/FamilyBot-MD?style=for-the-badge&label=License" alt="License"></a>
</p>

<p>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/issues">🐛 Reportar error</a> •
<a href="https://github.com/AmilcarGit/FamilyBot-MD/pulls">🔧 Pull Requests</a> •
<a href="https://github.com/AmilcarGit/FamilyBot-MD/fork">🍴 Fork</a> •
<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">⭐ Dar estrella</a>
</p>

</div>

---

## 🧭 Navegación

<details open>
<summary><strong>📚 Abrir índice</strong></summary>

- [🌌 Sobre el proyecto](#-sobre-el-proyecto)
- [✨ Características](#-características)
- [🧠 Tecnologías](#-tecnologías)
- [📁 Estructura](#-estructura)
- [📱 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [▶️ Ejecución](#️-ejecución)
- [🎮 Comandos](#-comandos)
- [🧹 Desarrollo](#-desarrollo)
- [🔐 Seguridad](#-seguridad)
- [🤝 Contribuir](#-contribuir)
- [🐛 Reportar problemas](#-reportar-problemas)
- [⭐ Apoyar](#-apoyar)
- [👨‍💻 Créditos](#-créditos)
- [📜 Licencia](#-licencia)

</details>

---

# 🌌 Sobre el proyecto

**FamilyBot-MD** es un bot de WhatsApp Multi-Device desarrollado con **Node.js y JavaScript moderno**, organizado para facilitar la creación, mantenimiento y personalización de comandos.

🌿 Su estructura está separada por comandos, librerías, locales, recursos y módulos auxiliares.

> 💚 **FamilyBot-MD** es la nueva identidad del proyecto anteriormente conocido como **TheYui-MD**.

---

# ✨ Características

| 🧩 | Función | Descripción |
|---|---|---|
| 🤖 | WhatsApp MD | Soporte para arquitectura Multi-Device |
| ⚡ | Node.js | Ejecución mediante JavaScript moderno |
| 🧱 | Modular | Comandos y módulos independientes |
| 🎵 | Multimedia | Herramientas para contenido multimedia |
| 🌎 | Locales | Organización para traducciones |
| 💾 | Persistencia | Dependencias para almacenamiento |
| 🌐 | Web | Express disponible para servicios web |
| 🖼️ | Imágenes | Procesamiento mediante Jimp |
| 🧹 | Calidad | ESLint y Prettier |
| 🛠️ | Personalizable | Fácil de adaptar y ampliar |

---

# 🧠 Tecnologías

```text
🟢 Node.js
💬 Baileys
🌐 Express
🗄️ LowDB / MongoDB
🖼️ Jimp
🎬 FFmpeg
📺 youtubei.js
🎨 Chalk
🧹 ESLint
✨ Prettier
```

<details>
<summary>🔎 Ver información técnica</summary>

El proyecto utiliza ES Modules y mantiene sus dependencias y scripts en `package.json`.

Las versiones exactas deben consultarse directamente en dicho archivo.

</details>

---

# 📁 Estructura

<details open>
<summary>📂 Ver estructura del proyecto</summary>

```text
FamilyBot-MD/
│
├── 📂 assets/
├── 📂 commands/
├── 📂 lib/
├── 📂 locales/
├── 📂 music/
├── ⚙️ config.js
├── 🧠 handler.js
├── 🚀 index.js
├── 📦 package.json
├── 📜 LICENSE
└── 📖 README.md
```

</details>

---

# 📱 Instalación

<details open>
<summary><strong>📲 Instalación en Termux</strong></summary>

### 1️⃣ Actualizar Termux

```bash
pkg update && pkg upgrade -y
```

### 2️⃣ Instalar herramientas

```bash
pkg install git nodejs ffmpeg imagemagick -y
```

### 3️⃣ Clonar

```bash
git clone https://github.com/AmilcarGit/FamilyBot-MD.git
cd FamilyBot-MD
```

### 4️⃣ Instalar dependencias

```bash
npm install
```

</details>

---

# ⚙️ Configuración

<details>
<summary>🔧 Abrir configuración</summary>

La configuración principal se encuentra en:

```text
config.js
```

### 🔐 Nunca publiques

```text
❌ Tokens
❌ Contraseñas
❌ Sesiones de WhatsApp
❌ API Keys privadas
❌ Cookies privadas
```

</details>

---

# ▶️ Ejecución

<details open>
<summary>🚀 Comandos de ejecución</summary>

### ▶️ Iniciar

```bash
npm start
```

### 🧹 Revisar código

```bash
npm run lint
```

### 🎨 Formatear

```bash
npm run format
```

### 🔄 PM2

```bash
npm run pm2
```

### ⛔ Detener PM2

```bash
npm run stop
```

</details>

---

# 🎮 Comandos

<details>
<summary>🤖 Ejemplos de comandos</summary>

```text
.menu
.ping
.family
.pokedex
```

> 💡 Los comandos disponibles pueden variar según la configuración y los módulos instalados.

</details>

---

# 🧩 Ejemplo de interfaz

```text
╭━━━〔 🌿 FAMILYBOT-MD 〕━━━╮
┃
┃ 🤖 WhatsApp Multi-Device
┃ ⚡ Node.js
┃ 🧩 Arquitectura modular
┃ 🌎 Open Source
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

<p align="center">
<a href="https://github.com/AmilcarGit/FamilyBot-MD"><img src="https://img.shields.io/badge/📦%20Código-181717?style=for-the-badge&logo=github" alt="Código"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/issues"><img src="https://img.shields.io/badge/🐛%20Issues-red?style=for-the-badge" alt="Issues"></a>
<a href="https://github.com/AmilcarGit/FamilyBot-MD/pulls"><img src="https://img.shields.io/badge/🔧%20PRs-blue?style=for-the-badge" alt="Pull Requests"></a>
</p>

---

# 🧹 Desarrollo

<details>
<summary>💻 Guía para desarrolladores</summary>

```bash
git clone https://github.com/AmilcarGit/FamilyBot-MD.git
cd FamilyBot-MD
npm install
```

Después:

```bash
npm run lint
npm run format
```

### ⌨️ Atajos visuales

<kbd>Ctrl</kbd> + <kbd>C</kbd> → detener procesos

<kbd>Ctrl</kbd> + <kbd>L</kbd> → limpiar la terminal

</details>

---

# 🔐 Seguridad

<details>
<summary>🛡️ Recomendaciones</summary>

- 🔒 Mantén tus credenciales privadas.
- 🚫 No publiques sesiones.
- 🔑 Protege tus API Keys.
- 📦 Mantén las dependencias actualizadas.
- 🔍 Revisa los commits antes de publicarlos.
- 🧪 Prueba cambios antes del despliegue.
- 🧹 No incluyas secretos en Issues o Pull Requests.

</details>

---

# 🤝 Contribuir

<details open>
<summary>🚀 Cómo contribuir</summary>

```text
🍴 Fork
 ↓
🌿 Crear rama
 ↓
🧩 Programar
 ↓
🧪 Probar
 ↓
🧹 Lint
 ↓
🎨 Format
 ↓
📤 Pull Request
```

Antes de enviar un Pull Request:

```bash
npm run lint
npm run format
```

</details>

---

# 🐛 Reportar problemas

<a href="https://github.com/AmilcarGit/FamilyBot-MD/issues/new/choose">
<img src="https://img.shields.io/badge/🐛%20Abrir%20Issue-d73a4a?style=for-the-badge&logo=github" alt="Abrir Issue">
</a>

<details>
<summary>📋 Qué incluir</summary>

- 📱 Sistema operativo
- 🟢 Versión de Node.js
- 🧾 Error completo
- 🔁 Pasos para reproducir
- 📋 Logs relevantes
- 🧩 Comando o módulo afectado

⚠️ Elimina información privada antes de publicar.

</details>

---

# 📊 Estadísticas

<p align="center">

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
<img src="https://img.shields.io/github/last-commit/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github" alt="Último commit">
</a>

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
<img src="https://img.shields.io/github/repo-size/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github" alt="Tamaño">
</a>

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
<img src="https://img.shields.io/github/languages/top/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=javascript" alt="Lenguaje">
</a>

</p>

---

# ⭐ Apoyar

<div align="center">

### ¿Te gusta FamilyBot-MD?

<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">
<img src="https://img.shields.io/badge/⭐%20Dar%20una%20estrella-FFD700?style=for-the-badge&logo=github&logoColor=black" alt="Star">
</a>

<a href="https://github.com/AmilcarGit/FamilyBot-MD/fork">
<img src="https://img.shields.io/badge/🍴%20Hacer%20Fork-007EC6?style=for-the-badge&logo=github" alt="Fork">
</a>

</div>

---

# 👨‍💻 Créditos

<div align="center">

## 🌿 FamilyBot-MD

### Creado por

# **AmilcarGit**

<a href="https://github.com/AmilcarGit">
<img src="https://img.shields.io/badge/GitHub-AmilcarGit-181717?style=for-the-badge&logo=github&logoColor=white" alt="AmilcarGit">
</a>

<br><br>

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
<img src="https://img.shields.io/badge/FamilyBot--MD-00D4FF?style=for-the-badge&logo=github&logoColor=white" alt="FamilyBot-MD">
</a>

</div>

---

# 📜 Licencia

Este proyecto se distribuye bajo la **Licencia MIT**.

Consulta [`LICENSE`](./LICENSE) para los términos completos.

---

<div align="center">

<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">
<img src="https://img.shields.io/github/stars/AmilcarGit/FamilyBot-MD?style=social" alt="Stars">
</a>

<br><br>

# 🌿 FamilyBot-MD

### 🤖 WhatsApp • Node.js • Open Source

**Hecho con 💚 por AmilcarGit**

<br>

<sub>© FamilyBot-MD · Open Source Project</sub>

</div>
