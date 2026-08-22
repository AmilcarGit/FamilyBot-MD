import * as Baileys from '@whiskeysockets/baileys'
import { buscarYouTube, esEnlaceYouTube, limpiarTitulo } from '../../lib/youtube.js'

const generateWAMessageFromContent = Baileys.generateWAMessageFromContent || Baileys.default?.generateWAMessageFromContent

export const desc = 'Busca videos de YouTube y permite elegir audio o video'
export const alias = ['yts', 'youtube']
export const categoria = 'descargas'
export const cooldown = 10

function crearBoton(texto, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: texto,
      id
    })
  }
}

export default async function ytsearch({ sock, msg, args, chatId, config }) {
  const query = args.join(' ').trim()

  if (!query) {
    await sock.sendMessage(chatId, {
      text: `❌ Escribe el nombre de un video.\n\nEjemplo: ${config.prefijo}ytsearch música cyberpunk`
    }, { quoted: msg })
    return
  }

  if (esEnlaceYouTube(query)) {
    await sock.sendMessage(chatId, {
      text: `Selecciona el formato para este enlace:\n\n${query}\n\n${config.prefijo}play ${query}\n${config.prefijo}video ${query}`
    }, { quoted: msg })
    return
  }

  await sock.sendMessage(chatId, {
    text: `⏳ Buscando *${query}* en YouTube...`
  }, { quoted: msg })

  try {
    const resultados = await buscarYouTube(query)
    if (!resultados.length) {
      await sock.sendMessage(chatId, {
        text: '❌ No encontré resultados para esa búsqueda.'
      }, { quoted: msg })
      return
    }

    let cuerpo = `╭━━━〔 🔎 *YT SEARCH* 〕━━━⬣\n┃ Consulta: *${query}*\n╰━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`
    const botones = []

    resultados.slice(0, 3).forEach((item, index) => {
      const titulo = limpiarTitulo(item.title)
      cuerpo += `*${index + 1}.* ${titulo}\n`
      cuerpo += `👤 ${item.author}  |  ⏱️ ${item.duration}\n\n`
      botones.push(crearBoton(`▶️ Play #${index + 1}`, `${config.prefijo}play ${item.url}`))
      botones.push(crearBoton(`🎬 Video #${index + 1}`, `${config.prefijo}video ${item.url}`))
    })

    cuerpo += 'Selecciona si quieres audio o video.'

    if (!generateWAMessageFromContent || typeof sock.relayMessage !== 'function') {
      await sock.sendMessage(chatId, {
        text: `${cuerpo}\n\n${config.prefijo}play ENLACE\n${config.prefijo}video ENLACE`
      }, { quoted: msg })
      return
    }

    const interactiveMessage = {
      body: { text: cuerpo },
      footer: { text: config.nombreBot || 'FamilyBot-MD' },
      header: {
        title: '🌌 FamilyBot-MD Neural Search',
        subtitle: 'Elige el formato de descarga',
        hasMediaAttachment: false
      },
      nativeFlowMessage: {
        buttons: botones,
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
  } catch (error) {
    console.error('Error en ytsearch:', error.message)
    await sock.sendMessage(chatId, {
      text: `❌ Falló la búsqueda de YouTube.\n\nDetalle: ${error.message}`
    }, { quoted: msg })
  }
}
