import { obtenerJidMencionado } from '../../lib/utils.js'
import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Expulsa a un miembro del grupo'
export const cooldown = 3
export const soloAdmin = true

export default async function kick({ sock, msg, args, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para expulsar miembros.' })
  }

  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número de quien quieres expulsar.',
    })
  }

  try {
    await sock.groupParticipantsUpdate(chatId, [jid], 'remove')
  } catch (err) {
    console.error('Error expulsando:', err)
    return sock.sendMessage(chatId, { text: '❌ No pude expulsar a ese usuario.' }).catch(() => {})
  }

  await new Promise((r) => setTimeout(r, 800))

  try {
    await sock.sendMessage(chatId, {
      text: `✅ @${jid.split('@')[0]} fue expulsado del grupo.`,
      mentions: [jid],
    })
  } catch (err) {
    console.error('Kick exitoso, pero no se pudo confirmar por chat:', err)
  }
}
