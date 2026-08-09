import path from 'path'
import fs from 'fs'
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import handler from '../handler.js'
import { getDB } from '../lib/db.js'
import { delay } from '../lib/utils.js'
import { info, warn, error as logError } from '../lib/logger.js'

const logger = pino({ level: 'silent' })
const CARPETA_BASE = './subbots/sesiones'

const subbotsActivos = new Map()

function carpetaSesion(numero) {
  return path.join(CARPETA_BASE, numero)
}

async function guardarMetadata(numero, creadorJid) {
  const db = await getDB()
  db.data.subbots ??= []

  const existente = db.data.subbots.find((s) => s.numero === numero)
  if (existente) {
    existente.creadorJid = creadorJid
  } else {
    db.data.subbots.push({ numero, creadorJid, fecha: Date.now() })
  }

  await db.write()
}

async function eliminarMetadata(numero) {
  const db = await getDB()
  db.data.subbots ??= []
  db.data.subbots = db.data.subbots.filter((s) => s.numero !== numero)
  await db.write()
}

export function listarSubbots() {
  return [...subbotsActivos.entries()].map(([numero, datos]) => ({
    numero,
    conectado: datos.conectado,
    creadorJid: datos.creadorJid,
  }))
}

export function contarSubbotsDe(creadorJid) {
  return [...subbotsActivos.values()].filter((d) => d.creadorJid === creadorJid).length
}

export async function iniciarSubbot({ numero, creadorJid, chatOrigen, sockPrincipal, esReconexion = false }) {
  if (subbotsActivos.has(numero)) {
    return { ok: false, mensaje: '⚠️ Ese número ya tiene un subbot activo.' }
  }

  const carpeta = carpetaSesion(numero)
  fs.mkdirSync(carpeta, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(carpeta)
  const { version } = await fetchLatestBaileysVersion()

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

  const entrada = { numero, sock, conectado: false, creadorJid }
  subbotsActivos.set(numero, entrada)

  let codigoSolicitado = esReconexion

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting' && !sock.authState.creds.registered && !codigoSolicitado) {
      codigoSolicitado = true
      await delay(1500)

      try {
        const codigo = await sock.requestPairingCode(numero)

        if (sockPrincipal && chatOrigen) {
          await sockPrincipal.sendMessage(chatOrigen, {
            text:
              `🔗 *Código de vinculación del subbot*\n\n` +
              `📱 Número: ${numero}\n` +
              `🔑 Código: *${codigo}*\n\n` +
              `Abre WhatsApp en ese número > Dispositivos vinculados > Vincular con número de teléfono, e ingresa el código. Expira en unos minutos.`,
          })
        }
      } catch (err) {
        logError('Error solicitando código de vinculación del subbot:', err)
        subbotsActivos.delete(numero)

        if (sockPrincipal && chatOrigen) {
          await sockPrincipal.sendMessage(chatOrigen, {
            text: '❌ No pude generar el código de vinculación. Intenta de nuevo.',
          })
        }
      }
    }

    if (connection === 'open') {
      entrada.conectado = true
      await guardarMetadata(numero, creadorJid)

      if (sockPrincipal && chatOrigen) {
        await sockPrincipal.sendMessage(chatOrigen, {
          text: `✅ Subbot *${numero}* conectado correctamente 💕\nYa tiene todos los comandos del bot principal.`,
        })
      }

      info(chalk.green(`🤖 Subbot conectado: ${numero}`))
    }

    if (connection === 'close') {
      entrada.conectado = false
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      if (isLoggedOut) {
        subbotsActivos.delete(numero)
        await eliminarMetadata(numero)
        fs.rmSync(carpeta, { recursive: true, force: true })
        warn(chalk.yellow(`🗑️ Subbot desvinculado: ${numero}`))
        return
      }

      warn(chalk.yellow(`Subbot ${numero} desconectado, reintentando en 5s...`))
      subbotsActivos.delete(numero)
      await delay(5000)
      iniciarSubbot({ numero, creadorJid, sockPrincipal, chatOrigen: null, esReconexion: true })
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handler(sock, m)
    } catch (err) {
      logError(`Error procesando mensaje en subbot ${numero}:`, err)
    }
  })

  return { ok: true, mensaje: '⏳ Generando código de vinculación...' }
}

export async function detenerSubbot(numero) {
  const entrada = subbotsActivos.get(numero)
  if (!entrada) return false

  try {
    await entrada.sock.logout()
  } catch {}

  subbotsActivos.delete(numero)
  await eliminarMetadata(numero)
  fs.rmSync(carpetaSesion(numero), { recursive: true, force: true })

  return true
}

export async function reconectarSubbotsGuardados(sockPrincipal) {
  const db = await getDB()
  db.data.subbots ??= []

  for (const { numero, creadorJid } of db.data.subbots) {
    const carpeta = carpetaSesion(numero)
    if (!fs.existsSync(path.join(carpeta, 'creds.json'))) continue

    info(chalk.blue(`♻️  Reconectando subbot: ${numero}`))
    await iniciarSubbot({ numero, creadorJid, sockPrincipal, chatOrigen: null, esReconexion: true })
    await delay(2000)
  }
}