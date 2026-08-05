import yts from 'yt-search'

export const desc = 'Busca y descarga una canción de YouTube en audio'
export const cooldown = 8

export default async function play({ sock, chatId, args }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre de la canción.\nEjemplo: .play amor'
    })
  }

  await sock.sendMessage(chatId, {
    text: `🔎 Buscando *${consulta}*...`
  })

  try {
    const resultado = await yts(consulta)

    const video = resultado.videos?.[0]

    if (!video) {
      return sock.sendMessage(chatId, {
        text: '❌ No encontré resultados.'
      })
    }

    const url = video.url

    await sock.sendMessage(chatId, {
      text: `⬇️ Descargando *${video.title}*...`
    })

    const api =
      `https://dv-yer-api.online/ytmp3?mode=link&url=${encodeURIComponent(url)}&apikey=dvyer673989047548`

    const res = await fetch(api)
    const data = await res.json()

    const audioUrl =
      data.url ||
      data.link ||
      data.download ||
      data.result

    if (!audioUrl) {
      console.log(data)
      throw new Error('La API no devolvió audio')
    }

    const audio = await fetch(audioUrl)

    const buffer = Buffer.from(
      await audio.arrayBuffer()
    )

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${video.title}.mp3`
    })

  } catch (e) {
    console.error(e)

    await sock.sendMessage(chatId, {
      text: '❌ Error buscando o descargando la canción.'
    })
  }
}