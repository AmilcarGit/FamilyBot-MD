import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'
import { FormData } from 'formdata-node'
import { fileFromSync } from 'fetch-blob'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export async function descargarMedia(msg, logger) {
  return downloadMediaMessage(msg, 'buffer', {}, { logger })
}

export function obtenerMensajeCitado(msg) {
  const contexto = msg.message?.extendedTextMessage?.contextInfo
  const citado = contexto?.quotedMessage
  if (!citado) return null

  return {
    key: {
      remoteJid: msg.key.remoteJid,
      id: contexto.stanzaId,
      participant: contexto.participant,
    },
    message: citado,
  }
}

export function tipoDeMedia(msg) {
  const tipo = Object.keys(msg?.message || {})[0]
  const tipos = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'stickerMessage',
    'documentMessage',
  ]
  return tipos.includes(tipo) ? tipo : null
}

export async function enviarImagen(sock, chatId, buffer, caption = '') {
  await sock.sendMessage(chatId, { image: buffer, caption })
}

export async function enviarVideo(sock, chatId, buffer, caption = '') {
  await sock.sendMessage(chatId, { video: buffer, caption })
}

export async function enviarAudio(sock, chatId, buffer, ptt = false) {
  await sock.sendMessage(chatId, { audio: buffer, mimetype: 'audio/mp4', ptt })
}

export async function enviarSticker(sock, chatId, buffer) {
  await sock.sendMessage(chatId, { sticker: buffer })
}

export async function subirACatbox(buffer) {
  const tempFile = path.join(os.tmpdir(), \`upload-\${Date.now()}.png\`)
  await fs.writeFile(tempFile, buffer)

  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', fileFromSync(tempFile))

  try {
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form
    })
    const url = await res.text()
    return url.trim()
  } finally {
    await fs.unlink(tempFile).catch(() => {})
  }
}
