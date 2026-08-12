import fs from 'fs'
import path from 'path'

export const desc = 'Muestra las últimas líneas del log del bot'
export const soloOwner = true
export const cooldown = 5

export default async function logs({ sock, args, chatId }) {
  const rutaLog = path.join(process.cwd(), 'logs', 'bot.log')

  if (!fs.existsSync(rutaLog)) {
    return sock.sendMessage(chatId, { text: '❌ No hay archivo de log todavía.' })
  }

  const cantidad = parseInt(args[0], 10) || 30
  const contenido = fs.readFileSync(rutaLog, 'utf-8')
  const lineas = contenido.trim().split('\n').slice(-cantidad)
  const texto = lineas.join('\n')

  if (texto.length > 3500) {
    return sock.sendMessage(chatId, {
      document: Buffer.from(texto, 'utf-8'),
      fileName: 'bot.log',
      mimetype: 'text/plain',
      caption: `📄 Últimas ${lineas.length} líneas (muy largo para texto, enviado como archivo).`,
    })
  }

  await sock.sendMessage(chatId, {
    text: `📄 *Últimas ${lineas.length} líneas del log*\n\n\`\`\`${texto}\`\`\``,
  })
}