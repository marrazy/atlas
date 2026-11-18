/**
 * A position the way a navigator writes it, for example 58°26′N 001°53′E: two-digit latitude, three-digit
 * longitude, minutes rounded. Design v2 uses it for field positions only.
 */
export function formatCoordinates(lat: number, lon: number): string {
  const part = (value: number, width: number, positive: string, negative: string) => {
    const totalMinutes = Math.round(Math.abs(value) * 60)
    const degrees = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const hemisphere = value < 0 ? negative : positive
    return `${String(degrees).padStart(width, '0')}°${String(minutes).padStart(2, '0')}′${hemisphere}`
  }
  return `${part(lat, 2, 'N', 'S')} ${part(lon, 3, 'E', 'W')}`
}
