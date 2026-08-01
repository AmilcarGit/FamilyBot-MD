import { Jimp } from 'jimp'
import { descargarMedia, obtenerMensajeCitado, tipoDeMedia } from '../../lib/media.js'

export const desc = 'Convierte un sticker en imagen'
export const alias = ['toimage']
export const cooldown = 5

export default async function toimg({ sock, msg, chatId }) {
  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'stickerMessage') {
    return sock.sendMessage(chatId, {
      text: '❀ Responde a un sticker con *toimg* para convertirlo en imagen.',
    })
  }

  try {
    const buffer = await descargarMedia(objetivo, sock.logger)
    const imagen = await Jimp.read(buffer)
    const pngBuffer = await imagen.getBuffer('image/png')

    await sock.sendMessage(chatId, { image: pngBuffer })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude convertir ese sticker.' })
  }
}
