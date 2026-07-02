import http from "http";

const data = JSON.stringify({
  categoryId: 1,
  name: "Test Image Product",
  basePrice: 10,
  imageUrl: "/uploads/products/test.png"
});

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
