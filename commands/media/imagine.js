export const desc = 'Genera una imagen a partir de texto usando IA.'
export const alias = ['dalle', 'iaimg', 'gen']
export const cooldown = 15

export default async function imagine({ sock, chatId, args, config }) {
  const text = args.join(' ').trim()
  
  if (!text) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa una descripción para la imagen.\nEjemplo: *${config.prefijo}imagine un gato en el espacio*`
    })
  }

  try {
    const apiKey = 'nyx_52Mp5ITkf_L7Nt9uO7bxsZ2vW5sh3jQu'
    const url = `https://nyxdlapi.vercel.app/api/tools/text2img?prompt=${encodeURIComponent(text)}&apikey=${apiKey}`
    
    await sock.sendMessage(chatId, { text: `🎨 Generando tu imagen de *${text}*, espera un momento...` })

    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.result?.image) {
      return sock.sendMessage(chatId, {
        text: `❌ No se pudo generar la imagen. La API podría estar saturada.`
      })
    }

    await sock.sendMessage(chatId, {
      image: { url: data.result.image },
      caption: `✨ *Resultado para:* ${text}\n🎨 *IA:* NyxDLaPI`
    })

  } catch (error) {
    console.error('Error en comando imagine:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al procesar la solicitud.`
    })
  }
}
