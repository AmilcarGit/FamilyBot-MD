import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import config from './config.js'
import { esOwner, normalizarJid } from './lib/utils.js'
import { esAdminGrupo } from './lib/groupPermissions.js'
import { getDB } from './lib/db.js'
import { info, error as logError } from './lib/logger.js'

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

async function cargarComandos() {
  const archivos = listarArchivosComandos(commandsDir)

  for (const rutaCompleta of archivos) {
    const nombre = path.basename(rutaCompleta, '.js')
    const relPath = path.relative(commandsDir, rutaCompleta).split(path.sep).join('/')
    const dirRelativo = path.dirname(relPath)
    const categoria = dirRelativo === '.' ? 'general' : dirRelativo

    const mod = await import(`./commands/${relPath}`)

    const entrada = {
      nombre,
      categoria,
      run: mod.default,
      desc: mod.desc || 'Sin descripción',
      alias: mod.alias || [],
      cooldown: mod.cooldown ?? 3,
      soloOwner: mod.soloOwner || false,
      soloAdmin: mod.soloAdmin || false,
    }

    comandos[nombre] = entrada
    for (const a of entrada.alias) comandos[a] = entrada
    listaComandos.push(entrada)
  }

  info(chalk.green(`✔ ${listaComandos.length} comandos cargados desde /commands`))
}

await cargarComandos()

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

  try {
    const db = await getDB()
    const jidNormalizado = normalizarJid(jidRemitente)
    db.data.users[jidNormalizado] ??= { mensajes: 0 }
    db.data.users[jidNormalizado].mensajes++
    await db.write()
  } catch (err) {
    logError('Error guardando en la base de datos:', err)
  }

  const texto =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    ''

  const tipoMensaje = Object.keys(msg.message)[0]
  const esGrupo = chatId.endsWith('@g.us')
  info(
    chalk.cyan(esGrupo ? '👥 Grupo' : '👤 Privado'),
    chalk.gray(`${jidRemitente.split('@')[0]}:`),
    texto || chalk.dim(`[${tipoMensaje}]`)
  )

  if (!texto) return

  let cuerpo = texto
  if (config.prefijo && texto.startsWith(config.prefijo)) {
    cuerpo = texto.slice(config.prefijo.length)
  }

  const [comandoRaw, ...args] = cuerpo.trim().split(/\s+/)
  const comando = comandoRaw?.toLowerCase()

  const entrada = comando && comandos[comando]
  if (!entrada) return

  const esDueno = esOwner(jidRemitente, config.owner)

  if (entrada.soloOwner && !esDueno) {
    return sock.sendMessage(chatId, {
      text: '⛔ Este comando es solo para el owner del bot.',
    })
  }

  if (entrada.soloAdmin && !esDueno) {
    const esAdmin = await esAdminGrupo(sock, chatId, jidRemitente)
    if (!esAdmin) {
      return sock.sendMessage(chatId, {
        text: '⛔ Este comando es solo para administradores del grupo.',
      })
    }
  }

  if (entrada.cooldown > 0 && !esDueno) {
    const clave = `${entrada.nombre}:${jidRemitente}`
    const ahora = Date.now()
    const vencimiento = cooldowns.get(clave)

    if (vencimiento && ahora < vencimiento) {
      const restante = Math.ceil((vencimiento - ahora) / 1000)
      return sock.sendMessage(chatId, {
        text: `⏳ Espera ${restante}s antes de volver a usar *${config.prefijo}${entrada.nombre}*.`,
      })
    }
    cooldowns.set(clave, ahora + entrada.cooldown * 1000)
  }

  try {
    const db = await getDB()

    db.data.stats ??= { comandosEjecutados: 0 }
    db.data.stats.comandosEjecutados++
    await db.write()

    info(
      chalk.green('⚡ Comando:'),
      `${config.prefijo}${entrada.nombre}`,
      chalk.gray(`(${jidRemitente.split('@')[0]})`)
    )

    await entrada.run({
      sock,
      msg,
      args,
      chatId,
      esDueno,
      comandos: listaComandos,
      config,
      db,
    })
  } catch (err) {
    logError(`Error en el comando "${entrada.nombre}":`, err)
    await notificarErrorAlOwner(sock, err, entrada.nombre)
  }
}
