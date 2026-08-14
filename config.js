export default {
  nombreBot: 'TheYui-MD',
  prefijo: '.',
  idiomaPorDefecto: 'es',
  owner: ['51910227479'],
  staff: [
    '5493875132593',
    // Agrega aquí los otros 9 números del equipo, mínimo 10 en total,
    // mismo formato: código de país + número, sin "+", sin espacios ni guiones.
    // Ejemplo: '51987654321',
  ],
  numeroBot: '',
  sessionFolder: './session',
  dbFile: './database.json',
  groupCacheTTL: 60 * 1000,
  rateLimitPause: 90 * 1000,
  maxReconnectAttempts: 8,
  maxReconnectDelay: 5 * 60 * 1000,
  maxSubbots: 5,
  subbotsPorUsuario: 1,
  panelActivo: true,
  panelPort: 3001,
  panelToken: 'yui2026-x7k9-panel-unico1',
  bienvenida: {
    activa: true,
    mensajeEntrada: '👋 ¡Bienvenido/a {mention} a *{grupo}*!\nLee las reglas y disfruta tu estadía 🎉',
    mensajeSalida: '😢 {mention} salió de *{grupo}*. ¡Hasta pronto!',
  },
}