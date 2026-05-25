// 解析桌码/分店扫码 scene 参数
// 兼容老的纯桌码字符串、key=val 形式，以及紧凑的 t=桌码&s=分店ID
function parseTableScene(sceneValue) {
  const decoded = decodeURIComponent(sceneValue || '').trim()
  if (!decoded) {
    return { tableNumber: '', shopId: '' }
  }

  const query = decoded.indexOf('?') > -1 ? decoded.split('?')[1] : decoded
  if (query.indexOf('=') === -1) {
    return { tableNumber: query, shopId: '' }
  }

  const params = {}
  query.split('&').forEach(item => {
    const pair = item.split('=')
    const key = pair[0]
    const value = pair.slice(1).join('=')
    if (key) {
      params[key] = decodeURIComponent(value || '')
    }
  })

  return {
    tableNumber: (params.tableNumber || params.table || params.tableNo || params.t || '').trim(),
    shopId: (params.shopId || params.storeId || params.shop || params.s || '').trim()
  }
}

module.exports = {
  parseTableScene
}
