export const desc = 'Envía un abrazo 🤗 usando la API oficial de FamilyBot-MD'
export const alias = ['hug', 'abrazo']
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/anime/reaction?apiKey=familybot-md&type=hug'

export default async function reaction({
  sock,
  chatId,
  m
}) {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json, image/gif, image/webp, image/png, image/jpeg, */*',
        'User-Agent': 'FamilyBot-MD/1.0'
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(
        `FamilyBot API HTTP ${response.status}`
      )
    }

    const contentType =
      response.headers.get('content-type') || ''

    let imageBuffer = null
    let imageUrl = null

    if (contentType.includes('image')) {
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      const data = await response.json()

      imageUrl =
        data.url ||
        data.image ||
        data.imageUrl ||
        data.gif ||
        data.gifUrl ||
        data.result?.url ||
        data.result?.image ||
        data.result?.gif ||
        data.data?.url ||
        data.data?.image ||
        data.data?.gif

      if (!imageUrl) {
        console.log(
          'Respuesta de FamilyBot-MD API:',
          data
        )

        throw new Error(
          'La API no devolvió una imagen'
        )
      }

      const imageResponse = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          Accept: 'image/gif, image/webp, image/png, image/jpeg, */*',
          'User-Agent': 'FamilyBot-MD/1.0'
        },
        signal: AbortSignal.timeout(30000)
      })

      if (!imageResponse.ok) {
        throw new Error(
          `La imagen respondió HTTP ${imageResponse.status}`
        )
      }

      const imageArrayBuffer =
        await imageResponse.arrayBuffer()

      imageBuffer = Buffer.from(imageArrayBuffer)
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error(
        'La imagen recibida está vacía'
      )
    }

    await sock.sendMessage(
      chatId,
      {
        image: imageBuffer,
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

        ✦ ───────────── ✦
        🌿 𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲.
        ✦ ───────────── ✦
`.trim()
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      '❌ Error en abrazo.js:',
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

🔴 *No se pudo obtener el abrazo.*

╭─❖ ⚠️ 𝐃𝐄𝐓𝐀𝐋𝐋𝐄
│
│ La API oficial no respondió
│ correctamente.
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