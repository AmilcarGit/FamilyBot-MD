import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import config from './config.js'
import handler from './handler.js'
import { delay, backoffDelay } from './lib/utils.js'
import { info, warn, error as logError } from './lib/logger.js'
import { mostrarBannerInicio, mostrarConexionExitosa } from './lib/banner.js'
import { getDB } from './lib/db.js'
import { obtenerConfigChat } from './lib/groupSettings.js'
import { reconectarSubbotsGuardados } from './subbots/manager.js'
import { iniciarBackupsAutomaticos } from './lib/backup.js'
import { iniciarPanel, establecerSockActivo } from './lib/panel.js'

const logger = pino({ level: 'silent' })
let intentosReconexion = 0
let codigoSolicitado = false
let subbotsCargados = false
let numeroIngresado = null

const ARCHIVO_LOCK = path.join(process.cwd(), 'bot.lock')

function procesoActivo(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function verificarInstanciaUnica() {
  if (fs.existsSync(ARCHIVO_LOCK)) {
    const pidAnterior = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)

    if (pidAnterior && procesoActivo(pidAnterior)) {
      logError(
        chalk.red(
          `❌ Ya hay una instancia del bot corriendo (PID ${pidAnterior}). No inicio una segunda para no romper la sesión de WhatsApp.\n` +
            `Si estás seguro de que no hay ninguna corriendo, borra el archivo bot.lock manualmente.`
        )
      )
      process.exit(1)
    }
  }

  fs.writeFileSync(ARCHIVO_LOCK, String(process.pid))
}

function liberarInstancia() {
  try {
    const pidGuardado = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)
    if (pidGuardado === process.pid) {
      fs.unlinkSync(ARCHIVO_LOCK)
    }
  } catch {}
}

verificarInstanciaUnica()
process.on('exit', liberarInstancia)
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

process.on('uncaughtException', (err) => {
  logError('⚠️ Excepción no capturada (el bot sigue corriendo):', err)
})

process.on('unhandledRejection', (reason) => {
  logError('⚠️ Promesa rechazada sin capturar (el bot sigue corriendo):', reason)
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
const preguntar = (texto) =>
  new Promise((resolve) => rl.question(texto, resolve))

const cacheGrupos = new Map()
const RUTA_CACHE_VERSION = path.join(process.cwd(), '.baileys-version.json')

async function obtenerVersionConCache() {
  try {
    const { version } = await fetchLatestBaileysVersion()
    fs.writeFileSync(RUTA_CACHE_VERSION, JSON.stringify({ version, fecha: Date.now() }))
    return version
  } catch (err) {
    if (fs.existsSync(RUTA_CACHE_VERSION)) {
      warn(chalk.yellow('No se pudo consultar la última versión de Baileys, usando la versión en caché local.'))
      const cache = JSON.parse(fs.readFileSync(RUTA_CACHE_VERSION, 'utf-8'))
      return cache.version
    }
    throw err
  }
}

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(
    config.sessionFolder
  )
  const version = await obtenerVersionConCache()

  let numero = config.numeroBot || numeroIngresado
  if (!state.creds.registered && !numero) {
    numero = await preguntar(
      chalk.green(
        'Ingresa el número de WhatsApp del bot (con código de país, sin +): '
      )
    )
    numeroIngresado = numero
  }
  if (numero) numero = numero.replace(/\D/g, '')

  let sock

  async function obtenerMetadataConCache(jid) {
    const entrada = cacheGrupos.get(jid)
    const ahora = Date.now()

    if (entrada && ahora - entrada.timestamp < config.groupCacheTTL) {
      return entrada.data
    }

    const data = await sock.groupMetadata(jid)
    cacheGrupos.set(jid, { data, timestamp: ahora })
    return data
  }

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    cachedGroupMetadata: obtenerMetadataConCache,
  })

  sock.contacts = {}

  sock.ev.on('contacts.upsert', (contactos) => {
    for (const contacto of contactos) {
      sock.contacts[contacto.id] = contacto
    }
  })

  sock.ev.on('contacts.update', (actualizaciones) => {
    for (const act of actualizaciones) {
      if (sock.contacts[act.id]) {
        Object.assign(sock.contacts[act.id], act)
      } else {
        sock.contacts[act.id] = act
      }
    }
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (
      connection === 'connecting' &&
      !sock.authState.creds.registered &&
      !codigoSolicitado &&
      numero
    ) {
      codigoSolicitado = true
      await delay(1500)

      try {
        const codigo = await sock.requestPairingCode(numero)
        info(
          chalk.yellow('\n============================='),
          chalk.cyan(`\nTu código de vinculación es: ${codigo}`),
          chalk.yellow('\n=============================\n'),
          '\nAbre WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa el código.'
        )
      } catch (err) {
        logError(chalk.red('Error al solicitar el código de vinculación:'), err)
        codigoSolicitado = false
      }
    }

    if (connection === 'open') {
      intentosReconexion = 0
      codigoSolicitado = false
      mostrarConexionExitosa(config.nombreBot)
      establecerSockActivo(sock)

      if (!subbotsCargados) {
        subbotsCargados = true
        reconectarSubbotsGuardados(sock).catch((err) => {
          logError('Error reconectando subbots guardados:', err)
        })
      }
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      if (isLoggedOut) {
        logError(
          chalk.red(
            'Sesión cerrada desde el teléfono. Elimina la carpeta de sesión y vuelve a vincular.'
          )
        )
        return
      }

      if (intentosReconexion < config.maxReconnectAttempts) {
        const espera = backoffDelay(intentosReconexion, config.maxReconnectDelay)
        intentosReconexion++
        warn(
          chalk.yellow(
            `Conexión cerrada (${statusCode}). Reintentando en ${Math.round(
              espera / 1000
            )}s (intento ${intentosReconexion}/${config.maxReconnectAttempts})...`
          )
        )
        await delay(espera)
        iniciar()
      } else {
        logError(
          chalk.red('Se alcanzó el máximo de reintentos de reconexión. Deteniendo el bot.')
        )
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handler(sock, m)
    } catch (err) {
      if (err?.output?.statusCode === 429 || err?.status === 429) {
        warn(
          chalk.yellow(
            `Rate limit detectado. Pausando ${config.rateLimitPause / 1000}s...`
          )
        )
        await delay(config.rateLimitPause)
      } else {
        logError('Error procesando mensaje:', err)
      }
    }
  })

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id: chatId, participants, action } = update

      cacheGrupos.delete(chatId)

      const db = await getDB()
      const configChat = obtenerConfigChat(db, chatId)
      if (!configChat.bienvenida) return

      const metadata = await sock.groupMetadata(chatId)
      const nombreGrupo = metadata.subject

      for (const jid of participants) {
        const plantilla =
          action === 'add'
            ? config.bienvenida.mensajeEntrada
            : action === 'remove'
              ? config.bienvenida.mensajeSalida
              : null

        if (!plantilla) continue

        const texto = plantilla
          .replace('{mention}', `@${jid.split('@')[0]}`)
          .replace('{grupo}', nombreGrupo)

        await sock.sendMessage(chatId, { text: texto, mentions: [jid] })
      }
    } catch (err) {
      logError('Error en bienvenida/despedida:', err)
    }
  })

  return sock
}

mostrarBannerInicio(config.nombreBot, process.env.npm_package_version || "1.0.0")
iniciarBackupsAutomaticos(6)
iniciarPanel()
iniciar()