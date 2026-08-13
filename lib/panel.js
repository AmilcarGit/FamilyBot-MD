import express from 'express'
import { getDB } from './db.js'
import { listarSubbots } from '../subbots/manager.js'
import config from '../config.js'
import { info, error as logError } from './logger.js'

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
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f14; color: #eee; margin: 0; padding: 24px; }
  h1 { background: linear-gradient(90deg, #ff6ec7, #a86ee8); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 24px; }
  .card { background: #1a1a24; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #2a2a38; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .stat { font-size: 28px; font-weight: bold; color: #ff6ec7; }
  .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  input { padding: 10px; border-radius: 8px; border: 1px solid #333; background: #111; color: #fff; width: 220px; font-size: 14px; }
  button { padding: 10px 20px; border-radius: 8px; border: none; background: #ff6ec7; color: #000; font-weight: bold; cursor: pointer; }
  #login { display: flex; gap: 8px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
  #panel { display: none; }
  .footer { color: #555; font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>🌈 ${config.nombreBot} — Panel</h1>
  <div id="login">
    <input id="token" type="password" placeholder="Token de acceso">
    <button onclick="cargar()">Entrar</button>
  </div>
  <div id="panel">
    <div class="grid">
      <div class="card"><div class="stat" id="uptime">-</div><div class="label">Uptime</div></div>
      <div class="card"><div class="stat" id="ram">-</div><div class="label">RAM</div></div>
      <div class="card"><div class="stat" id="usuarios">-</div><div class="label">Usuarios</div></div>
      <div class="card"><div class="stat" id="chats">-</div><div class="label">Chats</div></div>
      <div class="card"><div class="stat" id="comandos">-</div><div class="label">Comandos ejecutados</div></div>
      <div class="card"><div class="stat" id="subbots">-</div><div class="label">Subbots activos</div></div>
    </div>
    <div class="footer">Actualiza cada 5 segundos</div>
  </div>
<script>
  let tokenGuardado = ''

  async function actualizar() {
    const res = await fetch('/api/status?token=' + encodeURIComponent(tokenGuardado))
    if (!res.ok) return
    const data = await res.json()
    document.getElementById('uptime').textContent = data.uptime
    document.getElementById('ram').textContent = data.ram
    document.getElementById('usuarios').textContent = data.usuarios
    document.getElementById('chats').textContent = data.chats
    document.getElementById('comandos').textContent = data.comandosEjecutados
    document.getElementById('subbots').textContent = data.subbots
  }

  async function cargar() {
    tokenGuardado = document.getElementById('token').value
    const res = await fetch('/api/status?token=' + encodeURIComponent(tokenGuardado))
    if (!res.ok) return alert('Token inválido')
    document.getElementById('login').style.display = 'none'
    document.getElementById('panel').style.display = 'block'
    actualizar()
    setInterval(actualizar, 5000)
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

  app.listen(config.panelPort, () => {
    info(`🌐 Panel web disponible en http://localhost:${config.panelPort}`)
  })
}