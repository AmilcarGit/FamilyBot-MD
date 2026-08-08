import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Deja que solo los administradores puedan escribir en el grupo'
export const cooldown = 3
export const soloAdmin = true

export default async function cerrargrupo({ sock, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para hacer esto.' })
  }

  try {
    await sock.groupSettingUpdate(chatId, 'announcement')
    await sock.sendMessage(chatId, {
      text: '🔒 Grupo cerrado. Solo los administradores pueden escribir.',
    })
  } catch (err) {
    console.error('Error cerrando el grupo:', err)
    await sock.sendMessage(chatId, { text: '❌ No pude cambiar la configuración del grupo.' })
  }
}
