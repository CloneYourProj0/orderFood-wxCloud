// pages/admin/shopInfo/shopInfo.js
const {
  TENCENT_MAP_KEY,
  TENCENT_MAP_REFERER,
  TENCENT_MAP_CATEGORY
} = require('../../../utils/mapConfig')

const db = wx.cloud.database()
const chooseLocation = requirePlugin('chooseLocation')

function createEmptyShop(sort = 1) {
  return {
    _id: '',
    name: '',
    description: '',
    address: '',
    phone: '',
    businessHours: '',
    latitude: '',
    longitude: '',
    locationTitle: '',
    sort,
    status: 1
  }
}

function hasLocation(shop = {}) {
  const latitude = Number(shop.latitude)
  const longitude = Number(shop.longitude)

  return shop.latitude !== '' &&
    shop.latitude !== undefined &&
    shop.latitude !== null &&
    shop.longitude !== '' &&
    shop.longitude !== undefined &&
    shop.longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
}

Page({
  data: {
    shopList: [],
    currentIndex: 0,
    shopInfo: createEmptyShop(),
    hasShopLocation: false
  },

  onLoad() {
    this.hasOpenedLocationPicker = false
    chooseLocation.setLocation(null)
    this.loadShopInfo()
  },

  onShow() {
    if (!this.hasOpenedLocationPicker) return

    const location = chooseLocation.getLocation()
    this.hasOpenedLocationPicker = false
    chooseLocation.setLocation(null)

    if (!location) return

    this.applyLocation(location)
  },

  onUnload() {
    chooseLocation.setLocation(null)
  },

  // 加载分店信息
  async loadShopInfo(selectedId = '') {
    try {
      wx.showLoading({ title: '加载中...' })

      const res = await db.collection('shopInfo')
        .orderBy('sort', 'asc')
        .limit(100)
        .get()

      wx.hideLoading()

      const list = (res.data || []).map((item, index) => ({
        status: typeof item.status === 'undefined' ? 1 : item.status,
        sort: typeof item.sort === 'undefined' ? index + 1 : item.sort,
        address: item.address || '',
        phone: item.phone || '',
        businessHours: item.businessHours || '',
        latitude: item.latitude || '',
        longitude: item.longitude || '',
        locationTitle: item.locationTitle || '',
        ...item
      }))

      if (list.length === 0) {
        this.setData({
          shopList: [],
          currentIndex: 0,
          shopInfo: createEmptyShop(),
          hasShopLocation: false
        })
        return
      }

      const indexById = selectedId ? list.findIndex(item => item._id === selectedId) : -1
      const currentIndex = indexById >= 0 ? indexById : 0

      this.setData({
        shopList: list,
        currentIndex,
        shopInfo: { ...list[currentIndex] },
        hasShopLocation: hasLocation(list[currentIndex])
      })
    } catch (err) {
      wx.hideLoading()
      console.error('加载店铺信息失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  selectShop(e) {
    const index = Number(e.currentTarget.dataset.index)
    const shop = this.data.shopList[index]
    if (!shop) return

    this.setData({
      currentIndex: index,
      shopInfo: { ...shop },
      hasShopLocation: hasLocation(shop)
    })
  },

  addShop() {
    const shop = createEmptyShop(this.data.shopList.length + 1)

    this.setData({
      currentIndex: -1,
      shopInfo: shop,
      hasShopLocation: false
    })
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value

    if (field === 'name' && value.length > 12) {
      value = value.substring(0, 12)
      wx.showToast({
        title: '分店名最多12个字',
        icon: 'none'
      })
    }

    this.setData({
      [`shopInfo.${field}`]: value
    })
  },

  openLocationPicker() {
    if (!this.isMapConfigReady()) {
      wx.showToast({
        title: '请先配置腾讯地图Key',
        icon: 'none'
      })
      return
    }

    const params = [
      `key=${encodeURIComponent(TENCENT_MAP_KEY)}`,
      `referer=${encodeURIComponent(TENCENT_MAP_REFERER)}`,
      `category=${encodeURIComponent(TENCENT_MAP_CATEGORY)}`,
      'scale=16'
    ]

    const location = this.getCurrentLocationParam()
    if (location) {
      params.push(`location=${encodeURIComponent(JSON.stringify(location))}`)
    }

    this.hasOpenedLocationPicker = true
    wx.navigateTo({
      url: `plugin://chooseLocation/index?${params.join('&')}`,
      fail: (err) => {
        this.hasOpenedLocationPicker = false
        console.error('打开腾讯地图选点插件失败', err)
        wx.showToast({
          title: '打开地图选点失败',
          icon: 'none'
        })
      }
    })
  },

  isMapConfigReady() {
    return TENCENT_MAP_KEY &&
      TENCENT_MAP_REFERER &&
      !/^请填写/.test(TENCENT_MAP_KEY) &&
      !/^请填写/.test(TENCENT_MAP_REFERER)
  },

  getCurrentLocationParam() {
    if (!hasLocation(this.data.shopInfo)) {
      return null
    }

    const latitude = Number(this.data.shopInfo.latitude)
    const longitude = Number(this.data.shopInfo.longitude)

    return {
      latitude,
      longitude
    }
  },

  applyLocation(location) {
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({
        title: '地图返回位置无效',
        icon: 'none'
      })
      return
    }

    this.setData({
      'shopInfo.address': location.address || location.name || '',
      'shopInfo.latitude': latitude,
      'shopInfo.longitude': longitude,
      'shopInfo.locationTitle': location.name || '',
      hasShopLocation: true
    })
  },

  onStatusChange(e) {
    this.setData({
      'shopInfo.status': e.detail.value ? 1 : 0
    })
  },

  buildSaveData(shopInfo) {
    const latitudeText = String(shopInfo.latitude || '').trim()
    const longitudeText = String(shopInfo.longitude || '').trim()

    if (!latitudeText || !longitudeText) {
      throw new Error('请先在地图中选择门店地址')
    }

    const latitude = latitudeText ? Number(latitudeText) : ''
    const longitude = longitudeText ? Number(longitudeText) : ''

    if (latitudeText && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      throw new Error('请输入正确的纬度')
    }

    if (longitudeText && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      throw new Error('请输入正确的经度')
    }

    return {
      name: shopInfo.name.trim(),
      description: (shopInfo.description || '').trim(),
      address: (shopInfo.address || '').trim(),
      phone: (shopInfo.phone || '').trim(),
      businessHours: (shopInfo.businessHours || '').trim(),
      latitude,
      longitude,
      locationTitle: (shopInfo.locationTitle || '').trim(),
      sort: Number(shopInfo.sort || 0),
      status: shopInfo.status === 0 ? 0 : 1,
      updateTime: new Date()
    }
  },

  // 保存分店信息
  async saveShopInfo() {
    const { shopInfo } = this.data

    if (!shopInfo.name.trim()) {
      wx.showToast({
        title: '请输入分店名称',
        icon: 'none'
      })
      return
    }

    let saveData
    try {
      saveData = this.buildSaveData(shopInfo)
    } catch (err) {
      wx.showToast({
        title: err.message,
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      let selectedId = shopInfo._id

      if (shopInfo._id) {
        await db.collection('shopInfo').doc(shopInfo._id).update({
          data: saveData
        })
      } else {
        const addRes = await db.collection('shopInfo').add({
          data: {
            ...saveData,
            createTime: new Date()
          }
        })
        selectedId = addRes._id
      }

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      this.loadShopInfo(selectedId)
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  deleteShopInfo() {
    const { shopInfo } = this.data
    if (!shopInfo._id) {
      this.addShop()
      return
    }

    wx.showModal({
      title: '删除分店',
      content: `确定删除「${shopInfo.name}」吗？`,
      success: async (res) => {
        if (!res.confirm) return

        try {
          wx.showLoading({ title: '删除中...' })
          await db.collection('shopInfo').doc(shopInfo._id).remove()
          wx.hideLoading()
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          this.loadShopInfo()
        } catch (err) {
          wx.hideLoading()
          console.error('删除分店失败', err)
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    })
  }
})
