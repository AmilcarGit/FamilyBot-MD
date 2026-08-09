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
export const cooldown = 15

const DELIRIUS_BASE = 'https://api.delirius.store/download/ytmp4'
const EDWARD_BASE = 'https://dv-edward.onrender.com/api/download/ytvideo'
const EDWARD_API_KEY = 'EdwardwEqIgrqU'
const TIMEOUT_MS = 60000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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
  console.log('