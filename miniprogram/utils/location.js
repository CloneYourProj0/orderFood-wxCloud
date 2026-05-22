function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toRad(value) {
  return value * Math.PI / 180
}

function calcDistance(from, to) {
  if (!from || !to) return null

  const fromLat = toNumber(from.latitude)
  const fromLng = toNumber(from.longitude)
  const toLat = toNumber(to.latitude)
  const toLng = toNumber(to.longitude)

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return null
  }

  const earthRadius = 6371000
  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadius * c
}

function formatDistance(distance) {
  if (distance === null || distance === undefined) return ''
  if (distance < 1000) return `${Math.round(distance)}m`
  return `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)}km`
}

function normalizeShop(shop, userLocation) {
  const distance = calcDistance(userLocation, shop)
  return {
    ...shop,
    status: typeof shop.status === 'undefined' ? 1 : shop.status,
    sort: Number(shop.sort || 0),
    distance,
    distanceText: formatDistance(distance)
  }
}

function normalizeShopList(list, userLocation) {
  return (list || [])
    .map(item => normalizeShop(item, userLocation))
    .sort((a, b) => {
      if (a.status === 0 && b.status !== 0) return 1
      if (a.status !== 0 && b.status === 0) return -1
      if (a.distance !== null && b.distance === null) return -1
      if (a.distance === null && b.distance !== null) return 1
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
        return a.distance - b.distance
      }
      return (a.sort || 0) - (b.sort || 0)
    })
}

module.exports = {
  calcDistance,
  formatDistance,
  normalizeShop,
  normalizeShopList
}
