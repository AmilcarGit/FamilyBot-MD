import { MongoClient } from 'mongodb'
import 'dotenv/config'

const datosPorDefecto = { users: {}, chats: {}, subbots: [], stats: {} }
const NOMBRE_BASE_DATOS = 'theyui-md'
const NOMBRE_COLECCION = 'botdata'
const ID_DOCUMENTO = 'main'

let instancia = null

async function conectarColeccion() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('Falta MONGODB_URI en tu archivo .env')
  }

  const cliente = new MongoClient(uri)
  await cliente.connect()

  const db = cliente.db(NOMBRE_BASE_DATOS)
  return db.collection(NOMBRE_COLECCION)
}

export async function getDB() {
  if (instancia) return instancia

  const coleccion = await conectarColeccion()
  const documento = await coleccion.findOne({ _id: ID_DOCUMENTO })

  const data = documento?.data
    ? { ...structuredClone(datosPorDefecto), ...documento.data }
    : structuredClone(datosPorDefecto)

  instancia = {
    data,
    async write() {
      await coleccion.updateOne(
        { _id: ID_DOCUMENTO },
        { $set: { data: instancia.data, actualizado: new Date() } },
        { upsert: true }
      )
    },
    async read() {
      const doc = await coleccion.findOne({ _id: ID_DOCUMENTO })
      if (doc?.data) instancia.data = doc.data
    },
  }

  return instancia
}