import { exec } from 'child_process'
import { promisify } from 'util'
import config from '../config.js'

const execAsync = promisify(exec)
let actualizando = false

export async function checkUpdate(sock) {
  if (actualizando) return
  
  try {
    await execAsync('git fetch')
    const { stdout: local } = await execAsync('git rev-parse HEAD')
    const { stdout: remote } = await execAsync('git rev-parse @{u}')
    
    if (local.trim() !== remote.trim()) {
      actualizando = true
      const ownerJid = `${config.owner[0]}@s.whatsapp.net`
      
      await sock.sendMessage(ownerJid, { text: '🔄 Detecté una nueva actualización en GitHub. Iniciando descarga automática...' })
      
      try {
        await execAsync('git add .')
        await execAsync('git stash')
        await execAsync('git pull')
        try {
          await execAsync('git stash pop')
        } catch (e) {}
        
        await sock.sendMessage(ownerJid, { text: '✅ Actualización descargada con éxito. Reiniciando núcleo para aplicar cambios...' })
        
        setTimeout(() => process.exit(0), 2000)
      } catch (err) {
        actualizando = false
        await sock.sendMessage(ownerJid, { text: `❌ Error en auto-update: ${err.message}` })
      }
    }
  } catch (err) {}
}

export function iniciarAutoUpdate(sock) {
  setInterval(() => checkUpdate(sock), 5 * 60 * 1000)
}
