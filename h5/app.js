const STORAGE_KEY = 'orderFoodWxCloud:h5:data:v1'
const ADMIN_KEY = 'orderFoodWxCloud:h5:adminPassword:v1'

const defaultDishImage = '/h5/assets/dish-fish.jpg'

let state = loadState()
let toastTimer = null
let ui = {
  route: 'order',
  categoryId: state.categories[0]?.id || 'recommend',
  orderFilter: 'all',
  cartOpen: false,
  checkout: null,
  confirm: null,
  shopSelectorOpen: false,
  userLocation: null,
  locating: false,
  adminPasswordOpen: false,
  adminPasswordMode: localStorage.getItem(ADMIN_KEY) ? 'verify' : 'set',
  adminOpen: false,
  adminTab: 'users',
  toast: ''
}

function seedState() {
  return {
    currentUserId: 'u-demo',
    shopInfo: {
      name: '闫哥鱼粉',
      slogan: '扫码点餐，会员充值更优惠',
      notice: '充值更有优惠，充得越多送得越多'
    },
    currentShopId: 's-main',
    shopList: [
      {
        id: 's-main',
        name: '闫哥鱼粉总店',
        slogan: '扫码点餐，会员充值更优惠',
        notice: '充值更有优惠，充得越多送得越多',
        address: '成都市锦江区春熙路 88 号',
        phone: '028-88886666',
        businessHours: '10:00-22:00',
        latitude: 30.657,
        longitude: 104.066,
        sort: 1,
        status: 1
      },
      {
        id: 's-east',
        name: '闫哥鱼粉东门店',
        slogan: '附近门店，快速取餐',
        notice: '东门店工作日午市加粉半价',
        address: '成都市成华区建设路 66 号',
        phone: '028-88887777',
        businessHours: '09:30-21:30',
        latitude: 30.674,
        longitude: 104.112,
        sort: 2,
        status: 1
      },
      {
        id: 's-south',
        name: '闫哥鱼粉南门店',
        slogan: '扫码点餐，到店即取',
        notice: '南门店晚市饮品第二杯半价',
        address: '成都市武侯区天府大道 188 号',
        phone: '028-88889999',
        businessHours: '10:30-22:30',
        latitude: 30.56,
        longitude: 104.07,
        sort: 3,
        status: 1
      }
    ],
    users: [
      {
        id: 'u-demo',
        nickName: 'H5餐饮会员',
        phoneNumber: '13800000000',
        balance: 36,
        miandanCount: 1,
        createTime: new Date().toISOString()
      },
      {
        id: 'u-jason',
        nickName: 'Jason',
        phoneNumber: '13900000030',
        balance: 30,
        miandanCount: 0,
        createTime: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'u-chen',
        nickName: '陈目标',
        phoneNumber: '13820002888',
        balance: 164,
        miandanCount: 0,
        createTime: new Date(Date.now() - 86400000 * 4).toISOString()
      }
    ],
    categories: [
      { id: 'recommend', name: '店长推荐', sort: 1 },
      { id: 'fish-soup', name: '招牌鱼汤粉', sort: 2 },
      { id: 'beef', name: '牛肉粉', sort: 3 },
      { id: 'snacks', name: '小吃饮品', sort: 4 }
    ],
    dishes: [
      {
        id: 'd-hgy',
        categoryId: 'recommend',
        name: '黄骨鱼',
        description: '鲜香鱼汤，米粉可选微辣',
        price: 18,
        originalPrice: 18,
        canUseMiandan: true,
        status: 1,
        image: defaultDishImage,
        tags: ['微辣', '要葱']
      },
      {
        id: 'd-hgyf',
        categoryId: 'fish-soup',
        name: '黄骨鱼汤粉',
        description: '鱼汤浓，粉量足，适合堂食',
        price: 16,
        originalPrice: 18,
        canUseMiandan: false,
        status: 1,
        image: defaultDishImage,
        tags: ['不辣', '加粉']
      },
      {
        id: 'd-yrou',
        categoryId: 'fish-soup',
        name: '鱼肉汤粉',
        description: '去骨鱼肉，口味清爽',
        price: 14,
        originalPrice: 0,
        canUseMiandan: false,
        status: 1,
        image: defaultDishImage,
        tags: ['清淡', '少葱']
      },
      {
        id: 'd-beef',
        categoryId: 'beef',
        name: '卤牛肉粉',
        description: '卤香牛肉片，汤底醇厚',
        price: 16,
        originalPrice: 0,
        canUseMiandan: false,
        status: 1,
        image: '',
        tags: ['微辣', '要葱']
      },
      {
        id: 'd-egg',
        categoryId: 'snacks',
        name: '卤蛋',
        description: '小份加餐',
        price: 2,
        originalPrice: 0,
        canUseMiandan: false,
        status: 1,
        image: '',
        tags: []
      },
      {
        id: 'd-drink',
        categoryId: 'snacks',
        name: '冰柠茶',
        description: '酸甜解腻',
        price: 6,
        originalPrice: 0,
        canUseMiandan: false,
        status: 1,
        image: '',
        tags: ['少冰', '常温']
      }
    ],
    rechargeOptions: [
      { id: 'r-30', amount: 30, giveAmount: 2, status: 1 },
      { id: 'r-68', amount: 68, giveAmount: 8, status: 1 },
      { id: 'r-100', amount: 100, giveAmount: 18, status: 1 },
      { id: 'r-200', amount: 200, giveAmount: 48, status: 1 }
    ],
    tableNumbers: ['01', '02', '03', '04', 'A01'],
    cart: {},
    orders: []
  }
}

function loadState() {
  const fallback = seedState()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw)
    return {
      ...fallback,
      ...parsed,
      shopInfo: { ...fallback.shopInfo, ...(parsed.shopInfo || {}) },
      currentShopId: parsed.currentShopId || fallback.currentShopId,
      shopList: Array.isArray(parsed.shopList) && parsed.shopList.length
        ? parsed.shopList
        : [{ id: 's-legacy', ...fallback.shopInfo, ...(parsed.shopInfo || {}), sort: 1, status: 1 }],
      cart: parsed.cart || {},
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : fallback.users,
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : fallback.categories,
      dishes: Array.isArray(parsed.dishes) && parsed.dishes.length ? parsed.dishes : fallback.dishes,
      rechargeOptions: Array.isArray(parsed.rechargeOptions) && parsed.rechargeOptions.length ? parsed.rechargeOptions : fallback.rechargeOptions
    }
  } catch (err) {
    console.warn('H5 state parse failed', err)
    return fallback
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]
  })
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}

