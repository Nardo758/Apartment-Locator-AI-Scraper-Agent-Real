const http = require('http')

const secret = process.argv[2] || ''
const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/debug/supabase?secret=${encodeURIComponent(secret)}`,
  method: 'GET',
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => (data += chunk))
  res.on('end', () => {
    try {
      console.log('status', res.statusCode)
      console.log(JSON.parse(data))
    } catch (e) {
      console.error('failed to parse response', data)
    }
  })
})

req.on('error', (err) => console.error('request error', err))
req.end()
