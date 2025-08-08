const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/',
  method: 'GET'
}, (res) => {
  console.log('✅ Connected! Status:', res.statusCode);
  res.on('data', data => console.log(data.toString()));
});

req.on('error', (err) => {
  console.log('❌ Connection failed:', err.message);
});

req.end(); 
