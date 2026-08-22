export const desc = 'Muestra el estado oficial de la API de FamilyBot-MD.'
export const alias = ['statusapi', 'api', 'estado', 'fbstatus']
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/status'
const API_KEY = 'familybot-md'

function formatUptime(seconds) {
  const total = Number(seconds) || 0

  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  const result = []

  if (days > 0) result.push(`${days}d`)
  if (hours > 0) result.push(`${hours}h`)
  if (minutes > 0) result.push(`${minutes}m`)

  result.push(`${secs}s`)

  return result.join(' ')
}

function formatDate(timestamp) {
  if (!timestamp) return 'Desconocida'

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Desconocida'
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'America/Lima'
  }).format(date)
}

function getStatus(status) {
  return status === true
    ? '🟢 ONLINE'
    : '🔴 OFFLINE'
}

function getBar(status) {
  return status === true
    ? '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩'
    : '🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥'
}

export default async function status({
  sock,
  chatId,
  m,
  config
}) {
  const start = Date.now()

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': API_KEY
      },
      signal: AbortSignal.timeout(15000)
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    const statusText = getStatus(data.status)
    const bar = getBar(data.status)
    const uptime = formatUptime(data.uptime_seconds)
    const users = Number(data.registeredUsers || 0)
      .toLocaleString('es-PE')

    const prefix = config?.prefijo || '.'

    const text = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      𝐀𝐏𝐈 𝐒𝐓𝐀𝐓𝐔𝐒
╰━━━━━━━━━━━━━━━━━━━━━━╯

          ${statusText}

${bar}

╭─❖ ⚙️ 𝐒𝐄𝐑𝐕𝐈𝐂𝐄
│
│ 🌐 Servicio
│   ${data.service || 'familybot-md-api'}
│
│ 📡 Estado
│   ${statusText}
│
│ ⏱️ Uptime
│   ${uptime}
│
│ 👥 Usuarios
│   ${users}
│
│ 🟩 Node.js
│   ${data.node_version || 'Desconocido'}
│
╰──────────────────────

╭─❖ ⚡ 𝐏𝐄𝐑𝐅𝐎𝐑𝐌𝐀𝐍𝐂𝐄
│
│ 📶 Latencia
│   ${responseTime} ms
│
│ 🔐 API Key
│   Protegida ✓
│
╰──────────────────────

╭─❖ 🕐 𝐔𝐏𝐃𝐀𝐓𝐄
│
│ ${formatDate(data.timestamp)}
│
╰──────────────────────

╭─❖ 🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓
│
│ 🤖 FamilyBot-MD
│ 👑 AmilcarGit
│ 🌐 Official API
│
╰──────────────────────

        ✦ ───────────── ✦
        𝐌𝐨𝐫𝐞 𝐭𝐡𝐚𝐧 𝐚 𝐛𝐨𝐭...
        𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲. 🌿
        ✦ ───────────── ✦
`.trim()

    await sock.sendMessage(
      chatId,
      {
        text,
        footer: '🌿 FamilyBot-MD • Official API',
        buttons: [
          {
            buttonId: `${prefix}status`,
            buttonText: {
              displayText: '🔄 Actualizar'
            },
            type: 1
          }
        ]
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      'FamilyBot-MD API Status Error:',
      error
    )

    const errorText = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃      𝐀𝐏𝐈 𝐒𝐓𝐀𝐓𝐔𝐒
╰━━━━━━━━━━━━━━━━━━━━━━╯

          🔴 𝐎𝐅𝐅𝐋𝐈𝐍𝐄

🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥

╭─❖ ⚠️ 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐈𝐎𝐍
│
│ No fue posible conectar
│ con la API oficial.
│
│ 🌐 familybot-md-api
│
│ 🔄 Intenta nuevamente
│ en unos segundos.
│
╰──────────────────────

╭─❖ 🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓
│
│ 👑 AmilcarGit
│ 🛡️ Official API
│
╰──────────────────────

        ✦ ───────────── ✦
        𝐌𝐨𝐫𝐞 𝐭𝐡𝐚𝐧 𝐚 𝐛𝐨𝐭...
        𝐖𝐞'𝐫𝐞 𝐟𝐚𝐦𝐢𝐥𝐲. 🌿
        ✦ ───────────── ✦
`.trim()

    await sock.sendMessage(
      chatId,
      {
        text: errorText,
        footer: '🌿 FamilyBot-MD • API Offline',
        buttons: [
          {
            buttonId: `${config?.prefijo || '.'}status`,
            buttonText: {
              displayText: '🔄 Reintentar'
            },
            type: 1
          }
        ]
      },
      {
        quoted: m
      }
    )
  }
}