function money(value) {
  return Number(value || 0).toFixed(2)
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toRad(value) {
  return value * Math.PI / 180
}

function calcDistance(from, to) {
  if (!from || !to) return null
  const fromLat = Number(from.latitude)
  const fromLng = Number(from.longitude)
  const toLat = Number(to.latitude)
  const toLng = Number(to.longitude)
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null

  const earthRadius = 6371000
  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(distance) {
  if (distance === null || distance === undefined) return ''
  if (distance < 1000) return `${Math.round(distance)}m`
  return `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)}km`
}

function currentShop() {
  if (!Array.isArray(state.shopList) || state.shopList.length === 0) {
    state.shopList = [{ id: 's-default', ...state.shopInfo, sort: 1, status: 1 }]
  }

  let shop = state.shopList.find((item) => item.id === state.currentShopId)
  if (!shop || shop.status === 0) {
    shop = state.shopList.find((item) => item.status !== 0) || state.shopList[0]
    state.currentShopId = shop.id
  }

  return shop
}

function syncShopInfoFromCurrent() {
  const shop = currentShop()
  state.shopInfo = {
    ...state.shopInfo,
    name: shop.name,
    slogan: shop.slogan || state.shopInfo.slogan,
    notice: shop.notice || state.shopInfo.notice
  }
}

function shopsForDisplay() {
  return (state.shopList || [])
    .filter((shop) => shop.status !== 0)
    .map((shop) => {
      const distance = calcDistance(ui.userLocation, shop)
      return {
        ...shop,
        distance,
        distanceText: formatDistance(distance)
      }
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance === null) return -1
      if (a.distance === null && b.distance !== null) return 1
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) return a.distance - b.distance
      return Number(a.sort || 0) - Number(b.sort || 0)
    })
}

function selectShop(shopId) {
  const shop = state.shopList.find((item) => item.id === shopId && item.status !== 0)
  if (!shop) return
  state.currentShopId = shop.id
  syncShopInfoFromCurrent()
  ui.shopSelectorOpen = false
  saveState()
  showToast('已切换分店')
  render()
}

function locateNearestShop() {
  if (!navigator.geolocation) {
    showToast('当前浏览器不支持定位')
    return
  }

  ui.locating = true
  render()
  navigator.geolocation.getCurrentPosition((position) => {
    ui.userLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }
    const nearest = shopsForDisplay()[0]
    if (nearest) {
      state.currentShopId = nearest.id
      syncShopInfoFromCurrent()
      saveState()
    }
    ui.locating = false
    render()
    showToast(nearest && nearest.distanceText ? `已推荐最近分店：${nearest.distanceText}` : '定位成功')
  }, () => {
    ui.locating = false
    render()
    showToast('定位失败，请手动选择分店')
  }, {
    enableHighAccuracy: true,
    timeout: 8000
  })
}

function currentUser() {
  let user = state.users.find((item) => item.id === state.currentUserId)
  if (!user) {
    user = seedState().users[0]
    state.currentUserId = user.id
    state.users.unshift(user)
  }
  return user
}

function updateCurrentUser(patch) {
  Object.assign(currentUser(), patch)
}

function activeDishes() {
  return state.dishes.filter((dish) => dish.status !== 0)
}

function findDish(dishId) {
  return state.dishes.find((dish) => dish.id === dishId)
}

function cartItems() {
  return Object.values(state.cart)
    .map((item) => ({ ...item, dish: findDish(item.dishId) }))
    .filter((item) => item.dish)
}

function cartCount() {
  return cartItems().reduce((sum, item) => sum + item.count, 0)
}

function cartTotal() {
  return cartItems().reduce((sum, item) => sum + item.count * Number(item.dish.price || 0), 0)
}

function dishCartCount(dishId) {
  return state.cart[dishId]?.count || 0
}

function canUseMiandan() {
  const user = currentUser()
  const items = cartItems()
  return user.miandanCount > 0 && items.length === 1 && items[0].count === 1 && items[0].dish.canUseMiandan
}

function showToast(message) {
  ui.toast = message
  render()
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    ui.toast = ''
    render()
  }, 1800)
}

function setRoute(route) {
  ui.route = route
  ui.cartOpen = false
  ui.checkout = null
  ui.confirm = null
  ui.shopSelectorOpen = false
  render()
}

function addDish(dishId) {
  const dish = findDish(dishId)
  if (!dish || dish.status === 0) return
  state.cart[dishId] = {
    dishId,
    count: (state.cart[dishId]?.count || 0) + 1
  }
  saveState()
  render()
}

function reduceDish(dishId) {
  if (!state.cart[dishId]) return
  state.cart[dishId].count -= 1
  if (state.cart[dishId].count <= 0) {
    delete state.cart[dishId]
  }
  saveState()
  render()
}

function clearCart() {
  state.cart = {}
  saveState()
  render()
}

function defaultPayMethod() {
  const user = currentUser()
  const total = cartTotal()
  if (canUseMiandan()) return 'miandan'
  if (user.balance >= total) return 'balance'
  return 'wechat'
}

function openCheckout() {
  if (cartCount() === 0) {
    showToast('请先选择菜品')
    return
  }

  ui.cartOpen = false
  ui.checkout = {
    payMethod: defaultPayMethod(),
    shopId: currentShop().id,
    tableNumber: state.tableNumbers[1] || '02',
    orderType: 'dineIn'
  }
  render()
}

function confirmCheckout() {
  if (!ui.checkout) return
  ui.checkout.tableNumber = (document.getElementById('checkout-table')?.value || '').trim()
  ui.checkout.orderType = document.getElementById('checkout-order-type')?.value || 'dineIn'

  if (!ui.checkout.tableNumber) {
    showToast('请填写桌码')
    return
  }

  const payMethod = ui.checkout.payMethod
  const total = cartTotal()
  const user = currentUser()

  if (payMethod === 'miandan' && !canUseMiandan()) {
    showToast('当前订单不能使用免单')
    return
  }

  if (payMethod === 'balance' && user.balance < total) {
    ui.checkout.payMethod = 'wechat'
    showToast('余额不足，已切换微信支付')
    return
  }

  if (payMethod === 'wechat') {
    ui.confirm = {
      kind: 'wechatOrder',
      title: '微信支付',
      message: `确认支付 ¥${money(total)} 完成点餐订单。`,
      confirmLabel: '确认支付'
    }
    render()
    return
  }

  finishOrder(payMethod)
}

