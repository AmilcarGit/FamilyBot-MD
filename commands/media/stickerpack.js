import webp from 'node-webpmux'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

export const desc = 'Busca un paquete de stickers y envía un pack completo.'
export const alias = ['pack', 'spack', 'stickerpack']
export const cooldown = 10

const AUTOR_STICKER = 'FamilyBot-MD Bot'
const PACK_NAME = 'Sticker Pack Elite'

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
  
  if (url.endsWith('.png') || url.includes('.png')) {
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

export default async function stickerpack({ sock, chatId, args, config }) {
  const query = args.join(' ').trim()
  
  if (!query) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa el nombre de los stickers que deseas buscar.\nEjemplo: *${config.prefijo}pack Perros*`
    })
  }

  try {
    const apiKey = 'lem954'
    const url = `https://api.lempi.lat/s/stickers?q=${encodeURIComponent(query)}&apikey=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `🔎 Buscando pack de stickers para: *${query}*...\n✨ *Powered by Lempi API*` })

    const response = await fetch(url)
    const data = await response.json()
    
    const resultados = Array.isArray(data) ? data : (data.result || data.resultados || [])

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

    const cantidadAEnviar = Math.min(stickers.length, 12)

    await sock.sendMessage(chatId, { 
      text: `✨ *Paquete:* ${pack.titulo}\n👤 *Autor:* ${pack.autor || 'Desconocido'}\n📦 *Enviando:* ${cantidadAEnviar} stickers...\n🌐 *Fuente:* Lempi API` 
    })

    for (let i = 0; i < cantidadAEnviar; i++) {
      try {
        const buffer = await procesarSticker(stickers[i])
        await sock.sendMessage(chatId, { sticker: buffer })
        await new Promise(r => setTimeout(r, 600))
      } catch (err) {
        console.error('Error enviando sticker del pack:', err)
      }
    }

  } catch (error) {
    console.error('Error en comando stickerpack:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al descargar el pack de stickers.`
    })
  }
}
