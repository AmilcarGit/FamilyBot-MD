import { Jimp } from 'jimp'
import { descargarMedia, obtenerMensajeCitado, tipoDeMedia } from '../../lib/media.js'

export const desc = 'Aplica un filtro a una imagen. Subcomandos: blur, gris, invertir, sepia, pixelar, espejo'
export const alias = ['filter']
export const cooldown = 5

async function obtenerImagenObjetivo({ msg, sock, chatId }) {
  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'imageMessage') {
    await sock.sendMessage(chatId, {
      text: '❀ Responde a una imagen con *filtro <tipo>*.',
    })
    return null
  }

  const buffer = await descargarMedia(objetivo, sock.logger)
  return Jimp.read(buffer)
}

async function aplicarFiltro({ msg, sock, chatId }, callback) {
  try {
    const imagen = await obtenerImagenObjetivo({ msg, sock, chatId })
    if (!imagen) return

    callback(imagen)

    const buffer = await imagen.getBuffer('image/png')
    await sock.sendMessage(chatId, { image: buffer })
  } catch (err) {
    console.log('❌ Error aplicando filtro:', err.message)
    await sock.sendMessage(chatId, { text: '❌ No pude aplicar el filtro a esa imagen.' })
  }
}

async function blur(ctx) {
  await aplicarFiltro(ctx, (img) => img.blur(6))
}

async function gris(ctx) {
  await aplicarFiltro(ctx, (img) => img.greyscale())
}

async function invertir(ctx) {
  await aplicarFiltro(ctx, (img) => img.invert())
}

async function sepia(ctx) {
  await aplicarFiltro(ctx, (img) => img.sepia())
}

async function pixelar(ctx) {
  await aplicarFiltro(ctx, (img) => img.pixelate(12))
}

async function espejo(ctx) {
  await aplicarFiltro(ctx, (img) => img.flip({ horizontal: true, vertical: false }))
}

export const subcomandos = { blur, gris, invertir, sepia, pixelar, espejo }

export default async function filtro({ sock, chatId, config }) {
  await sock.sendMessage(chatId, {
    text:
      `🎨 *Filtros de imagen*\n\n` +
      `Responde a una imagen con:\n` +
      `▢ ${config.prefijo}filtro blur\n▢ ${config.prefijo}filtro gris\n▢ ${config.prefijo}filtro invertir\n▢ ${config.prefijo}filtro sepia\n▢ ${config.prefijo}filtro pixelar\n▢ ${config.prefijo}filtro espejo`,
  })
}