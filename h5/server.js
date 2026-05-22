const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const port = Number(process.env.PORT || 5175)

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

function resolveFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0])
  if (decodedPath === '/' || decodedPath === '/index.html') {
    return path.join(root, 'h5/index.html')
  }

  const requested = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '')
  return path.join(root, requested)
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || '/')

  if (!filePath.startsWith(root)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    })
    fs.createReadStream(filePath).pipe(res)
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`H5 preview running at http://127.0.0.1:${port}`)
})
