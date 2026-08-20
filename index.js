import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } from '@itsukichan/baileys'
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
import { iniciarAutoUpdate } from './lib/autoupdate.js'

const logger = pino({ level: 'silent' })
let intentosReconexion = 0
let cierresLoggedOutSeguidos = 0
let codigoSolicitado = false
let numeroIngresado = null

const ARCHIVO_LOCK = path.join(process.cwd(), 'bot.lock')

function verificarInstanciaUnica() {
  if (fs.existsSync(ARCHIVO_LOCK)) {
    try {
      const pid = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)
      if (pid && pid !== process.pid) {
        try { 
          process.kill(pid, 0)
          process.exit(1) 
        } catch (e) {}
      }
    } catch (e) {}
  }
  fs.writeFileSync(ARCHIVO_LOCK, String(process.pid))
}

function liberarInstancia() {
  try {
    if (fs.existsSync(ARCHIVO_LOCK)) {
      const pid = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)
      if (pid === process.pid) fs.unlinkSync(ARCHIVO_LOCK)
    }
  } catch {}
}

verificarInstanciaUnica()

function nuclearReset() {
  try {
    if (fs.existsSync(config.sessionFolder)) {
      fs.rmSync(config.sessionFolder, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    }
  } catch (e) {}
  liberarInstancia()
  process.exit(1)
}

let contadorBadMac = 0
let temporizadorBadMac = null
let reseteando = false

function vigilarBadMac(texto) {
  if (reseteando || !texto || !texto.includes('Bad MAC')) return
  contadorBadMac++
  if (!temporizadorBadMac) {
    temporizadorBadMac = setTimeout(() => {
      contadorBadMac = 0
      temporizadorBadMac = null
    }, 15000)
  }
  if (contadorBadMac >= 5) {
    reseteando = true
    nuclearReset()
  }
}

const consoleLogOriginal = console.log
const consoleErrorOriginal = console.error

console.log = (...args) => {
  vigilarBadMac(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
  consoleLogOriginal(...args)
}

console.error = (...args) => {
  vigilarBadMac(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
  consoleErrorOriginal(...args)
}

process.on('uncaughtException', (err) => {
  if (err.message.includes('EADDRINUSE')) process.exit(1)
  if (err.message.includes('Bad MAC')) return nuclearReset()
  if (err.code === 'ERR_USE_AFTER_CLOSE') return
})

process.on('unhandledRejection', (reason) => {
  if (reason?.message?.includes('Bad MAC')) return nuclearReset()
})

async function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close()
      resolve(respuesta)
    })
    setTimeout(() => {
      try { rl.close() } catch (e) {}
      resolve(null)
    }, 60000)
  })
}

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder)
  
  let version
  try {
    const v = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ])
    version = v.version
  } catch (e) {
    version = [2, 3000, 1015901307]
  }

  let numero = config.numeroBot || numeroIngresado
  if (!state.creds.registered && !numero) {
    try {
      numero = await preguntar(chalk.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ ') + chalk.white('Ingresa el número del bot (ej: 51xxx):') + chalk.cyan(' ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n> '))
      numeroIngresado = numero
    } catch (e) {
      numero = null
    }
  }

  if (numero) {
    numero = numero.replace(/\D/g, '')
    if (numero.startsWith('54') && !numero.startsWith('549')) numero = '549' + numero.slice(2)
  }

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['TheYui-MD', 'Chrome', '20.0.04'],
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      return { conversation: 'TheYui-MD' }
    }
  })

  establecerSockActivo(sock)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (!sock.authState.creds.registered && !codigoSolicitado && numero && (connection === 'connecting' || update.qr)) {
      codigoSolicitado = true
      await delay(4000)
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log('\n' + chalk.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'))
        console.log(chalk.cyan('┃') + chalk.bgCyan(chalk.black(`  CÓDIGO DE VINCULACIÓN: ${codigo}  `)) + chalk.cyan('┃'))
        console.log(chalk.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛') + '\n')
      } catch (err) {
        codigoSolicitado = false
      }
    }

    if (connection === 'open') {
      intentosReconexion = 0
      cierresLoggedOutSeguidos = 0
      mostrarConexionExitosa(config.nombreBot)
      iniciarAutoUpdate(sock)
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const errorMsg = lastDisconnect?.error?.message || ''

      if (errorMsg.includes('Bad MAC')) {
        nuclearReset()
      }

      if (statusCode === DisconnectReason.loggedOut) {
        cierresLoggedOutSeguidos++
        if (cierresLoggedOutSeguidos >= 2) {
          nuclearReset()
        }
      }

      intentosReconexion++
      setTimeout(iniciar, backoffDelay(intentosReconexion, config.maxReconnectDelay))
    }
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handler(sock, m)
    } catch (err) {
      if (err.message.includes('Bad MAC')) {
        nuclearReset()
      }
    }
  })

  return sock
}

mostrarBannerInicio(config.nombreBot, '1.0.0')
iniciarBackupsAutomaticos(6)
iniciarPanel()
iniciar()
