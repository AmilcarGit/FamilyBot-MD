import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

const logFile = path.join(logDir, 'bot.log')
const logFileViejo = path.join(logDir, 'bot.log.old')
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024

function limpiar(valor) {
  return String(valor).replace(/\x1b\[[0-9;]*m/g, '')
}

function rotarSiHaceFalta() {
  try {
    const stats = fs.statSync(logFile)
    if (stats.size >= TAMANO_MAXIMO_BYTES) {
      fs.renameSync(logFile, logFileViejo)
    }
  } catch {}
}

function escribirArchivo(nivel, args) {
  rotarSiHaceFalta()

  const linea = `[${new Date().toISOString()}] [${nivel}] ${args
    .map(limpiar)
    .join(' ')}\n`
  fs.appendFile(logFile, linea, () => {})
}

export function info(...args) {
  console.log(...args)
  escribirArchivo('INFO', args)
}

export function warn(...args) {
  console.log(...args)
  escribirArchivo('WARN', args)
}

export function error(...args) {
  console.error(...args)
  escribirArchivo('ERROR', args)
}