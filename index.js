import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
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
import { iniciarBackupsAutomaticos } from './lib/backup.js'
import { iniciarPanel, establecerSockActivo } from './lib/panel.js'

const logger = pino({ level: 'silent' })
let intentosReconexion = 0
let codigoSolicitado = false
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
      logError(chalk.red(`❌ Ya hay una instancia activa (PID ${pidAnterior}).`))
      process.exit(1)
    }
  }
  fs.writeFileSync(ARCHIVO_LOCK, String(process.pid))
}

function liberarInstancia() {
  try {
    const pidGuardado = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)
    if (pidGuardado === process.pid) fs.unlinkSync(ARCHIVO_LOCK)
  } catch {}
}

verificarInstanciaUnica()
process.on('exit', liberarInstancia)
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const preguntar = (texto) => new Promise((resolve) => rl.question(texto, resolve))

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder)
  const { version } = await fetchLatestBaileysVersion()

  let numero = config.numeroBot || numeroIngresado
  if (!state.creds.registered && !numero) {
    numero = await preguntar(chalk.green('Ingresa el número del bot (con código de país): '))
    numeroIngresado = numero
  }

  if (numero) {
    numero = numero.replace(/\D/g, '')
    if (numero.startsWith('54') && !numero.startsWith('549')) {
      numero = '549' + numero.slice(2)
    }
  }

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  })

  establecerSockActivo(sock)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting' && !sock.authState.creds.registered && !codigoSolicitado && numero) {
      codigoSolicitado = true
      await delay(3000)
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log('\n' + '='.repeat(40))
        console.log(chalk.black(chalk.bgCyan(`  TU CÓDIGO DE VINCULACIÓN ES: ${codigo}  `)))
        console.log('='.repeat(40) + '\n')
      } catch (err) {
        codigoSolicitado = false
      }
    }

    if (connection === 'open') {
      intentosReconexion = 0
      mostrarConexionExitosa(config.nombreBot)
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        logError(chalk.red('Sesión cerrada. Borra la carpeta session y reinicia.'))
        return
      }
      if (intentosReconexion < config.maxReconnectAttempts) {
        intentosReconexion++
        setTimeout(iniciar, backoffDelay(intentosReconexion, config.maxReconnectDelay))
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', async (m) => {
    try { await handler(sock, m) } catch (err) { console.error(err) }
  })

  return sock
}

mostrarBannerInicio(config.nombreBot, '1.0.0')
iniciarBackupsAutomaticos(6)
iniciarPanel()
iniciar()
