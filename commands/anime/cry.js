import { enviarReaccion } from '../../lib/reacciones.js'

export const desc = 'Envía una reacción de llanto animada'
export const alias = ['llorar', 'llanto']
export const categoria = 'social'
export const cooldown = 5

export default async function cry({ sock, chatId, msg, config }) {
  try {
    await enviarReaccion({
      sock,
      chatId,
      msg,
      config,
      tipo: 'cry',
      nombre: 'Llanto',
      emoji: '😭'
    })
  } catch (error) {
    console.error('Error en cry:', error.message)
    await sock.sendMessage(chatId, {
      text: '❌ No pude enviar la reacción de llanto. Verifica que FFmpeg esté instalado y que FamilyBot-API esté disponible.'
    }, { quoted: msg })
  }
}
