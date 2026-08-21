import fetch from 'node-fetch'
import * as Baileys from '@whiskeysockets/baileys'

const generateWAMessageFromContent =
  Baileys.generateWAMessageFromContent ||
  Baileys.default?.generateWAMessageFromContent

const prepareWAMessageMedia =
  Baileys.prepareWAMessageMedia ||
  Baileys.default?.prepareWAMessageMedia

export const desc =
  'Sistema Gacha con tickets, recompensas e imágenes'

export const alias = [
  'gacha',
  'rw',
  'roll'
]

export const cooldown = 5

const MAX_TICKETS = 10
const TICKET_INTERVAL = 30 * 60 * 1000
const DAILY_REWARD = 5
const DAILY_INTERVAL = 24 * 60 * 60 * 1000

const personajes = [
  {
    id: '001',
    nombre: 'Yui',
    rareza: 'COMMON',
    emoji: '⚪',
    poder: [100, 500]
  },
  {
    id: '002',
    nombre: 'Elyssia',
    rareza: 'UNCOMMON',
    emoji: '🟢',
    poder: [400, 900]
  },
  {
    id: '003',
    nombre: 'Kael',
    rareza: 'RARE',
    emoji: '🔵',
    poder: [800, 1500]
  },
  {
    id: '004',
    nombre: 'TheEly',
    rareza: 'EPIC',
    emoji: '🟣',
    poder: [1400, 2500]
  },
  {
    id: '005',
    nombre: 'Amilcar',
    rareza: 'LEGENDARY',
    emoji: '🟡',
    poder: [2500, 5000]
  },
  {
    id: '006',
    nombre: 'Family Guardian',
    rareza: 'MYTHIC',
    emoji: '🔴',
    poder: [5000, 9000]
  },
  {
    id: '007',
    nombre: 'Secret Yui',
    rareza: 'SECRET',
    emoji: '🌈',
    poder: [9000, 15000]
  }
]

const rarezas = [
  {
    nombre: 'COMMON',
    peso: 55
  },
  {
    nombre: 'UNCOMMON',
    peso: 25
  },
  {
    nombre: 'RARE',
    peso: 12
  },
  {
    nombre: 'EPIC',
    peso: 5
  },
  {
    nombre: 'LEGENDARY',
    peso: 2
  },
  {
    nombre: 'MYTHIC',
    peso: 0.8
  },
  {
    nombre: 'SECRET',
    peso: 0.2
  }
]

function random(min, max) {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min
}

function obtenerUsuario(db, jid) {
  if (!db.data.users) {
    db.data.users = {}
  }

  if (!db.data.users[jid]) {
    db.data.users[jid] = {}
  }

  const user =
    db.data.users[jid]

  if (!Array.isArray(user.gacha)) {
    user.gacha = []
  }

  if (
    typeof user.gachaTickets !==
    'number'
  ) {
    user.gachaTickets = 10
  }

  if (
    typeof user.gachaLastTicket !==
    'number'
  ) {
    user.gachaLastTicket = Date.now()
  }

  if (
    typeof user.gachaDailyClaim !==
    'number'
  ) {
    user.gachaDailyClaim = 0
  }

  return user
}

function actualizarTickets(user) {
  const ahora = Date.now()

  if (
    user.gachaTickets >=
    MAX_TICKETS
  ) {
    user.gachaTickets =
      MAX_TICKETS

    user.gachaLastTicket =
      ahora

    return 0
  }

  const transcurrido =
    ahora -
    user.gachaLastTicket

  if (
    transcurrido <
    TICKET_INTERVAL
  ) {
    return 0
  }

  const ticketsGanados =
    Math.floor(
      transcurrido /
        TICKET_INTERVAL
    )

  const espacio =
    MAX_TICKETS -
    user.gachaTickets

  const añadidos =
    Math.min(
      ticketsGanados,
      espacio
    )

  if (añadidos > 0) {
    user.gachaTickets +=
      añadidos

    user.gachaLastTicket =
      ahora
  }

  return añadidos
}

