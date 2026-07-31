import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normalizarJid } from './utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '..', 'locales')

const traducciones = {}

function cargarIdiomas() {
  const archivos = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'))
  for (const archivo of archivos) {
    const codigo = archivo.replace('.json', '')
    traducciones[codigo] = JSON.parse(
      fs.readFileSync(path.join(localesDir, archivo), 'utf-8')
    )
  }
}

cargarIdiomas()

export function idiomasDisponibles() {
  return Object.keys(traducciones)
}

export function obtenerIdiomaUsuario(db, jid, config) {
  const idiomaDefault = config.idiomaPorDefecto || 'es'
  if (!db) return idiomaDefault

  const jidNormalizado = normalizarJid(jid)
  const idioma = db.data?.users?.[jidNormalizado]?.idioma

  return idioma && traducciones[idioma] ? idioma : idiomaDefault
}

export function t(idioma, clave, vars = {}) {
  const tabla = traducciones[idioma] || traducciones.es
  let texto = tabla?.[clave] ?? traducciones.es?.[clave] ?? clave

  for (const [k, v] of Object.entries(vars)) {
    texto = texto.replaceAll(`{${k}}`, v)
  }

  return texto
}