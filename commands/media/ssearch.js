import webp from 'node-webpmux'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

export const desc = 'Busca paquetes de stickers y envía algunos.'
export const alias = ['buscars', 'stickersearch', 'ss']
export const cooldown = 10

const AUTOR_STICKER = 'FamilyBot-MD Bot'
const PACK_NAME = 'Sticker Search'

async function agregarExif(webpBuffer) {
  const img = new webp.Image()
  await img.load(webpBuffer)
  const json = {
    'sticker-pack-id': `familybot-${randomUUID()}`,
    'sticker-pack-name': PACK_NAME,
    'sticker-pack-publisher': AUTOR_STICKER,
    emojis: ['✨'],
  }
  const exif = Buffer.concat([
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]),
    Buffer.from(JSON.stringify(json), 'utf-8'),
  ])
  exif.writeUIntLE(exif.length - 22, 14, 4)
  img.exif = exif
  return await img.save(null)
}

async function procesarSticker(url) {
  const res = await fetch(url)
  const buffer = Buffer.from(await res.arrayBuffer())
  
  if (url.endsWith('.png')) {
    const tempPng = path.join(os.tmpdir(), `${randomUUID()}.png`)
    const tempWebp = path.join(os.tmpdir(), `${randomUUID()}.webp`)
    try {
      await fs.writeFile(tempPng, buffer)
      await execFileAsync('cwebp', ['-q', '80', tempPng, '-o', tempWebp])
      const webpBuffer = await fs.readFile(tempWebp)
      return await agregarExif(webpBuffer)
    } finally {
      await fs.unlink(tempPng).catch(() => {})
      await fs.unlink(tempWebp).catch(() => {})
    }
  } else {
    return await agregarExif(buffer)
  }
}

export default async function ssearch({ sock, chatId, args, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un término de búsqueda.\nEjemplo: *${config.prefijo}ss gatos*`
    })
  }

  try {
    const apiKey = 'FamilyBot-MD'
    const url = `https://api.lempi.lat/s/stickers?q=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `🔎 Buscando stickers de *${query}*...` })

    const response = await fetch(url)
    const data = await response.json()
    const resultados = Array.isArray(data) ? data : (data.resultados || [])

    if (resultados.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ No se encontraron paquetes de stickers para: *${query}*`
      })
    }

    const pack = resultados[0]
    const stickers = pack.stickers || []

    if (stickers.length === 0) {
      return sock.sendMessage(chatId, {
        text: `❌ El paquete encontrado no tiene stickers disponibles.`
      })
    }

    await sock.sendMessage(chatId, { 
      text: `✨ *Paquete:* ${pack.titulo}\n👤 *Autor:* ${pack.autor || 'Desconocido'}\n📦 *Total:* ${stickers.length} stickers\n\n📥 Enviando los primeros 3 stickers...` 
    })

    const aEnviar = stickers.slice(0, 3)
    
    for (const sUrl of aEnviar) {
      try {
        const buffer = await procesarSticker(sUrl)
        await sock.sendMessage(chatId, { sticker: buffer })
      } catch (err) {
        console.error('Error procesando sticker individual:', err)
      }
    }

  } catch (error) {
    console.error('Error en comando ssearch:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al buscar stickers. Inténtalo más tarde.`
    })
  }
}
