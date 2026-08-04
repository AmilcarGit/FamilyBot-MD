import { Jimp } from 'jimp'
import webp from 'node-webpmux'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { descargarMedia, obtenerMensajeCitado, tipoDeMedia } from '../../lib/media.js'
import config from '../../config.js'

const execFileAsync = promisify(execFile)

export const desc = 'Convierte una imagen en sticker'
export const alias = ['s', 'stiker']
export const cooldown = 5

const AUTOR_STICKER =
  '╭─𓆩 👑 𓆪─╮\n' +
  '🌸🦋 𝙏𝙝𝙚𝙔𝙪𝙞-𝙈𝘿 • ʙᴏᴛ\n' +
  '🐱 ᴏʀɪɢɪɴᴀʟ sᴛɪᴄᴋᴇʀs\n' +
  '💎 ᴄʀᴇᴀᴛᴏʀ ᴇᴅɪᴛ\n' +
  '╰─𓆩🦋𓆪─╯'

async function pngABuffer(objetivo, sock) {
  const buffer = await descargarMedia(objetivo, sock.logger)
  const imagen = await Jimp.read(buffer)
  imagen.cover({ w: 512, h: 512 })
  return imagen.getBuffer('image/png')
}

async function convertirAPngWebp(bufferPng) {
  const carpetaTemp = os.tmpdir()
  const id = randomUUID()
  const rutaPng = path.join(carpetaTemp, `theyui-${id}.png`)
  const rutaWebp = path.join(carpetaTemp, `theyui-${id}.webp`)

  try {
    await fs.writeFile(rutaPng, bufferPng)
    await execFileAsync('cwebp', ['-q', '80', rutaPng, '-o', rutaWebp])
    return await fs.readFile(rutaWebp)
  } finally {
    await fs.unlink(rutaPng).catch(() => {})
    await fs.unlink(rutaWebp).catch(() => {})
  }
}

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
    const bufferPng = await pngABuffer(objetivo, sock)
    const webpBuffer = await convertirAPngWebp(bufferPng)

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
    console.error('Error creando sticker:', err)

    if (err.code === 'ENOENT') {
      return sock.sendMessage(chatId, {
        text: '❌ Falta instalar la herramienta *webp* en el servidor.\nEjecuta: pkg install webp (Termux) o apt install webp (Linux/hosting).',
      })
    }

    await sock.sendMessage(chatId, { text: '❌ No pude crear el sticker.' })
  }
}
