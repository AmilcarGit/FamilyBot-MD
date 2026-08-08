import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Revoca y genera un nuevo link de invitación'
export const alias = ['resetlink']
export const cooldown = 10
export const soloAdmin = true

export default async function revocarlink({ sock, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para revocar el link.' })
  }

  try {
    const codigo = await sock.groupRevokeInvite(chatId)
    await sock.sendMessage(chatId, { text: `🔄 Link renovado:\nhttps://chat.whatsapp.com/${codigo}` })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude revocar el link del grupo.' })
  }
}