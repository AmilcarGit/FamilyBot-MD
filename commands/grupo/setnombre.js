import { esBotAdminGrupo } from '../../lib/groupPermissions.js'

export const desc = 'Cambia el nombre del grupo'
export const alias = ['setname']
export const cooldown = 5
export const soloAdmin = true

export default async function setnombre({ sock, chatId, args }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const botEsAdmin = await esBotAdminGrupo(sock, chatId)
  if (!botEsAdmin) {
    return sock.sendMessage(chatId, { text: '❌ Necesito ser administrador para cambiar el nombre.' })
  }

  const nuevoNombre = args.join(' ').trim()
  if (!nuevoNombre) {
    return sock.sendMessage(chatId, { text: '❀ Escribe el nuevo nombre del grupo.' })
  }

  try {
    await sock.groupUpdateSubject(chatId, nuevoNombre)
    await sock.sendMessage(chatId, { text: '✅ Nombre del grupo actualizado.' })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude cambiar el nombre.' })
  }
}