function tiempoProximoTicket(user) {
  if (
    user.gachaTickets >=
    MAX_TICKETS
  ) {
    return 'COMPLETO'
  }

  const ahora = Date.now()

  const transcurrido =
    ahora -
    user.gachaLastTicket

  const restante =
    Math.max(
      0,
      TICKET_INTERVAL -
        transcurrido
    )

  const minutos =
    Math.floor(
      restante / 60000
    )

  const segundos =
    Math.floor(
      (restante % 60000) /
        1000
    )

  return `${minutos}m ${segundos}s`
}

function puedeReclamar(user) {
  if (
    !user.gachaDailyClaim
  ) {
    return true
  }

  return (
    Date.now() -
      user.gachaDailyClaim >=
    DAILY_INTERVAL
  )
}

function tiempoRecompensa(user) {
  if (
    puedeReclamar(user)
  ) {
    return 'DISPONIBLE'
  }

  const restante =
    DAILY_INTERVAL -
    (
      Date.now() -
      user.gachaDailyClaim
    )

  const horas =
    Math.floor(
      restante /
        3600000
    )

  const minutos =
    Math.floor(
      (
        restante %
        3600000
      ) / 60000
    )

  return `${horas}h ${minutos}m`
}

function elegirRareza() {
  const total =
    rarezas.reduce(
      (a, b) =>
        a + b.peso,
      0
    )

  let valor =
    Math.random() *
    total

  for (
    const rareza of rarezas
  ) {
    valor -=
      rareza.peso

    if (
      valor <= 0
    ) {
      return rareza.nombre
    }
  }

  return 'COMMON'
}

function obtenerPersonaje() {
  const rareza =
    elegirRareza()

  const disponibles =
    personajes.filter(
      personaje =>
        personaje.rareza ===
        rareza
    )

  const lista =
    disponibles.length
      ? disponibles
      : personajes

  const personaje =
    lista[
      random(
        0,
        lista.length - 1
      )
    ]

  return {
    ...personaje,
    poder: random(
      personaje.poder[0],
      personaje.poder[1]
    ),
    fecha: Date.now()
  }
}

async function obtenerImagen() {
  try {
    const respuesta =
      await fetch(
        'https://nekos.best/api/v2/neko'
      )

    if (
      !respuesta.ok
    ) {
      return null
    }

    const data =
      await respuesta.json()

    if (
      !data.results ||
      !data.results.length
    ) {
      return null
    }

    return (
      data.results[0].url ||
      null
    )
  } catch (error) {
    console.error(
      '❌ Error obteniendo imagen:',
      error
    )

    return null
  }
}

function crearBotones(
  config,
  botones
) {
  const prefijo =
    config?.prefijo || '.'

  return botones.map(
    boton => ({
      name:
        'quick_reply',
      buttonParamsJson:
        JSON.stringify({
          display_text:
            boton.text,
          id:
            `${prefijo}${boton.id}`
        })
    })
  )
}

async function enviarMensaje({
  sock,
  chatId,
  msg,
  config,
  titulo,
  texto,
  imagen,
  botones
}) {
  try {
    let media = null

    if (imagen) {
      try {
        media =
          await prepareWAMessageMedia(
            {
              image: {
                url: imagen
              }
            },
            {
              upload:
                sock.waUploadToServer
            }
          )
      } catch (error) {
        console.error(
          '❌ Error preparando imagen:',
          error
        )
      }
    }

    const buttons =
      crearBotones(
        config,
        botones
      )

    const interactiveMessage = {
      body: {
        text: texto
      },
      footer: {
        text:
          config?.nombreBot ||
          'FamilyBot-MD'
      },
      header: {
        title: titulo,
        hasMediaAttachment:
          !!media,
        imageMessage:
          media
            ? media.imageMessage
            : null
      },
      nativeFlowMessage: {
        buttons
      }
    }

    const message =
      generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage
            }
          }
        },
        {
          quoted: msg
        }
      )

    await sock.relayMessage(
      chatId,
      message.message,
      {
        messageId:
          message.key.id
      }
    )
  } catch (error) {
    console.error(
      '❌ Error enviando Gacha:',
      error
    )

    await sock.sendMessage(
      chatId,
      {
        text: texto
      },
      {
        quoted: msg
      }
    )
  }
}

