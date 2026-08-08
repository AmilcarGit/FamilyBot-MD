import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import config from './config.js'
import { esOwner, normalizarJid, resolverNumeroReal } from './lib/utils.js'
import { esAdminGrupo } from './lib/groupPermissions.js'
import { getDB } from './lib/db.js'
import { info, warn, error as logError } from './lib/logger.js'
import { t, obtenerIdiomaUsuario } from './lib/i18n.js'
import { mostrarResumenComandos } from './lib/banner.js'
import { obtenerConfigChat } from './lib/groupSettings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.join(__dirname, 'commands')

const comandos = {}
const listaComandos = []
const cooldowns = new Map()

function listarArchivosComandos(dir) {
  const resultado = []
  const entradas = fs.readdirSync(dir, { withFileTypes: true })

  for (const entrada of entradas) {
    const rutaCompleta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      resultado.push(...listarArchivosComandos(rutaCompleta))
    } else if (entrada.name.endsWith('.js')) {
      resultado.push(rutaCompleta)
    }
  }

  return resultado
}

function quitarComando(nombre) {
  const entradaVieja = comandos[nombre]
  if (!entradaVieja) return

  delete comandos[nombre]
  for (const a of entradaVieja.alias) delete comandos[a]

  const idx = listaComandos.findIndex((c) => c.nombre === nombre)
  if (idx !== -1) listaComandos.splice(idx, 1)
}

async function cargarComandoIndividual(rutaCompleta, avisar = false) {
  const nombre = path.basename(rutaCompleta, '.js')
  const relPath = path.relative(commandsDir, rutaCompleta).split(path.sep).join('/')
  const dirRelativo = path.dirname(relPath)
  const categoria = dirRelativo === '.' ? 'general' : dirRelativo

  quitarComando(nombre)

  const mod = await import(`./commands/${relPath}?update=${Date.now()}`)

  const entrada = {
    nombre,
    categoria,
    run: mod.default,
    subcomandos: mod.subcomandos || null,
    desc: mod.desc || 'Sin descripción',
    alias: mod.alias || [],
    cooldown: mod.cooldown ?? 3,
    soloOwner: mod.soloOwner || false,
    soloAdmin: mod.soloAdmin || false,
    oculto: mod.oculto || false,
  }

  comandos[nombre] = entrada
  for (const a of entrada.alias) comandos[a] = entrada
  listaComandos.push(entrada)

  if (avisar) {
    info(chalk.magenta(`♻️  Comando recargado: ${nombre}`))
  }
}

async function cargarComandos() {
  const archivos = listarArchivosComandos(commandsDir)

  for (const rutaCompleta of archivos) {
    try {
      await cargarComandoIndividual(rutaCompleta)
    } catch (err) {
      logError(`Error cargando el comando "${rutaCompleta}":`, err)
    }
  }

  mostrarResumenComandos(listaComandos)
}

function activarHotReload() {
  fs.watch(commandsDir, { recursive: true }, (evento, nombreArchivo) => {
    if (!nombreArchivo || !nombreArchivo.endsWith('.js')) return

    const rutaCompleta = path.join(commandsDir, nombreArchivo)

    if (!fs.existsSync(rutaCompleta)) {
      const nombre = path.basename(nombreArchivo, '.js')
      quitarComando(nombre)
      warn(chalk.yellow(`🗑️  Comando eliminado: ${nombre}`))
      return
    }

    setTimeout(() => {
      cargarComandoIndividual(rutaCompleta, true).catch((err) => {
        logError(`Error recargando "${nombreArchivo}":`, err)
      })
    }, 150)
  })

  info(chalk.blue('👀 Vigilando /commands para hot-reload...'))
}

await cargarComandos()
activarHotReload()

async function notificarErrorAlOwner(sock, err, comando) {
  try {
    const ownerJid = `${config.owner[0]}@s.whatsapp.net`
    await sock.sendMessage(ownerJid, {
      text: `⚠️ Error ejecutando *${config.prefijo}${comando}*:\n\n${err?.stack || err?.message || err}`,
    })
  } catch {}
}

