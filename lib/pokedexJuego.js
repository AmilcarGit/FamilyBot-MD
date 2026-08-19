import { normalizarJid } from './utils.js'

const cachePokemon = new Map()

export function guardarEnCache(id, datos) {
  cachePokemon.set(String(id), datos)
}

export function leerDeCache(id) {
  return cachePokemon.get(String(id))
}

export function calcularProbabilidadCaptura(statsTotal) {
  const dificultad = Math.min(65, Math.floor(statsTotal / 12))
  return Math.max(15, 92 - dificultad)
}

export function intentarCapturar(statsTotal) {
  const probabilidad = calcularProbabilidadCaptura(statsTotal)
  const tirada = Math.random() * 100
  return { exito: tirada <= probabilidad, probabilidad }
}

export async function agregarAMochila(db, jid, pokemon) {
  const key = normalizarJid(jid)
  db.data.users[key] ??= {}
  db.data.users[key].pokedex ??= { mochila: {} }
  db.data.users[key].pokedex.mochila[pokemon.id] ??= {
    nombre: pokemon.nombre,
    tipos: pokemon.tipos,
    cantidad: 0,
  }
  db.data.users[key].pokedex.mochila[pokemon.id].cantidad++
  await db.write()
  return db.data.users[key].pokedex.mochila[pokemon.id]
}

export function obtenerMochila(db, jid) {
  const key = normalizarJid(jid)
  return db.data.users?.[key]?.pokedex?.mochila || {}
}
