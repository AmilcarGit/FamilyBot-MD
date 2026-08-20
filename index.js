import * as baileysNS from '@whiskeysockets/baileys'
const { 
  useMultiFileAuthState, 
  DisconnectReason, 
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = baileysNS.default || baileysNS
const makeWASocket = baileysNS.makeWASocket || baileysNS.default?.makeWASocket || baileysNS.default || baileysNS
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

async function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close()
      resolve(respuesta)
    })
  })
}

async function iniciar() {
  console.log(chalk.yellow('📂 Cargando sesión neural...'))
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder)
  
  let { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(chalk.blue(`📡 Usando WA v${version.join('.')}, ¿Es la última?: ${isLatest}`))

  let numero = config.numeroBot || numeroIngresado
  if (!state.creds.registered && !numero) {
    console.log(chalk.cyan('❓ Esperando número de teléfono...'))
    numero = await preguntar(chalk.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ ') + chalk.white('Ingresa el número del bot (ej: 51xxx):') + chalk.cyan(' ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n> '))
    numeroIngresado = numero
  }

  if (numero) {
    numero = numero.replace(/\D/g, '')
    if (numero.startsWith('54') && !numero.startsWith('549')) numero = '549' + numero.slice(2)
  }

  console.log(chalk.yellow('🚀 Iniciando conexión neural...'))
  
  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Mac OS', 'Chrome', '10.15.7'],
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async (key) => {
      return { conversation: 'TheYui-MD' }
    }
  })

  establecerSockActivo(sock)

  if (!sock.authState.creds.registered && numero) {
    setTimeout(async () => {
      if (codigoSolicitado) return
      codigoSolicitado = true
      console.log(chalk.yellow('⏳ Solicitando código para: ' + numero + '...'))
      try {
        await delay(3000)
        const codigo = await sock.requestPairingCode(numero)
        console.log('\n' + chalk.cyan('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'))
        console.log(chalk.cyan('┃') + chalk.bgCyan(chalk.black(`  CÓDIGO DE VINCULACIÓN: ${codigo}  `)) + chalk.cyan('┃'))
        console.log(chalk.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛') + '\n')
      } catch (err) {
        console.log(chalk.red('❌ Error al generar código:'), err.message)
        codigoSolicitado = false
      }
    }, 8000)
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      intentosReconexion = 0
      mostrarConexionExitosa(config.nombreBot)
      iniciarAutoUpdate(sock)
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(chalk.red(`🔌 Conexión cerrada. Razón: ${statusCode}`))
      
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
    try {
      await handler(sock, m)
    } catch (err) {}
  })

  return sock
}

mostrarBannerInicio(config.nombreBot, '1.0.0')
iniciarBackupsAutomaticos(6)
iniciarPanel()
iniciar()