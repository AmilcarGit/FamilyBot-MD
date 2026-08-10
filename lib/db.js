import fs from 'fs'
import config from '../config.js'
import { warn, error as logError } from './logger.js'

const datosPorDefecto = { users: {}, chats: {}, subbots: [], stats: {} }
const RETRASO_ESCRITURA_MS = 500
const MAX_BACKUPS = 3

let instancia = null
let timeoutEscritura = null
let escrituraPendiente = false

function rutaBackup(n) {
  return `${config.dbFile}.bak${n}`
}

function rotarBackups() {
  for (let i = MAX_BACKUPS; i >= 1; i--) {
    const origen = i === 1 ? config.dbFile : rutaBackup(i - 1)
    const destino = rutaBackup(i)
    if (fs.existsSync(origen)) {
      fs.copyFileSync(origen, destino)
    }
  }
}

function escribirAtomico(datos) {
  const rutaTemporal = `${config.dbFile}.tmp`
  fs.writeFileSync(rutaTemporal, JSON.stringify(datos, null, 2))
  fs.renameSync(rutaTemporal, config.dbFile)
}

function intentarRecuperarDeBackup() {
  for (let i = 1; i <= MAX_BACKUPS; i++) {
    const ruta = rutaBackup(i)
    if (!fs.existsSync(ruta)) continue

    try {
      const contenido = fs.readFileSync(ruta, 'utf-8')
      const datos = JSON.parse(contenido)
      warn(`⚠️ database.json estaba dañado, se recuperó desde ${ruta}`)
      return datos
    } catch {
      continue
    }
  }
  return null
}

function leerDatosIniciales() {
  if (!fs.existsSync(config.dbFile)) {
    return structuredClone(datosPorDefecto)
  }

  try {
    const contenido = fs.readFileSync(config.dbFile, 'utf-8')
    if (!contenido.trim()) return structuredClone(datosPorDefecto)
    return { ...structuredClone(datosPorDefecto), ...JSON.parse(contenido) }
  } catch (err) {
    logError('database.json está corrupto:', err.message)
    const recuperado = intentarRecuperarDeBackup()
    return recuperado
      ? { ...structuredClone(datosPorDefecto), ...recuperado }
      : structuredClone(datosPorDefecto)
  }
}

function guardarAhora() {
  escrituraPendiente = false

  try {
    rotarBackups()
    escribirAtomico(instancia.data)
  } catch (err) {
    logError('Error escribiendo database.json:', err.message)
  }
}

function programarEscritura() {
  escrituraPendiente = true

  if (timeoutEscritura) return

  timeoutEscritura = setTimeout(() => {
    timeoutEscritura = null
    if (escrituraPendiente) guardarAhora()
  }, RETRASO_ESCRITURA_MS)
}

export async function getDB() {
  if (instancia) return instancia

  const data = leerDatosIniciales()

  instancia = {
    data,
    async write() {
      programarEscritura()
    },
    async writeSync() {
      if (timeoutEscritura) {
        clearTimeout(timeoutEscritura)
        timeoutEscritura = null
      }
      guardarAhora()
    },
  }

  process.on('exit', () => {
    if (escrituraPendiente && timeoutEscritura) {
      clearTimeout(timeoutEscritura)
      guardarAhora()
    }
  })

  return instancia
}