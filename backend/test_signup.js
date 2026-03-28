const http = require('http');

const data = JSON.stringify({
  name: "newuser2",
  email: "newuser2@test.com",
  password: "password123",
  role: "user",
  binId: "TEST-BIN-2"
});

const options = {
  hostname: 'localhost',
  port: 5005,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => console.log('BODY:', body));
});

req.on('error', error => {
  console.error('Network Error:', error);
});

req.write(data);
req.end();
