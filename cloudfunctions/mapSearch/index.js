// 云函数入口文件
const https = require('https')
const cloud = require('wx-server-sdk')

cloud.init({
  env: '填写你的环境ID'
})

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY || process.env.QQ_MAP_KEY || ''
const API_HOST = 'apis.map.qq.com'

function buildQuery(params) {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
}

function requestJson(path, params) {
  const query = buildQuery(params)
  const urlPath = query ? `${path}?${query}` : path

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: urlPath,
      method: 'GET'
    }, res => {
      let body = ''

      res.on('data', chunk => {
        body += chunk
      })

      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`腾讯地图请求失败：${res.statusCode}`))
          return
        }

        try {
          resolve(JSON.parse(body))
        } catch (err) {
          reject(new Error('腾讯地图返回数据解析失败'))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

function normalizePlace(item) {
  const location = item.location || {}
  const adInfo = item.ad_info || {}
  const latitude = Number(location.lat)
  const longitude = Number(location.lng)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    _key: item.id || `${item.title || ''}-${item.address || ''}-${latitude}-${longitude}`,
    id: item.id || '',
    title: item.title || '',
    address: item.address || item.title || '',
    province: item.province || adInfo.province || '',
    city: item.city || adInfo.city || '',
    district: item.district || adInfo.district || '',
    adcode: item.adcode || adInfo.adcode || '',
    category: item.category || '',
    latitude,
    longitude
  }
}

function normalizeGeocoder(keyword, result) {
  const location = result && result.location ? result.location : {}
  const latitude = Number(location.lat)
  const longitude = Number(location.lng)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const components = result.address_components || {}
  return {
    _key: `${result.title || keyword}-${result.address || keyword}-${latitude}-${longitude}`,
    id: '',
    title: result.title || keyword,
    address: result.address || keyword,
    province: components.province || '',
    city: components.city || '',
    district: components.district || '',
    category: '',
    latitude,
    longitude
  }
}

async function searchSuggestion(keyword, region) {
  const res = await requestJson('/ws/place/v1/suggestion', {
    key: TENCENT_MAP_KEY,
    keyword,
    region,
    region_fix: 0,
    page_size: 20
  })

  if (res.status !== 0) {
    throw new Error(res.message || '腾讯地图地址搜索失败')
  }

  return (res.data || [])
    .map(normalizePlace)
    .filter(Boolean)
}

async function geocodeAddress(keyword) {
  const res = await requestJson('/ws/geocoder/v1/', {
    key: TENCENT_MAP_KEY,
    address: keyword
  })

  if (res.status !== 0) {
    throw new Error(res.message || '腾讯地图地址解析失败')
  }

  const item = normalizeGeocoder(keyword, res.result || {})
  return item ? [item] : []
}

// 云函数入口函数
exports.main = async (event = {}) => {
  const keyword = String(event.keyword || event.address || '').trim()
  const region = String(event.region || '').trim()
  const action = event.action === 'geocoder' ? 'geocoder' : 'suggestion'

  if (!TENCENT_MAP_KEY) {
    return {
      success: false,
      data: [],
      message: '请先在 mapSearch 云函数环境变量中配置 TENCENT_MAP_KEY'
    }
  }

  if (!keyword) {
    return {
      success: true,
      data: [],
      message: ''
    }
  }

  try {
    const data = action === 'geocoder'
      ? await geocodeAddress(keyword)
      : await searchSuggestion(keyword, region)

    if (data.length === 0 && action !== 'geocoder') {
      return {
        success: true,
        data: await geocodeAddress(keyword),
        message: ''
      }
    }

    return {
      success: true,
      data,
      message: ''
    }
  } catch (err) {
    console.error('腾讯地图搜索失败', err)
    return {
      success: false,
      data: [],
      message: err.message || '腾讯地图搜索失败'
    }
  }
}
