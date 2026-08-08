import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Muestra el link de invitación del grupo'
export const alias = ['linkgc', 'grupolink']
export const cooldown = 5
export const soloAdmin = true

export default async function linkgrupo({ sock, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para obtener el link.' })
  }

  try {
    const codigo = await sock.groupInviteCode(chatId)
    await sock.sendMessage(chatId, { text: `🔗 https://chat.whatsapp.com/${codigo}` })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude obtener el link del grupo.' })
  }
}