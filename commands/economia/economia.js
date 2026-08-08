import { normalizarJid, obtenerJidMencionado } from '../../lib/utils.js'

export const desc = 'Sistema de economía. Subcomandos: saldo, depositar, retirar, minar, trabajar, cosechar'
export const alias = ['eco']
export const cooldown = 3

const COOLDOWN_MINAR_MS = 30 * 60 * 1000
const COOLDOWN_TRABAJAR_MS = 60 * 60 * 1000
const COOLDOWN_COSECHAR_MS = 45 * 60 * 1000
const COOLDOWN_ROBAR_MS = 20 * 60 * 1000
const COOLDOWN_DIARIO_MS = 24 * 60 * 60 * 1000

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
  const usuario = db.data.users[jidNormalizado]
  usuario.economia ??= {}
  usuario.economia.saldo ??= 0
  usuario.economia.banco ??= 0
  usuario.economia.ultimoMinar ??= 0
  usuario.economia.ultimoTrabajar ??= 0
  usuario.economia.ultimoCosechar ??= 0
  usuario.economia.ultimoRobar ??= 0
  usuario.economia.ultimoDiario ??= 0
  usuario.economia.racha ??= 0
  await db.write()
  return usuario.economia
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

async function robar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args)

  if (!jidObjetivo) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número de a quién quieres robar.',
    })
  }

  if (normalizarJid(jidObjetivo) === normalizarJid(jidRemitente)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes robarte a ti mismo.' })
  }

  const ecoLadron = await obtenerUsuario(db, jidRemitente)
  const ahora = Date.now()
  const restante = ecoLadron.ultimoRobar + COOLDOWN_ROBAR_MS - ahora

  if (restante > 0) {
    return sock.sendMessage(chatId, {
      text: `⏳ Espera ${formatearTiempoRestante(restante)} para volver a robar.`,
    })
  }

  const ecoVictima = await obtenerUsuario(db, jidObjetivo)

  if (ecoVictima.saldo < 100) {
    return sock.sendMessage(chatId, { text: '❌ Esa persona no tiene suficiente efectivo para robarle.' })
  }

  ecoLadron.ultimoRobar = ahora
  await db.write()

  const exito = Math.random() < 0.5

  if (exito) {
    const monto = Math.floor(Math.random() * (ecoVictima.saldo * 0.4)) + 1
    ecoVictima.saldo -= monto
    ecoLadron.saldo += monto
    await db.write()

    return sock.sendMessage(chatId, {
      text: `🦹 Robaste ${monto} de efectivo a @${jidObjetivo.split('@')[0]}.`,
      mentions: [jidObjetivo],
    })
  }

  const multa = Math.floor(Math.random() * 100) + 50
  ecoLadron.saldo = Math.max(0, ecoLadron.saldo - multa)
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🚨 Te atraparon robando a @${jidObjetivo.split('@')[0]} y pagaste una multa de ${multa}.`,
    mentions: [jidObjetivo],
  })
}

async function apostar({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const monto = parseInt(args[0], 10)
  if (!monto || monto <= 0 || monto > eco.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para apostar (tienes ${eco.saldo} en efectivo).`,
    })
  }

  const dadoUsuario = Math.floor(Math.random() * 6) + 1
  const dadoBot = Math.floor(Math.random() * 6) + 1

  let resultado
  if (dadoUsuario > dadoBot) {
    eco.saldo += monto
    resultado = `🎉 Ganaste ${monto} de efectivo.`
  } else if (dadoUsuario < dadoBot) {
    eco.saldo -= monto
    resultado = `😢 Perdiste ${monto} de efectivo.`
  } else {
    resultado = `🤝 Empate, recuperas tu apuesta.`
  }

  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎲 Tu dado: ${dadoUsuario} | Dado del bot: ${dadoBot}\n\n${resultado}`,
  })
}

async function transferir({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args)

  if (!jidObjetivo) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número a quién quieres transferir.',
    })
  }

  if (normalizarJid(jidObjetivo) === normalizarJid(jidRemitente)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes transferirte a ti mismo.' })
  }

  const montoTexto = args.find((a) => /^\d+$/.test(a))
  const monto = parseInt(montoTexto, 10)

  const ecoOrigen = await obtenerUsuario(db, jidRemitente)

  if (!monto || monto <= 0 || monto > ecoOrigen.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para transferir (tienes ${ecoOrigen.saldo} en efectivo).`,
    })
  }

  const ecoDestino = await obtenerUsuario(db, jidObjetivo)

  ecoOrigen.saldo -= monto
  ecoDestino.saldo += monto
  await db.write()

  await sock.sendMessage(chatId, {
    text: `✅ Transferiste ${monto} a @${jidObjetivo.split('@')[0]}.`,
    mentions: [jidObjetivo],
  })
}

async function diario({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const ahora = Date.now()
  const restante = eco.ultimoDiario + COOLDOWN_DIARIO_MS - ahora

  if (restante > 0) {
    return sock.sendMessage(chatId, {
      text: `⏳ Ya reclamaste tu diario. Vuelve en ${formatearTiempoRestante(restante)}.`,
    })
  }

  const unDiaMs = 24 * 60 * 60 * 1000
  const rachaActiva = eco.ultimoDiario > 0 && ahora - eco.ultimoDiario <= unDiaMs * 2
  eco.racha = rachaActiva ? (eco.racha || 0) + 1 : 1

  const bono = Math.min(eco.racha * 50, 500)
  const ganancia = 200 + bono

  eco.saldo += ganancia
  eco.ultimoDiario = ahora
  await db.write()

  await sock.sendMessage(chatId, {
    text: `🎁 Reclamaste tu recompensa diaria.\n\n💵 Ganaste ${ganancia} de efectivo.\n🔥 Racha: ${eco.racha} día(s)`,
  })
}

async function top({ sock, chatId, db }) {
  const usuarios = Object.entries(db.data.users)
    .filter(([, u]) => u.economia)
    .map(([jid, u]) => ({ jid, total: (u.economia.saldo || 0) + (u.economia.banco || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  if (!usuarios.length) {
    return sock.sendMessage(chatId, { text: '❌ Todavía no hay nadie con economía registrada.' })
  }

  const medallas = ['🥇', '🥈', '🥉']
  let texto = '🏆 *Top economía*\n\n'

  usuarios.forEach((u, i) => {
    const medalla = medallas[i] || `${i + 1}.`
    texto += `${medalla} @${u.jid.split('@')[0]} — ${u.total}\n`
  })

  await sock.sendMessage(chatId, {
    text: texto,
    mentions: usuarios.map((u) => u.jid),
  })
}

export const subcomandos = {
  saldo,
  depositar,
  retirar,
  minar,
  trabajar,
  cosechar,
  robar,
  apostar,
  transferir,
  diario,
  top,
}

export default async function economia({ sock, chatId, config }) {
  await sock.sendMessage(chatId, {
    text:
      `💰 *Sistema de economía*\n\n` +
      `Uso: *${config.prefijo}economia <subcomando>*\n\n` +
      `▢ saldo\n▢ depositar <monto>\n▢ retirar <monto>\n▢ minar (cada 30 min)\n▢ trabajar (cada 1 hora)\n▢ cosechar (cada 45 min)\n▢ robar @usuario (cada 20 min)\n▢ apostar <monto>\n▢ transferir @usuario <monto>\n▢ diario (cada 24h, con racha)\n▢ top`,
  })
}