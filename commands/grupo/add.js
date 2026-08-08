import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Agrega un número al grupo'
export const cooldown = 5
export const soloAdmin = true

export default async function add({ sock, chatId, args }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para agregar miembros.' })
  }

  const numero = args[0]?.replace(/\D/g, '')
  if (!numero || numero.length < 8) {
    return sock.sendMessage(chatId, { text: '❀ Escribe el número que quieres agregar. Ejemplo: add 51987654321' })
  }

  const jid = `${numero}@s.whatsapp.net`

  try {
    await sock.groupParticipantsUpdate(chatId, [jid], 'add')
    await sock.sendMessage(chatId, { text: `✅ @${numero} fue agregado al grupo.`, mentions: [jid] })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude agregar a ese número. Puede tener la privacidad restringida.' })
  }
}