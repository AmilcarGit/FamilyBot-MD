import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { extraerIdYoutube } from '../../lib/utils.js'

const execFileAsync = promisify(execFile)

export const desc = 'Descarga un video de YouTube a partir de un link'
export const alias = ['ytvideo']
export const cooldown = 8

const DELIRIUS_BASE = 'https://api.delirius.store/download/ytmp4'
const EDWARD_BASE = 'https://dv-edward.onrender.com/api/download/ytvideo'
const EDWARD_API_KEY = 'EdwardwEqIgrqU'
const TIMEOUT_MS = 15000

async function fetchConTimeout(url, opciones = {}) {
  const controlador = new AbortController()
  const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, { ...opciones, signal: controlador.signal })
  } finally {
    clearTimeout(idTimeout)
  }
}

function extraerDatosDelirius(json) {
  const data = json?.data || json?.result || json

  const url =
    data?.download?.url ||
    data?.download_url ||
    data?.dl_url ||
    data?.url ||
    (typeof data?.download === 'string' ? data.download : null)

  const titulo = data?.title || data?.judul || data?.videoTitle
  const calidad = data?.quality || data?.download?.quality || data?.resolution

  return { url, titulo, calidad }
}

async function intentarEdward(youtubeUrl) {
  console.log('🎬 Intentando descargar con Edward...')
  try {
    const apiUrl = `${EDWARD_BASE}?url=${encodeURIComponent(youtubeUrl)}&apiKey=${EDWARD_API_KEY}`
    const respuesta = await fetchConTimeout(apiUrl)
    const json = await respuesta.json()

    if (!json?.status || !json?.result?.download_url) {
      console.log('⚠️ Edward no trajo download_url:', JSON.stringify(json))
      return null
    }

    console.log('✅ Edward respondió correctamente.')
    return {
      url: json.result.download_url,
      titulo: json.result.title,
      calidad: json.result.quality,
      fuente: 'edward',
    }
  } catch (err) {
    console.log('❌ Falló Edward:', err.message)
    return null
  }
}

async function intentarDelirius(youtubeUrl) {
  console.log('🎬 Intentando descargar con Delirius...')
  try {
    const apiUrl = `${DELIRIUS_BASE}?url=${encodeURIComponent(youtubeUrl)}`
    const respuesta = await fetchConTimeout(apiUrl)
    const json = await respuesta.json()
    const { url, titulo, calidad } = extraerDatosDelirius(json)

    if (!url) {
      console.log('⚠️ Delirius no trajo download_url:', JSON.stringify(json))
      return null
    }

    console.log('✅ Delirius respondió correctamente.')
    return { url, titulo, calidad, fuente: 'delirius' }
  } catch (err) {
    console.log('❌ Falló Delirius:', err.message)
    return null
  }
}

async function remuxRapido(rutaEntrada, rutaSalida) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', rutaEntrada,
    '-c', 'copy',
    '-movflags', '+faststart',
    rutaSalida,
  ])
}

async function reencodarCompleto(rutaEntrada, rutaSalida) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', rutaEntrada,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    rutaSalida,
  ])
}

async function repararMp4(bufferOriginal) {
  const carpetaTemp = os.tmpdir()
  const id = randomUUID()
  const rutaEntrada = path.join(carpetaTemp, `theyui-video-in-${id}.mp4`)
  const rutaSalida = path.join(carpetaTemp, `theyui-video-out-${id}.mp4`)

  try {
    await fs.writeFile(rutaEntrada, bufferOriginal)

    try {
      await remuxRapido(rutaEntrada, rutaSalida)
      return await fs.readFile(rutaSalida)
    } catch (errRemux) {
      if (errRemux.code === 'ENOENT') throw errRemux

      console.log('⚠️ Remux rápido falló, intentando recodificar completo:', errRemux.stderr?.slice(-300) || errRemux.message)
      await fs.unlink(rutaSalida).catch(() => {})

      await reencodarCompleto(rutaEntrada, rutaSalida)
      return await fs.readFile(rutaSalida)
    }
  } finally {
    await fs.unlink(rutaEntrada).catch(() => {})
    await fs.unlink(rutaSalida).catch(() => {})
  }
}

export default async function video({ sock, chatId, args }) {
  const entrada = args.join(' ').trim()
  const idDirecto = extraerIdYoutube(entrada)

  if (!idDirecto) {
    return sock.sendMessage(chatId, {
      text: '❀ Pega un link de YouTube.\nEjemplo: video https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${idDirecto}`

  let info = await intentarEdward(youtubeUrl)
  if (!info) {
    info = await intentarDelirius(youtubeUrl)
  }

  if (!info) {
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video con ninguna de las APIs.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  const titulo = info.titulo || 'Video de YouTube'
  let bufferDescargado

  try {
    const videoRes = await fetchConTimeout(info.url)
    if (!videoRes.ok) throw new Error(`La descarga respondió ${videoRes.status}`)

    bufferDescargado = Buffer.from(await videoRes.arrayBuffer())

    console.log(
      `📦 Archivo recibido (fuente: ${info.fuente}) → tamaño: ${(bufferDescargado.length / 1024 / 1024).toFixed(2)}MB`
    )

    if (bufferDescargado.length < 50 * 1024) {
      console.log('⚠️ Archivo demasiado pequeño, primeros bytes:', bufferDescargado.subarray(0, 40).toString('utf8'))
      return sock.sendMessage(chatId, {
        text: `❌ La API devolvió un archivo demasiado pequeño (fuente: ${info.fuente}).\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
      })
    }
  } catch (err) {
    console.log(`❌ Falló la descarga del archivo (fuente: ${info.fuente}):`, err.message)
    return sock.sendMessage(chatId, {
      text: `❌ No pude descargar el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  let bufferFinal

  try {
    bufferFinal = await repararMp4(bufferDescargado)
    console.log(`🛠️ Video reparado → tamaño final: ${(bufferFinal.length / 1024 / 1024).toFixed(2)}MB`)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return sock.sendMessage(chatId, {
        text: '❌ Falta instalar *ffmpeg* en el servidor.\nEjecuta: pkg install ffmpeg (Termux) o apt install ffmpeg (Linux/hosting).',
      })
    }

    console.log('❌ ffmpeg no pudo reparar el video ni recodificando:', err.stderr?.slice(-300) || err.message)
    return sock.sendMessage(chatId, {
      text: `❌ El video que entregó la API venía dañado y no se pudo reparar (fuente: ${info.fuente}).\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  try {
    await sock.sendMessage(chatId, {
      video: bufferFinal,
      mimetype: 'video/mp4',
      caption: `🎬 *${titulo}*${info.calidad ? `\n📺 Calidad: ${info.calidad}` : ''}`,
    })
  } catch (err) {
    console.log('❌ Falló el envío del video:', err.message)
    await sock.sendMessage(chatId, {
      text: `❌ No pude enviar el video.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }
}