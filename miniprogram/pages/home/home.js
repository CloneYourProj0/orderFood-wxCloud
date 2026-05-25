// pages/home/home.js
const { parseTableScene } = require('../../utils/tableScene.js')
const {
  loadShopList,
  saveSelectedShop,
  readStoredShop,
  pickPreferredShop,
  locateAndSort
} = require('../../utils/currentShop.js')

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
      const { shopList } = await loadShopList(this.data.userLocation)

      const pendingShopId = wx.getStorageSync('pendingShopId')
      const stored = readStoredShop()
      const preferId = pendingShopId || stored.id
      const currentShop = pickPreferredShop(shopList, { preferId })

      this.setData({
        shopList,
        currentShop,
        branchAddressText: this.formatBranchAddress(currentShop)
      })

      if (currentShop) {
        saveSelectedShop(currentShop)
      }
      if (pendingShopId) {
        wx.removeStorageSync('pendingShopId')
      }
    } catch (err) {
      console.error('加载店铺信息失败', err)
      const stored = readStoredShop()
      if (stored.info && stored.info._id) {
        this.setData({
          currentShop: stored.info,
          shopList: [stored.info],
          branchAddressText: this.formatBranchAddress(stored.info)
        })
      }
    }
  },

  refreshCurrentShop() {
    const stored = readStoredShop()
    if (!stored.id) return
    if (this.data.currentShop && this.data.currentShop._id === stored.id) return
    const shop = this.data.shopList.find(item => item._id === stored.id)
    if (!shop) return
    this.setData({
      currentShop: shop,
      branchAddressText: this.formatBranchAddress(shop)
    })
    // 用户在点餐页切了店再回首页：清掉残留的桌码和堂食/外带偏好
    wx.removeStorageSync('pendingTableNumber')
    wx.removeStorageSync('preferOrderType')
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

  onShopSelect(e) {
    const shopId = e.detail && e.detail.shopId
    const shop = this.data.shopList.find(item => item._id === shopId)
    if (!shop) return
    const previousShopId = this.data.currentShop && this.data.currentShop._id
    this.setData({
      currentShop: shop,
      branchAddressText: this.formatBranchAddress(shop),
      showShopSelector: false
    })
    saveSelectedShop(shop)
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
    locateAndSort(this.data.shopList).then(({ userLocation, shopList }) => {
      const stored = readStoredShop()
      const keepId = opts.keepSelected
        ? (this.data.currentShop && this.data.currentShop._id) || stored.id
        : ''
      const currentShop = shopList.find(item => item._id === keepId)
        || shopList.find(item => item.distance !== null && item.status !== 0)
        || pickPreferredShop(shopList, {})

      this.setData({
        userLocation,
        shopList,
        currentShop,
        branchAddressText: this.formatBranchAddress(currentShop),
        locating: false
      })
      if (currentShop) saveSelectedShop(currentShop)

      if (!opts.silent) {
        wx.showToast({
          title: currentShop && currentShop.distanceText
            ? `最近：${currentShop.distanceText}`
            : '定位成功',
          icon: 'none'
        })
      }
    }).catch((err) => {
      console.error('定位失败', err)
      this.setData({ locating: false })
      if (!opts.silent) {
        const denied = err && err.errMsg && err.errMsg.indexOf('auth deny') > -1
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
