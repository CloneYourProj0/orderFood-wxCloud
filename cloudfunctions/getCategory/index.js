// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: '填写你的环境ID' })

const db = cloud.database()
const _ = db.command

async function getDefaultShopId() {
  const shopRes = await db.collection('shopInfo')
    .orderBy('sort', 'asc')
    .limit(100)
    .get()
  const list = shopRes.data || []
  const shop = list.find(item => item.status !== 0) || list[0] || null
  return shop ? shop._id || '' : ''
}

function buildShopScopedWhere(shopId, defaultShopId) {
  if (!shopId) {
    return {}
  }

  if (shopId !== defaultShopId) {
    return { shopId }
  }

  return _.or([
    { shopId },
    { shopId: '' },
    { shopId: null },
    { shopId: _.exists(false) }
  ])
}

// 云函数入口函数
exports.main = async (event = {}, context) => {
  try {
    const defaultShopId = await getDefaultShopId()
    const shopId = event.shopId || defaultShopId

    // 获取菜品分类
    const menuRes = await db.collection('dishCategory')
      .where(buildShopScopedWhere(shopId, defaultShopId))
      .orderBy('sort', 'asc')
      .limit(100)
      .get()
    
    return {
      success: true,
      data: menuRes.data
    }
  } catch (err) {
    console.error('获取菜品分类失败', err)
    return {
      success: false,
      message: '获取菜品分类失败'
    }
  }
}
