export async function getWeatherCondition(lat, lng) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weathercode&timezone=auto`,
      { signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    const code = data?.current?.weathercode ?? 0
    if (code === 0) return 'clear'
    if (code <= 3) return 'cloudy'
    if (code <= 49) return 'fog'
    if (code <= 77) return 'rain'
    return 'rain'
  } catch {
    return 'clear'
  }
}

export function getTimeCondition() {
  const h = new Date().getHours()
  if (h >= 5 && h < 8)  return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

export function getDateCondition() {
  const now = new Date()
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (m === 4 && d >= 4 && d <= 6)   return 'qingming'
  if (m === 12 && d >= 21 && d <= 23) return 'dongzhi'
  return null
}