function botonesPrincipales() {
  return [
    {
      text:
        '🎴 GACHA ×1',
      id:
        'gacha 1'
    },
    {
      text:
        '🌟 GACHA ×10',
      id:
        'gacha 10'
    },
    {
      text:
        '🎁 RECLAMAR',
      id:
        'gacha claim'
    },
    {
      text:
        '🎒 COLECCIÓN',
      id:
        'gacha coleccion'
    }
  ]
}

export default async function gacha({
  sock,
  chatId,
  args,
  msg,
  config,
  db
}) {
  const jid =
    msg?.key?.participant ||
    msg?.key?.remoteJid

  if (!jid) {
    return
  }

  const user =
    obtenerUsuario(
      db,
      jid
    )

  actualizarTickets(user)

  const accion =
    args?.join(' ')
      ?.toLowerCase()
      ?.trim() ||
    'menu'

  if (
    accion === 'menu' ||
    accion === 'help' ||
    accion === 'ayuda'
  ) {
    const texto = `
╭━━〔 🎴 *FAMILY GACHA* 〕━━╮

👤 Jugador:
@${jid.split('@')[0]}

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

⏰ Próximo ticket:
*${tiempoProximoTicket(user)}*

🎁 Recompensa diaria:
*${tiempoRecompensa(user)}*

🎒 Colección:
*${user.gacha.length}*

━━━━━━━━━━━━━━━━━━━━

💎 *RAREZAS*

⚪ COMMON
🟢 UNCOMMON
🔵 RARE
🟣 EPIC
🟡 LEGENDARY
🔴 MYTHIC
🌈 SECRET

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '🎴 FAMILY GACHA',
      texto,
      imagen:
        await obtenerImagen(),
      botones:
        botonesPrincipales()
    })
  }

  if (
    accion === 'claim' ||
    accion === 'reclamar' ||
    accion === 'daily'
  ) {
    actualizarTickets(user)

    if (
      !puedeReclamar(user)
    ) {
      const texto = `
╭━━〔 🎁 *RECOMPENSA DIARIA* 〕━━╮

⏳ Todavía no puedes reclamar.

🕐 Disponible en:
*${tiempoRecompensa(user)}*

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo:
          '🎁 RECOMPENSA DIARIA',
        texto,
        imagen:
          await obtenerImagen(),
        botones: [
          {
            text:
              '🎴 GACHA ×1',
            id:
              'gacha 1'
          },
          {
            text:
              '🏠 MENÚ',
            id:
              'gacha'
          }
        ]
      })
    }

    const antes =
      user.gachaTickets

    user.gachaTickets =
      Math.min(
        MAX_TICKETS,
        user.gachaTickets +
          DAILY_REWARD
      )

    user.gachaDailyClaim =
      Date.now()

    const recibidos =
      user.gachaTickets -
      antes

    const texto = `
╭━━〔 🎁 *RECOMPENSA DIARIA* 〕━━╮

✨ *¡RECOMPENSA RECIBIDA!*

🎟️ Tickets obtenidos:
*+${recibidos}*

🎟️ Tickets actuales:
*${user.gachaTickets}/${MAX_TICKETS}*

⏰ Próxima recompensa:
*24 horas*

🌿 ¡Vuelve mañana!

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '🎁 RECOMPENSA DIARIA',
      texto,
      imagen:
        await obtenerImagen(),
      botones: [
        {
          text:
            '🎴 GACHA ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 GACHA ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🏠 MENÚ',
          id:
            'gacha'
        }
      ]
    })
  }

  if (
    accion === '1' ||
    accion === 'x1'
  ) {
    actualizarTickets(user)

    if (
      user.gachaTickets < 1
    ) {
      const texto = `
