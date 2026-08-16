import { obtenerJidMencionado, normalizarJid, resolverNumeroReal } from '../../lib/utils.js'
import { obtenerConfigChat } from '../../lib/groupSettings.js'
import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Sistema de advertencias. Subcomandos: dar, quitar, ver'
export const alias = ['advertir', 'warn']
export const cooldown = 3
export const soloAdmin = true

const MAX_ADVERTENCIAS = 3

async function dar({ sock, msg, args, chatId, db }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, { text: '❀ Menciona, responde o escribe el número de quien quieres advertir.' })
  }

  const configChat = obtenerConfigChat(db, chatId)
  const jidNormalizado = normalizarJid(jid)
  configChat.advertencias[jidNormalizado] = (configChat.advertencias[jidNormalizado] || 0) + 1
  await db.write()

  const cantidad = configChat.advertencias[jidNormalizado]

  if (cantidad >= MAX_ADVERTENCIAS) {
    const botEsAdmin = await esBotAdminGrupo(sock, chatId)

    configChat.advertencias[jidNormalizado] = 0
    await db.write()

    const numero = await resolverNumeroReal(sock, jid)
    await sock.sendMessage(chatId, {
      text: `🚨 @${numero} llegó a ${MAX_ADVERTENCIAS} advertencias y fue expulsado.`,
      mentions: [jid],
    })

    if (botEsAdmin) {
      try {
        await sock.groupParticipantsUpdate(chatId, [jid], 'remove')
      } catch {}
    }
    return
  }

  const numero = await resolverNumeroReal(sock, jid)
  await sock.sendMessage(chatId, {
    text: `⚠️ @${numero} recibió una advertencia (${cantidad}/${MAX_ADVERTENCIAS}).`,
    mentions: [jid],
  })
}

async function quitar({ sock, msg, args, chatId, db }) {
  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, { text: '❀ Menciona, responde o escribe el número de quien quieres perdonar.' })
  }

  const configChat = obtenerConfigChat(db, chatId)
  const jidNormalizado = normalizarJid(jid)
  configChat.advertencias[jidNormalizado] = Math.max(0, (configChat.advertencias[jidNormalizado] || 0) - 1)
  await db.write()

  const numero = await resolverNumeroReal(sock, jid)
  await sock.sendMessage(chatId, {
    text: `✅ Se quitó una advertencia a @${numero} (${configChat.advertencias[jidNormalizado]}/${MAX_ADVERTENCIAS}).`,
    mentions: [jid],
  })
}

async function ver({ sock, msg, args, chatId, db }) {
  const jid = obtenerJidMencionado(msg, args) || msg.key.participant || msg.key.remoteJid
  const configChat = obtenerConfigChat(db, chatId)
  const jidNormalizado = normalizarJid(jid)
  const cantidad = configChat.advertencias[jidNormalizado] || 0

  const numero = await resolverNumeroReal(sock, jid, msg)
  await sock.sendMessage(chatId, {
    text: `⚠️ @${numero} tiene ${cantidad}/${MAX_ADVERTENCIAS} advertencias.`,
    mentions: [jid],
  })
}

export const subcomandos = { dar, quitar, ver }

export default async function advertencia({ sock, chatId, config }) {
  await sock.sendMessage(chatId, {
    text:
      `⚠️ *Sistema de advertencias*\n\n` +
      `Uso: *${config.prefijo}advertencia <subcomando>*\n\n` +
      `▢ dar @usuario\n▢ quitar @usuario\n▢ ver @usuario`,
  })
}