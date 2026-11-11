/**
 * Cut a string to at most `max` UTF-16 code units. If the cut would leave a
 * high surrogate without its pair, that unit is dropped too, so an emoji on
 * the boundary is not split.
 */
export function limitText(text: string, max: number): string {
  if (max < 1 || text.length === 0) return ''
  if (text.length <= max) return text
  const last = text.charCodeAt(max - 1)
  const end = last >= 0xd800 && last <= 0xdbff ? max - 1 : max
  return text.slice(0, end)
}
