// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const axios = require('axios')
const crypto = require('crypto')
const querystring = require('querystring')

cloud.init({
  env: '填写你的环境ID'
})

const db = cloud.database()
const baseUrl = 'https://open.spyun.net/v1/printer'
// 商鹏开放平台：https://www.spyun.net.cn/open/index.html
const appid = process.env.SPYUN_APPID || '填写你的商鹏appid'
const appsecret = process.env.SPYUN_APPSECRET || '填写你的商鹏appsecret'

const globalErrorMap = {
  '-1': 'appid为空',
  '-2': 'appid不存在',
  '-3': '时间戳为空',
  '-4': '签名错误'
}

function validateConfig() {
  if (!appid || appid.includes('填写') || !appsecret || appsecret.includes('填写')) {
    throw {
      code: -1,
      message: '请先在 printManage 云函数中配置商鹏 appid 和 appsecret'
    }
  }
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000)
}

function getSign(params) {
  const stringA = Object.keys(params)
    .filter(key => key !== 'sign')
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  const stringSignTemp = `${stringA}&appsecret=${appsecret}`

  return crypto
    .createHash('md5')
    .update(stringSignTemp, 'utf8')
    .digest('hex')
    .toUpperCase()
}

function buildSignedParams(params = {}) {
  validateConfig()

  const signedParams = {
    appid,
    timestamp: getTimestamp(),
    ...params
  }

  signedParams.sign = getSign(signedParams)
  return signedParams
}

function getErrorMessage(result, fallback) {
  if (!result) return fallback
  const code = String(result.errorcode)
  return result.errormsg || result.message || globalErrorMap[code] || fallback
}

function isSuccess(result, extraSuccessCodes = []) {
  const code = Number(result && result.errorcode)
  return code === 0 || extraSuccessCodes.includes(code)
}

function isDuplicatePrinterResult(result) {
  return Number(result && result.errorcode) === 5
}

