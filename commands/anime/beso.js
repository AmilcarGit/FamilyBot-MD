import { enviarReaccion } from '../../lib/reacciones.js'

export const desc = 'Envía un beso animado con una reacción anime'
export const alias = ['kiss', 'besar']
export const categoria = 'social'
export const cooldown = 5

export default async function beso({ sock, chatId, msg, config }) {
  try {
    await enviarReaccion({
      sock,
      chatId,
      msg,
      config,
      tipo: 'kiss',
      nombre: 'Beso',
      emoji: '💋'
    })
  } catch (error) {
    console.error('Error en beso:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No pude enviar el beso animado. Verifica que FFmpeg esté instalado y que FamilyBot-API esté disponible.'
    }, { quoted: msg })
  }
}
