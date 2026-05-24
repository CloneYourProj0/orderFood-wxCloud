function getDefaultShop(shopList = []) {
  if (!Array.isArray(shopList) || shopList.length === 0) {
    return null
  }

  return shopList.find(item => item && item.status !== 0) || shopList[0] || null
}

function getDefaultShopId(shopList = []) {
  const shop = getDefaultShop(shopList)
  return shop ? shop._id || '' : ''
}

function getShopFields(shop = {}) {
  return {
    shopId: shop._id || '',
    shopName: shop.name || ''
  }
}

function buildShopScopedWhere(db, shopId, defaultShopId, extra = {}) {
  if (!shopId) {
    return extra
  }

  if (shopId !== defaultShopId) {
    return {
      ...extra,
      shopId
    }
  }

  const _ = db.command
  const shopCondition = _.or([
    { shopId },
    { shopId: '' },
    { shopId: null },
    { shopId: _.exists(false) }
  ])

  if (Object.keys(extra).length === 0) {
    return shopCondition
  }

  return _.and([
    extra,
    shopCondition
  ])
}

function isShopScopedItem(item = {}, shopId, defaultShopId) {
  if (!shopId) {
    return true
  }

  if (item.shopId === shopId) {
    return true
  }

  if (shopId !== defaultShopId) {
    return false
  }

  return !item.shopId
}

module.exports = {
  getDefaultShop,
  getDefaultShopId,
  getShopFields,
  buildShopScopedWhere,
  isShopScopedItem
}
