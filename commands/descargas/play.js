import { buscarYouTube, descargarYouTube, esEnlaceYouTube, limpiarTitulo } from '../../lib/youtube.js'

export const desc = 'Descarga y envía audio de YouTube mediante FamilyBot-API'
export const alias = ['ytplay', 'audio', 'ytmp3']
export const categoria = 'descargas'
export const cooldown = 10

export default async function play({ sock, msg, args, chatId, config }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    await sock.sendMessage(chatId, {
      text: `❌ Escribe una canción o enlace de YouTube.\n\nEjemplo: ${config.prefijo}play After Dark Mr Kitty`
    }, { quoted: msg })
    return
  }

  try {
    await sock.sendMessage(chatId, {
      text: '⏳ Preparando audio mediante FamilyBot-API...'
    }, { quoted: msg })

    let video
    if (esEnlaceYouTube(consulta)) {
      video = {
        url: consulta,
        title: 'Audio de YouTube',
        duration: 'Desconocida',
        author: 'YouTube'
      }
    } else {
      const resultados = await buscarYouTube(consulta)
      video = resultados[0]
      if (!video) {
        await sock.sendMessage(chatId, {
          text: '❌ No encontré esa canción o video en YouTube.'
        }, { quoted: msg })
        return
      }
    }

    const descarga = await descargarYouTube(video.url, 'audio')
    const caption = `╭━━━〔 🎵 *FAMILYBOT PLAY* 〕━━━⬣\n┃ ✧ *Título:* ${limpiarTitulo(descarga.title || video.title)}\n┃ ✧ *Duración:* ${descarga.duration || video.duration}\n┃ ✧ *Autor:* ${video.author}\n┃ ✧ *Fuente:* ${descarga.provider || 'FamilyBot-API'}\n╰━━━━━━━━━━━━━━━━━━━━━━⬣`

    const mensaje = descarga.archivo
      ? { audio: descarga.archivo, mimetype: 'audio/mpeg', ptt: false, fileName: `${limpiarTitulo(video.title)}.mp3` }
      : { audio: { url: descarga.url }, mimetype: 'audio/mpeg', ptt: false, fileName: `${limpiarTitulo(video.title)}.mp3` }

    await sock.sendMessage(chatId, mensaje, { quoted: msg })
    await sock.sendMessage(chatId, { text: caption }, { quoted: msg })
  } catch (error) {
    console.error('Error en play:', error.message)
    await sock.sendMessage(chatId, {
      text: `❌ No se pudo enviar el audio.\n\nDetalle: ${error.message}`
    }, { quoted: msg })
  }
}
