/**
 * MAKE CALL — Ініціювати вихідний дзвінок через HTTP API
 * Запуск: node scripts/make-call.js +380XXXXXXXXX
 */

const http = require('http');

const number = process.argv[2];
const apiPort = process.env.API_PORT || 3000;

if (!number) {
  console.log('Використання: node scripts/make-call.js +380XXXXXXXXX');
  console.log('  Система повинна бути запущена (npm start)');
  process.exit(1);
}

console.log(`📱 Дзвінок на ${number}...`);

const data = JSON.stringify({ number });

const req = http.request(
  {
    hostname: 'localhost',
    port: apiPort,
    path: '/call',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => {
      const result = JSON.parse(body);
      if (result.ok) {
        console.log(`✅ Дзвінок ініційовано на ${result.number}`);
      } else {
        console.error(`❌ Помилка: ${result.error}`);
      }
    });
  }
);

req.on('error', (err) => {
  console.error(`❌ Не вдалося підключитися: ${err.message}`);
  console.error('   Переконайтеся що система запущена (npm start)');
});

req.write(data);
req.end();
