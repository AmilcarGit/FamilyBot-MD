import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots } from '../subbots/manager.js'
import config from '../config.js'
import { info, error as logError } from './logger.js'

let sockActivo = null

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function verificarToken(req, res, next) {
  const token = req.query.token || req.headers['x-panel-token']
  if (!config.panelToken || token !== config.panelToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  next()
}

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return `${h}h ${m}m`
}

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${config.nombreBot} — Panel</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f14; color: #eee; margin: 0; padding: 20px; }
  h1 { background: linear-gradient(90deg, #ff6ec7, #a86ee8); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 20px; font-size: 22px; }
  .card { background: #1a1a24; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #2a2a38; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
  .stat { font-size: 24px; font-weight: bold; color: #ff6ec7; }
  .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  input { padding: 10px; border-radius: 8px; border: 1px solid #333; background: #111; color: #fff; width: 200px; font-size: 14px; }
  button { padding: 10px 18px; border-radius: 8px; border: none; background: #ff6ec7; color: #000; font-weight: bold; cursor: pointer; font-size: 13px; }
  button.secundario { background: #2a2a38; color: #eee; }
  #login { display: flex; gap: 8px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
  #panel { display: none; }
  .tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
  .tab { padding: 8px 14px; border-radius: 20px; background: #1a1a24; border: 1px solid #2a2a38; cursor: pointer; font-size: 13px; color: #aaa; }
  .tab.activo { background: #ff6ec7; color: #000; font-weight: bold; border-color: #ff6ec7; }
  .seccion { display: none; }
  .seccion.activa { display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { padding: 8px; text-align: left; border-bottom: 1px solid #2a2a38; }
  th { color: #888; font-weight: normal; text-transform: uppercase; font-size: 11px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .dot.on { background: #4ade80; }
  .dot.off { background: #666; }
  pre { background: #0a0a0e; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  .footer { color: #555; font-size: 11px; margin-top: 16px; }
  .vacio { color: #666; font-size: 13px; padding: 12px 0; }
</style>
</head>
<body>
  <h1>🌈 ${config.nombreBot} — Panel</h1>
  <div id="login">
    <input id="token" type="password" placeholder="Token de acceso">
    <button onclick="entrar()">Entrar</button>
  </div>
  <div id="panel">
    <div class="tabs">
      <div class="tab activo" data-tab="resumen" onclick="cambiarTab('resumen')">📊 Resumen</div>
      <div class="tab" data-tab="subbots" onclick="cambiarTab('subbots')">🤖 Subbots</div>
      <div class="tab" data-tab="grupos" onclick="cambiarTab('grupos')">👥 Grupos</div>
      <div class="tab" data-tab="economia" onclick="cambiarTab('economia')">💰 Top economía</div>
      <div class="tab" data-tab="logs" onclick="cambiarTab('logs')">📄 Logs</div>
      <button class="secundario" onclick="salir()">Salir</button>
    </div>

    <div id="tab-resumen" class="seccion activa">
      <div class="grid">
        <div class="card"><div class="stat" id="uptime">-</div><div class="label">Uptime</div></div>
        <div class="card"><div class="stat" id="ram">-</div><div class="label">RAM</div></div>
        <div class="card"><div class="stat" id="usuarios">-</div><div class="label">Usuarios</div></div>
        <div class="card"><div class="stat" id="chats">-</div><div class="label">Chats</div></div>
        <div class="card"><div class="stat" id="comandos">-</div><div class="label">Comandos ejecutados</div></div>
        <div class="card"><div class="stat" id="subbotsActivos">-</div><div class="label">Subbots activos</div></div>
      </div>
      <div class="footer">Se actualiza cada 5 segundos</div>
    </div>

    <div id="tab-subbots" class="seccion">
      <div class="card"><table id="tablaSubbots"><thead><tr><th>Número</th><th>Estado</th><th>Creador</th></tr></thead><tbody></tbody></table></div>
    </div>

    <div id="tab-grupos" class="seccion">
      <div class="card"><table id="tablaGrupos"><thead><tr><th>Grupo</th><th>Miembros</th></tr></thead><tbody></tbody></table></div>
    </div>

    <div id="tab-economia" class="seccion">
      <div class="card"><table id="tablaEconomia"><thead><tr><th>#</th><th>Usuario</th><th>Total</th></tr></thead><tbody></tbody></table></div>
    </div>

    <div id="tab-logs" class="seccion">
      <div class="card"><pre id="cajaLogs">Cargando...</pre></div>
    </div>
  </div>

<script>
  let tokenGuardado = localStorage.getItem('panelToken') || ''

  function cabecera() {
    return { 'x-panel-token': tokenGuardado }
  }

  async function entrar() {
    const valor = document.getElementById('token').value
    if (valor) tokenGuardado = valor

    const res = await fetch('/api/status', { headers: cabecera() })
    if (!res.ok) return alert('Token inválido')

    localStorage.setItem('panelToken', tokenGuardado)
    document.getElementById('login').style.display = 'none'
    document.getElementById('panel').style.display = 'block'
    actualizarResumen()
    setInterval(actualizarResumen, 5000)
  }

  function salir() {
    localStorage.removeItem('panelToken')
    location.reload()
  }

  function cambiarTab(nombre) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('activo', t.dataset.tab === nombre))
    document.querySelectorAll('.seccion').forEach((s) => s.classList.toggle('activa', s.id === 'tab-' + nombre))

    if (nombre === 'subbots') cargarSubbots()
    if (nombre === 'grupos') cargarGrupos()
    if (nombre === 'economia') cargarEconomia()
    if (nombre === 'logs') cargarLogs()
  }

  async function actualizarResumen() {
    const res = await fetch('/api/status', { headers: cabecera() })
    if (!res.ok) return
    const d = await res.json()
    uptime.textContent = d.uptime
    ram.textContent = d.ram
    usuarios.textContent = d.usuarios
    chats.textContent = d.chats
    comandos.textContent = d.comandosEjecutados
    subbotsActivos.textContent = d.subbots
  }

  async function cargarSubbots() {
    const res = await fetch('/api/subbots', { headers: cabecera() })
    const data = await res.json()
    const cuerpo = document.querySelector('#tablaSubbots tbody')
    cuerpo.innerHTML = data.length
      ? data.map((s) => \`<tr><td>\${s.numero}</td><td><span class="dot \${s.conectado ? 'on' : 'off'}"></span>\${s.conectado ? 'Conectado' : 'Desconectado'}</td><td>\${s.creadorJid?.split('@')[0] || '-'}</td></tr>\`).join('')
      : '<tr><td colspan="3" class="vacio">No hay subbots activos</td></tr>'
  }

  async function cargarGrupos() {
    const res = await fetch('/api/grupos', { headers: cabecera() })
    const data = await res.json()
    const cuerpo = document.querySelector('#tablaGrupos tbody')
    cuerpo.innerHTML = data.length
      ? data.map((g) => \`<tr><td>\${g.nombre}</td><td>\${g.miembros}</td></tr>\`).join('')
      : '<tr><td colspan="2" class="vacio">Sin datos (bot recién conectando o sin grupos)</td></tr>'
  }

  async function cargarEconomia() {
    const res = await fetch('/api/economia-top', { headers: cabecera() })
    const data = await res.json()
    const cuerpo = document.querySelector('#tablaEconomia tbody')
    cuerpo.innerHTML = data.length
      ? data.map((u, i) => \`<tr><td>\${i + 1}</td><td>\${u.numero}</td><td>\${u.total}</td></tr>\`).join('')
      : '<tr><td colspan="3" class="vacio">Todavía nadie tiene economía</td></tr>'
  }

  async function cargarLogs() {
    const res = await fetch('/api/logs', { headers: cabecera() })
    const data = await res.json()
    document.getElementById('cajaLogs').textContent = data.texto || 'Sin logs todavía.'
  }

  if (tokenGuardado) {
    fetch('/api/status', { headers: cabecera() }).then((res) => {
      if (res.ok) {
        document.getElementById('login').style.display = 'none'
        document.getElementById('panel').style.display = 'block'
        actualizarResumen()
        setInterval(actualizarResumen, 5000)
      }
    })
  }
</script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return

  if (!config.panelToken || config.panelToken === 'cambia-este-token') {
    logError('⚠️ Panel web desactivado: cambia config.panelToken por uno único antes de activarlo.')
    return
  }

  const app = express()

  app.get('/', (req, res) => {
    res.send(paginaHtml())
  })

  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const memoria = process.memoryUsage()

      res.json({
        uptime: formatearUptime(process.uptime()),
        ram: `${(memoria.rss / 1024 / 1024).toFixed(1)} MB`,
        usuarios: Object.keys(db.data.users || {}).length,
        chats: Object.keys(db.data.chats || {}).length,
        comandosEjecutados: db.data.stats?.comandosEjecutados || 0,
        subbots: listarSubbots().filter((s) => s.conectado).length,
      })
    } catch (err) {
      res.status(500).json({ error: 'Error interno' })
    }
  })

  app.get('/api/subbots', verificarToken, (req, res) => {
    res.json(listarSubbots())
  })

  app.get('/api/grupos', verificarToken, async (req, res) => {
    try {
      if (!sockActivo) return res.json([])

      const grupos = await sockActivo.groupFetchAllParticipating()
      const lista = Object.values(grupos)
        .map((g) => ({ nombre: g.subject, miembros: g.participants.length }))
        .sort((a, b) => b.miembros - a.miembros)
        .slice(0, 20)

      res.json(lista)
    } catch (err) {
      res.json([])
    }
  })

  app.get('/api/economia-top', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const lista = Object.entries(db.data.users || {})
        .filter(([, u]) => u.economia)
        .map(([jid, u]) => ({
          numero: jid.split('@')[0],
          total: (u.economia.saldo || 0) + (u.economia.banco || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      res.json(lista)
    } catch (err) {
      res.json([])
    }
  })

  app.get('/api/logs', verificarToken, (req, res) => {
    try {
      const rutaLog = path.join(process.cwd(), 'logs', 'bot.log')

      if (!fs.existsSync(rutaLog)) {
        return res.json({ texto: '' })
      }

      const contenido = fs.readFileSync(rutaLog, 'utf-8')
      const lineas = contenido.trim().split('\n').slice(-50)

      res.json({ texto: lineas.join('\n') })
    } catch (err) {
      res.json({ texto: '' })
    }
  })

  app.listen(config.panelPort, () => {
    info(`🌐 Panel web disponible en http://localhost:${config.panelPort}`)
  })
}