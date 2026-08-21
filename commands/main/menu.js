import fs from 'fs'
import path from 'path'
import * as Baileys from '@whiskeysockets/baileys'
import { fileURLToPath } from 'url'
import { obtenerImagenMenuAleatoria } from '../../lib/randomImage.js'

const generateWAMessageFromContent =
  Baileys.generateWAMessageFromContent ||
  Baileys.default?.generateWAMessageFromContent

const prepareWAMessageMedia =
  Baileys.prepareWAMessageMedia ||
  Baileys.default?.prepareWAMessageMedia

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const commandsPath = path.join(__dirname, '..')

export const desc = 'Menú principal de FamilyBot-MD'

export const alias = [
  'menu',
  'help',
  'ayuda'
]

export const cooldown = 3

const emojis = {
  economia: '💰',
  gacha: '🎴',
  grupo: '👥',
  herramientas: '🛠️',
  ia: '🤖',
  juegos: '🎮',
  main: '🌿',
  media: '🎬',
  owner: '👑',
  perfil: '👤',
  social: '🌐',
  subbot: '🤖',
  default: '📦'
}

const nombres = {
  economia: 'ECONOMÍA',
  gacha: 'GACHA',
  grupo: 'GRUPO',
  herramientas: 'HERRAMIENTAS',
  ia: 'INTELIGENCIA ARTIFICIAL',
  juegos: 'JUEGOS',
  main: 'MAIN',
  media: 'MULTIMEDIA',
  owner: 'OWNER',
  perfil: 'PERFIL',
  social: 'SOCIAL',
  subbot: 'SUB-BOT'
}

function obtenerNombreCategoria(carpeta) {
  const clave = carpeta
    .toLowerCase()
    .replace(/\s+/g, '')

  return (
    nombres[clave] ||
    carpeta
      .replace(/[-_]/g, ' ')
      .toUpperCase()
  )
}

function obtenerEmojiCategoria(carpeta) {
  const clave = carpeta
    .toLowerCase()
    .replace(/\s+/g, '')

  return emojis[clave] || emojis.default
}

function obtenerAliases(contenido) {
  const resultado = contenido.match(
    /export\s+const\s+alias\s*=\s*(\[[\s\S]*?\])/
  )

  if (!resultado) {
    return []
  }

  const aliases = resultado[1].match(
    /['"`]([^'"`]+)['"`]/g
  )

  if (!aliases) {
    return []
  }

  return aliases.map(alias =>
    alias.slice(1, -1)
  )
}

function obtenerDescripcion(contenido) {
  const resultado = contenido.match(
    /export\s+const\s+desc\s*=\s*['"`]([\s\S]*?)['"`]/
  )

  return resultado ? resultado[1] : ''
}

function obtenerComandos() {
  const categorias = []

  if (!fs.existsSync(commandsPath)) {
    return categorias
  }

  const carpetas = fs
    .readdirSync(commandsPath, {
      withFileTypes: true
    })
    .filter(item => item.isDirectory())
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    )

  for (const carpeta of carpetas) {
    const rutaCategoria = path.join(
      commandsPath,
      carpeta.name
    )

    const archivos = fs
      .readdirSync(rutaCategoria, {
        withFileTypes: true
      })
      .filter(
        item =>
          item.isFile() &&
          /\.js$/i.test(item.name)
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      )

    const comandos = []

    for (const archivo of archivos) {
      if (archivo.name.startsWith('_')) {
        continue
      }

      if (
        archivo.name === 'menu.js' &&
        carpeta.name === 'main'
      ) {
        continue
      }

      const rutaArchivo = path.join(
        rutaCategoria,
        archivo.name
      )

      let contenido = ''

      try {
        contenido = fs.readFileSync(
          rutaArchivo,
          'utf8'
        )
      } catch {
        continue
      }

      const nombre = path.basename(
        archivo.name,
        '.js'
      )

      const aliases =
        obtenerAliases(contenido)

      const descripcion =
        obtenerDescripcion(contenido)

      comandos.push({
        nombre,
        aliases,
        descripcion
      })
    }

    if (comandos.length > 0) {
      categorias.push({
        carpeta: carpeta.name,
        nombre:
          obtenerNombreCategoria(
            carpeta.name
          ),
        emoji:
          obtenerEmojiCategoria(
            carpeta.name
          ),
        comandos
      })
    }
  }

  return categorias
}

