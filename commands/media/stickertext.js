import { Jimp, loadFont } from 'jimp'
import { measureText } from 'jimp'
import { SANS_64_WHITE } from 'jimp/fonts'
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

export const desc = 'Crea un sticker con texto encima de una imagen'
export const alias = ['stickertexto', 'stext']
export const cooldown = 5

function partirLineas(font, texto, anchoMaximo) {
  const palabras = texto.split(' ')
  const lineas = []
  let lineaActual = ''

  for (const palabra of palabras) {
    const intento = lineaActual ? `${lineaActual} ${palabra}` : palabra
    const ancho = measureText(font, intento)

    if (ancho > anchoMaximo && lineaActual) {
      lineas.push(lineaActual)
      lineaActual = palabra
    } else {
      lineaActual = intento
    }
  }

  if (lineaActual) lineas.push(lineaActual)
  return lineas
}

async function convertirAWebp(bufferPng) {
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

export default async function stickertext({ sock, msg, args, chatId }) {
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chatId, {
      text: '❀ Responde a una imagen con *stickertext Tu texto aquí* para ponerle texto encima.',
    })
  }

  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'imageMessage') {
    return sock.sendMessage(chatId, {
      text: '❀ Responde a una imagen con *stickertext Tu texto aquí*.',
    })
  }

  try {
    const buffer = await descargarMedia(objetivo, sock.logger)
    const imagen = await Jimp.read(buffer)
    imagen.cover({ w: 512, h: 512 })

    const font = await loadFont(SANS_64_WHITE)
    const anchoMaximo = 470
    const lineas = partirLineas(font, texto.toUpperCase(), anchoMaximo)

    const altoLinea = 70
    const altoTotal = lineas.length * altoLinea
    let y = 512 - altoTotal - 20

    for (const linea of lineas) {
      const anchoLinea = measureText(font, linea)
      const x = Math.max(10, (512 - anchoLinea) / 2)
      imagen.print({ font, x, y, text: linea })
      y += altoLinea
    }

    const bufferPng = await imagen.getBuffer('image/png')
    const webpBuffer = await convertirAWebp(bufferPng)

    const img = new webp.Image()
    await img.load(webpBuffer)

    const json = {
      'sticker-pack-id': 'theyui-md-sticker',
      'sticker-pack-name': config.nombreBot,
      'sticker-pack-publisher': config.nombreBot,
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
    console.log('❌ Error creando sticker con texto:', err.message)

    if (err.code === 'ENOENT') {
      return sock.sendMessage(chatId, {
        text: '❌ Falta instalar la herramienta *webp* en el servidor.\nEjecuta: pkg install webp (Termux) o apt install webp (Linux/hosting).',
      })
    }

    await sock.sendMessage(chatId, { text: '❌ No pude crear el sticker con texto.' })
  }
}