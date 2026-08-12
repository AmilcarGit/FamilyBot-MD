import { crearBackup } from '../../lib/backup.js'

export const desc = 'Crea un backup manual de la base de datos y lo envía'
export const soloOwner = true
export const cooldown = 10

export default async function backup({ sock, chatId }) {
  try {
    const ruta = crearBackup()

    if (!ruta) {
      return sock.sendMessage(chatId, { text: '❌ No encontré la base de datos para respaldar.' })
    }

    await sock.sendMessage(chatId, {
      document: { url: ruta },
      fileName: ruta.split('/').pop(),
      mimetype: 'application/json',
      caption: '💾 Backup de la base de datos.',
    })
  } catch (err) {
    console.log('❌ Error creando backup manual:', err.message)
    await sock.sendMessage(chatId, { text: '❌ No pude crear el backup.' })
  }
}