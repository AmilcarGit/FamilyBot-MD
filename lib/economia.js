import { normalizarJid } from './utils.js'

export const COOLDOWN_MINAR_MS = 30 * 60 * 1000
export const COOLDOWN_TRABAJAR_MS = 60 * 60 * 1000
export const COOLDOWN_COSECHAR_MS = 45 * 60 * 1000
export const COOLDOWN_ROBAR_MS = 20 * 60 * 1000
export const COOLDOWN_DIARIO_MS = 24 * 60 * 60 * 1000

export const TIENDA = {
  escudo: { nombre: '🛡️ Escudo antirrobo', precio: 800, desc: 'Te protege de robos por 24 horas' },
  amuleto: { nombre: '🍀 Amuleto de suerte', precio: 1200, desc: 'Duplica tu próxima ganancia de trabajar/minar/cosechar' },
  multiplicador: { nombre: '✨ Multiplicador diario', precio: 1500, desc: 'Tu próximo diario da el doble' },
}

export const MENSAJES_MINAR = [
  'Encontraste una veta de oro ⛏️',
  'Sacaste unos diamantes brillantes 💎',
  'Picaste piedra y hallaste plata 🪨',
  'Encontraste una gema rara en la mina 🔷',
]

export const MENSAJES_TRABAJAR = [
  'Trabajaste como programador 💻',
  'Trabajaste repartiendo pedidos 🛵',
  'Trabajaste en una cafetería ☕',
  'Trabajaste como taxista 🚕',
]

export const MENSAJES_COSECHAR = [
  'Cosechaste papas del campo 🥔',
  'Recogiste manzanas del árbol 🍎',
  'Cosechaste maíz dorado 🌽',
  'Recolectaste trigo para el pan 🌾',
]

export async function obtenerUsuario(db, jid) {
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
  usuario.economia.escudoHasta ??= 0
  usuario.economia.amuletoActivo ??= false
  usuario.economia.multiplicadorActivo ??= false
  await db.write()
  return usuario.economia
}

export function formatearTiempoRestante(ms) {
  const minutos = Math.ceil(ms / 60000)
  if (minutos < 60) return `${minutos} minuto(s)`
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  return `${horas}h ${minutosRestantes}m`
}

export async function actividadConCooldown({
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

  let gananciaFinal = ganancia
  let textoAmuleto = ''

  if (eco.amuletoActivo) {
    gananciaFinal *= 2
    eco.amuletoActivo = false
    textoAmuleto = '\n🍀 ¡Tu amuleto de suerte duplicó la ganancia!'
  }

  eco.saldo += gananciaFinal
  eco[campoCooldown] = ahora
  await db.write()

  return {
    ok: true,
    texto: `${emoji} ${mensaje}\n💵 Ganaste ${gananciaFinal} de efectivo.${textoAmuleto}`,
  }
}