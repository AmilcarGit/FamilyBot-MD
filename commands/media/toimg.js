import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { descargarMedia, obtenerMensajeCitado, tipoDeMedia } from '../../lib/media.js'

const execFileAsync = promisify(execFile)

export const desc = 'Convierte un sticker en imagen'
export const alias = ['toimage']
export const cooldown = 5

async function convertirWebpAPng(bufferWebp) {
  const carpetaTemp = os.tmpdir()
  const id = randomUUID()
  const rutaWebp = path.join(carpetaTemp, `theyui-${id}.webp`)
  const rutaPng = path.join(carpetaTemp, `theyui-${id}.png`)

  try {
    await fs.writeFile(rutaWebp, bufferWebp)
    await execFileAsync('dwebp', [rutaWebp, '-o', rutaPng])
    return await fs.readFile(rutaPng)
  } finally {
    await fs.unlink(rutaWebp).catch(() => {})
    await fs.unlink(rutaPng).catch(() => {})
  }
}

export default async function toimg({ sock, msg, chatId }) {
  const citado = obtenerMensajeCitado(msg)
  const objetivo = citado || msg
  const tipo = tipoDeMedia(objetivo)

  if (tipo !== 'stickerMessage') {
    return sock.sendMessage(chatId, {
      text: '❀ Responde a un sticker con *toimg* para convertirlo en imagen.',
    })
  }

  try {
    const bufferWebp = await descargarMedia(objetivo, sock.logger)
    const pngBuffer = await convertirWebpAPng(bufferWebp)

    await sock.sendMessage(chatId, { image: pngBuffer })
  } catch (err) {
    console.error('Error convirtiendo sticker:', err)

    if (err.code === 'ENOENT') {
      return sock.sendMessage(chatId, {
        text: '❌ Falta instalar la herramienta *webp* en el servidor.\nEjecuta: pkg install webp (Termux) o apt install webp (Linux/hosting).',
      })
    }

    await sock.sendMessage(chatId, { text: '❌ No pude convertir ese sticker.' })
  }
}
