import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { info, error as logError } from './logger.js'

const CARPETA_BACKUPS = path.join(process.cwd(), 'backups')
const MAX_BACKUPS = 10

function asegurarCarpeta() {
  if (!fs.existsSync(CARPETA_BACKUPS)) {
    fs.mkdirSync(CARPETA_BACKUPS, { recursive: true })
  }
}

function timestamp() {
  const ahora = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}_${pad(ahora.getHours())}-${pad(ahora.getMinutes())}`
}

export function crearBackup() {
  asegurarCarpeta()

  if (!fs.existsSync(config.dbFile)) return null

  const nombreArchivo = `database-${timestamp()}.json`
  const rutaDestino = path.join(CARPETA_BACKUPS, nombreArchivo)

  fs.copyFileSync(config.dbFile, rutaDestino)

  const backups = fs
    .readdirSync(CARPETA_BACKUPS)
    .filter((f) => f.startsWith('database-'))
    .sort()

  while (backups.length > MAX_BACKUPS) {
    const viejo = backups.shift()
    fs.unlinkSync(path.join(CARPETA_BACKUPS, viejo))
  }

  return rutaDestino
}

export function iniciarBackupsAutomaticos(intervaloHoras = 6) {
  setInterval(() => {
    try {
      const ruta = crearBackup()
      if (ruta) info(`💾 Backup automático creado: ${ruta}`)
    } catch (err) {
      logError('Error creando backup automático:', err)
    }
  }, intervaloHoras * 60 * 60 * 1000)
}