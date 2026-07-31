# TheYui-MD 🌸🦋🫧

Un starter profesional y estético para crear tu propio bot de WhatsApp con Baileys (Multidevice).

> TheYui-MD es una plantilla ligera, organizada y lista para extender, pensada para desarrolladores que quieren un punto de partida con buenas prácticas y estilo.

---

## ✨ Características destacadas

- Conexión multidevice con @whiskeysockets/baileys.
- QR en consola para vinculación rápida (qrcode-terminal).
- Persistencia ligera con lowdb (db JSON).
- Manipulación básica de imágenes y WebP (jimp, node-webpmux).
- Logs estructurados y coloreados (pino, chalk).
- Estructura modular para comandos y utilidades.

## 🛠 Requisitos

- Node.js 18+ (compatible con módulos ES).
- npm o yarn.

## 🚀 Instalación

1. Clona el repositorio:

   git clone https://github.com/AmilcarGit/TheYui-MD.git
2. Entra al directorio e instala dependencias:

   cd TheYui-MD
   npm install

## ▶️ Uso

- Inicia el bot:

  npm start

- La primera vez verás un QR en consola. Escanéalo desde WhatsApp para vincular la sesión.

## ⚙️ Configuración mínima (ejemplo)

Crea un archivo `config.json` o usa variables de entorno. Ejemplo `config.json`:

{
  "owner": "TuNombre",
  "botName": "TheYui",
  "prefix": "!",
  "language": "es"
}

Asegúrate de que el archivo/ubicación de las credenciales de sesión (p. ej. `sessions/` o `auth_info.json`) quede excluido del repositorio (.gitignore).

## 📁 Estructura sugerida

- index.js — punto de entrada (gestiona conexión y eventos).
- commands/ — comandos del bot (un archivo por comando).
- lib/ — helpers y utilidades.
- sessions/ — credenciales de sesión (NO subir).
- db.json — almacenamiento de lowdb.

## 🔐 Buenas prácticas

- Nunca subas archivos de sesión ni credenciales al repositorio público.
- Añade `sessions/`, `auth_info.json` y otros archivos sensibles a `.gitignore`.
- Usa variables de entorno para secrets y tokens.
- Implementa manejo de reconexión y reintentos para una experiencia robusta.

## 🧪 Ejemplo básico de index.js (idea)

// Pseudocódigo / idea: conecta, muestra QR, guarda credenciales y escucha mensajes

1. Cargar config y DB
2. Inicializar Baileys y manejar evento de QR
3. Guardar credenciales en `sessions/` (local)
4. Escuchar mensajes y enrutar a `commands/`

Si quieres, puedo añadir un ejemplo funcional de `index.js` y un `.gitignore` listo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Abre un issue o haz un pull request describiendo los cambios y cómo probarlos.

## 📝 Licencia

MIT (según package.json).

## 📬 Soporte

¿Tienes dudas o quieres funcionalidades extras? Abre un issue o contáctame en el repositorio.

---

Made with ❤ for TheYui-MD 🌸🦋🫧