function limpiarNombre(nombre) {
  return nombre
    .replace(/\.js$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
}

function construirMenuComandos(prefijo) {
  const categorias =
    obtenerComandos()

  if (!categorias.length) {
    return `
╭─────── 🌿 ───────╮
      𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒
╰─────── 🌿 ───────╯

📭 No se encontraron comandos.

╰─────────────────╯
`.trim()
  }

  const bloques = categorias.map(
    categoria => {
      const comandos =
        categoria.comandos
          .map(comando => {
            const nombre =
              limpiarNombre(
                comando.nombre
              )

            const aliases =
              comando.aliases
                .filter(
                  alias =>
                    alias !==
                    comando.nombre
                )
                .slice(0, 3)

            let linea =
              `│ ${prefijo}${nombre}`

            if (aliases.length) {
              linea +=
                `\n│   ↳ ${aliases
                  .map(
                    alias =>
                      `${prefijo}${alias}`
                  )
                  .join(' • ')}`
            }

            return linea
          })
          .join('\n')

      return `
╭─❖ ${categoria.emoji} 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀: ${categoria.nombre}
${comandos}
╰────────────────
`.trim()
    }
  )

  const total =
    categorias.reduce(
      (cantidad, categoria) =>
        cantidad +
        categoria.comandos.length,
      0
    )

  return `
╭─────── 🌿 ───────╮
     𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓
    𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒
╰─────── 🌿 ───────╯

${bloques.join('\n\n')}

╭─────────────────╮
│ 📚 Total: ${total} comandos
╰─────────────────╯

🌿 *𝐌𝐨𝐫𝐞 𝐭𝐡𝐚𝐧 𝐚 𝐛𝐨𝐭...*
   *𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲.*
`.trim()
}

async function prepararImagen(sock) {
  try {
    const buffer =
      obtenerImagenMenuAleatoria()

    if (!buffer) {
      return null
    }

    return await prepareWAMessageMedia(
      {
        image: buffer
      },
      {
        upload:
          sock.waUploadToServer
      }
    )
  } catch (error) {
    console.error(
      '❌ Error preparando imagen del menú:',
      error
    )

    return null
  }
}

function crearBoton(
  prefijo,
  texto,
  id
) {
  return {
    name: 'quick_reply',
    buttonParamsJson:
      JSON.stringify({
        display_text: texto,
        id: `${prefijo}${id}`
      })
  }
}

async function enviarMenu({
  sock,
  chatId,
  msg,
  config,
  texto,
  titulo,
  botones
}) {
  const media =
    await prepararImagen(sock)

  const message =
    generateWAMessageFromContent(
      chatId,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: {
                text: texto
              },
              footer: {
                text:
                  config?.nombreBot ||
                  'FamilyBot-MD'
              },
              header: {
                title: titulo,
                hasMediaAttachment:
                  !!media,
                ...(media
                  ? {
                      imageMessage:
                        media.imageMessage
                    }
                  : {})
              },
              nativeFlowMessage: {
                buttons: botones
              }
            }
          }
        }
      },
      {
        quoted: msg
      }
    )

  await sock.relayMessage(
    chatId,
    message.message,
    {
      messageId: message.key.id
    }
  )
}

export default async function menu({
  sock,
  chatId,
  msg,
  config,
  db,
  args = []
}) {
  const jid =
    msg?.key?.participant ||
    msg?.key?.remoteJid

  const numero =
    jid?.split('@')[0] ||
    'Usuario'

  const users =
    db?.data?.users || {}

  const user =
    users[jid] || {}

  const nivel =
    user.level ??
    user.nivel ??
    1

  const xp =
    user.exp ??
    user.xp ??
    0

  const rango =
    user.rank ??
    user.rango ??
    'Miembro'

  const nombreBot =
    config?.nombreBot ||
    'FamilyBot-MD'

  const version =
    config?.version ||
    '2.0'

  const prefijo =
    config?.prefijo ||
    '.'

  const accion =
    args
      .join(' ')
      .toLowerCase()
      .trim()

  if (
    accion === 'all' ||
    accion === 'todos' ||
    accion === 'comandos' ||
    accion === 'lista'
  ) {
    const texto =
      construirMenuComandos(
        prefijo
      )

    return enviarMenu({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '📚 FAMILYBOT-MD • COMANDOS',
      texto,
      botones: [
        crearBoton(
          prefijo,
          '⬅️ VOLVER',
          'menu'
        ),
        crearBoton(
          prefijo,
          '⚡ PING',
          'ping'
        )
      ]
    })
  }

  const texto = `
╭─────── 🌿 ───────╮
   𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
      𝐌𝐄𝐍𝐔
╰─────── 🌿 ───────╯

👋 𝐇𝐨𝐥𝐚, @${numero}

╭─❖ 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎
│ 🤖 ${nombreBot}
│ 🟢 Estado: Online
│ ⚡ Versión: ${version}
│ 👑 Creador: AmilcarGit
╰────────────────

╭─❖ 𝐓𝐔 𝐏𝐄𝐑𝐅𝐈𝐋
│ ⭐ Nivel: ${nivel}
│ ✨ XP: ${Number(xp).toLocaleString()}
│ 🎖️ Rango: ${rango}
╰────────────────

╭─❖ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒
│ 💰 Economía
│ 🎴 Gacha
│ 👥 Grupo
│ 🛠️ Herramientas
│ 🤖 Inteligencia Artificial
│ 🎮 Juegos
│ 🎬 Multimedia
│ 👑 Owner
│ 👤 Perfil
│ 🌐 Social
│ 🤖 Sub-Bot
╰────────────────

        🌿 ───────── 🌿

   ❝ 𝐌𝐨𝐫𝐞 𝐭𝐡𝐚𝐧 𝐚 𝐛𝐨𝐭...
      𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲. ❞

        🌿 ───────── 🌿

        🍃 𝐀𝐦𝐢𝐥𝐜𝐚𝐫𝐆𝐢𝐭
`.trim()

  return enviarMenu({
    sock,
    chatId,
    msg,
    config,
    titulo:
      '🌿 FAMILYBOT-MD',
    texto,
    botones: [
      crearBoton(
        prefijo,
        '📚 ABRIR MENÚ',
        'menu all'
      ),
      crearBoton(
        prefijo,
        '⚡ PING',
        'ping'
      )
    ]
  })
}