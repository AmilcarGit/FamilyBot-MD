export const desc =
  'Envía un abrazo 🤗 usando la API de FamilyBot-MD'

export const alias = [
  'hug',
  'abrazo'
]

export const cooldown = 5

const API_BASE =
  'https://familybot-md-api.onrender.com'

const API_KEY =
  'familybot-md'

const API_URL =
  `${API_BASE}/api/anime/reaction?apiKey=${encodeURIComponent(API_KEY)}&type=hug`

const API_TIMEOUT = 30000

async function fetchWithTimeout(
  url,
  options = {},
  timeout = API_TIMEOUT
) {
  const controller =
    new AbortController()

  const timer =
    setTimeout(() => {
      controller.abort()
    }, timeout)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

async function getImage() {
  const response =
    await fetchWithTimeout(
      API_URL,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'FamilyBot-MD/1.0'
        }
      }
    )

  if (!response.ok) {
    throw new Error(
      `FamilyBot API HTTP ${response.status}`
    )
  }

  const contentType =
    response.headers.get(
      'content-type'
    ) || ''

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    throw new Error(
      'La API no devolvió JSON'
    )
  }

  const data =
    await response.json()

  if (
    !data ||
    data.status !== true
  ) {
    throw new Error(
      data?.message ||
      'La API no pudo obtener el abrazo'
    )
  }

  const imageUrl =
    data.url ||
    data.image ||
    data.imageUrl ||
    data.gif ||
    data.gifUrl

  if (!imageUrl) {
    throw new Error(
      'La API no devolvió una URL de imagen'
    )
  }

  try {
    new URL(imageUrl)
  } catch {
    throw new Error(
      'La API devolvió una URL inválida'
    )
  }

  const imageResponse =
    await fetchWithTimeout(
      imageUrl,
      {
        method: 'GET',
        headers: {
          Accept:
            'image/gif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent':
            'FamilyBot-MD/1.0'
        }
      }
    )

  if (!imageResponse.ok) {
    throw new Error(
      `El proxy respondió HTTP ${imageResponse.status}`
    )
  }

  const imageContentType =
    imageResponse.headers.get(
      'content-type'
    ) || ''

  if (
    !imageContentType
      .toLowerCase()
      .startsWith('image/')
  ) {
    throw new Error(
      `El proxy no devolvió una imagen (${imageContentType || 'sin content-type'})`
    )
  }

  const arrayBuffer =
    await imageResponse.arrayBuffer()

  const imageBuffer =
    Buffer.from(arrayBuffer)

  if (
    !imageBuffer ||
    imageBuffer.length === 0
  ) {
    throw new Error(
      'La imagen recibida está vacía'
    )
  }

  return {
    buffer: imageBuffer,
    contentType:
      imageContentType
  }
}

export default async function reaction({
  sock,
  chatId,
  m
}) {
  try {
    console.log(
      '🤗 Solicitando GIF de abrazo...'
    )

    const image =
      await getImage()

    console.log(
      `✅ GIF recibido: ${image.contentType}`
    )

    await sock.sendMessage(
      chatId,
      {
        video: image.buffer,
        gifPlayback: true,
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

    try {
      await sock.sendMessage(
        chatId,
        {
          text: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      🤗 𝐀𝐁𝐑𝐀𝐙𝐎
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔴 No se pudo obtener el abrazo.

╭─❖ ⚠️ 𝐃𝐄𝐓𝐀𝐋𝐋𝐄
│
│ La API no pudo entregar
│ el GIF en este momento.
│
│ 🔄 Intenta nuevamente.
│
╰──────────────────────

🌿 FamilyBot-MD