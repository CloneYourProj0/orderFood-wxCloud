// pages/home/home.js
const app = getApp()
const db = wx.cloud.database()
const { normalizeShopList } = require('../../utils/location.js')
const { parseTableScene } = require('../../utils/tableScene.js')

const SELECTED_SHOP_ID_KEY = 'selectedShopId'
const SELECTED_SHOP_INFO_KEY = 'selectedShopInfo'

Page({
  data: {
    shopList: [],
    currentShop: null,
    branchAddressText: '',
    locating: false,
    showShopSelector: false,
    userLocation: null
  },

  onLoad(options) {
    // 扫桌码进入首页（如果小程序码绑定的是首页路径）
    if (options && options.scene) {
      const { tableNumber, shopId } = parseTableScene(options.scene)
      if (tableNumber) {
        wx.setStorageSync('pendingTableNumber', tableNumber)
      }
      if (shopId) {
        wx.setStorageSync('pendingShopId', shopId)
      }
    }

    this.loadShopInfo().then(() => {
      this.locateNearestShop({ silent: true, keepSelected: true })
    })
  },

  onShow() {
    if (this.data.shopList && this.data.shopList.length > 0) {
      this.refreshCurrentShop()
    }
  },

  async loadShopInfo() {
    try {
      const res = await db.collection('shopInfo')
        .orderBy('sort', 'asc')
        .limit(100)
        .get()
      const rawList = res.data || []
      const activeList = rawList.filter(item => item.status !== 0)
      const shopList = normalizeShopList(
        activeList.length ? activeList : rawList,
        this.data.userLocation
      )

      const pendingShopId = wx.getStorageSync('pendingShopId')
      const storedShopId = wx.getStorageSync(SELECTED_SHOP_ID_KEY)
      const targetShopId = pendingShopId || storedShopId
      const currentShop = shopList.find(item => item._id === targetShopId)
        || shopList.find(item => item.status !== 0)
        || shopList[0]
        || null

      this.setData({
        shopList,
        currentShop,
        branchAddressText: this.formatBranchAddress(currentShop)
      })

      if (currentShop) {
        this.saveSelectedShop(currentShop)
      }
      if (pendingShopId) {
        wx.removeStorageSync('pendingShopId')
      }
    } catch (err) {
      console.error('加载店铺信息失败', err)
      const cachedShop = wx.getStorageSync(SELECTED_SHOP_INFO_KEY)
      if (cachedShop && cachedShop._id) {
        this.setData({
          currentShop: cachedShop,
          shopList: [cachedShop],
          branchAddressText: this.formatBranchAddress(cachedShop)
        })
      }
    }
  },

  refreshCurrentShop() {
    const storedShopId = wx.getStorageSync(SELECTED_SHOP_ID_KEY)
    if (!storedShopId) return
    if (this.data.currentShop && this.data.currentShop._id === storedShopId) return
    const shop = this.data.shopList.find(item => item._id === storedShopId)
    if (shop) {
      this.setData({
        currentShop: shop,
        branchAddressText: this.formatBranchAddress(shop)
      })
    }
  },

  saveSelectedShop(shop) {
    if (!shop) return
    app.globalData.currentShop = shop
    wx.setStorageSync(SELECTED_SHOP_ID_KEY, shop._id || '')
    wx.setStorageSync(SELECTED_SHOP_INFO_KEY, shop)
  },

  formatBranchAddress(shop) {
    if (!shop || !shop._id) return ''
    const parts = []
    if (shop.distanceText) parts.push(`距您 ${shop.distanceText}`)
    if (shop.address) parts.push(shop.address)
    return parts.join(' | ')
  },

  openShopSelector() {
    this.setData({ showShopSelector: true })
  },

  closeShopSelector() {
    this.setData({ showShopSelector: false })
  },

  stopPropagation() {},

  selectShop(e) {
    const shopId = e.currentTarget.dataset.id
    const shop = this.data.shopList.find(item => item._id === shopId)
    if (!shop) return
    const previousShopId = this.data.currentShop && this.data.currentShop._id
    this.setData({
      currentShop: shop,
      branchAddressText: this.formatBranchAddress(shop),
      showShopSelector: false
    })
    this.saveSelectedShop(shop)
    // 切换了分店：清掉残留的桌码与偏好（堂食/外带），避免带到下一家
    if (previousShopId && previousShopId !== shop._id) {
      wx.removeStorageSync('pendingTableNumber')
      wx.removeStorageSync('preferOrderType')
    }
    wx.showToast({ title: '已切换分店', icon: 'success' })
  },

  locateNearestShop(options = {}) {
    const isTapEvent = options && options.currentTarget
    const opts = isTapEvent ? { silent: false, keepSelected: false } : options

    this.setData({ locating: true })
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const userLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        app.globalData.userLocation = userLocation

        const shopList = normalizeShopList(this.data.shopList, userLocation)
        const storedShopId = wx.getStorageSync(SELECTED_SHOP_ID_KEY)
        const keepId = opts.keepSelected
          ? (this.data.currentShop && this.data.currentShop._id) || storedShopId
          : ''
        const currentShop = shopList.find(item => item._id === keepId)
          || shopList.find(item => item.distance !== null && item.status !== 0)
          || shopList.find(item => item.status !== 0)
          || shopList[0]
          || null

        this.setData({
          userLocation,
          shopList,
          currentShop,
          branchAddressText: this.formatBranchAddress(currentShop),
          locating: false
        })
        if (currentShop) this.saveSelectedShop(currentShop)

        if (!opts.silent) {
          wx.showToast({
            title: currentShop && currentShop.distanceText
              ? `最近：${currentShop.distanceText}`
              : '定位成功',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('定位失败', err)
        this.setData({ locating: false })
        if (!opts.silent) {
          const denied = err.errMsg && err.errMsg.indexOf('auth deny') > -1
          if (denied) {
            wx.showModal({
              title: '需要定位权限',
              content: '开启定位后可为你推荐最近的分店',
              confirmText: '去设置',
              success: (res) => { if (res.confirm) wx.openSetting() }
            })
          } else {
            wx.showToast({ title: '定位失败，请手动选择分店', icon: 'none' })
          }
        }
      }
    })
  },

  handleEntry(e) {
    const orderType = e.currentTarget.dataset.orderType
    if (!this.data.currentShop || !this.data.currentShop._id) {
      wx.showToast({ title: '请先选择分店', icon: 'none' })
      this.openShopSelector()
      return
    }

    if (orderType === 'takeOut') {
      wx.setStorageSync('preferOrderType', 'takeOut')
      wx.removeStorageSync('pendingTableNumber')
      this.goToOrderPage()
      return
    }

    // 堂食：先确认桌码
    const tableNumber = wx.getStorageSync('pendingTableNumber')
    if (tableNumber) {
      wx.setStorageSync('preferOrderType', 'dineIn')
      this.goToOrderPage()
      return
    }

    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const sceneValue = res.path || res.result || ''
        const parsed = parseTableScene(this.extractSceneFromPath(sceneValue) || res.result)
        if (!parsed.tableNumber) {
          wx.showToast({ title: '未识别到桌码，请扫描桌牌二维码', icon: 'none' })
          return
        }
        wx.setStorageSync('pendingTableNumber', parsed.tableNumber)
        wx.setStorageSync('preferOrderType', 'dineIn')
        if (parsed.shopId) {
          wx.setStorageSync('pendingShopId', parsed.shopId)
        }
        wx.showToast({ title: `桌码：${parsed.tableNumber}`, icon: 'success' })
        this.goToOrderPage()
      },
      fail: () => {
        // 用户取消或扫码失败，不跳转
      }
    })
  },

  // 小程序码扫到的 path 形如 "pages/index/index?scene=t%3D5%26s%3Dxxx"，从中取出 scene 值
  extractSceneFromPath(pathOrUrl) {
    if (!pathOrUrl) return ''
    const queryStart = pathOrUrl.indexOf('?')
    if (queryStart === -1) return pathOrUrl
    const query = pathOrUrl.slice(queryStart + 1)
    const pairs = query.split('&')
    for (let i = 0; i < pairs.length; i++) {
      const [k, v] = pairs[i].split('=')
      if (k === 'scene') return decodeURIComponent(v || '')
    }
    return query
  },

  goToOrderPage() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
