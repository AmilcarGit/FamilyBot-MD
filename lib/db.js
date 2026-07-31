import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import config from '../config.js'

const datosPorDefecto = { users: {}, chats: {} }

let instancia = null

export async function getDB() {
  if (instancia) return instancia

  const adapter = new JSONFile(config.dbFile)
  instancia = new Low(adapter, datosPorDefecto)

  await instancia.read()
  instancia.data ||= datosPorDefecto

  return instancia
}
