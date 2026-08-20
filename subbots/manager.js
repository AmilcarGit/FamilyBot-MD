import path from 'path'
import fs from 'fs'
import { 
  makeWASocket,
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason, 
  makeCacheableSignalKeyStore 
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import { getDB } from '../lib/db.js'
import { delay, backoffDelay } from '../lib/utils.js'
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
  
  let version
  try {
    const v = await fetchLatestBaileysVersion()
    version = v.version
  } catch (e) {
    version = [2, 3000, 1015901307]
  }

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Ubuntu', 'Chrome', '110.0.5481.178'],
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage)
      if (requiresPatch) {
        message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, ...message } } }
      }
      return message
    },
  })

  sock.isSubbot = true
  const entrada = { numero, sock, conectado: false, creadorJid, intentos: 0 }
  subbotsActivos.set(numero, entrada)

  let codigoSolicitado = esReconexion

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting' && !sock.authState.creds.registered && !codigoSolicitado) {
      codigoSolicitado = true
      await delay(5000)

      try {
        const codigo = await sock.requestPairingCode(numero)

        if (sockPrincipal && chatOrigen) {
          await sockPrincipal.sendMessage(chatOrigen, {
            text: `🔗 *Vinculación de Subbot*\n\n📱 Número: ${numero}\n🔑 El código se enviará a continuación para que puedas copiarlo fácilmente.`,
          })
          await delay(1000)
          await sockPrincipal.sendMessage(chatOrigen, { text: codigo })
          await delay(1000)
          await sockPrincipal.sendMessage(chatOrigen, {
            text: '👆 *Toca el código de arriba para copiarlo.*\n\nLuego abre WhatsApp > Dispositivos vinculados > Vincular con número de teléfono e ingrésalo.',
          })
        }
      } catch (err) {
        codigoSolicitado = false
        subbotsActivos.delete(numero)

        if (sockPrincipal && chatOrigen) {
          await sockPrincipal.sendMessage(chatOrigen, {
            text: '❌ No pude generar el código de vinculación. Asegúrate de que el número sea correcto e intenta de nuevo.',
          })
        }
      }
    }

    if (connection === 'open') {
      entrada.conectado = true
      entrada.intentos = 0
      await guardarMetadata(numero, creadorJid)

      if (sockPrincipal && chatOrigen) {
        await sockPrincipal.sendMessage(chatOrigen, {
          text: `✅ Subbot *${numero}* conectado correctamente 💕`,
        })
      }
    }

    if (connection === 'close') {
      entrada.conectado = false
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const errorMsg = lastDisconnect?.error?.message || ''

      if (statusCode === DisconnectReason.loggedOut || errorMsg.includes('Bad MAC')) {
        subbotsActivos.delete(numero)
        await eliminarMetadata(numero)
        fs.rmSync(carpeta, { recursive: true, force: true })
        return
      }

      if (entrada.intentos < 5) {
        entrada.intentos++
        subbotsActivos.delete(numero)
        setTimeout(() => {
          iniciarSubbot({ numero, creadorJid, sockPrincipal, chatOrigen: null, esReconexion: true })
        }, backoffDelay(entrada.intentos, 60000))
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  const { default: handler } = await import('../handler.js')

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handler(sock, m)
    } catch (err) {
      if (err.message.includes('Bad MAC')) {
        subbotsActivos.delete(numero)
        await eliminarMetadata(numero)
        fs.rmSync(carpeta, { recursive: true, force: true })
      }
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
    await iniciarSubbot({ numero, creadorJid, sockPrincipal, chatOrigen: null, esReconexion: true })
    await delay(3000)
  }
}
