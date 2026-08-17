import { normalizarJid } from './utils.js'

export function esPremium(db, jid) {
  const key = normalizarJid(jid)
  const datos = db.data.users?.[key]?.premium
  if (!datos?.activo) return false
  if (datos.vence && Date.now() > datos.vence) return false
  return true
}

export async function otorgarPremium(db, jid, dias = 30) {
  const key = normalizarJid(jid)
  db.data.users[key] ??= {}
  const actual = db.data.users[key].premium

  const yaActivo = actual?.activo && (!actual.vence || actual.vence > Date.now())
  const baseDesde = yaActivo ? actual.vence : Date.now()
  const vence = dias === 0 ? null : baseDesde + dias * 24 * 60 * 60 * 1000

  db.data.users[key].premium = { activo: true, desde: Date.now(), vence }
  await db.write()
  return db.data.users[key].premium
}

export async function quitarPremium(db, jid) {
  const key = normalizarJid(jid)
  if (db.data.users[key]?.premium) {
    db.data.users[key].premium = { activo: false, desde: null, vence: null }
    await db.write()
  }
}

export function formatearVencimiento(vence) {
  if (!vence) return 'Para siempre (sin vencimiento)'
  return new Date(vence).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}
