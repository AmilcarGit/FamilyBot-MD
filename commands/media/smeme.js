import { descargarMedia, obtenerMensajeCitado, tipoDeMedia, subirACatbox } from '../../lib/media.js'
import { Jimp } from 'jimp'
import webp from 'node-webpmux'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

export const desc = 'Crea un sticker meme con texto arriba y abajo.'
export const alias = ['smeme', 'stickermeme']
export const cooldown = 10

const AUTOR_STICKER =
  '╭─𓆩 👑 𓆪─╮\n' +
  '🌸🦋 𝙏𝙝𝙚𝙔𝙪𝙞-𝙈𝘿 • ʙᴏᴛ\n' +
  '🐱 ᴏʀɪɢɪɴᴀʟ sᴛɪᴄᴋᴇʀs\n' +
  '💎 ᴄʀᴇᴀᴛᴏʀ ᴇᴅɪᴛ\n' +
  '╰─𓆩🦋𓆪─╯'

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

export default async function smeme({ sock, msg, chatId, args, config }) {
  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'imageMessage' && tipo !== 'stickerMessage') {
    return sock.sendMessage(chatId, {
      text: `❀ Responde a una imagen o sticker con *${config.prefijo}smeme texto arriba | texto abajo*`,
    })
  }

  let text = args.join(' ')
  if (!text) return sock.sendMessage(chatId, { text: '❌ Ingresa el texto para el meme.' })

  let [top, bottom] = text.split('|').map(t => t.trim())
  if (!bottom) {
    bottom = top
    top = ''
  }

  try {
    await sock.sendMessage(chatId, { text: '⏳ Creando tu sticker meme...' }, { quoted: msg })

    const buffer = await descargarMedia(objetivo, sock.logger)
    const imageUrl = await subirACatbox(buffer)

    const apiKey = 'sk-c8498d1dfbff805b5c10823a491082714dd76ac6f9a9e03dfe12ffc9b646d9a4'
    const apiUrl = `https://api.mitzuki.xyz/maker/smeme?top=${encodeURIComponent(top)}&bottom=${encodeURIComponent(bottom)}&image=${encodeURIComponent(imageUrl)}&apikey=${apiKey}`

    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error('Error en la API de memes')
    const memeBuffer = Buffer.from(await res.arrayBuffer())

    const imagen = await Jimp.read(memeBuffer)
    imagen.cover({ w: 512, h: 512 })
    const bufferPng = await imagen.getBuffer('image/png')
    
    const webpBuffer = await convertirAPngWebp(bufferPng)

    const img = new webp.Image()
    await img.load(webpBuffer)

    const json = {
      'sticker-pack-id': 'theyui-md-smeme',
      'sticker-pack-name': config.nombreBot,
      'sticker-pack-publisher': AUTOR_STICKER,
      emojis: ['🤡'],
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
    await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: msg })

  } catch (err) {
    console.error('Error en smeme:', err)
    await sock.sendMessage(chatId, { text: '❌ No pude crear el sticker meme.' })
  }
}
