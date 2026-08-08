import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Sistema de economía. Subcomandos: saldo, depositar, retirar, minar, trabajar, cosechar'
export const alias = ['eco']
export const cooldown = 3

const COOLDOWN_MINAR_MS = 30 * 60 * 1000
const COOLDOWN_TRABAJAR_MS = 60 * 60 * 1000
const COOLDOWN_COSECHAR_MS = 45 * 60 * 1000

const MENSAJES_MINAR = [
  'Encontraste una veta de oro ⛏️',
  'Sacaste unos diamantes brillantes 💎',
  'Picaste piedra y hallaste plata 🪨',
  'Encontraste una gema rara en la mina 🔷',
]

const MENSAJES_TRABAJAR = [
  'Trabajaste como programador 💻',
  'Trabajaste repartiendo pedidos 🛵',
  'Trabajaste en una cafetería ☕',
  'Trabajaste como taxista 🚕',
]

const MENSAJES_COSECHAR = [
  'Cosechaste papas del campo 🥔',
  'Recogiste manzanas del árbol 🍎',
  'Cosechaste maíz dorado 🌽',
  'Recolectaste trigo para el pan 🌾',
]

async function obtenerUsuario(db, jid) {
  const jidNormalizado = normalizarJid(jid)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  db.data.users[jidNormalizado].economia ??= {
    saldo: 0,
    banco: 0,
    ultimoMinar: 0,
    ultimoTrabajar: 0,
    ultimoCosechar: 0,
  }
  await db.write()
  return db.data.users[jidNormalizado].economia
}

function formatearTiempoRestante(ms) {
  const minutos = Math.ceil(ms / 60000)
  if (minutos < 60) return `${minutos} minuto(s)`
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  return `${horas}h ${minutosRestantes}m`
}

async function actividadConCooldown({
  db,
  jid,
  campoCooldown,
  cooldownMs,
  minGanancia,
  maxGanancia,
  mensajes,
  emoji,
}) {
  const eco = await obtenerUsuario(db, jid)
  const ahora = Date.now()
  const restante = eco[campoCooldown] + cooldownMs - ahora

  if (restante > 0) {
    return { ok: false, texto: `⏳ Espera ${formatearTiempoRestante(restante)} para volver a hacer esto.` }
  }

  const ganancia = Math.floor(Math.random() * (maxGanancia - minGanancia + 1)) + minGanancia
  const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)]

  eco.saldo += ganancia
  eco[campoCooldown] = ahora
  await db.write()

  return {
    ok: true,
    texto: `${emoji} ${mensaje}\n💵 Ganaste ${ganancia} de efectivo.`,
  }
}

async function saldo({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  await sock.sendMessage(chatId, {
    text: `💰 *Tu economía*\n\n💵 Efectivo: ${eco.saldo}\n🏦 Banco: ${eco.banco}`,
  })
}

async function depositar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para depositar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  eco.saldo -= monto
  eco.banco += monto
  await db.write()

  await sock.sendMessage(chatId, { text: `✅ Depositaste ${monto} en el banco.` })
}

async function retirar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.banco) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para retirar (tienes ${eco.banco} en el banco).`,
    })
  }

  eco.banco -= monto
  eco.saldo += monto
  await db.write()

  await sock.sendMessage(chatId, { text: `✅ Retiraste ${monto} del banco.` })
}

async function minar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoMinar',
    cooldownMs: COOLDOWN_MINAR_MS,
    minGanancia: 50,
    maxGanancia: 200,
    mensajes: MENSAJES_MINAR,
    emoji: '⛏️',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}

async function trabajar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoTrabajar',
    cooldownMs: COOLDOWN_TRABAJAR_MS,
    minGanancia: 100,
    maxGanancia: 400,
    mensajes: MENSAJES_TRABAJAR,
    emoji: '💼',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}

async function cosechar({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const resultado = await actividadConCooldown({
    db,
    jid: jidRemitente,
    campoCooldown: 'ultimoCosechar',
    cooldownMs: COOLDOWN_COSECHAR_MS,
    minGanancia: 30,
    maxGanancia: 150,
    mensajes: MENSAJES_COSECHAR,
    emoji: '🌾',
  })

  await sock.sendMessage(chatId, { text: resultado.texto })
}

export const subcomandos = { saldo, depositar, retirar, minar, trabajar, cosechar }

export default async function economia({ sock, chatId, config }) {
  await sock.sendMessage(chatId, {
    text:
      `💰 *Sistema de economía*\n\n` +
      `Uso: *${config.prefijo}economia <subcomando>*\n\n` +
      `▢ saldo\n▢ depositar <monto>\n▢ retirar <monto>\n▢ minar (cada 30 min)\n▢ trabajar (cada 1 hora)\n▢ cosechar (cada 45 min)`,
  })
}
