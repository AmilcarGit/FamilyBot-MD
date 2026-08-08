import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Permite que todos los miembros puedan escribir en el grupo'
export const cooldown = 3
export const soloAdmin = true

export default async function abrirgrupo({ sock, chatId }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para hacer esto.' })
  }

  try {
    await sock.groupSettingUpdate(chatId, 'not_announcement')
    await sock.sendMessage(chatId, {
      text: '🔓 Grupo abierto. Todos los miembros pueden escribir de nuevo.',
    })
  } catch (err) {
    console.error('Error abriendo el grupo:', err)
    await sock.sendMessage(chatId, { text: '❌ No pude cambiar la configuración del grupo.' })
  }
}
