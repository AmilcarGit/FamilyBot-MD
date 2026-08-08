import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

const logFile = path.join(logDir, 'bot.log')

function getTimestamp() {
  return new Date().toLocaleTimeString('es-ES', { hour12: false })
}

function limpiar(valor) {
  return String(valor).replace(/\x1b\[[0-9;]*m/g, '')
}

function escribirArchivo(nivel, args) {
  const linea = `[${new Date().toISOString()}] [${nivel}] ${args
    .map(limpiar)
    .join(' ')}\n`
  fs.appendFile(logFile, linea, () => {})
}

export function info(...args) {
  const ts = chalk.gray(`[${getTimestamp()}]`)
  const prefix = chalk.cyan('● INFO')
  console.log(ts, prefix, ...args)
  escribirArchivo('INFO', args)
}

export function warn(...args) {
  const ts = chalk.gray(`[${getTimestamp()}]`)
  const prefix = chalk.yellow('▲ WARN')
  console.log(ts, prefix, ...args)
  escribirArchivo('WARN', args)
}

export function error(...args) {
  const ts = chalk.gray(`[${getTimestamp()}]`)
  const prefix = chalk.red('■ ERROR')
  console.error(ts, prefix, ...args)
  escribirArchivo('ERROR', args)
}

export function logCustom(prefix, color, ...args) {
  const ts = chalk.gray(`[${getTimestamp()}]`)
  const pref = chalk[color](prefix)
  console.log(ts, pref, ...args)
  escribirArchivo(prefix, args)
}
