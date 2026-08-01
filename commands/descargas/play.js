import ytdl from '@distube/ytdl-core'
import yts from 'yt-search'

export const desc = 'Busca y descarga una canción de YouTube en audio'
export const cooldown = 8

export default async function play({ sock, chatId, args }) {
  const consulta = args.join(' ').trim()

  if (!consulta) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre de la canción.\nEjemplo: play shape of you',
    })
  }

  await sock.sendMessage(chatId, { text: `🔎 Buscando *${consulta}*...` })

  let resultado
  try {
    const busqueda = await yts(consulta)
    resultado = busqueda.videos?.[0]
  } catch (err) {
    return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
  }

  if (!resultado) {
    return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
  }

  try {
    const stream = ytdl(resultado.url, { filter: 'audioonly', quality: 'highestaudio' })
    const chunks = []

    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    const buffer = Buffer.concat(chunks)

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mp4',
      fileName: `${resultado.title}.mp3`,
    })
  } catch (err) {
    await sock.sendMessage(chatId, {
      text: `❌ No pude descargar el audio.\n🔗 Puedes escucharlo directo aquí: ${resultado.url}`,
    })
  }
}