// HTTP请求封装
async function request(options) {
  try {
    const response = await axios({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      params: options.params,
      headers: options.headers || {},
      timeout: options.timeout || 30000
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw {
        code: error.response.status,
        message: error.response.data?.message || error.response.data?.errormsg || error.message,
        data: error.response.data
      }
    } else if (error.request) {
      throw {
        code: -1,
        message: '网络请求失败，请检查网络连接'
      }
    } else {
      throw {
        code: -1,
        message: error.message || '请求失败'
      }
    }
  }
}

async function spyunRequest(path, method, params = {}) {
  const signedParams = buildSignedParams(params)
  const upperMethod = method.toUpperCase()
  const options = {
    url: `${baseUrl}${path}`,
    method: upperMethod,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }

  if (upperMethod === 'GET' || upperMethod === 'DELETE') {
    options.params = signedParams
  } else {
    options.data = querystring.stringify(signedParams)
  }

  return request(options)
}

function normalizeTimes(value) {
  const times = parseInt(value || 1, 10)
  if (Number.isNaN(times)) return 1
  return Math.min(Math.max(times, 1), 5)
}

function normalizePrintContent(content) {
  let result = String(content || '')

  result = result
    .replace(/<C>\s*<\/C><BR>/g, '<BR>')
    .replace(/<LEFT>([\s\S]*?)<\/LEFT>/g, '$1')
    .replace(/<RIGHT>([\s\S]*?)<\/RIGHT>/g, '<R>$1</R>')
    .replace(/<font#\s+([^>]*)>([\s\S]*?)<\/font#>/gi, (match, attrs, inner) => {
      const bolder = /bolder\s*=\s*["']?1/i.test(attrs)
      const heightMatch = attrs.match(/height\s*=\s*["']?(\d+)/i)
      const widthMatch = attrs.match(/width\s*=\s*["']?(\d+)/i)
      const height = heightMatch ? parseInt(heightMatch[1], 10) : 1
      const width = widthMatch ? parseInt(widthMatch[1], 10) : 1
      let wrapped = inner

      if (height >= 2 && width >= 2) {
        wrapped = `<L2>${wrapped}</L2>`
      } else if (height >= 2) {
        wrapped = `<H>${wrapped}</H>`
      } else if (width >= 2) {
        wrapped = `<W>${wrapped}</W>`
      }

      if (bolder) {
        wrapped = `<B>${wrapped}</B>`
      }

      return wrapped
    })

  return result
}

function mapDeviceStatus(result) {
  const onlineStatus = Number(result.online) === 1 ? 1 : 0
  const status = Number(result.status)

  return {
    onlineStatus,
    workStatus: Number.isNaN(status) ? undefined : status,
    workStatusDesc: result.status_text || (onlineStatus === 1 ? (status === 0 ? '正常' : '异常') : '离线'),
    queueCount: result.sqsnum || 0,
    raw: result
  }
}

function mapVolumeToVoice(volume) {
  const value = parseInt(volume, 10)
  if (value <= 0) return 'N'
  if (value <= 2) return 'U'
  if (value <= 4) return 'V'
  return 'W'
}

async function updateOrderPrintStatus(outTradeNo, data) {
  if (!outTradeNo || String(outTradeNo).startsWith('TEST_')) return

  try {
    await db.collection('order').doc(outTradeNo).update({
      data
    })
  } catch (err) {
    console.error('更新订单打印状态失败', err, { outTradeNo, data })
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const app = new TcbRouter({ event })

  // 全局中间件
  app.use(async (ctx, next) => {
    ctx.event = event
    await next()
  })

  // 绑定打印机
  app.router('addPrinter', async (ctx, next) => {
    const { sn, key, pkey, name, business } = ctx.event
    const printerKey = key || pkey

    if (!sn || !printerKey) {
      ctx.body = {
        success: false,
        error: '设备编号或设备KEY为空'
      }
      return
    }

    try {
      const body = {
        business: business || 1,
        sn,
        pkey: printerKey,
        name: name || `打印机${sn}`
      }
      const result = await spyunRequest('/add', 'POST', body)

      ctx.body = {
        success: isSuccess(result, [5]),
        data: result,
        duplicate: Number(result.errorcode) === 5,
        error: isSuccess(result, [5]) ? undefined : getErrorMessage(result, '绑定失败')
      }
    } catch (error) {
      if (isDuplicatePrinterResult(error.data)) {
        ctx.body = {
          success: true,
          data: error.data,
          duplicate: true
        }
        return
      }

      console.error('绑定打印机失败', error)
      ctx.body = {
        success: false,
        error: error.message || '绑定失败',
        code: error.code,
        data: error.data
      }
    }
  })

  // 解绑打印机
  app.router('delPrinter', async (ctx, next) => {
    const { sn } = ctx.event
    const sns = Array.isArray(sn) ? sn : [sn]

    try {
      const results = []
      for (const item of sns) {
        if (!item) continue
        const result = await spyunRequest('/delete', 'DELETE', { sn: item })
        results.push({ sn: item, result })
      }

      const failed = results.filter(item => !isSuccess(item.result, [2]))
      ctx.body = {
        success: failed.length === 0,
        data: results,
        error: failed.length === 0 ? undefined : getErrorMessage(failed[0].result, '解绑失败')
      }
    } catch (error) {
      console.error('解绑打印机失败', error)
      ctx.body = {
        success: false,
        error: error.message || '解绑失败',
        code: error.code,
        data: error.data
      }
    }
  })

  // 设置音量
  app.router('setVolume', async (ctx, next) => {
    const { sn, volume } = ctx.event

    try {
      let autoCut = 1
      try {
        const info = await spyunRequest('/info', 'GET', { sn })
        if (info && info.auto_cut !== undefined) {
          autoCut = info.auto_cut
        }
      } catch (err) {
        console.warn('查询打印机配置失败，使用默认自动切刀配置', err)
      }

      const result = await spyunRequest('/setting', 'PATCH', {
        sn,
        auto_cut: autoCut,
        voice: mapVolumeToVoice(volume)
      })

      ctx.body = {
        success: isSuccess(result),
        data: result,
        error: isSuccess(result) ? undefined : getErrorMessage(result, '设置失败')
      }
    } catch (error) {
      console.error('设置音量失败', error)
      ctx.body = {
        success: false,
        error: error.message || '设置失败',
        code: error.code,
        data: error.data
      }
    }
  })

  // 查询打印机状态
  app.router('getDeviceStatus', async (ctx, next) => {
    const { sn } = ctx.event

    try {
      const result = await spyunRequest('/info', 'GET', { sn })
      const mappedStatus = mapDeviceStatus(result)

      ctx.body = {
        success: isSuccess(result),
        data: {
          data: mappedStatus,
          raw: result
        },
        error: isSuccess(result) ? undefined : getErrorMessage(result, '查询失败')
      }
    } catch (error) {
      console.error('查询打印机状态失败', error)
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
        code: error.code,
        data: error.data
      }
    }
  })

  // 打印小票
  app.router('printNote', async (ctx, next) => {
    const { sn, content, copies, times, outTradeNo } = ctx.event

    try {
      const body = {
        sn,
        content: normalizePrintContent(content),
        times: normalizeTimes(times || copies)
      }
      const result = await spyunRequest('/print', 'POST', body)
      const success = isSuccess(result)
      const printId = result && result.id ? result.id : ''

      await updateOrderPrintStatus(outTradeNo, {
        printStatus: success ? 2 : 3,
        printTime: db.serverDate(),
        printId,
        sn,
        printProvider: 'spyun',
        printError: success ? '' : getErrorMessage(result, '打印失败')
      })

      ctx.body = {
        success,
        data: {
          ...result,
          printId
        },
        error: success ? undefined : getErrorMessage(result, '打印失败')
      }
    } catch (error) {
      console.error('打印小票失败', error)
      await updateOrderPrintStatus(outTradeNo, {
        printStatus: 3,
        printTime: db.serverDate(),
        sn,
        printProvider: 'spyun',
        printError: error.message || '打印失败'
      })
      ctx.body = {
        success: false,
        error: error.message || '打印失败',
        code: error.code,
        data: error.data
      }
    }
  })

  // 清空打印队列
  app.router('cleanWaitingQueue', async (ctx, next) => {
    const { sn } = ctx.event

    try {
      const result = await spyunRequest('/cleansqs', 'DELETE', { sn })
      ctx.body = {
        success: isSuccess(result),
        data: result,
        error: isSuccess(result) ? undefined : getErrorMessage(result, '清空失败')
      }
    } catch (error) {
      console.error('清空打印队列失败', error)
      ctx.body = {
        success: false,
        error: error.message || '清空失败',
        code: error.code,
        data: error.data
      }
    }
  })

  return app.serve()
}
