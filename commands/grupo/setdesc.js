import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Cambia la descripción del grupo'
export const cooldown = 5
export const soloAdmin = true

export default async function setdesc({ sock, chatId, args }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para cambiar la descripción.' })
  }

  const nuevaDesc = args.join(' ').trim()
  if (!nuevaDesc) {
    return sock.sendMessage(chatId, { text: '❀ Escribe la nueva descripción del grupo.' })
  }

  try {
    await sock.groupUpdateDescription(chatId, nuevaDesc)
    await sock.sendMessage(chatId, { text: '✅ Descripción del grupo actualizada.' })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude cambiar la descripción.' })
  }
}