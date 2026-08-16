import { obtenerJidMencionado, resolverNumeroReal } from '../../lib/utils.js'
import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Asciende a un miembro a administrador'
export const cooldown = 3
export const soloAdmin = true

export default async function promote({ sock, msg, args, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para ascender miembros.' })
  }

  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número de quien quieres ascender.',
    })
  }

  try {
    await sock.groupParticipantsUpdate(chatId, [jid], 'promote')
    const numero = await resolverNumeroReal(sock, jid)
    await sock.sendMessage(chatId, {
      text: `👑 @${numero} ahora es administrador.`,
      mentions: [jid],
    })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude ascender a ese usuario.' })
  }
}
