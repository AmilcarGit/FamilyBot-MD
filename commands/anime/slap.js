import { enviarReaccion } from '../../lib/reacciones.js'

export const desc = 'Envía una bofetada animada con una reacción anime'
export const alias = ['bofetada', 'cachetada']
export const categoria = 'social'
export const cooldown = 5

export default async function slap({ sock, chatId, msg, config }) {
  try {
    await enviarReaccion({
      sock,
      chatId,
      msg,
      config,
      tipo: 'slap',
      nombre: 'Bofetada',
      emoji: '👋'
    })
  } catch (error) {
    console.error('Error en slap:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No pude enviar la bofetada animada. Verifica que FFmpeg esté instalado y que FamilyBot-API esté disponible.'
    }, { quoted: msg })
  }
}
