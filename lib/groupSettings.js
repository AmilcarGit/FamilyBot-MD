export function obtenerConfigChat(db, chatId) {
  db.data.chats[chatId] ??= {}
  db.data.chats[chatId].antilink ??= false
  db.data.chats[chatId].bienvenida ??= true
  db.data.chats[chatId].advertencias ??= {}
  return db.data.chats[chatId]
}

export async function actualizarConfigChat(db, chatId, cambios) {
  const configActual = obtenerConfigChat(db, chatId)
  Object.assign(configActual, cambios)
  await db.write()
  return configActual
}