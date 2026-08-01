import { obtenerConfigChat, actualizarConfigChat } from '../../lib/groupSettings.js'

export const desc = 'Activa o desactiva el borrado de links de invitación de WhatsApp'
export const cooldown = 3
export const soloAdmin = true

export default async function antilink({ sock, chatId, args, db }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const opcion = args[0]?.toLowerCase()

  if (opcion !== 'on' && opcion !== 'off') {
    const configChat = obtenerConfigChat(db, chatId)
    return sock.sendMessage(chatId, {
      text:
        `🔗 *Antilink*\n\n` +
        `Estado actual: ${configChat.antilink ? 'Activado ✅' : 'Desactivado ❌'}\n\n` +
        `Uso: antilink on / antilink off`,
    })
  }

  await actualizarConfigChat(db, chatId, { antilink: opcion === 'on' })

  await sock.sendMessage(chatId, {
    text: opcion === 'on'
      ? '✅ Antilink activado. Se borrarán los links de invitación de WhatsApp que manden los miembros.'
      : '❌ Antilink desactivado.',
  })
}
