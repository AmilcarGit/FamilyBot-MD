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
import { mostrarBannerInicio, mostrarConexionExitosa } from './lib/banner.js'
import { iniciarBackupsAutomaticos } from './lib/backup.js'
import { iniciarPanel, establecerSockActivo } from './lib/panel.js'
import { iniciarAutoUpdate } from './lib/autoupdate.js'

const logger = pino({ level: 'silent' })
let intentosReconexion = 0
let codigoSolicitado = false
let numeroTemporal = null

const ARCHIVO_LOCK = path.join(process.cwd(), 'bot.lock')

function verificarInstanciaUnica() {
  if (fs.existsSync(ARCHIVO_LOCK)) {
    try {
      const pid = parseInt(fs.readFileSync(ARCHIVO_LOCK, 'utf-8'), 10)
      if (pid && pid !== process.pid) {
        try { process.kill(pid, 0); process.exit(1) } catch (e) {}
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
      fs.rmSync(config.sessionFolder, { recursive: true, force: true })
    }
  } catch (e) {}
  liberarInstancia()
  process.exit(1)
}

async function preguntarNumero() {
  if (process.env.PM2_HOME) return null
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log(chalk.cyan('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'))
  console.log(chalk.cyan('┃') + chalk.yellow('  🌐 CONFIGURACIÓN DE VINCULACIÓN NEURAL  ') + chalk.cyan('┃'))
  console.log(chalk.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛'))
  
  return new Promise((resolve) => {
    rl.question(chalk.green('➤ Ingresa el número del bot (ej: 51910227479): '), (respuesta) => {
      rl.close()
      resolve(respuesta ? respuesta.replace(/\D/g, '') : null)
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
    const v = await fetchLatestBaileysVersion()
    version = v.version
  } catch (e) {
    version = [2, 3000, 1015901307]
  }

  let numero = config.numeroBot || numeroTemporal
  if (!state.creds.registered && !numero) {
    numero = await preguntarNumero()
    numeroTemporal = numero
  }

  if (numero) {
    if (numero.startsWith('54') && !numero.startsWith('549')) numero = '549' + numero.slice(2)
  }

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: !numero,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage)
      if (requiresPatch) {
        message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, ...message } } }
      }
      return message
    },
  })

  establecerSockActivo(sock)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting' && !sock.authState.creds.registered && !codigoSolicitado && numero) {
      codigoSolicitado = true
      await delay(5000)
      try {
        const codigo = await sock.requestPairingCode(numero)
        console.log(chalk.black(chalk.bgCyan(`\n TU CÓDIGO DE VINCULACIÓN ES: ${codigo} \n`)))
      } catch (err) {
        codigoSolicitado = false
      }
    }

    if (connection === 'open') {
      intentosReconexion = 0
      mostrarConexionExitosa(config.nombreBot)
      iniciarAutoUpdate(sock)
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        nuclearReset()
      } else {
        intentosReconexion++
        setTimeout(iniciar, backoffDelay(intentosReconexion, config.maxReconnectDelay))
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', async (m) => {
    try { await handler(sock, m) } catch (err) { if (err.message.includes('Bad MAC')) nuclearReset() }
  })

  return sock
}

mostrarBannerInicio(config.nombreBot, '1.0.0')
iniciarBackupsAutomaticos(6)
iniciarPanel()
iniciar()
