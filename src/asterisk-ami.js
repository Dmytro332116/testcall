/**
 * OUTBOUND CALLER — Ініціація вихідних дзвінків через Asterisk AMI
 * Використовує Asterisk Manager Interface для originate
 */

const net = require('net');
const EventEmitter = require('events');
const logger = require('./logger');

class AsteriskAMI extends EventEmitter {
  constructor(config) {
    super();
    this.host   = config.host || '127.0.0.1';
    this.port   = config.amiPort || 5038;
    this.user   = config.amiUser || 'admin';
    this.secret = config.amiSecret || 'admin';
    this.socket = null;
    this.connected = false;
    this._buffer = '';
    this._actionCallbacks = new Map();
    this._actionId = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.connect(this.port, this.host, () => {
        logger.info(`🔌 AMI: підключено до ${this.host}:${this.port}`);
        this._login();
      });

      this.socket.on('data', (data) => {
        logger.debug(`[AMI RAW] ${data.toString()}`);
        this._buffer += data.toString();
        this._parseMessages();
      });

      this.socket.on('error', (err) => {
        logger.error(`❌ AMI помилка: ${err.message}`);
        reject(err);
      });

      this.socket.on('close', () => {
        this.connected = false;
        logger.warn('⚠️ AMI: з\'єднання закрито');
        this.emit('disconnected');
      });

      this.once('connected', resolve);
      this.once('authFailed', () => reject(new Error('AMI: помилка авторизації')));
    });
  }

  _parseMessages() {
    const messages = this._buffer.split('\r\n\r\n');
    this._buffer = messages.pop(); // Незавершений буфер

    for (const rawMsg of messages) {
      if (!rawMsg.trim()) continue;

      const msg = {};
      rawMsg.split('\r\n').forEach((line) => {
        const idx = line.indexOf(': ');
        if (idx > 0) {
          msg[line.substring(0, idx)] = line.substring(idx + 2);
        }
      });

      this._handleMessage(msg);
    }
  }

  _handleMessage(msg) {
    // Початкове привітання — ігноруємо
    if (msg['Asterisk Call Manager']) {
      return;
    }

    // Відповідь на Login
    if (msg.Response === 'Success' && msg.Message === 'Authentication accepted') {
      this.connected = true;
      logger.info('✅ AMI: авторизовано');
      this.emit('connected');
      return;
    }

    if (msg.Response === 'Error' && msg.Message === 'Authentication failed') {
      this.emit('authFailed');
      return;
    }

    // Відповіді на Action (з ActionID)
    if (msg.ActionID && this._actionCallbacks.has(msg.ActionID)) {
      const { resolve, reject } = this._actionCallbacks.get(msg.ActionID);
      this._actionCallbacks.delete(msg.ActionID);
      if (msg.Response === 'Success' || msg.Response === 'Follows') {
        resolve(msg);
      } else {
        reject(new Error(msg.Message || 'AMI action failed'));
      }
      return;
    }

    // Forwarding events
    if (msg.Event) {
      this.emit('event', msg);
      this.emit(msg.Event, msg);
    }
  }

  _login() {
    this._send({
      Action: 'Login',
      Username: this.user,
      Secret: this.secret,
    });
  }

  _send(obj) {
    const lines = Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    this.socket.write(lines + '\r\n\r\n');
  }

  action(params) {
    return new Promise((resolve, reject) => {
      const actionId = `action-${++this._actionId}`;
      this._actionCallbacks.set(actionId, { resolve, reject });

      this._send({ ...params, ActionID: actionId });

      // Таймаут 10 секунд
      setTimeout(() => {
        if (this._actionCallbacks.has(actionId)) {
          this._actionCallbacks.delete(actionId);
          reject(new Error(`AMI action timeout: ${params.Action}`));
        }
      }, 10000);
    });
  }

  /**
   * Ініціює вихідний дзвінок через Asterisk
   * Asterisk телефонує на number, і коли відповідають — запускає наш AI агент
   */
  async originate(number, context = 'ai-agent', extension = 's', priority = 1) {
    logger.call(`📱 AMI Originate → ${number}`);

    try {
      const result = await this.action({
        Action: 'Originate',
        Channel: `PJSIP/${number}@trunk-provider-endpoint`, // Використовуємо наш SIP транк
        Exten: extension,
        Context: context,
        Priority: priority,
        CallerID: `AI Agent <${process.env.SIP_CALLER_ID || '422'}>`,
        Timeout: 30000,
        Async: 'yes',
      });

      logger.call(`✅ Originate успішно: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      logger.error(`❌ Originate помилка: ${err.message}`);
      throw err;
    }
  }

  disconnect() {
    if (this.socket) {
      this._send({ Action: 'Logoff' });
      this.socket.destroy();
    }
  }
}

module.exports = AsteriskAMI;
