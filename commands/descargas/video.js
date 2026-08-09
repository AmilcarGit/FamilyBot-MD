import { Innertube, UniversalCache } from 'youtubei.js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { extraerIdYoutube } from '../../lib/utils.js'

const execFileAsync = promisify(execFile)

export const desc = 'Busca y descarga un video de YouTube'
export const alias = ['ytvideo']
export const cooldown = 8

const DELIRIUS_BASE = 'https://api.delirius.store/download/ytmp4'
const EDWARD_BASE = 'https://dv-edward.onrender.com/api/download/ytvideo'
const EDWARD_API_KEY = 'EdwardwEqIgrqU'
const TIMEOUT_MS = 15000

let clienteYt = null

async function obtenerCliente() {
  if (!clienteYt) {
    clienteYt = await Innertube.create({ cache: new UniversalCache(false) })
  }
  return clienteYt
}

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

async function repararMp4(bufferOriginal) {
  const carpetaTemp = os.tmpdir()
  const id = randomUUID()
  const rutaEntrada = path.join(carpetaTemp, `theyui-video-in-${id}.mp4`)
  const rutaSalida = path.join(carpetaTemp, `theyui-video-out-${id}.mp4`)

  try {
    await fs.writeFile(rutaEntrada, bufferOriginal)

    await execFileAsync('ffmpeg', [
      '-y',
      '-i', rutaEntrada,
      '-c', 'copy',
      '-movflags', '+faststart',
      rutaSalida,
    ])

    return await fs.readFile(rutaSalida)
  } finally {
    await fs.unlink(rutaEntrada).catch(() => {})
    await fs.unlink(rutaSalida).catch(() => {})
  }
}

export default async function video({ sock, chatId, args }) {
  const entrada = args.join(' ').trim()

  if (!entrada) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el nombre del video o pega un link de YouTube.\nEjemplo: video shape of you',
    })
  }

  const idDirecto = extraerIdYoutube(entrada)
  let youtubeUrl
  let tituloBusqueda = entrada

  if (idDirecto) {
    youtubeUrl = `https://www.youtube.com/watch?v=${idDirecto}`
  } else {
    await sock.sendMessage(chatId, { text: `🔎 Buscando *${entrada}*...` })

    let yt
    try {
      yt = await obtenerCliente()
    } catch (err) {
      return sock.sendMessage(chatId, { text: '❌ No pude conectar con YouTube.' })
    }

    let resultado
    try {
      const busqueda = await yt.search(entrada, { type: 'video' })
      resultado = busqueda?.videos?.[0]
    } catch (err) {
      return sock.sendMessage(chatId, { text: '❌ Ocurrió un error buscando en YouTube.' })
    }

    if (!resultado) {
      return sock.sendMessage(chatId, { text: '❌ No encontré resultados para esa búsqueda.' })
    }

    youtubeUrl = `https://www.youtube.com/watch?v=${resultado.id}`
    tituloBusqueda = resultado.title
  }

  let info = await intentarEdward(youtubeUrl)
  if (!info) {
    info = await intentarDelirius(youtubeUrl)
  }

  if (!info) {
    return sock.sendMessage(chatId, {
      text: `❌ No pude obtener el video con ninguna de las APIs.\n🔗 Puedes verlo directo aquí: ${youtubeUrl}`,
    })
  }

  let bufferDescargado
  const titulo = info.titulo || tituloBusqueda

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

  let bufferFinal = bufferDescargado

  try {
    bufferFinal = await repararMp4(bufferDescargado)
    console.log(`🛠️ Video reparado con ffmpeg → tamaño final: ${(bufferFinal.length / 1024 / 1024).toFixed(2)}MB`)
  } catch (err) {
    console.log('⚠️ ffmpeg no pudo reparar el video, se enviará el original:', err.message)

    if (err.code === 'ENOENT') {
      return sock.sendMessage(chatId, {
        text: '❌ Falta instalar *ffmpeg* en el servidor.\nEjecuta: pkg install ffmpeg (Termux) o apt install ffmpeg (Linux/hosting).',
      })
    }
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