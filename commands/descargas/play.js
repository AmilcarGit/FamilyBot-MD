import { Innertube, UniversalCache } from 'youtubei.js'

export const desc = 'Busca y descarga una canción de YouTube en audio'
export const cooldown = 8

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
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

  await sock.sendMessage(chatId, { text: `🔎 Buscando *${consulta}*...` })

  let yt
  try {
    yt = await obtenerCliente()
  } catch (err) {
    return sock.sendMessage(chatId, { text: '❌ No pude conectar con YouTube.' })
  }

  let video
  try {
    const busqueda = await yt.search(consulta, { type: 'video' })
    video = busqueda?.videos?.[0]
  } catch (err) {
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
  }

  if (!video) {
    return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
  }

  try {
    const stream = await yt.download(video.id, {
      type: 'audio',
      quality: 'best',
      format: 'mp4',
    })

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mp4',
      fileName: `${video.title}.mp3`,
    })
  } catch (err) {
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el audio.\n🔗 Puedes escucharlo directo aquí: https://youtu.be/${video.id}`,
    })
  }
}
