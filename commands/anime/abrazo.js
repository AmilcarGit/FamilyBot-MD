export const desc = 'Envía una reacción de abrazo 🤗'
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
    const url = `${API_URL}?apiKey=${encodeURIComponent(API_KEY)}&type=hug`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data) {
      throw new Error('La API no devolvió datos')
    }

    const imageUrl =
      data.url ||
      data.image ||
      data.imageUrl ||
      data.result?.url ||
      data.result?.image ||
      data.data?.url ||
      data.data?.image

    if (!imageUrl) {
      throw new Error('La API no devolvió una URL de imagen')
    }

    await sock.sendMessage(
      chatId,
      {
        image: {
          url: imageUrl
        },
        caption: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      🤗 𝐑𝐄𝐀𝐂𝐓𝐈𝐎𝐍
╰━━━━━━━━━━━━━━━━━━━━╯

      🤗 *¡Abrazo enviado!*

╭─❖ 💚 𝐑𝐄𝐀𝐂𝐂𝐈Ó𝐍
│
│ 🫂 Tipo: *Hug*
│ 🌐 API: *FamilyBot-MD*
│ ⚡ Estado: *Online*
│
╰────────────────────

        🌿 𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲. 💚
`.trim()
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      'Error en reaction.js:',
      error
    )

    await sock.sendMessage(
      chatId,
      {
        text: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      🤗 𝐑𝐄𝐀𝐂𝐓𝐈𝐎𝐍
╰━━━━━━━━━━━━━━━━━━━━╯

🔴 *No pude obtener el abrazo.*

⚠️ La API no respondió correctamente.
🔄 Inténtalo nuevamente en unos segundos.

╰─ 🌿 FamilyBot-MD
`.trim()
      },
      {
        quoted: m
      }
    )
  }
}