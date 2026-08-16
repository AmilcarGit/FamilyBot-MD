import { normalizarJid, obtenerJidMencionado, esOwner, resolverNumeroReal } from '../../lib/utils.js'

export const desc = 'Bloquea a un usuario, el bot ignora todos sus mensajes'
export const soloOwner = true
export const cooldown = 3

export default async function ban({ sock, msg, args, chatId, db, config }) {
  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, { text: '❀ Menciona, responde o escribe el número a bloquear.' })
  }

  const numero = await resolverNumeroReal(sock, jid)
  if (esOwner(numero, config.owner)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes bloquear al owner.' })
  }

  db.data.blacklist ??= []
  const jidNormalizado = normalizarJid(jid)

  if (db.data.blacklist.includes(jidNormalizado)) {
    return sock.sendMessage(chatId, { text: '⚠️ Ese usuario ya está bloqueado.' })
  }

  db.data.blacklist.push(jidNormalizado)
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🚫 @${numero} fue bloqueado. El bot ignorará todos sus mensajes.`,
    mentions: [jid],
  })
}