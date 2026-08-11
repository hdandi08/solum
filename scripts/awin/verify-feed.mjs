export function assertAwinFeedResponse(text, contentType) {
  if (!contentType.toLowerCase().includes('text/csv')) throw new Error('AWIN feed is not CSV')
  const lines = text.trim().split(/\r?\n/)
  if (!lines[0]?.startsWith('product_id,product_name,')) throw new Error('AWIN feed header is invalid')
  if (!lines.some((line) => line.startsWith('ground,'))) throw new Error('GROUND is missing')
  if (!lines.some((line) => line.startsWith('ritual,'))) throw new Error('RITUAL is missing')
}