export default async function handler(sock, m) {
  const msg = m.messages?.[0]
  if (!msg?.message || msg.key.fromMe) return

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const chatId = msg.key.remoteJid

  let db
  try {
    db = await getDB()
    const jidNormalizado = normalizarJid(jidRemitente)
    db.data.users[jidNormalizado] ??= { mensajes: 0, idioma: config.idiomaPorDefecto }
    db.data.users[jidNormalizado].mensajes++
    await db.write()
  } catch (err) {
    logError('Error guardando en la base de datos:', err)
  }

  const idioma = obtenerIdiomaUsuario(db, jidRemitente, config)

  const texto =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    ''

  const tipoMensaje = Object.keys(msg.message)[0]
  const esGrupo = chatId.endsWith('@g.us')
  const tag = esGrupo ? chalk.magenta('👥 GRUPO') : chalk.blue('👤 PRIV')
  const user = chalk.gray(jidRemitente.split('@')[0])
  console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`), tag, '|', user, '|', chalk.white(texto || `[${tipoMensaje}]`))

  if (!texto) return

  if (esGrupo) {
    const contieneLink = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(texto)

    if (contieneLink) {
      const configChat = obtenerConfigChat(db, chatId)

      if (configChat.antilink) {
        const numeroReal = await resolverNumeroReal(sock, jidRemitente, msg)
        const esDuenoMsj = esOwner(numeroReal, config.owner)
        const esAdminMsj = esDuenoMsj ? true : await esAdminGrupo(sock, chatId, jidRemitente)

        if (!esDuenoMsj && !esAdminMsj) {
          try {
            await sock.sendMessage(chatId, { delete: msg.key })
          } catch {}

          await sock.sendMessage(chatId, {
            text: `🔗 @${jidRemitente.split('@')[0]} no se permiten links de invitación en este grupo.`,
            mentions: [jidRemitente],
          })

          return
        }
      }
    }
  }

  let cuerpo = texto
  if (config.prefijo && texto.startsWith(config.prefijo)) {
    cuerpo = texto.slice(config.prefijo.length)
  }

  const [comandoRaw, ...args] = cuerpo.trim().split(/\s+/)
  const comando = comandoRaw?.toLowerCase()

  const entrada = comando && comandos[comando]
  if (!entrada) return

  const numeroRealRemitente = await resolverNumeroReal(sock, jidRemitente, msg)
  const esDueno = esOwner(numeroRealRemitente, config.owner)

  if (entrada.soloOwner && !esDueno) {
    return sock.sendMessage(chatId, { text: t(idioma, 'soloOwner') })
  }

  if (entrada.soloAdmin && !esDueno) {
    const esAdmin = await esAdminGrupo(sock, chatId, jidRemitente)
    if (!esAdmin) {
      return sock.sendMessage(chatId, { text: t(idioma, 'soloAdmin') })
    }
  }

  if (entrada.cooldown > 0 && !esDueno) {
    const clave = `${entrada.nombre}:${jidRemitente}`
    const ahora = Date.now()
    const vencimiento = cooldowns.get(clave)

    if (vencimiento && ahora < vencimiento) {
      const restante = Math.ceil((vencimiento - ahora) / 1000)
      return sock.sendMessage(chatId, {
        text: t(idioma, 'cooldown', { restante, prefijo: config.prefijo, comando: entrada.nombre }),
      })
    }
    cooldowns.set(clave, ahora + entrada.cooldown * 1000)
  }

  let ejecutar = entrada.run
  let argsFinal = args

  if (entrada.subcomandos && args[0]) {
    const nombreSub = args[0].toLowerCase()
    if (entrada.subcomandos[nombreSub]) {
      ejecutar = entrada.subcomandos[nombreSub]
      argsFinal = args.slice(1)
    }
  }

  try {
    db.data.stats ??= { comandosEjecutados: 0 }
    db.data.stats.comandosEjecutados++
    await db.write()

    const cmdTag = chalk.green.bold('⚡ CMD')
    const cmdName = chalk.yellow.bold(`${config.prefijo}${entrada.nombre}`)
    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`), cmdTag, '|', cmdName, '|', chalk.gray(jidRemitente.split('@')[0]))

    await ejecutar({
      sock,
      msg,
      args: argsFinal,
      chatId,
      esDueno,
      comandos: listaComandos,
      config,
      db,
      idioma,
      t: (clave, vars) => t(idioma, clave, vars),
    })
  } catch (err) {
    logError(`Error en el comando "${entrada.nombre}":`, err)
    await notificarErrorAlOwner(sock, err, entrada.nombre)
  }
}