╭━━〔 🎟️ *SIN TICKETS* 〕━━╮

❌ Te quedaste sin tickets.

⏰ Próximo ticket:
*${tiempoProximoTicket(user)}*

🎁 Recompensa diaria:
*${tiempoRecompensa(user)}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo:
          '🎟️ SIN TICKETS',
        texto,
        imagen:
          await obtenerImagen(),
        botones: [
          {
            text:
              '🎁 RECLAMAR',
            id:
              'gacha claim'
          },
          {
            text:
              '🏠 MENÚ',
            id:
              'gacha'
          }
        ]
      })
    }

    user.gachaTickets--

    const personaje =
      obtenerPersonaje()

    const imagen =
      await obtenerImagen()

    personaje.imagen =
      imagen

    user.gacha.push(
      personaje
    )

    const texto = `
╭━━〔 ✨ *NUEVA OBTENCIÓN* 〕━━╮

${personaje.emoji} *${personaje.nombre}*

💎 Rareza:
*${personaje.rareza}*

⭐ Poder:
*${personaje.poder.toLocaleString()}*

🆔 ID:
*#${personaje.id}*

━━━━━━━━━━━━━━━━━━━━

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

⏰ Próximo:
*${tiempoProximoTicket(user)}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        `🎴 ${personaje.nombre} #${personaje.id}`,
      texto,
      imagen,
      botones: [
        {
          text:
            '🔄 OTRA VEZ',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 GACHA ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎁 RECLAMAR',
          id:
            'gacha claim'
        }
      ]
    })
  }

  if (
    accion === '10' ||
    accion === 'x10'
  ) {
    actualizarTickets(user)

    if (
      user.gachaTickets < 10
    ) {
      const texto = `
╭━━〔 🎟️ *NO HAY SUFICIENTES* 〕━━╮

🌟 Gacha ×10 necesita:
*10 tickets*

🎟️ Actualmente:
*${user.gachaTickets}/${MAX_TICKETS}*

⏰ Próximo ticket:
*${tiempoProximoTicket(user)}*

🎁 Recompensa:
*${tiempoRecompensa(user)}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo:
          '🎟️ TICKETS INSUFICIENTES',
        texto,
        imagen:
          await obtenerImagen(),
        botones: [
          {
            text:
              '🎴 GACHA ×1',
            id:
              'gacha 1'
          },
          {
            text:
              '🎁 RECLAMAR',
            id:
              'gacha claim'
          }
        ]
      })
    }

    user.gachaTickets -= 10

    const resultados = []

    for (
      let i = 0;
      i < 10;
      i++
    ) {
      const personaje =
        obtenerPersonaje()

      const imagen =
        await obtenerImagen()

      personaje.imagen =
        imagen

      user.gacha.push(
        personaje
      )

      resultados.push(
        personaje
      )
    }

    const lista =
      resultados
        .map(
          (p, i) =>
            `${i + 1}. ${p.emoji} *${p.nombre}*\n` +
            `   💎 ${p.rareza}\n` +
            `   ⭐ ${p.poder.toLocaleString()}\n` +
            `   🆔 #${p.id}`
        )
        .join(
          '\n\n'
        )

    const imagenPrincipal =
      resultados.find(
        p => p.imagen
      )?.imagen ||
      null

    const texto = `
╭━━〔 🌟 *GACHA ×10* 〕━━╮

🎉 *¡DIEZ OBTENCIONES!*

${lista}

━━━━━━━━━━━━━━━━━━━━

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

⏰ Próximo:
*${tiempoProximoTicket(user)}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '🌟 FAMILY GACHA ×10',
      texto,
      imagen:
        imagenPrincipal,
      botones: [
        {
          text:
            '🔄 ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎴 ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🎁 RECLAMAR',
          id:
            'gacha claim'
        }
      ]
    })
  }

  if (
    accion === 'coleccion' ||
    accion === 'collection' ||
    accion === 'inventario'
  ) {
    const lista =
      user.gacha
        .slice(-10)
        .reverse()

    if (
      !lista.length
    ) {
      return enviarMensaje({
        sock,
        chatId,
        msg,
        config,
        titulo:
          '🎒 MI COLECCIÓN',
        texto: `
╭━━〔 🎒 *MI COLECCIÓN* 〕━━╮

📭 Todavía no tienes personajes.

🎴 ¡Haz tu primera tirada!

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim(),
        imagen:
          await obtenerImagen(),
        botones: [
          {
            text:
              '🎴 GACHA ×1',
            id:
              'gacha 1'
          },
          {
            text:
              '🌟 GACHA ×10',
            id:
              'gacha 10'
          }
        ]
      })
    }

    const texto = `
╭━━〔 🎒 *MI COLECCIÓN* 〕━━╮

👤 @${jid.split('@')[0]}

🎴 Total:
*${user.gacha.length}*

🎟️ Tickets:
*${user.gachaTickets}/${MAX_TICKETS}*

━━━━━━━━━━━━━━━━━━━━

${lista
  .map(
    (p, i) =>
      `${i + 1}. ${p.emoji} *${p.nombre}*\n` +
      `   💎 ${p.rareza} | ⭐ ${p.poder.toLocaleString()}`
  )
  .join('\n\n')}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    const imagen =
      lista.find(
        p => p.imagen
      )?.imagen ||
      await obtenerImagen()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '🎒 MI COLECCIÓN',
      texto,
      imagen,
      botones: [
        {
          text:
            '🎴 GACHA ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 GACHA ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎁 RECLAMAR',
          id:
            'gacha claim'
        }
      ]
    })
  }

  if (
    accion === 'ranking' ||
    accion === 'rank'
  ) {
    const ranking =
      Object.entries(
        db.data.users || {}
      )
        .map(
          ([jid, user]) => ({
            jid,
            cantidad:
              Array.isArray(
                user.gacha
              )
                ? user.gacha.length
                : 0
          })
        )
        .filter(
          x =>
            x.cantidad > 0
        )
        .sort(
          (a, b) =>
            b.cantidad -
            a.cantidad
        )
        .slice(0, 10)

    const lista =
      ranking.length
        ? ranking
            .map(
              (x, i) => {
                const medalla =
                  i === 0
                    ? '🥇'
                    : i === 1
                      ? '🥈'
                      : i === 2
                        ? '🥉'
                        : '🏅'

                return (
                  `${medalla} *#${i + 1}* ` +
                  `@${x.jid.split('@')[0]}\n` +
                  `   🎴 ${x.cantidad} personajes`
                )
              }
            )
            .join(
              '\n\n'
            )
        : '📭 Todavía no hay jugadores.'

    const texto = `
╭━━〔 🏆 *GACHA RANKING* 〕━━╮

${lista}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    return enviarMensaje({
      sock,
      chatId,
      msg,
      config,
      titulo:
        '🏆 GACHA RANKING',
      texto,
      imagen:
        await obtenerImagen(),
      botones: [
        {
          text:
            '🎴 GACHA ×1',
          id:
            'gacha 1'
        },
        {
          text:
            '🌟 GACHA ×10',
          id:
            'gacha 10'
        },
        {
          text:
            '🎁 RECLAMAR',
          id:
            'gacha claim'
        }
      ]
    })
  }

  return enviarMensaje({
    sock,
    chatId,
    msg,
    config,
    titulo:
      '🎴 FAMILY GACHA',
    texto: `
❌ *OPCIÓN NO ENCONTRADA*

Usa:
*${config?.prefijo || '.'}gacha*
`.trim(),
    imagen:
      await obtenerImagen(),
    botones: [
      {
        text:
          '🎴 ABRIR GACHA',
        id:
          'gacha'
      },
      {
        text:
          '🎁 RECLAMAR',
        id:
          'gacha claim'
      }
    ]
  })
}