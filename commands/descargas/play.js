import { Innertube, UniversalCache } from 'youtubei.js'

export const desc = 'Busca y descarga una canción de YouTube en audio'
export const cooldown = 8

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({
      cache: new UniversalCache(false),
    })
  }
  return clienteYt
}

export default async function play({ sock, chatId, args }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre de la canción.\nEjemplo: play shape of you',
    })
  }

  await sock.sendMessage(chatId, {
    text: `🔎 Buscando *${consulta}*...`,
  })

  let yt

  try {
    yt = await obtenerCliente()
  } catch {
    return sock.sendMessage(chatId, {
      text: '❌ No pude conectar con YouTube.',
    })
  }

  let video

  try {
    const busqueda = await yt.search(consulta, {
      type: 'video',
    })

    video = busqueda?.videos?.[0]
  } catch {
    return sock.sendMessage(chatId, {
      text: '❌ Error buscando en YouTube.',
    })
  }

  if (!video) {
    return sock.sendMessage(chatId, {
      text: '❌ No encontré resultados.',
    })
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`

  await sock.sendMessage(chatId, {
    text: `⬇️ Descargando *${video.title}*...`,
  })

  try {
    const apiUrl =
      `https://dv-yer-api.online/ytmp3?mode=link&url=${encodeURIComponent(youtubeUrl)}&apikey=dvyer673989047548`

    const res = await fetch(apiUrl)
    const data = await res.json()

    // Ajusta este campo si la API devuelve otro nombre
    const audioUrl = data.url || data.download || data.link

    if (!audioUrl) {
      throw new Error('No llegó enlace de descarga')
    }

    const audioRes = await fetch(audioUrl)

    if (!audioRes.ok) {
      throw new Error('Error descargando audio')
    }

    const buffer = Buffer.from(await audioRes.arrayBuffer())

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${video.title}.mp3`,
    })

  } catch (err) {
    console.error(err)

    await sock.sendMessage(chatId, {
      text:
        `❌ No pude descargar el audio.\n\n` +
        `🔗 ${youtubeUrl}`,
    })
  }
}