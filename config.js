export default {
  nombreBot: 'TheYui-MD',
  prefijo: '.',
  idiomaPorDefecto: 'es',
  owner: ['51910227479'],
  staff: [
    { nombre: 'Benja', numero: '543875132593' }
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
  panelPort: 3000,
  panelToken: 'yui2026-x7k9-panel-unico1',
  bienvenida: {
    activa: true,
    mensajeEntrada: '👋 ¡Bienvenido/a {mention} a *{grupo}*!\nLee las reglas y disfruta tu estadía 🎉',
    mensajeSalida: '😢 {mention} salió de *{grupo}*. ¡Hasta pronto!',
  },
}
