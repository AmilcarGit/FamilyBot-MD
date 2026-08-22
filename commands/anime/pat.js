import { enviarReaccion } from '../../lib/reacciones.js'

export const desc = 'Envía una palmadita animada con una reacción anime'
export const alias = ['palmadita', 'acariciar']
export const categoria = 'social'
export const cooldown = 5

export default async function pat({ sock, chatId, msg, config }) {
  try {
    await enviarReaccion({
      sock,
      chatId,
      msg,
      config,
      tipo: 'pat',
      nombre: 'Palmadita',
      emoji: '🫳'
    })
  } catch (error) {
    console.error('Error en pat:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No pude enviar la palmadita animada. Verifica que FFmpeg esté instalado y que FamilyBot-API esté disponible.'
    }, { quoted: msg })
  }
}
