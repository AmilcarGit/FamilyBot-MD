import fetch from 'node-fetch'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const ejecutar = promisify(execFile)

export const desc = 'Envía un abrazo animado con una reacción anime'
export const alias = ['hug', 'abrazar']
export const categoria = 'social'
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/anime/reaction'
const API_KEY = 'familybot-md'

function extraerUrl(data) {
  const valores = [
    data?.url,
    data?.image,
    data?.imageUrl,
    data?.gif,
    data?.video,
    data?.data?.url,
    data?.data?.image,
    data?.data?.imageUrl,
    data?.data?.gif,
    data?.data?.video,
    data?.result?.url,
    data?.result?.image,
    data?.result?.imageUrl,
    data?.result?.gif,
    data?.result?.video,
    data?.resultado?.url,
    data?.resultado?.image,
    data?.resultado?.gif,
    data?.resultado?.video
  ]

  return valores.find(valor => {
    return typeof valor === 'string' && /^https?:\/\//i.test(valor)
  }) || null
}

function obtenerMencion(msg) {
  const contexto = msg?.message?.extendedTextMessage?.contextInfo || msg?.message?.contextInfo || {}
  return contexto.mentionedJid?.[0] || null
}

async function convertirAnimacion(mediaUrl) {
  const respuesta = await fetch(mediaUrl, {
    headers: {
      accept: 'image/gif,video/*,application/octet-stream',
      'user-agent': 'FamilyBot-MD/1.0'
    }
  })

  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar la animación: HTTP ${respuesta.status}`)
  }

  const contenido = Buffer.from(await respuesta.arrayBuffer())
  if (!contenido.length) {
    throw new Error('La animación descargada está vacía')
  }

  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'familybot-hug-'))
  const entrada = path.join(carpeta, `${crypto.randomUUID()}.gif`)
  const salida = path.join(carpeta, `${crypto.randomUUID()}.mp4`)

  try {
    await fs.writeFile(entrada, contenido)

    await ejecutar('ffmpeg', [
      '-y',
      '-i', entrada,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-movflags', 'faststart',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      salida
    ])

    return await fs.readFile(salida)
  } finally {
    await fs.rm(carpeta, { recursive: true, force: true })
  }
}

export default async function abrazo({ sock, chatId, msg, config }) {
  try {
    const mencionado = obtenerMencion(msg)
    const nombreBot = config?.nombreBot || 'FamilyBot-MD'
    const endpoint = `${API_URL}?apiKey=${encodeURIComponent(API_KEY)}&type=hug`

    await sock.sendMessage(chatId, {
      text: '🫂 *Preparando y convirtiendo el abrazo animado...*'
    }, { quoted: msg })

    const respuesta = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
        'user-agent': 'FamilyBot-MD/1.0'
      }
    })

    const contenido = await respuesta.text()

    if (!respuesta.ok) {
      throw new Error(`La API respondió con HTTP ${respuesta.status}`)
    }

    let data
    try {
      data = JSON.parse(contenido)
    } catch {
      throw new Error('La API no devolvió JSON válido')
    }

    const mediaUrl = extraerUrl(data)
    if (!mediaUrl) {
      throw new Error('La respuesta no contiene una URL multimedia')
    }

    const video = await convertirAnimacion(mediaUrl)
    const texto = mencionado
      ? `🫂 *Abrazo neural*\n\n@${mencionado.split('@')[0]} recibió un abrazo de la familia.\n\n✨ *Powered by ${nombreBot}*`
      : `🫂 *Abrazo neural*\n\nUn abrazo para toda la familia.\n\n✨ *Powered by ${nombreBot}*`

    await sock.sendMessage(chatId, {
      video,
      mimetype: 'video/mp4',
      gifPlayback: true,
      caption: texto,
      mentions: mencionado ? [mencionado] : []
    }, { quoted: msg })
  } catch (error) {
    console.error('Error en abrazo:', error.message)

    await sock.sendMessage(chatId, {
      text: '❌ No pude convertir o enviar el GIF del abrazo. Verifica que FFmpeg esté instalado y que la API devuelva una URL multimedia.'
    }, { quoted: msg })
  }
}