function finishOrder(payMethod) {
  if (!ui.checkout || cartCount() === 0) return
  const items = cartItems()
  const total = cartTotal()
  const user = currentUser()
  const shop = currentShop()
  const finalPrice = payMethod === 'miandan' ? 0 : total

  if (payMethod === 'balance') {
    user.balance = Number((user.balance - finalPrice).toFixed(2))
  }

  if (payMethod === 'miandan') {
    user.miandanCount = Math.max(0, user.miandanCount - 1)
  }

  const order = {
    id: `O${Date.now()}`,
    type: 'order',
    goods: items.map((item) => ({
      dishId: item.dishId,
      dishName: item.dish.name,
      price: item.dish.price,
      count: item.count,
      canUseMiandan: item.dish.canUseMiandan
    })),
    totalPrice: total,
    finalPrice,
    useMiandan: payMethod === 'miandan',
    payMethod,
    pay_status: true,
    orderType: ui.checkout.orderType,
    tableNumber: ui.checkout.tableNumber,
    shopId: shop.id,
    shopName: shop.name,
    shopAddress: shop.address || '',
    shopInfo: { ...shop },
    createTime: new Date().toISOString(),
    userId: user.id
  }

  state.orders.unshift(order)
  state.cart = {}
  ui.checkout = null
  ui.confirm = null
  ui.route = 'orders'
  saveState()
  render()
  showToast('下单成功')
}

function finishRecharge(planId) {
  const plan = state.rechargeOptions.find((item) => item.id === planId)
  if (!plan) return

  const user = currentUser()
  const paidRechargeCount = state.orders.filter((order) => order.type === 'recharge' && order.pay_status).length
  const totalGet = Number(plan.amount) + Number(plan.giveAmount || 0)
  const addFree = paidRechargeCount === 0 && Number(plan.amount) > 68 ? 1 : 0

  user.balance = Number((user.balance + totalGet).toFixed(2))
  user.miandanCount += addFree

  state.orders.unshift({
    id: `R${Date.now()}`,
    type: 'recharge',
    amount: Number(plan.amount),
    giveAmount: Number(plan.giveAmount || 0),
    totalGet,
    payMethod: 'wechat',
    pay_status: true,
    createTime: new Date().toISOString(),
    userId: user.id
  })

  ui.confirm = null
  ui.route = 'orders'
  saveState()
  render()
  showToast(addFree ? '充值成功，已赠送免单次数' : '充值成功')
}

function cancelOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId)
  if (!order || order.status === 'canceled' || order.type !== 'order') return
  const user = currentUser()

  if (order.payMethod === 'balance' && order.finalPrice > 0) {
    user.balance = Number((user.balance + order.finalPrice).toFixed(2))
  }

  if (order.useMiandan) {
    user.miandanCount += 1
  }

  order.status = 'canceled'
  saveState()
  render()
  showToast('订单已取消')
}

