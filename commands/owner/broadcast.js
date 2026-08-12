import { delay } from '../../lib/utils.js'

export const desc = 'Envía un mensaje a todos los grupos donde está el bot'
export const alias = ['bc']
export const soloOwner = true
export const cooldown = 30

export default async function broadcast({ sock, args, chatId, db }) {
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chatId, { text: '❀ Escribe el mensaje que quieres enviar a todos los grupos.' })
  }

  const chats = Object.keys(db.data.chats || {})

  if (!chats.length) {
    return sock.sendMessage(chatId, { text: '❌ No hay chats registrados todavía.' })
  }

  await sock.sendMessage(chatId, { text: `📢 Enviando broadcast a ${chats.length} chat(s)...` })

  let enviados = 0
  let fallidos = 0

  for (const chatDestino of chats) {
    try {
      await sock.sendMessage(chatDestino, { text: `📢 *Mensaje del owner*\n\n${texto}` })
      enviados++
    } catch {
      fallidos++
    }

    await delay(1500)
  }

  await sock.sendMessage(chatId, {
    text: `✅ Broadcast terminado.\n📨 Enviados: ${enviados}\n❌ Fallidos: ${fallidos}`,
  })
}