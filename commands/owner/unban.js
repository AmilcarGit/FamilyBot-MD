import { normalizarJid, obtenerJidMencionado } from '../../lib/utils.js'

export const desc = 'Desbloquea a un usuario'
export const soloOwner = true
export const cooldown = 3

export default async function unban({ sock, msg, args, chatId, db }) {
  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, { text: '❀ Menciona, responde o escribe el número a desbloquear.' })
  }

  db.data.blacklist ??= []
  const jidNormalizado = normalizarJid(jid)

  if (!db.data.blacklist.includes(jidNormalizado)) {
    return sock.sendMessage(chatId, { text: '⚠️ Ese usuario no está bloqueado.' })
  }

  db.data.blacklist = db.data.blacklist.filter((j) => j !== jidNormalizado)
  await db.write()

  await sock.sendMessage(chatId, {
    text: `✅ @${jid.split('@')[0]} fue desbloqueado.`,
    mentions: [jid],
  })
}