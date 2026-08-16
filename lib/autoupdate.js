import { exec } from 'child_process'
import { promisify } from 'util'
import config from '../config.js'
import { info, warn, error as logError } from './logger.js'

const execAsync = promisify(exec)
let actualizando = false

export async function checkUpdate(sock) {
  if (actualizando) return

  try {
    await execAsync('git fetch')
    const { stdout: local } = await execAsync('git rev-parse HEAD')
    const { stdout: remote } = await execAsync('git rev-parse @{u}')

    if (local.trim() === remote.trim()) return

    const { stdout: estado } = await execAsync('git status --porcelain')

    if (estado.trim()) {
      warn('Hay actualización disponible pero existen cambios locales sin confirmar, se omite el auto-update.')
      return
    }

    actualizando = true
    const ownerJid = `${config.owner[0]}@s.whatsapp.net`

    await sock.sendMessage(ownerJid, { text: '🔄 Detecté una nueva actualización en GitHub. Iniciando descarga automática...' })

    try {
      await execAsync('git pull --ff-only')
      await sock.sendMessage(ownerJid, { text: '✅ Actualización descargada con éxito. Reiniciando núcleo para aplicar cambios...' })
      setTimeout(() => process.exit(0), 2000)
    } catch (err) {
      actualizando = false
      logError('Error en auto-update:', err)
      await sock.sendMessage(ownerJid, { text: `❌ No se pudo aplicar la actualización automáticamente (posible conflicto). Revísalo manualmente con git pull.\n\n${err.message}` })
    }
  } catch (err) {
    logError('Error verificando actualización:', err)
  }
}

export function iniciarAutoUpdate(sock) {
  setInterval(() => checkUpdate(sock), 5 * 60 * 1000)
}
