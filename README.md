<div align="center">

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
  <img src="https://i.postimg.cc/m2zZMSYw/file-000000007e3481f582fd4e0467fe5966.png" width="100%" alt="FamilyBot-MD">
</a>

<br><br>

# 🌿 FamilyBot-MD

### 🤖 WhatsApp Multi-Device Bot · Modular · Powerful · Customizable

<p>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">
    <img src="https://img.shields.io/github/stars/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Stars" alt="Stars">
  </a>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/network/members">
    <img src="https://img.shields.io/github/forks/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Forks" alt="Forks">
  </a>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/issues">
    <img src="https://img.shields.io/github/issues/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github&label=Issues" alt="Issues">
  </a>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/AmilcarGit/FamilyBot-MD?style=for-the-badge&label=License" alt="License">
  </a>
</p>

<p>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD"><strong>📦 Código fuente</strong></a> •
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/issues"><strong>🐛 Reportar error</strong></a> •
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/pulls"><strong>🔧 Pull Requests</strong></a> •
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/forks"><strong>🍴 Hacer Fork</strong></a>
</p>

</div>

---

## 📚 Contenido

- [🌌 Sobre FamilyBot-MD](#-sobre-familybot-md)
- [✨ Características](#-características)
- [🧠 Tecnologías](#-tecnologías)
- [📁 Estructura](#-estructura)
- [📱 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [▶️ Ejecución](#️-ejecución)
- [🧹 Desarrollo](#-desarrollo)
- [🔐 Seguridad](#-seguridad)
- [🤝 Contribuir](#-contribuir)
- [🐛 Issues](#-issues)
- [⭐ Apoyar](#-apoyar)
- [👨‍💻 Créditos](#-créditos)
- [📜 Licencia](#-licencia)

---

## 🌌 Sobre FamilyBot-MD

**FamilyBot-MD** es un bot de WhatsApp Multi-Device construido con
**JavaScript y Node.js**, pensado como una base modular para automatizar,
experimentar y crear nuevas funciones para WhatsApp.

Su organización por comandos, librerías, locales y recursos permite
mantener el proyecto extensible y fácil de personalizar.

> 🌿 **FamilyBot-MD** nace como la nueva identidad del proyecto anteriormente conocido como **TheYui-MD**.

---

## ✨ Características

| 🧩 Característica | 📌 Descripción |
|---|---|
| 🤖 Multi-Device | Arquitectura para WhatsApp Multi-Device |
| ⚡ Node.js | JavaScript moderno con ES Modules |
| 🧱 Modular | Comandos y módulos organizados |
| 🎵 Multimedia | Herramientas para contenido multimedia |
| 🌎 Locales | Estructura para idiomas y traducciones |
| 💾 Base de datos | Soporte para persistencia mediante dependencias del proyecto |
| 🌐 Web | Express disponible para servicios web |
| 🖼️ Imágenes | Procesamiento mediante Jimp |
| 🧹 Code Quality | ESLint y Prettier |
| 🛠️ Personalizable | Configuración y comandos modificables |

---

## 🧠 Tecnologías

- 🟢 Node.js
- 💬 Baileys
- 🌐 Express
- 🗄️ LowDB / MongoDB
- 🖼️ Jimp
- 🎬 FFmpeg
- 📺 youtubei.js
- 🎨 Chalk
- 🧹 ESLint
- ✨ Prettier

> ℹ️ Las versiones y dependencias exactas deben consultarse en `package.json`.

---

## 📁 Estructura

```text
FamilyBot-MD/
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

---

# 📱 Instalación

## 🟢 Termux

### 1. Actualizar paquetes

```bash
pkg update && pkg upgrade -y
```

### 2. Instalar dependencias del sistema

```bash
pkg install git nodejs ffmpeg imagemagick -y
```

### 3. Clonar el repositorio

```bash
git clone https://github.com/AmilcarGit/FamilyBot-MD.git
cd FamilyBot-MD
```

### 4. Instalar dependencias

```bash
npm install
```

---

# ⚙️ Configuración

Antes de iniciar:

```text
config.js
```

Revisa la configuración del bot y adapta los valores necesarios para
tu instalación.

### 🔐 Importante

Nunca publiques:

- 🔑 Tokens
- 🔐 Contraseñas
- 📱 Sesiones de WhatsApp
- 🗝️ API Keys privadas
- 🍪 Cookies privadas

---

# ▶️ Ejecución

### 🚀 Iniciar

```bash
npm start
```

### 🧹 Lint

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

### ⛔ Detener

```bash
npm run stop
```
---

# 🧹 Desarrollo

Para trabajar en el proyecto:

```bash
git clone https://github.com/AmilcarGit/FamilyBot-MD.git
cd FamilyBot-MD
npm install
```

Después realiza tus cambios y comprueba el código:

```bash
npm run lint
npm run format
```

---

# 🔐 Seguridad

FamilyBot-MD es software de código abierto.

Para mantener segura tu instalación:

- 🔒 Mantén las credenciales privadas.
- 🚫 No subas sesiones.
- 🛡️ No compartas API Keys.
- 📦 Mantén las dependencias actualizadas.
- 🔍 Revisa los cambios antes de hacer `git push`.
- 🧪 Prueba tus modificaciones antes de desplegarlas.

---

# 🤝 Contribuir

¡Las contribuciones son bienvenidas! 💚

```text
1️⃣ Fork
   ↓
2️⃣ Crear rama
   ↓
3️⃣ Realizar cambios
   ↓
4️⃣ Probar
   ↓
5️⃣ Commit
   ↓
6️⃣ Pull Request
```

### 💡 Antes de enviar un PR

```bash
npm run lint
npm run format
```

Explica claramente qué cambia tu Pull Request y, si corresponde,
incluye pasos para reproducir o probar la modificación.

---

# 🐛 Issues

¿Encontraste un error?

👉 **[Abrir un Issue](https://github.com/AmilcarGit/FamilyBot-MD/issues)**

Incluye:

- 📱 Sistema operativo
- 🟢 Versión de Node.js
- 🧾 Error completo
- 🔁 Pasos para reproducir
- 📋 Logs relevantes
- 🧩 Comando o módulo afectado

⚠️ Elimina cualquier información privada antes de publicar logs.

---

# 🔧 Pull Requests

👉 **[Ver Pull Requests](https://github.com/AmilcarGit/FamilyBot-MD/pulls)**

Las mejoras, correcciones y nuevas funciones pueden proponerse mediante
Pull Requests.

---

# ⭐ Apoya FamilyBot-MD

Si el proyecto te gusta:

<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">
  ⭐ <strong>Dale una estrella</strong>
</a>

<br><br>

<a href="https://github.com/AmilcarGit/FamilyBot-MD/fork">
  🍴 <strong>Haz un Fork</strong>
</a>

<br><br>

<a href="https://github.com/AmilcarGit/FamilyBot-MD/issues">
  💬 <strong>Participa en la comunidad</strong>
</a>

---

# 📊 Estado del proyecto

<p align="center">
  <a href="https://github.com/AmilcarGit/FamilyBot-MD/commits/main">
    <img src="https://img.shields.io/github/last-commit/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github" alt="Last Commit">
  </a>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD">
    <img src="https://img.shields.io/github/repo-size/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=github" alt="Repo Size">
  </a>
  <a href="https://github.com/AmilcarGit/FamilyBot-MD">
    <img src="https://img.shields.io/github/languages/top/AmilcarGit/FamilyBot-MD?style=for-the-badge&logo=javascript" alt="Top Language">
  </a>
</p>

---

# 👨‍💻 Créditos

<div align="center">

## 🌿 FamilyBot-MD

### Creado por

# **AmilcarGit**

<a href="https://github.com/AmilcarGit">
  <img src="https://img.shields.io/badge/GitHub-AmilcarGit-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub AmilcarGit">
</a>

<br><br>

<a href="https://github.com/AmilcarGit/FamilyBot-MD">
  <img src="https://img.shields.io/badge/Repositorio-FamilyBot--MD-00D4FF?style=for-the-badge&logo=github&logoColor=white" alt="FamilyBot-MD">
</a>

</div>

---

# 📜 Licencia

Este proyecto se distribuye bajo la **Licencia MIT**.

Consulta [`LICENSE`](./LICENSE) para los términos completos.

---

<div align="center">

# 🌿 FamilyBot-MD

### 🤖 WhatsApp • Node.js • Open Source • Community

**Hecho con 💚 y JavaScript por AmilcarGit**

<br>

<a href="https://github.com/AmilcarGit/FamilyBot-MD/stargazers">
  ⭐ <strong>Star this repository</strong>
</a>

<br><br>

<img src="https://img.shields.io/github/stars/AmilcarGit/FamilyBot-MD?style=social" alt="GitHub stars">

</div>


