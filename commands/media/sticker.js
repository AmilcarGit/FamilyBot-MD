import webp from 'node-webpmux'
import { JimpWebp } from '../../lib/webp.js'
import { descargarMedia, obtenerMensajeCitado, tipoDeMedia } from '../../lib/media.js'
import config from '../../config.js'

export const desc = 'Convierte una imagen en sticker'
export const alias = ['s', 'stiker']
export const cooldown = 5

const AUTOR_STICKER =
  '╭─𓆩 👑 𓆪─╮\n' +
  '🌸🦋 𝙏𝙝𝙚𝙔𝙪𝙞-𝙈𝘿 • ʙᴏᴛ\n' +
  '🐱 ᴏʀɪɢɪɴᴀʟ sᴛɪᴄᴋᴇʀs\n' +
  '💎 ᴄʀᴇᴀᴛᴏʀ ᴇᴅɪᴛ\n' +
  '╰─𓆩🦋𓆪─╯'

export default async function sticker({ sock, msg, chatId }) {
  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'imageMessage') {
    return sock.sendMessage(chatId, {
      text: '❀ Envía o responde a una imagen con *sticker* para convertirla.',
    })
  }

  try {
    const buffer = await descargarMedia(objetivo, sock.logger)
    const imagen = await JimpWebp.read(buffer)
    imagen.cover({ w: 512, h: 512 })

    const webpBuffer = await imagen.getBuffer('image/webp')

    const img = new webp.Image()
    await img.load(webpBuffer)

    const json = {
      'sticker-pack-id': 'theyui-md-sticker',
      'sticker-pack-name': config.nombreBot,
      'sticker-pack-publisher': AUTOR_STICKER,
      emojis: ['🤖'],
    }

    const exif = Buffer.concat([
      Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41,
        0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      ]),
      Buffer.from(JSON.stringify(json), 'utf-8'),
    ])
    exif.writeUIntLE(exif.length - 22, 14, 4)

    img.exif = exif

    const finalBuffer = await img.save(null)

    await sock.sendMessage(chatId, { sticker: finalBuffer })
  } catch (err) {
    await sock.sendMessage(chatId, { text: '❌ No pude crear el sticker.' })
  }
}