function render() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="shell">
      ${renderTopbar()}
      <main class="screen ${ui.route === 'order' ? 'order-screen' : ''}">
        ${renderCurrentRoute()}
      </main>
      ${ui.route === 'order' ? renderCartSummary() : ''}
      ${renderTabbar()}
      ${ui.cartOpen ? renderCartDrawer() : ''}
      ${ui.checkout ? renderCheckoutModal() : ''}
      ${ui.confirm ? renderConfirmModal() : ''}
      ${ui.shopSelectorOpen ? renderShopSelector() : ''}
      ${ui.adminPasswordOpen ? renderAdminPasswordModal() : ''}
      ${ui.adminOpen ? renderAdminPanel() : ''}
      ${ui.toast ? `<div class="toast">${escapeHtml(ui.toast)}</div>` : ''}
    </div>
  `
}

function renderTopbar() {
  const shop = currentShop()
  const distance = formatDistance(calcDistance(ui.userLocation, shop))
  return `
    <header class="topbar">
      <div class="topbar-row">
        <button class="title-block shop-switch" data-action="open-shop-selector">
          <h1 class="shop-title">${escapeHtml(shop.name || '请选择分店')}</h1>
          <div class="shop-subtitle">${escapeHtml(distance ? `距你 ${distance}` : (shop.address || shop.slogan || '点击选择附近分店'))}</div>
        </button>
        <button class="locate-chip" data-action="locate-shop">${ui.locating ? '定位中' : '定位'}</button>
        <div class="h5-badge">H5</div>
      </div>
    </header>
  `
}

function renderCurrentRoute() {
  if (ui.route === 'recharge') return renderRecharge()
  if (ui.route === 'orders') return renderOrders()
  if (ui.route === 'me') return renderMe()
  return renderOrder()
}

function renderTabbar() {
  const tabs = [
    { route: 'order', text: '点餐', icon: 'buy' },
    { route: 'recharge', text: '充值', icon: 'recharge' },
    { route: 'orders', text: '订单', icon: 'myOrder' },
    { route: 'me', text: '我的', icon: 'me' }
  ]

  return `
    <nav class="tabbar">
      ${tabs.map((tab) => {
        const active = ui.route === tab.route
        const icon = `/miniprogram/images/tabBar/${tab.icon}${active ? '-active' : ''}.png`
        return `
          <button class="tab-btn ${active ? 'active' : ''}" data-route="${tab.route}">
            <img src="${icon}" alt="" />
            <span>${tab.text}</span>
          </button>
        `
      }).join('')}
    </nav>
  `
}

function renderOrder() {
  const user = currentUser()
  const shop = currentShop()
  const dishes = activeDishes().filter((dish) => dish.categoryId === ui.categoryId)

  return `
    <div class="notice">
      <span class="notice-icon">i</span>
      <span>${escapeHtml(shop.notice || state.shopInfo.notice)}</span>
    </div>
    <div class="member-strip">
      <div class="metric">
        <span class="metric-label">账户余额</span>
        <strong class="metric-value">¥${money(user.balance)}</strong>
      </div>
      <div class="metric">
        <span class="metric-label">免单次数</span>
        <strong class="metric-value">${user.miandanCount || 0} 次</strong>
      </div>
    </div>
    <div class="dish-layout">
      <aside class="category-list">
        ${state.categories.map((category) => `
          <button class="category-btn ${ui.categoryId === category.id ? 'active' : ''}" data-category="${category.id}">
            ${escapeHtml(category.name)}
          </button>
        `).join('')}
      </aside>
      <section class="goods-list">
        ${dishes.length ? dishes.map(renderDishCard).join('') : '<div class="empty">暂无菜品</div>'}
      </section>
    </div>
  `
}

function renderDishCard(dish) {
  const count = dishCartCount(dish.id)
  return `
    <article class="dish-card">
      ${renderDishImage(dish)}
      <div class="dish-info">
        <div class="dish-name-row">
          <h3 class="dish-name">${escapeHtml(dish.name)}</h3>
          ${dish.canUseMiandan ? '<span class="pill free">免单</span>' : ''}
        </div>
        <p class="dish-desc">${escapeHtml(dish.description || '')}</p>
        <div class="tag-row">
          ${(dish.tags || []).slice(0, 3).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="dish-footer">
          <div class="price"><small>¥</small>${money(dish.price)}${dish.originalPrice ? `<span class="old">¥${money(dish.originalPrice)}</span>` : ''}</div>
          <div class="stepper">
            ${count > 0 ? `<button class="icon-btn secondary" data-reduce="${dish.id}" aria-label="减少">-</button><span class="count-text">${count}</span>` : ''}
            <button class="icon-btn" data-add="${dish.id}" aria-label="增加">+</button>
          </div>
        </div>
      </div>
    </article>
  `
}

function renderDishImage(dish, className = 'dish-image') {
  if (dish.image) {
    return `<img class="${className}" src="${escapeAttr(dish.image)}" alt="${escapeAttr(dish.name)}" />`
  }
  return `<div class="${className} placeholder">${escapeHtml(dish.name.slice(0, 2))}</div>`
}

function renderCartSummary() {
  const count = cartCount()
  const total = cartTotal()
  return `
    <div class="cart-summary">
      <button class="cart-left" data-action="toggle-cart">
        <span class="cart-icon">
          <img src="/miniprogram/images/shopping.png" alt="" />
          ${count ? `<span class="cart-badge">${count}</span>` : ''}
        </span>
        <span>
          <span class="cart-total">¥${money(total)}</span>
          <span class="cart-hint">${count ? `${count} 件商品` : '购物车为空'}</span>
        </span>
      </button>
      <button class="primary-btn" data-action="open-checkout" ${count ? '' : 'disabled'}>去结算</button>
    </div>
  `
}

function renderCartDrawer() {
  const items = cartItems()
  return `
    <div class="modal-backdrop" data-action="close-cart">
      <section class="modal" data-stop>
        <div class="modal-head">
          <h2 class="modal-title">购物车</h2>
          <button class="close-btn" data-action="close-cart">×</button>
        </div>
        ${items.length ? `
          <div class="cart-lines">
            ${items.map((item) => `
              <div class="cart-line">
                ${renderDishImage(item.dish, 'cart-thumb')}
                <div>
                  <strong>${escapeHtml(item.dish.name)}</strong>
                  <div class="order-time">¥${money(item.dish.price)} × ${item.count}</div>
                </div>
                <div class="stepper">
                  <button class="icon-btn secondary" data-reduce="${item.dishId}">-</button>
                  <span class="count-text">${item.count}</span>
                  <button class="icon-btn" data-add="${item.dishId}">+</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="button-row">
            <button class="ghost-btn" data-action="clear-cart">清空</button>
            <button class="primary-btn" data-action="open-checkout">去结算 ¥${money(cartTotal())}</button>
          </div>
        ` : '<div class="empty">购物车为空</div>'}
      </section>
    </div>
  `
}

function renderCheckoutModal() {
  const user = currentUser()
  const shop = currentShop()
  const total = cartTotal()
  const pay = ui.checkout.payMethod
  const canFree = canUseMiandan()
  const balanceOk = user.balance >= total
  const finalPrice = pay === 'miandan' ? 0 : total

  return `
    <div class="modal-backdrop">
      <section class="modal" data-stop>
        <div class="modal-head">
          <h2 class="modal-title">确认订单</h2>
          <button class="close-btn" data-action="close-checkout">×</button>
        </div>
        <div class="cart-lines">
          ${cartItems().map((item) => `
            <div class="cart-line">
              ${renderDishImage(item.dish, 'cart-thumb')}
              <div>
                <strong>${escapeHtml(item.dish.name)}</strong>
                <div class="order-time">¥${money(item.dish.price)} × ${item.count}</div>
              </div>
              <strong>¥${money(item.dish.price * item.count)}</strong>
            </div>
          `).join('')}
        </div>
        <div class="form-grid">
          <div class="checkout-shop">
            <strong>${escapeHtml(shop.name || '餐饮店')}</strong>
            <span>${escapeHtml(shop.address || '当前下单分店')}</span>
          </div>
          <div class="form-row">
            <label for="checkout-table">桌码</label>
            <input id="checkout-table" class="input" value="${escapeAttr(ui.checkout.tableNumber)}" data-checkout-field="tableNumber" />
          </div>
          <div class="form-row">
            <label for="checkout-order-type">用餐方式</label>
            <select id="checkout-order-type" class="select" data-checkout-field="orderType">
              <option value="dineIn" ${ui.checkout.orderType === 'dineIn' ? 'selected' : ''}>堂食</option>
              <option value="takeOut" ${ui.checkout.orderType === 'takeOut' ? 'selected' : ''}>打包</option>
            </select>
          </div>
        </div>
        <div class="payment-list">
          ${renderPayMethod('miandan', '免单支付', canFree ? `可用 ${user.miandanCount} 次` : '当前订单不可用', pay === 'miandan', !canFree)}
          ${renderPayMethod('balance', '余额支付', `余额 ¥${money(user.balance)}`, pay === 'balance', !balanceOk)}
          ${renderPayMethod('wechat', '微信支付', '浏览器内模拟支付完成', pay === 'wechat', false)}
        </div>
        <div class="checkout-total">
          <div class="row-between">
            <span>商品合计</span>
            <strong>¥${money(total)}</strong>
          </div>
          <div class="row-between">
            <span>实付金额</span>
            <strong class="price">¥${money(finalPrice)}</strong>
          </div>
        </div>
        <button class="primary-btn" data-action="confirm-checkout" style="width: 100%;">提交订单</button>
      </section>
    </div>
  `
}

function renderPayMethod(value, title, desc, active, disabled) {
  return `
    <button class="pay-method ${active ? 'active' : ''}" data-action="pay-method" data-pay="${value}" ${disabled ? 'disabled' : ''}>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <span class="cart-hint">${escapeHtml(desc)}</span>
      </span>
      <span class="radio-dot"></span>
    </button>
  `
}

function renderShopSelector() {
  const shops = shopsForDisplay()
  const currentId = currentShop().id

  return `
    <div class="modal-backdrop" data-action="close-shop-selector">
      <section class="modal" data-stop>
        <div class="modal-head">
          <div>
            <h2 class="modal-title">选择分店</h2>
            <p class="section-note">获取定位后会优先展示最近门店。</p>
          </div>
          <button class="close-btn" data-action="close-shop-selector">×</button>
        </div>
        <button class="shop-locate-row" data-action="locate-shop">${ui.locating ? '正在获取当前位置...' : '获取定位并推荐最近分店'}</button>
        <div class="shop-list">
          ${shops.length ? shops.map((shop) => `
            <button class="shop-option ${shop.id === currentId ? 'active' : ''}" data-action="select-shop" data-shop="${shop.id}">
              <span>
                <strong>${escapeHtml(shop.name || '未命名分店')}</strong>
                <span class="cart-hint">${escapeHtml(shop.address || shop.slogan || '暂无地址')}</span>
                ${shop.businessHours || shop.phone ? `<span class="cart-hint">${escapeHtml([shop.businessHours, shop.phone].filter(Boolean).join(' · '))}</span>` : ''}
              </span>
              <span class="shop-distance">${escapeHtml(shop.distanceText || (shop.id === currentId ? '当前' : ''))}</span>
            </button>
          `).join('') : '<div class="empty">暂无可选分店</div>'}
        </div>
      </section>
    </div>
  `
}

function renderRecharge() {
  const user = currentUser()
  const recharges = state.orders.filter((order) => order.type === 'recharge')
  const hasPaidRecharge = state.orders.some((order) => order.type === 'recharge' && order.pay_status)

  return `
    <section class="balance-band">
      <div class="metric-label">账户余额</div>
      <div class="balance-amount">¥${money(user.balance)}</div>
      <div class="section-note">免单次数：${user.miandanCount || 0} 次</div>
    </section>
    <div class="section-head">
      <div>
        <h2>充值套餐</h2>
        <p class="section-note">充值成功后余额立即到账。</p>
      </div>
    </div>
    <section class="plans">
      ${state.rechargeOptions.filter((plan) => plan.status !== 0).map((plan) => {
        const firstGift = !hasPaidRecharge && Number(plan.amount) > 68
        return `
          <article class="plan-card">
            <div class="plan-main">
              <h3 class="plan-title">充 ¥${money(plan.amount)}</h3>
              <div class="plan-desc">赠送 ¥${money(plan.giveAmount)}，到账 ¥${money(Number(plan.amount) + Number(plan.giveAmount || 0))}</div>
              ${firstGift ? '<div class="tag-row" style="margin-top: 8px;"><span class="pill free">首次充值送免单</span></div>' : ''}
            </div>
            <button class="primary-btn" data-action="recharge" data-plan="${plan.id}">充值</button>
          </article>
        `
      }).join('')}
    </section>
    <div class="section-head">
      <h2>充值记录</h2>
    </div>
    <section class="order-list">
      ${recharges.length ? recharges.slice(0, 4).map(renderOrderCard).join('') : '<div class="empty">暂无充值记录</div>'}
    </section>
  `
}

function renderOrders() {
  const filter = ui.orderFilter
  const orders = state.orders.filter((order) => {
    if (filter === 'all') return true
    return order.type === filter
  })

  return `
    <div class="section-head">
      <div>
        <h2>我的订单</h2>
        <p class="section-note">仅展示当前 H5 本地数据。</p>
      </div>
    </div>
    <div class="order-filter">
      ${renderFilter('all', '全部')}
      ${renderFilter('order', '点餐订单')}
      ${renderFilter('recharge', '充值订单')}
    </div>
    <section class="order-list">
      ${orders.length ? orders.map(renderOrderCard).join('') : '<div class="empty">暂无订单</div>'}
    </section>
  `
}

function renderFilter(value, label) {
  return `<button class="filter-btn ${ui.orderFilter === value ? 'active' : ''}" data-action="order-filter" data-filter="${value}">${label}</button>`
}

function renderOrderCard(order) {
  const isRecharge = order.type === 'recharge'
  const payText = order.useMiandan ? '免单支付' : order.payMethod === 'balance' ? '余额支付' : '微信支付'
  const status = order.status === 'canceled' ? '已取消' : '已支付'

  if (isRecharge) {
    return `
      <article class="order-card">
        <div class="order-top">
          <div>
            <h3 class="order-title">充值订单</h3>
            <div class="order-time">${formatDate(order.createTime)}</div>
          </div>
          <span class="pill green">${status}</span>
        </div>
        <ul class="order-goods">
          <li><span>充值金额</span><strong>¥${money(order.amount)}</strong></li>
          <li><span>赠送金额</span><strong>¥${money(order.giveAmount)}</strong></li>
          <li><span>到账金额</span><strong>¥${money(order.totalGet)}</strong></li>
        </ul>
      </article>
    `
  }

  return `
    <article class="order-card">
      <div class="order-top">
        <div>
          <h3 class="order-title">${order.orderType === 'takeOut' ? '打包' : '堂食'}订单 ${escapeHtml(order.tableNumber || '')}</h3>
          <div class="order-time">${formatDate(order.createTime)}</div>
          ${order.shopName ? `<div class="order-time">分店：${escapeHtml(order.shopName)}</div>` : ''}
        </div>
        <span class="pill ${order.status === 'canceled' ? '' : 'green'}">${status}</span>
      </div>
      <ul class="order-goods">
        ${(order.goods || []).map((item) => `
          <li><span>${escapeHtml(item.dishName)} × ${item.count}</span><strong>¥${money(item.price * item.count)}</strong></li>
        `).join('')}
        <li><span>${payText}</span><strong class="price">¥${money(order.finalPrice)}</strong></li>
      </ul>
      ${order.status === 'canceled' ? '' : `
        <div class="button-row" style="margin-top: 12px;">
          <button class="ghost-btn" data-route="order">再来一单</button>
          <button class="secondary-btn" data-action="cancel-order" data-order="${order.id}">取消订单</button>
        </div>
      `}
    </article>
  `
}

function renderMe() {
  const user = currentUser()
  return `
    <section class="profile-band">
      <div class="profile-header">
        <div class="avatar">${escapeHtml(user.nickName.slice(0, 1) || '会')}</div>
        <div>
          <h2 class="profile-name">${escapeHtml(user.nickName)}</h2>
          <div class="profile-phone">${escapeHtml(user.phoneNumber || '未绑定手机号')}</div>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat-cell">
          <div class="metric-label">账户余额</div>
          <div class="metric-value">¥${money(user.balance)}</div>
        </div>
        <div class="stat-cell">
          <div class="metric-label">免单次数</div>
          <div class="metric-value">${user.miandanCount || 0} 次</div>
        </div>
      </div>
    </section>
    <section class="action-list">
      <button class="action-item" data-route="recharge">
        <span><strong>立即充值</strong><span class="cart-hint">选择套餐，模拟微信支付到账</span></span>
        <span>›</span>
      </button>
      <button class="action-item" data-route="orders">
        <span><strong>查看订单</strong><span class="cart-hint">点餐和充值记录</span></span>
        <span>›</span>
      </button>
      <button class="action-item" data-action="open-admin-password">
        <span><strong>管理员入口</strong><span class="cart-hint">本地密码，默认首次进入需设置</span></span>
        <span>›</span>
      </button>
    </section>
    <div class="section-head">
      <h2>会员资料</h2>
    </div>
    <section class="plans">
      <div class="admin-card">
        <div class="form-grid">
          <div class="form-row">
            <label for="profile-name">昵称</label>
            <input id="profile-name" class="input" value="${escapeAttr(user.nickName)}" />
          </div>
          <div class="form-row">
            <label for="profile-phone">手机号</label>
            <input id="profile-phone" class="input" value="${escapeAttr(user.phoneNumber)}" />
          </div>
          <button class="primary-btn" data-action="save-profile">保存资料</button>
        </div>
      </div>
      <button class="ghost-btn" data-action="reset-demo">重置 H5 数据</button>
    </section>
  `
}

function renderConfirmModal() {
  return `
    <div class="modal-backdrop">
      <section class="modal small" data-stop>
        <div class="modal-head">
          <h2 class="modal-title">${escapeHtml(ui.confirm.title)}</h2>
          <button class="close-btn" data-action="confirm-cancel">×</button>
        </div>
        <p class="section-note" style="font-size: 15px;">${escapeHtml(ui.confirm.message)}</p>
        <div class="button-row" style="margin-top: 18px;">
          <button class="ghost-btn" data-action="confirm-cancel">取消</button>
          <button class="primary-btn" data-action="confirm-ok">${escapeHtml(ui.confirm.confirmLabel || '确定')}</button>
        </div>
      </section>
    </div>
  `
}

function renderAdminPasswordModal() {
  const isSet = ui.adminPasswordMode === 'set'
  return `
    <div class="modal-backdrop">
      <section class="modal small" data-stop>
        <div class="modal-head">
          <h2 class="modal-title">${isSet ? '设置管理员密码' : '管理员登录'}</h2>
          <button class="close-btn" data-action="close-admin-password">×</button>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label for="admin-password">${isSet ? '新密码' : '密码'}</label>
            <input id="admin-password" class="input" type="password" minlength="6" />
          </div>
          <button class="primary-btn" data-action="submit-admin-password">${isSet ? '设置并进入' : '进入后台'}</button>
        </div>
      </section>
    </div>
  `
}

function renderAdminPanel() {
  const tabs = [
    ['users', '会员'],
    ['dishes', '菜品'],
    ['orders', '订单'],
    ['settings', '设置']
  ]

  return `
    <section class="admin-panel">
      <header class="admin-head">
        <strong>管理后台</strong>
        <button class="ghost-btn" data-action="close-admin">关闭</button>
      </header>
      <nav class="admin-tabs">
        ${tabs.map(([id, label]) => `<button class="admin-tab ${ui.adminTab === id ? 'active' : ''}" data-action="admin-tab" data-tab="${id}">${label}</button>`).join('')}
      </nav>
      <div class="admin-body">
        ${renderAdminBody()}
      </div>
    </section>
  `
}

function renderAdminBody() {
  if (ui.adminTab === 'dishes') return renderAdminDishes()
  if (ui.adminTab === 'orders') return renderAdminOrders()
  if (ui.adminTab === 'settings') return renderAdminSettings()
  return renderAdminUsers()
}

function renderAdminUsers() {
  return `
    <div class="admin-section">
      <div class="admin-card">
        <h3>会员管理</h3>
        ${state.users.map((user) => `
          <div class="user-row">
            <div class="row-between">
              <div>
                <strong>${escapeHtml(user.nickName)}</strong>
                <div class="order-time">${escapeHtml(user.phoneNumber || '')}</div>
              </div>
              <span class="pill ${user.id === state.currentUserId ? 'blue' : ''}">${user.id === state.currentUserId ? '当前用户' : '会员'}</span>
            </div>
            <div class="compact-grid" style="margin-top: 10px;">
              <div class="form-row">
                <label>余额</label>
                <input id="admin-balance-${user.id}" class="input" type="number" min="0" step="0.01" value="${escapeAttr(user.balance)}" />
              </div>
              <div class="form-row">
                <label>免单</label>
                <input id="admin-free-${user.id}" class="input" type="number" min="0" step="1" value="${escapeAttr(user.miandanCount)}" />
              </div>
              <button class="primary-btn" data-action="admin-save-user" data-user="${user.id}">保存</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function renderAdminDishes() {
  return `
    <div class="admin-section">
      <div class="admin-card">
        <h3>添加菜品</h3>
        <div class="form-grid">
          <div class="compact-grid">
            <div class="form-row">
              <label for="admin-dish-name">菜品名</label>
              <input id="admin-dish-name" class="input" placeholder="如：招牌鱼杂汤粉" />
            </div>
            <div class="form-row">
              <label for="admin-dish-price">价格</label>
              <input id="admin-dish-price" class="input" type="number" min="0" step="0.01" />
            </div>
            <div class="form-row">
              <label for="admin-dish-category">分类</label>
              <select id="admin-dish-category" class="select">
                ${state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="primary-btn" data-action="admin-add-dish">添加菜品</button>
        </div>
      </div>
      <div class="admin-card">
        <h3>菜品列表</h3>
        ${state.dishes.map((dish) => `
          <div class="dish-admin-row">
            <div>
              <strong>${escapeHtml(dish.name)}</strong>
              <div class="order-time">¥${money(dish.price)} · ${escapeHtml(state.categories.find((category) => category.id === dish.categoryId)?.name || '')}</div>
              <div class="tag-row" style="margin-top: 6px;">
                ${dish.canUseMiandan ? '<span class="pill free">免单</span>' : ''}
                <span class="pill ${dish.status === 0 ? '' : 'green'}">${dish.status === 0 ? '已下架' : '已上架'}</span>
              </div>
            </div>
            <div class="button-row">
              <button class="ghost-btn" data-action="admin-toggle-dish" data-dish="${dish.id}">${dish.status === 0 ? '上架' : '下架'}</button>
              <button class="secondary-btn" data-action="admin-delete-dish" data-dish="${dish.id}">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function renderAdminOrders() {
  return `
    <div class="admin-section">
      <div class="admin-card">
        <h3>订单管理</h3>
        ${state.orders.length ? state.orders.map(renderOrderCard).join('') : '<div class="empty">暂无订单</div>'}
      </div>
    </div>
  `
}

function renderAdminSettings() {
  const shop = currentShop()
  return `
    <div class="admin-section">
      <div class="admin-card">
        <h3>分店设置</h3>
        <div class="tag-row" style="margin-bottom: 12px;">
          ${state.shopList.map((item) => `<button class="filter-btn ${item.id === shop.id ? 'active' : ''}" data-action="admin-select-shop" data-shop="${item.id}">${escapeHtml(item.name || '未命名分店')}</button>`).join('')}
          <button class="filter-btn" data-action="admin-add-shop">新增分店</button>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label for="admin-shop-name">分店名称</label>
            <input id="admin-shop-name" class="input" value="${escapeAttr(shop.name)}" />
          </div>
          <div class="form-row">
            <label for="admin-shop-slogan">副标题</label>
            <input id="admin-shop-slogan" class="input" value="${escapeAttr(shop.slogan || '')}" />
          </div>
          <div class="form-row">
            <label for="admin-shop-notice">公告</label>
            <textarea id="admin-shop-notice" class="textarea">${escapeHtml(shop.notice || '')}</textarea>
          </div>
          <div class="form-row">
            <label for="admin-shop-address">地址</label>
            <input id="admin-shop-address" class="input" value="${escapeAttr(shop.address || '')}" />
          </div>
          <div class="compact-grid shop-admin-grid">
            <div class="form-row">
              <label for="admin-shop-phone">电话</label>
              <input id="admin-shop-phone" class="input" value="${escapeAttr(shop.phone || '')}" />
            </div>
            <div class="form-row">
              <label for="admin-shop-latitude">纬度</label>
              <input id="admin-shop-latitude" class="input" type="number" step="0.000001" value="${escapeAttr(shop.latitude || '')}" />
            </div>
            <div class="form-row">
              <label for="admin-shop-longitude">经度</label>
              <input id="admin-shop-longitude" class="input" type="number" step="0.000001" value="${escapeAttr(shop.longitude || '')}" />
            </div>
          </div>
          <div class="form-row">
            <label for="admin-shop-hours">营业时间</label>
            <input id="admin-shop-hours" class="input" value="${escapeAttr(shop.businessHours || '')}" />
          </div>
          <button class="primary-btn" data-action="admin-save-shop">保存分店设置</button>
        </div>
      </div>
      <div class="admin-card">
        <h3>充值套餐</h3>
        ${state.rechargeOptions.map((plan) => `
          <div class="admin-row">
            <div class="row-between">
              <div>充 ¥${money(plan.amount)}，赠 ¥${money(plan.giveAmount)}</div>
              <button class="secondary-btn" data-action="admin-delete-recharge" data-plan="${plan.id}">删除</button>
            </div>
          </div>
        `).join('')}
        <div class="compact-grid">
          <div class="form-row">
            <label for="admin-recharge-amount">充值金额</label>
            <input id="admin-recharge-amount" class="input" type="number" min="0" step="0.01" />
          </div>
          <div class="form-row">
            <label for="admin-recharge-give">赠送金额</label>
            <input id="admin-recharge-give" class="input" type="number" min="0" step="0.01" />
          </div>
          <button class="primary-btn" data-action="admin-add-recharge">添加</button>
        </div>
      </div>
      <div class="admin-card">
        <h3>修改管理员密码</h3>
        <div class="form-grid">
          <div class="form-row">
            <label for="admin-old-password">原密码</label>
            <input id="admin-old-password" class="input" type="password" />
          </div>
          <div class="form-row">
            <label for="admin-new-password">新密码</label>
            <input id="admin-new-password" class="input" type="password" />
          </div>
          <button class="primary-btn" data-action="admin-change-password">修改密码</button>
        </div>
      </div>
    </div>
  `
}

document.addEventListener('click', (event) => {
  const scopedClosest = (selector) => {
    const match = event.target.closest(selector)
    if (!match) return null
    const stop = event.target.closest('[data-stop]')
    if (stop && !stop.contains(match)) return null
    return match
  }

  const routeTarget = scopedClosest('[data-route]')
  if (routeTarget && !routeTarget.disabled) {
    setRoute(routeTarget.dataset.route)
    return
  }

  const categoryTarget = scopedClosest('[data-category]')
  if (categoryTarget) {
    ui.categoryId = categoryTarget.dataset.category
    render()
    return
  }

  const addTarget = scopedClosest('[data-add]')
  if (addTarget) {
    addDish(addTarget.dataset.add)
    return
  }

  const reduceTarget = scopedClosest('[data-reduce]')
  if (reduceTarget) {
    reduceDish(reduceTarget.dataset.reduce)
    return
  }

  const actionTarget = scopedClosest('[data-action]')
  if (!actionTarget || actionTarget.disabled) return

  handleAction(actionTarget)
})

document.addEventListener('input', (event) => {
  const field = event.target.dataset.checkoutField
  if (field && ui.checkout) {
    ui.checkout[field] = event.target.value
  }
})

document.addEventListener('change', (event) => {
  const field = event.target.dataset.checkoutField
  if (field && ui.checkout) {
    ui.checkout[field] = event.target.value
  }
})

function handleAction(target) {
  const action = target.dataset.action

  if (action === 'toggle-cart') ui.cartOpen = !ui.cartOpen
  if (action === 'close-cart') ui.cartOpen = false
  if (action === 'open-shop-selector') ui.shopSelectorOpen = true
  if (action === 'close-shop-selector') ui.shopSelectorOpen = false
  if (action === 'locate-shop') locateNearestShop()
  if (action === 'select-shop') selectShop(target.dataset.shop)
  if (action === 'clear-cart') clearCart()
  if (action === 'open-checkout') openCheckout()
  if (action === 'close-checkout') ui.checkout = null
  if (action === 'confirm-checkout') confirmCheckout()
  if (action === 'pay-method') {
    if (ui.checkout) ui.checkout.payMethod = target.dataset.pay
  }
  if (action === 'recharge') {
    const plan = state.rechargeOptions.find((item) => item.id === target.dataset.plan)
    if (plan) {
      ui.confirm = {
        kind: 'recharge',
        planId: plan.id,
        title: '微信支付',
        message: `确认支付 ¥${money(plan.amount)} 完成会员充值。`,
        confirmLabel: '确认支付'
      }
    }
  }
  if (action === 'order-filter') ui.orderFilter = target.dataset.filter
  if (action === 'cancel-order') cancelOrder(target.dataset.order)
  if (action === 'save-profile') saveProfile()
  if (action === 'reset-demo') {
    ui.confirm = {
      kind: 'reset',
      title: '重置数据',
      message: '清空当前浏览器中的 H5 点餐、充值和后台数据。',
      confirmLabel: '重置'
    }
  }
  if (action === 'confirm-cancel') ui.confirm = null
  if (action === 'confirm-ok') confirmOk()
  if (action === 'open-admin-password') {
    ui.adminPasswordMode = localStorage.getItem(ADMIN_KEY) ? 'verify' : 'set'
    ui.adminPasswordOpen = true
  }
  if (action === 'close-admin-password') ui.adminPasswordOpen = false
  if (action === 'submit-admin-password') submitAdminPassword()
  if (action === 'close-admin') ui.adminOpen = false
  if (action === 'admin-tab') ui.adminTab = target.dataset.tab
  if (action === 'admin-save-user') adminSaveUser(target.dataset.user)
  if (action === 'admin-add-dish') adminAddDish()
  if (action === 'admin-toggle-dish') adminToggleDish(target.dataset.dish)
  if (action === 'admin-delete-dish') adminDeleteDish(target.dataset.dish)
  if (action === 'admin-select-shop') adminSelectShop(target.dataset.shop)
  if (action === 'admin-add-shop') adminAddShop()
  if (action === 'admin-save-shop') adminSaveShop()
  if (action === 'admin-add-recharge') adminAddRecharge()
  if (action === 'admin-delete-recharge') adminDeleteRecharge(target.dataset.plan)
  if (action === 'admin-change-password') adminChangePassword()

  render()
}

function confirmOk() {
  if (!ui.confirm) return
  const confirm = ui.confirm

  if (confirm.kind === 'wechatOrder') {
    finishOrder('wechat')
    return
  }

  if (confirm.kind === 'recharge') {
    finishRecharge(confirm.planId)
    return
  }

  if (confirm.kind === 'reset') {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ADMIN_KEY)
    state = seedState()
    ui = {
      route: 'order',
      categoryId: state.categories[0]?.id || 'recommend',
      orderFilter: 'all',
      cartOpen: false,
      checkout: null,
      confirm: null,
      shopSelectorOpen: false,
      userLocation: null,
      locating: false,
      adminPasswordOpen: false,
      adminPasswordMode: 'set',
      adminOpen: false,
      adminTab: 'users',
      toast: ''
    }
    saveState()
    showToast('数据已重置')
  }
}

function saveProfile() {
  const nickName = (document.getElementById('profile-name')?.value || '').trim()
  const phoneNumber = (document.getElementById('profile-phone')?.value || '').trim()
  if (!nickName) {
    showToast('请输入昵称')
    return
  }
  updateCurrentUser({ nickName, phoneNumber })
  saveState()
  showToast('资料已保存')
}

function submitAdminPassword() {
  const password = document.getElementById('admin-password')?.value || ''
  if (password.length < 6) {
    showToast('密码至少 6 位')
    return
  }

  if (ui.adminPasswordMode === 'set') {
    localStorage.setItem(ADMIN_KEY, password)
    ui.adminPasswordOpen = false
    ui.adminOpen = true
    ui.adminTab = 'users'
    showToast('管理员密码已设置')
    return
  }

  if (password !== localStorage.getItem(ADMIN_KEY)) {
    showToast('管理员密码错误')
    return
  }

  ui.adminPasswordOpen = false
  ui.adminOpen = true
  ui.adminTab = 'users'
}

function adminSaveUser(userId) {
  const user = state.users.find((item) => item.id === userId)
  if (!user) return
  const balance = Number(document.getElementById(`admin-balance-${userId}`)?.value || 0)
  const freeCount = Number(document.getElementById(`admin-free-${userId}`)?.value || 0)
  user.balance = Math.max(0, Number(balance.toFixed(2)))
  user.miandanCount = Math.max(0, Math.floor(freeCount))
  saveState()
  showToast('会员信息已保存')
}

function adminAddDish() {
  const name = (document.getElementById('admin-dish-name')?.value || '').trim()
  const price = Number(document.getElementById('admin-dish-price')?.value || 0)
  const categoryId = document.getElementById('admin-dish-category')?.value || state.categories[0]?.id

  if (!name || price <= 0) {
    showToast('请填写菜品名和价格')
    return
  }

  state.dishes.unshift({
    id: `d-${Date.now()}`,
    categoryId,
    name,
    description: '后台新增菜品',
    price,
    originalPrice: 0,
    canUseMiandan: false,
    status: 1,
    image: '',
    tags: []
  })
  saveState()
  showToast('菜品已添加')
}

function adminToggleDish(dishId) {
  const dish = findDish(dishId)
  if (!dish) return
  dish.status = dish.status === 0 ? 1 : 0
  saveState()
}

function adminDeleteDish(dishId) {
  state.dishes = state.dishes.filter((dish) => dish.id !== dishId)
  delete state.cart[dishId]
  saveState()
  showToast('菜品已删除')
}

function adminSelectShop(shopId) {
  const shop = state.shopList.find((item) => item.id === shopId)
  if (!shop) return
  state.currentShopId = shop.id
  syncShopInfoFromCurrent()
  saveState()
}

function adminAddShop() {
  const shop = {
    id: `s-${Date.now()}`,
    name: '新分店',
    slogan: '扫码点餐，到店即取',
    notice: '欢迎光临新分店',
    address: '',
    phone: '',
    businessHours: '',
    latitude: '',
    longitude: '',
    sort: state.shopList.length + 1,
    status: 1
  }
  state.shopList.push(shop)
  state.currentShopId = shop.id
  syncShopInfoFromCurrent()
  saveState()
  showToast('已新增分店')
}

function adminSaveShop() {
  const shop = currentShop()
  shop.name = (document.getElementById('admin-shop-name')?.value || '').trim() || '餐饮店'
  shop.slogan = (document.getElementById('admin-shop-slogan')?.value || '').trim()
  shop.notice = (document.getElementById('admin-shop-notice')?.value || '').trim()
  shop.address = (document.getElementById('admin-shop-address')?.value || '').trim()
  shop.phone = (document.getElementById('admin-shop-phone')?.value || '').trim()
  shop.businessHours = (document.getElementById('admin-shop-hours')?.value || '').trim()
  shop.latitude = document.getElementById('admin-shop-latitude')?.value || ''
  shop.longitude = document.getElementById('admin-shop-longitude')?.value || ''
  syncShopInfoFromCurrent()
  saveState()
  showToast('分店设置已保存')
}

function adminAddRecharge() {
  const amount = Number(document.getElementById('admin-recharge-amount')?.value || 0)
  const giveAmount = Number(document.getElementById('admin-recharge-give')?.value || 0)
  if (amount <= 0 || giveAmount < 0) {
    showToast('请输入正确的充值金额')
    return
  }
  state.rechargeOptions.push({
    id: `r-${Date.now()}`,
    amount,
    giveAmount,
    status: 1
  })
  saveState()
  showToast('充值套餐已添加')
}

function adminDeleteRecharge(planId) {
  state.rechargeOptions = state.rechargeOptions.filter((plan) => plan.id !== planId)
  saveState()
  showToast('充值套餐已删除')
}

function adminChangePassword() {
  const oldPassword = document.getElementById('admin-old-password')?.value || ''
  const newPassword = document.getElementById('admin-new-password')?.value || ''
  if (oldPassword !== localStorage.getItem(ADMIN_KEY)) {
    showToast('原密码错误')
    return
  }
  if (newPassword.length < 6) {
    showToast('新密码至少 6 位')
    return
  }
  localStorage.setItem(ADMIN_KEY, newPassword)
  showToast('密码已修改')
}

syncShopInfoFromCurrent()
render()
