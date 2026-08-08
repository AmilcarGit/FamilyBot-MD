import { obtenerConfigChat, actualizarConfigChat } from '../../lib/groupSettings.js'

export const desc = 'Activa o desactiva el mensaje de bienvenida/despedida'
export const alias = ['welcome']
export const cooldown = 3
export const soloAdmin = true

export default async function bienvenida({ sock, chatId, args, db }) {
  if (!chatId.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ Este comando solo funciona en grupos.' })
  }

  const opcion = args[0]?.toLowerCase()

  if (opcion !== 'on' && opcion !== 'off') {
    const configChat = obtenerConfigChat(db, chatId)
    return sock.sendMessage(chatId, {
      text:
        `👋 *Bienvenida*\n\n` +
        `Estado actual: ${configChat.bienvenida ? 'Activado ✅' : 'Desactivado ❌'}\n\n` +
        `Uso: bienvenida on / bienvenida off`,
    })
  }

  await actualizarConfigChat(db, chatId, { bienvenida: opcion === 'on' })

  await sock.sendMessage(chatId, {
    text: opcion === 'on' ? '✅ Mensajes de bienvenida/despedida activados.' : '❌ Mensajes de bienvenida/despedida desactivados.',
  })
}