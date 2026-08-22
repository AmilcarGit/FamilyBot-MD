export const desc = 'Muestra el estado oficial de la API de FamilyBot-MD.'
export const alias = ['statusapi', 'api', 'estado', 'fbstatus']
export const cooldown = 5

const API_URL = 'https://familybot-md-api.onrender.com/api/status'

function formatoUptime(segundos) {
  const total = Number(segundos) || 0

  const dias = Math.floor(total / 86400)
  const horas = Math.floor((total % 86400) / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundosRestantes = total % 60

  const partes = []

  if (dias > 0) partes.push(`${dias}d`)
  if (horas > 0) partes.push(`${horas}h`)
  if (minutos > 0) partes.push(`${minutos}m`)
  partes.push(`${segundosRestantes}s`)

  return partes.join(' ')
}

function formatoFecha(timestamp) {
  if (!timestamp) return 'Desconocida'

  const fecha = new Date(timestamp)

  if (Number.isNaN(fecha.getTime())) {
    return 'Desconocida'
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'America/Lima'
  }).format(fecha)
}

function obtenerEstado(status) {
  return status === true
    ? '🟢 ONLINE'
    : '🔴 OFFLINE'
}

function obtenerBarra(status) {
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
  const inicio = Date.now()

  const apiKey =
    process.env.FAMILYBOT_API_KEY ||
    process.env.FAMILYBOT_KEY ||
    ''

  try {
    const headers = {
      Accept: 'application/json'
    }

    if (apiKey) {
      headers['x-api-key'] = apiKey
    }

    const response = await fetch(API_URL, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000)
    })

    const tiempoRespuesta = Date.now() - inicio

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      )
    }

    const data = await response.json()

    const estado = obtenerEstado(data.status)
    const barra = obtenerBarra(data.status)
    const uptime = formatoUptime(
      data.uptime_seconds
    )

    const texto = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃     𝐀𝐏𝐈 𝐒𝐓𝐀𝐓𝐔𝐒
╰━━━━━━━━━━━━━━━━━━━━━━╯

        ${estado}

${barra}

╭─❖ ⚙️ 𝐒𝐄𝐑𝐕𝐈𝐂𝐄
│
│ 🌐 Servicio
│   ${data.service || 'familybot-md-api'}
│
│ 🟢 Estado
│   ${estado}
│
│ ⏱️ Uptime
│   ${uptime}
│
│ 👥 Usuarios registrados
│   ${Number(
    data.registeredUsers || 0
  ).toLocaleString('es-PE')}
│
│ 🟩 Node.js
│   ${data.node_version || 'Desconocido'}
│
╰──────────────────────

╭─❖ ⚡ 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐈𝐎𝐍
│
│ 📡 Respuesta
│   ${tiempoRespuesta} ms
│
│ 🔐 API
│   ${apiKey ? 'Protegida' : 'Pública'}
│
╰──────────────────────

╭─❖ 🕐 𝐋𝐀𝐒𝐓 𝐔𝐏𝐃𝐀𝐓𝐄
│
│ ${formatoFecha(data.timestamp)}
│
╰──────────────────────

╭─❖ 🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓
│
│ 🤖 ${config?.nombreBot || 'FamilyBot-MD'}
│ 👑 AmilcarGit
│ 🚀 Official API
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
        text: texto,
        buttons: [
          {
            buttonId: `${config?.prefijo || '.'}status`,
            buttonText: {
              displayText: '🔄 ACTUALIZAR'
            },
            type: 1
          }
        ],
        footer:
          '🌿 FamilyBot-MD • Official API'
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      '❌ Error en FamilyBot-MD API Status:',
      error
    )

    const textoError = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌿 𝐅𝐀𝐌𝐈𝐋𝐘𝐁𝐎𝐓-𝐌𝐃
┃     𝐀𝐏𝐈 𝐒𝐓𝐀𝐓𝐔𝐒
╰━━━━━━━━━━━━━━━━━━━━━━╯

        🔴 𝐎𝐅𝐅𝐋𝐈𝐍𝐄

╭─❖ ⚠️ 𝐄𝐑𝐑𝐎𝐑
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
`.trim()

    await sock.sendMessage(
      chatId,
      {
        text: textoError,
        footer:
          '🌿 FamilyBot-MD • API Offline'
      },
      {
        quoted: m
      }
    )
  }
}