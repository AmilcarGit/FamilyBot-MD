import * as Baileys from '@whiskeysockets/baileys'
import { buscarYouTube, esEnlaceYouTube, limpiarTitulo } from '../../lib/youtube.js'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia || Baileys.default?.prepareWAMessageMedia

export const desc = 'Busca videos de YouTube con portada y selector de descarga'
export const alias = ['yts', 'youtube']
export const categoria = 'descargas'
export const cooldown = 10

function obtenerMiniatura(url) {
  const coincidencia = String(url || '').match(/[?&]v=([^&]+)/i) || String(url || '').match(/youtu\.be\/([^?&]+)/i) || String(url || '').match(/shorts\/([^?&]+)/i)
  return coincidencia ? `https://i.ytimg.com/vi/${coincidencia[1]}/hqdefault.jpg` : null
}

function crearFila(item, index, tipo, prefijo) {
  const titulo = limpiarTitulo(item.title)
  const textoTipo = tipo === 'audio' ? 'MP3' : 'MP4'
  const comando = tipo === 'audio' ? 'play' : 'video'
  return {
    header: `${index + 1}`,
    title: titulo,
    description: `${textoTipo} | ${item.duration || 'Desconocida'} | ${item.author || 'YouTube'}`,
    id: `${prefijo}${comando} ${item.url}`
  }
}

export default async function ytsearch({ sock, msg, args, chatId, config }) {
  const query = args.join(' ').trim()

  if (!query) {
    await sock.sendMessage(chatId, {
      text: `❌ Escribe el nombre de una canción o video.\n\nEjemplo: ${config.prefijo}ytsearch William Luna`
    }, { quoted: msg })
    return
  }

  if (esEnlaceYouTube(query)) {
    const filas = [
      {
        title: '🎵 MP3 — Solo audio',
        description: 'Descargar como audio',
        id: `${config.prefijo}play ${query}`
      },
      {
        title: '🎬 MP4 — Video',
        description: 'Descargar como video',
        id: `${config.prefijo}video ${query}`
      }
    ]
    await enviarSelector({
      sock,
      msg,
      chatId,
      config,
      cuerpo: `╭━━━〔 🔎 *YT SEARCH* 〕━━━⬣\n┃ Enlace listo para descargar\n╰━━━━━━━━━━━━━━━━━━━━━━⬣`,
      filas,
      imagen: obtenerMiniatura(query)
    })
    return
  }

  await sock.sendMessage(chatId, {
    text: `⏳ Buscando *${query}* en YouTube...`
  }, { quoted: msg })

  try {
    const resultados = (await buscarYouTube(query)).slice(0, 5)
    if (!resultados.length) {
      await sock.sendMessage(chatId, {
        text: '❌ No encontré resultados para esa búsqueda.'
      }, { quoted: msg })
      return
    }

    let cuerpo = `╭━━━〔 🔎 *YT SEARCH* 〕━━━⬣\n┃ Consulta: *${query}*\n╰━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`
    resultados.slice(0, 3).forEach((item, index) => {
      cuerpo += `${index + 1}. ${limpiarTitulo(item.title)}\n`
      cuerpo += `👤 ${item.author || 'Desconocido'}  |  ⏱️ ${item.duration || 'Desconocida'}\n\n`
    })
    cuerpo += 'Selecciona una canción y el formato de descarga.'

    const filasAudio = resultados.map((item, index) => crearFila(item, index, 'audio', config.prefijo))
    const filasVideo = resultados.map((item, index) => crearFila(item, index, 'video', config.prefijo))
    const filas = [
      {
        title: '🎵 MP3 — Solo audio',
        rows: filasAudio
      },
      {
        title: '🎬 MP4 — Video',
        rows: filasVideo
      }
    ]

    await enviarSelector({
      sock,
      msg,
      chatId,
      config,
      cuerpo,
      filas,
      imagen: resultados[0].image || obtenerMiniatura(resultados[0].url)
    })
  } catch (error) {
    console.error('Error en ytsearch:', error.message)
    await sock.sendMessage(chatId, {
      text: `❌ Falló la búsqueda de YouTube.\n\nDetalle: ${error.message}`
    }, { quoted: msg })
  }
}

async function enviarSelector({ sock, msg, chatId, config, cuerpo, filas, imagen }) {
  if (!generateWAMessageFromContent || typeof sock.relayMessage !== 'function') {
    const texto = filas.flatMap(seccion => [seccion.title, ...(seccion.rows || [seccion])].map(fila => `${fila.title}: ${fila.id}`)).join('\n')
    await sock.sendMessage(chatId, { text: `${cuerpo}\n\n${texto}` }, { quoted: msg })
    return
  }

  let media = null
  if (imagen && prepareWAMessageMedia) {
    try {
      media = await prepareWAMessageMedia({ image: { url: imagen } }, {
        upload: sock.waUploadToServer
      })
    } catch (error) {
      console.error('No se pudo cargar la portada:', error.message)
    }
  }

  const interactiveMessage = {
    body: { text: cuerpo },
    footer: { text: config.nombreBot || 'FamilyBot-MD' },
    header: {
      title: '🌌 FamilyBot-MD Neural Search',
      subtitle: 'Elige el formato y el resultado',
      hasMediaAttachment: Boolean(media),
      imageMessage: media?.imageMessage || undefined
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: 'ELEGIR DESCARGA',
            sections: filas
          })
        }
      ],
      messageParamsJson: JSON.stringify({ from: 'familybot-ytsearch' })
    }
  }

  const mensaje = generateWAMessageFromContent(chatId, {
    viewOnceMessage: {
      message: { interactiveMessage }
    }
  }, { quoted: msg })

  await sock.relayMessage(chatId, mensaje.message, {
    messageId: mensaje.key.id
  })
}
