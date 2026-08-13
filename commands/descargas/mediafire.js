export const desc = 'Descarga archivos de MediaFire.'
export const alias = ['mf', 'mediaf']
export const cooldown = 10

export default async function mediafire({ sock, chatId, args, config }) {
  const urlInput = args[0]
  
  if (!urlInput || !urlInput.includes('mediafire.com')) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa un enlace válido de MediaFire.\nEjemplo: *${config.prefijo}mediafire https://www.mediafire.com/file/...*`
    })
  }

  try {
    const apiKey = 'evogb-jRhjmDSp'
    const apiUrl = `https://api.evogb.org/dl/mediafire?url=${encodeURIComponent(urlInput)}&key=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `⏳ Obteniendo información del archivo, espera un momento...` })

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data.status || !data.data?.dl) {
      return sock.sendMessage(chatId, {
        text: `❌ No se pudo obtener el enlace de descarga. Asegúrate de que el link sea público.`
      })
    }

    const { name, size, type, dl } = data.data
    const caption = `📁 *Nombre:* ${name}\n⚖️ *Tamaño:* ${size}\n📄 *Tipo:* ${type}\n\n📥 Enviando archivo...`

    await sock.sendMessage(chatId, { text: caption })

    await sock.sendMessage(chatId, {
      document: { url: dl },
      fileName: name,
      mimetype: 'application/octet-stream'
    }, { quoted: null })

  } catch (error) {
    console.error('Error en comando mediafire:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al procesar la descarga.`
    })
  }
}
