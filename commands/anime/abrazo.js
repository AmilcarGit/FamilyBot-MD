import { enviarReaccion } from '../../lib/reacciones.js'

export const desc = 'Envía un abrazo animado con una reacción anime'
export const alias = ['hug', 'abrazar']
export const categoria = 'social'
export const cooldown = 5

export default async function abrazo({ sock, chatId, msg, config }) {
  try {
    await enviarReaccion({
      sock,
      chatId,
      msg,
      config,
      tipo: 'hug',
      nombre: 'Abrazo',
      emoji: '🫂'
    })
  } catch (error) {
    console.error('Error en abrazo:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No pude enviar el abrazo animado. Verifica que FFmpeg esté instalado y que FamilyBot-API esté disponible.'
    }, { quoted: msg })
  }
}
