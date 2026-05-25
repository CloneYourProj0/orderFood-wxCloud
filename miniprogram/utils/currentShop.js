const { normalizeShopList } = require('./location.js')
const { getDefaultShopId } = require('./shopScope.js')

const SELECTED_SHOP_ID_KEY = 'selectedShopId'
const SELECTED_SHOP_INFO_KEY = 'selectedShopInfo'
const SELECTED_SHOP_UPDATED_AT_KEY = 'selectedShopUpdatedAt'

async function loadShopList(userLocation) {
  const db = wx.cloud.database()
  const res = await db.collection('shopInfo')
    .orderBy('sort', 'asc')
    .limit(100)
    .get()
  const rawList = res.data || []
  const activeList = rawList.filter(item => item.status !== 0)
  const sourceList = activeList.length ? activeList : rawList
  const shopList = normalizeShopList(sourceList, userLocation)
  return { shopList }
}

function saveSelectedShop(shop) {
  if (!shop) return
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.currentShop = shop
  }
  wx.setStorageSync(SELECTED_SHOP_ID_KEY, shop._id || '')
  wx.setStorageSync(SELECTED_SHOP_INFO_KEY, shop)
  wx.setStorageSync(SELECTED_SHOP_UPDATED_AT_KEY, Date.now())
}

function readStoredShop() {
  return {
    id: wx.getStorageSync(SELECTED_SHOP_ID_KEY) || '',
    info: wx.getStorageSync(SELECTED_SHOP_INFO_KEY) || null,
    updatedAt: wx.getStorageSync(SELECTED_SHOP_UPDATED_AT_KEY) || 0
  }
}

function pickPreferredShop(shopList, { preferId } = {}) {
  if (!Array.isArray(shopList) || shopList.length === 0) return null
  if (preferId) {
    const matched = shopList.find(item => item._id === preferId)
    if (matched) return matched
  }
  return shopList.find(item => item.status !== 0) || shopList[0] || null
}

function locateAndSort(shopList) {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const userLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userLocation = userLocation
        }
        const sortedList = normalizeShopList(shopList, userLocation)
        resolve({ userLocation, shopList: sortedList })
      },
      fail: reject
    })
  })
}

module.exports = {
  SELECTED_SHOP_ID_KEY,
  SELECTED_SHOP_INFO_KEY,
  SELECTED_SHOP_UPDATED_AT_KEY,
  loadShopList,
  saveSelectedShop,
  readStoredShop,
  pickPreferredShop,
  locateAndSort,
  getDefaultShopId
}
