# TheYui-MD

Base para crear tu propio bot de WhatsApp usando Baileys (Multidevice).

Descripción
- Plantilla mínima para un bot de WhatsApp con @whiskeysockets/baileys y utilidades comunes (QR, almacenamiento ligero, manipulación de imágenes, webp, logs).
- Objetivo: punto de partida sencillo para desarrollar comandos, integraciones y persistencia.

Características
- Conexión con Baileys (multidevice).
- Generación de QR en consola para vincular la sesión.
- Persistencia ligera con lowdb.
- Soporte básico para imágenes (jimp) y webp (node-webpmux).
- Logging con pino y salida coloreada con chalk.

Requisitos
- Node.js 18+ (u otra versión moderna compatible con módulos ES).
- npm o yarn.

Instalación
1. Clona el repositorio:
   git clone https://github.com/AmilcarGit/TheYui-MD.git
2. Entra al directorio e instala dependencias:
   cd TheYui-MD
   npm install

Arrancar
- Ejecutar:
  npm start
- Al iniciar por primera vez el bot mostrará un QR en consola (qrcode-terminal). Escanéalo desde WhatsApp para vincular.

Configuración (ejemplo)
- Aquí se asume que el repo incluye un index.js que gestiona la autenticación. Si usas un archivo de configuración, crea un archivo `config.json` o usa variables de entorno con los parámetros necesarios.
- Ejemplo simple de config.json:
  {
    "owner": "TuNombre",
    "botName": "TheYui",
    "prefix": "!"
  }
- Guarda las credenciales de sesión en una carpeta segura (p. ej. `sessions/` o `auth_info.json`) según la implementación de Baileys que uses.

Estructura sugerida
- index.js — punto de entrada.
- lib/ — utilidades y helpers.
- commands/ — comandos del bot.
- db.json — base de datos de lowdb (ejemplo).
- sessions/ — credenciales de sesión (no subir a Git).

Dependencias principales (ver package.json)
- @whiskeysockets/baileys — cliente de WhatsApp.
- lowdb — persistencia ligera.
- qrcode-terminal — mostrar QR en consola.
- jimp, node-webpmux — manipulación de imágenes/webp.
- pino, chalk — logging y salida coloreada.

Buenas prácticas
- Nunca comprometas archivos de sesión ni credenciales en el repositorio público. Añade rutas de sesión a .gitignore.
- Usa variables de entorno para credenciales sensibles.
- Añade validaciones y manejo de errores alrededor de la conexión y reconexiones.

Contribuir
- Pull requests bienvenidos. Describe el cambio y cómo probarlo.
- Abre issues para bugs o ideas de nuevas funciones.

Licencia
- MIT (según package.json).

Soporte
- Para ayuda o preguntas abre un issue en el repositorio.
