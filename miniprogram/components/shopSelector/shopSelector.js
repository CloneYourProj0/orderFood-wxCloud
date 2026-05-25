Component({
  options: {
    multipleSlots: false
  },

  properties: {
    visible: { type: Boolean, value: false },
    shopList: { type: Array, value: [] },
    currentShop: { type: Object, value: null },
    locating: { type: Boolean, value: false }
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close')
    },

    noop() {},

    onLocateTap() {
      this.triggerEvent('locate')
    },

    onItemTap(e) {
      const shopId = e.currentTarget.dataset.id
      if (!shopId) return
      this.triggerEvent('select', { shopId })
    }
  }
})
