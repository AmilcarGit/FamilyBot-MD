export const desc = 'Envía un abrazo 🤗 usando la API oficial de FamilyBot-MD'
export const alias = ['hug', 'abrazo']
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/anime/reaction'
const API_KEY = 'familybot-md'

export default async function reaction({
  sock,
  chatId,
  m
}) {
  try {
    const apiUrl =
      `${API_URL}?apiKey=${encodeURIComponent(API_KEY)}&type=hug`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(20000)
    })

    if (!response.ok) {
      throw new Error(
        `FamilyBot API respondió HTTP ${response.status}`
      )
    }

    const data = await response.json()

    const imageUrl =
      data.url ||
      data.image ||
      data.imageUrl ||
      data.result?.url ||
      data.result?.image ||
      data.data?.url ||
      data.data?.image

    if (!imageUrl) {
      console.error(
        'Respuesta de FamilyBot API:',
        data
      )

      throw new Error(
        'La API no devolvió una URL de imagen'
      )
    }

    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        Accept: 'image/gif,image/webp,image/jpeg,image/png,*/*',
        'User-Agent': 'FamilyBot-MD/1.0'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!imageResponse.ok) {
      throw new Error(
        `No se pudo descargar la imagen: HTTP ${imageResponse.status}`
      )
    }

    const contentType =
      imageResponse.headers.get('content-type') || ''

    if (
      !contentType.includes('image') &&
      !contentType.includes('gif')
    ) {
      throw new Error(
        `La respuesta no es una imagen: ${contentType}`
      )
    }

    const arrayBuffer =
      await imageResponse.arrayBuffer()

    const buffer = Buffer.from(arrayBuffer)

    if (!buffer.length) {
      throw new Error(
        'La imagen descargada está vacía'
      )
    }

    await sock.sendMessage(
      chatId,
      {
        image: buffer,
        caption: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      🤗 𝐀𝐁𝐑𝐀𝐙𝐎
╰━━━━━━━━━━━━━━━━━━━━━━╯

        🫂 ¡Abrazo enviado!

╭─❖ 💚 𝐑𝐄𝐀𝐂𝐂𝐈Ó𝐍
│
│ 🤗 Tipo: Hug
│ 🌐 API: FamilyBot-MD
│ 🟢 Estado: Online
│
╰──────────────────────

        🌿 𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲. 💚
`.trim()
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      '❌ Error en reaction.js:',
      error
    )

    await sock.sendMessage(
      chatId,
      {
        text: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      🤗 𝐀𝐁𝐑𝐀𝐙𝐎
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔴 No pude obtener el abrazo.

╭─❖ ⚠️ 𝐄𝐑𝐑𝐎𝐑
│
│ La API o la imagen no
│ respondió correctamente.
│
│ 🔄 Intenta nuevamente.
│
╰──────────────────────

🌿 FamilyBot-MD
`.trim()
      },
      {
        quoted: m
      }
    )
  }
}