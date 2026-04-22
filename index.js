/**
 * MAIN ENTRY POINT — ElevenLabs Conversational AI Telephony System
 *
 * Архітектура:
 *   Телефон ──▶ Asterisk ──[AudioSocket TCP:9093]──▶ Node.js ──[WebSocket]──▶ ElevenLabs Agent
 */

require('dotenv').config();
const logger = require('./src/logger');
const AudioSocketBridge = require('./src/audiosocket-bridge');
const AsteriskAMI = require('./src/asterisk-ami');

const CONFIG = {
  // AudioSocket
  audioSocketPort: parseInt(process.env.AUDIOSOCKET_PORT || '9093'),
  audioSocketHost: process.env.AUDIOSOCKET_HOST || '0.0.0.0',

  // ElevenLabs Agent
  elevenKey: process.env.ELEVENLABS_API_KEY || '',
  agentId: process.env.ELEVENLABS_AGENT_ID || '',

  // Asterisk AMI
  host:      process.env.ASTERISK_HOST || '127.0.0.1',
  amiPort:   parseInt(process.env.AMI_PORT || '5038'),
  amiUser:   process.env.AMI_USER || 'admin',
  amiSecret: process.env.AMI_SECRET || 'admin',
};

async function main() {
  logger.banner('ELEVENLABS AI TELEPHONY SYSTEM v4.0');

  // Перевірка конфігу
  if (!CONFIG.elevenKey || !CONFIG.agentId) {
    logger.error(`❌ Відсутні ELEVENLABS_API_KEY або ELEVENLABS_AGENT_ID у .env`);
    process.exit(1);
  }

  // 1. Запускаємо міст AudioSocket ↔ ElevenLabs WS
  const bridge = new AudioSocketBridge(CONFIG);
  bridge.start();

  // 2. AMI для вихідних дзвінків
  let ami = null;
  if (process.env.AMI_ENABLED === 'true') {
    ami = new AsteriskAMI(CONFIG);
    try {
      await ami.connect();
      logger.info('✅ AMI підключено (вихідні дзвінки доступні)');
    } catch (err) {
      logger.warn(`⚠️ AMI не підключено: ${err.message}`);
    }
  }

  // 3. HTTP REST API
  if (process.env.HTTP_API === 'true') {
    const http = require('http');
    const apiPort = parseInt(process.env.API_PORT || '3000');

    const apiServer = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'POST' && req.url === '/call') {
        let body = '';
        req.on('data', (d) => (body += d));
        req.on('end', async () => {
          try {
            const { number } = JSON.parse(body);
            if (!ami || !ami.connected) throw new Error('AMI не підключено');

            await ami.originate(number);
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, number }));
          } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200);
        res.end(JSON.stringify({
          ok: true,
          activeCalls: bridge.activeCount,
          amiConnected: ami?.connected || false,
        }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    });

    apiServer.listen(apiPort, () => {
      logger.info(`🌐 HTTP API запущено на порту ${apiPort}`);
    });
  }

  logger.info('');
  logger.info('⏳ Очікування вхідних дзвінків від Asterisk...');

  process.on('SIGTERM', () => {
    logger.info('👋 Завершення роботи...');
    ami?.disconnect();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    logger.info('👋 Завершення роботи...');
    ami?.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`❌ Помилка: ${err.message}`);
  process.exit(1);
});
