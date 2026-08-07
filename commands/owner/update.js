import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const desc = 'Actualiza el bot desde el repositorio de GitHub (git pull)'
export const cooldown = 0
export const soloOwner = true

export default async function update({ sock, chatId }) {
  await sock.sendMessage(chatId, { text: '🔄 Buscando actualizaciones...' })

  let resultado
  try {
    resultado = await execFileAsync('git', ['pull'], { cwd: process.cwd() })
  } catch (err) {
    console.error('Error en git pull:', err)
    return sock.sendMessage(chatId, {
      text: `❌ No pude actualizar.\n\n${err.stderr || err.message}`,
    })
  }

  const salida = (resultado.stdout || resultado.stderr || '').trim()

  if (salida.includes('Already up to date')) {
    return sock.sendMessage(chatId, { text: '✅ El bot ya está actualizado, no había nada nuevo.' })
  }

  const huboCambioPackage = salida.includes('package.json')

  let texto = `✅ *Actualización completada*\n\n\`\`\`${salida.slice(0, 1000)}\`\`\``

  if (huboCambioPackage) {
    texto += `\n\n⚠️ *package.json* cambió — corre *npm install* manualmente en la terminal antes de reiniciar.`
  } else {
    texto += `\n\n💡 Usa *restart* para aplicar los cambios.`
  }

  await sock.sendMessage(chatId, { text: texto })
}