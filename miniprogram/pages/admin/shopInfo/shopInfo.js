// pages/admin/shopInfo/shopInfo.js
const db = wx.cloud.database()

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
    sort,
    status: 1
  }
}

Page({
  data: {
    shopList: [],
    currentIndex: 0,
    shopInfo: createEmptyShop()
  },

  onLoad() {
    this.loadShopInfo()
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
        ...item
      }))

      if (list.length === 0) {
        this.setData({
          shopList: [],
          currentIndex: 0,
          shopInfo: createEmptyShop()
        })
        return
      }

      const indexById = selectedId ? list.findIndex(item => item._id === selectedId) : -1
      const currentIndex = indexById >= 0 ? indexById : 0

      this.setData({
        shopList: list,
        currentIndex,
        shopInfo: { ...list[currentIndex] }
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
      shopInfo: { ...shop }
    })
  },

  addShop() {
    this.setData({
      currentIndex: -1,
      shopInfo: createEmptyShop(this.data.shopList.length + 1)
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

  onStatusChange(e) {
    this.setData({
      'shopInfo.status': e.detail.value ? 1 : 0
    })
  },

  buildSaveData(shopInfo) {
    const latitudeText = String(shopInfo.latitude || '').trim()
    const longitudeText = String(shopInfo.longitude || '').trim()
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
