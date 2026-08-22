import { buscarYouTube, descargarYouTube, esEnlaceYouTube, limpiarTitulo } from '../../lib/youtube.js'
import { getResult } from '../../lib/tempStore.js'

export const desc = 'Descarga videos de YouTube mediante FamilyBot-API'
export const alias = ['ytmp4', 'ytvideo']
export const categoria = 'descargas'
export const cooldown = 10

export default async function video({ sock, msg, args, chatId, config }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    await sock.sendMessage(chatId, {
      text: `❌ Escribe un título o enlace de YouTube.\n\nEjemplo: ${config.prefijo}video mejores goles de CR7`
    }, { quoted: msg })
    return
  }

  try {
    await sock.sendMessage(chatId, {
      text: '⏳ Preparando video mediante FamilyBot-API...'
    }, { quoted: msg })

    let video
    if (/^\d+$/.test(consulta)) {
      video = getResult(chatId, Number(consulta))
      if (!video) {
        await sock.sendMessage(chatId, {
          text: '❌ La búsqueda expiró. Ejecuta nuevamente `.ytsearch`.'
        }, { quoted: msg })
        return
      }
    } else if (esEnlaceYouTube(consulta)) {
      video = {
        url: consulta,
        title: 'Video de YouTube',
        duration: 'Desconocida',
        author: 'YouTube'
      }
    } else {
      const resultados = await buscarYouTube(consulta)
      video = resultados[0]
      if (!video) {
        await sock.sendMessage(chatId, {
          text: '❌ No encontré resultados para esa búsqueda.'
        }, { quoted: msg })
        return
      }
    }

    const descarga = await descargarYouTube(video.url, 'video')
    const caption = `╭━━━〔 🎬 *FAMILYBOT VIDEO* 〕━━━⬣\n┃ ✧ *Título:* ${limpiarTitulo(video.title)}\n┃ ✧ *Duración:* ${video.duration || descarga.duration || 'Desconocida'}\n┃ ✧ *Autor:* ${video.author || 'Desconocido'}\n┃ ✧ *Fuente:* ${descarga.provider || 'FamilyBot-API'}\n╰━━━━━━━━━━━━━━━━━━━━━━⬣`

    const mensaje = descarga.archivo
      ? { video: descarga.archivo, mimetype: 'video/mp4', caption }
      : { video: { url: descarga.url }, mimetype: 'video/mp4', caption }

    await sock.sendMessage(chatId, mensaje, { quoted: msg })
  } catch (error) {
    console.error('Error en video:', error.message)
    await sock.sendMessage(chatId, {
      text: `❌ No se pudo enviar el video.\n\nDetalle: ${error.message}`
    }, { quoted: msg })
  }
}
