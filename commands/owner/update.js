import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const desc = 'Actualiza el bot desde GitHub protegiendo los cambios locales'
export const cooldown = 0
export const soloOwner = true

export default async function update({ sock, chatId }) {
  await sock.sendMessage(chatId, { text: '🔄 Iniciando protocolo de actualización inteligente...' })

  try {
    await execAsync('git add .')
    await execAsync('git stash')
    
    const { stdout: pullOut } = await execAsync('git pull')
    
    try {
      await execAsync('git stash pop')
    } catch (stashErr) {
      console.log('Aviso: Conflicto menor al restaurar config.js, pero la actualización continuó.')
    }

    if (pullOut.includes('Already up to date')) {
      return sock.sendMessage(chatId, { text: '✅ El bot ya está en la última versión disponible.' })
    }

    const huboCambioPackage = pullOut.includes('package.json')
    let texto = `🚀 *Actualización Exitosa*\n\nSe han descargado las últimas mejoras del repositorio.\n\n`
    
    if (huboCambioPackage) {
      texto += `⚠️ *Importante:* Se detectaron cambios en las librerías. Ejecuta *npm install* en Termux y luego usa *restart*.`
    } else {
      texto += `💡 Usa el comando *restart* para aplicar los cambios ahora mismo.`
    }

    await sock.sendMessage(chatId, { text: texto })

  } catch (err) {
    console.error('Error crítico en actualización:', err)
    await sock.sendMessage(chatId, { 
      text: `❌ Error crítico al actualizar.\n\nDetalle: ${err.message}\n\nIntenta ejecutar *git stash && git pull && git stash pop* manualmente en Termux.` 
    })
  }
}
