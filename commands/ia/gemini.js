export const desc = 'Habla con la inteligencia artificial Gemini.'
export const alias = ['ia', 'chat', 'yui']
export const cooldown = 5

export default async function gemini({ sock, chatId, args, config }) {
  const text = args.join(' ').trim()
  
  if (!text) {
    return sock.sendMessage(chatId, {
      text: `❌ Por favor, ingresa una pregunta o mensaje.\nEjemplo: *${config.prefijo}gemini hola, ¿quién eres?*`
    })
  }

  try {
    const apiKey = 'lem711'
    const url = `https://api.lempi.lat/ai/gemini?q=${encodeURIComponent(text)}&apikey=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (!data.status || !data.resultado?.respuesta) {
      return sock.sendMessage(chatId, {
        text: `❌ La IA no pudo responder en este momento. Inténtalo más tarde.`
      })
    }

    await sock.sendMessage(chatId, {
      text: data.resultado.respuesta
    })

  } catch (error) {
    console.error('Error en comando gemini:', error)
    await sock.sendMessage(chatId, {
      text: `❌ Ocurrió un error al consultar a la IA.`
    })
  }
}
