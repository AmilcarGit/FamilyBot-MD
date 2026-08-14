const searchResults = new Map()

export function saveResults(chatId, results) {
  searchResults.set(chatId, results)
  setTimeout(() => {
    if (searchResults.get(chatId) === results) {
      searchResults.delete(chatId)
    }
  }, 5 * 60 * 1000)
}

export function getResult(chatId, index) {
  const results = searchResults.get(chatId)
  if (!results) return null
  return results[index - 1] || null
}
