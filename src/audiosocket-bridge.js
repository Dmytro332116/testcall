/**
 * AUDIOSOCKET-ELEVENLABS BRIDGE
 *
 * Міст між Asterisk AudioSocket та ElevenLabs Conversational AI Agent
 *
 * Потік:
 *   Телефон → Asterisk ──[AudioSocket TCP:9093]──▶ Node.js ──[WebSocket]──▶ ElevenLabs Agent
 *   Телефон ← Asterisk ◀──[AudioSocket TCP:9093]── Node.js ◀──[WebSocket]── ElevenLabs Agent
 *
 * AudioSocket протокол (Asterisk → Node.js):
 *   [1 байт тип][2 байти довжина][N байт дані]
 *   0x00 = Hangup, 0x01 = DTMF, 0x10 = Audio (slin 8kHz 16-bit mono), 0xff = Error
 */

const net = require('net');
const logger = require('./logger');
const ElevenLabsAgent = require('./elevenlabs-agent');

const AS_TYPE = {
  HANGUP: 0x00,
  UUID:   0x01, // Раніше було DTMF
  AUDIO:  0x10,
  ERROR:  0xff,
};

class AudioSocketBridge {
  constructor(config) {
    this.config = config;
    this.port = config.audioSocketPort || 9093;
    this.host = config.audioSocketHost || '0.0.0.0';
    this.server = null;
    this.activeSessions = new Map();
  }

  start() {
    this.server = net.createServer((socket) => {
      this._handleConnection(socket);
    });

    this.server.listen(this.port, this.host, () => {
      logger.banner(`🎙️ AudioSocket Bridge на ${this.host}:${this.port}`);
    });

    this.server.on('error', (err) => {
      logger.error(`❌ Помилка серверу: ${err.message}`);
    });
  }

  async _handleConnection(socket) {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.call(`🔗 Нове TCP підключення від ${remoteAddr}`);

    let callId = null;
    let agent = null;
    let headerBuf = Buffer.alloc(0);
    let audioOutQueue = [];
    let sendingAudio = false;
    let active = true;

    // ── Функція надсилання аудіо фрейму в Asterisk ──────────────────────
    const sendAudioToAsterisk = (pcmChunk) => {
      if (!active || socket.destroyed) return;
      const header = Buffer.alloc(3);
      header[0] = AS_TYPE.AUDIO;
      header.writeUInt16BE(pcmChunk.length, 1);
      socket.write(Buffer.concat([header, pcmChunk]));
    };

    // Плавне відтворення аудіо з черги (20ms фрейми)
    const FRAME_BYTES = 320; // 160 семплів × 2 байти = 20ms при 8kHz
    const playAudioQueue = async () => {
      if (sendingAudio) return;
      sendingAudio = true;

      while (audioOutQueue.length > 0 && active) {
        const chunk = audioOutQueue.shift();
        let offset = 0;
        while (offset < chunk.length && active) {
          const frame = chunk.slice(offset, offset + FRAME_BYTES);
          sendAudioToAsterisk(frame);
          offset += FRAME_BYTES;
          // Пауза 20ms між фреймами для синхронізації з реальним часом
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      sendingAudio = false;
    };

    // ── Обробка даних від Asterisk ──────────────────────────────────────
    socket.on('data', (data) => {
      headerBuf = Buffer.concat([headerBuf, data]);

      while (headerBuf.length >= 3) {
        const type   = headerBuf[0];
        const length = headerBuf.readUInt16BE(1);
        logger.debug(`[AudioSocket RAW] Type: 0x${type.toString(16)}, Length: ${length}`);

        if (headerBuf.length < 3 + length) break;

        const payload = headerBuf.slice(3, 3 + length);
        headerBuf = headerBuf.slice(3 + length);

        switch (type) {
          case AS_TYPE.HANGUP:
            logger.call(`📴 Hangup від Asterisk [${callId}]`);
            active = false;
            agent?.disconnect();
            break;

          case AS_TYPE.UUID:
            // Отримали UUID (16 байт)
            if (!callId && payload.length === 16) {
              callId = payload.toString('hex')
                .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
              logger.call(`📞 Дзвінок підключено: ${callId}`);
              initAgent();
            } else {
              logger.info(`📲 Отримано дані типу 0x01 (UUID/DTMF), довжина: ${payload.length}`);
            }
            break;

          case AS_TYPE.AUDIO:
            // Аудіо від абонента → ElevenLabs
            if (agent && agent.connected) {
              agent.sendAudio(payload);
            }
            break;

          case AS_TYPE.ERROR:
            logger.error(`❌ AudioSocket помилка: ${payload.toString()}`);
            break;
        }
      }
    });

    socket.on('close', () => {
      active = false;
      agent?.disconnect();
      if (callId) {
        this.activeSessions.delete(callId);
        logger.call(`♻️ Сесія ${callId} завершена. Активних: ${this.activeSessions.size}`);
      }
    });

    socket.on('error', (err) => {
      logger.error(`❌ Socket помилка: ${err.message}`);
      active = false;
      agent?.disconnect();
    });

    // ── Ініціалізація ElevenLabs Agent ──────────────────────────────────
    const initAgent = async () => {
      try {
        agent = new ElevenLabsAgent(this.config);
        this.activeSessions.set(callId, { socket, agent });

        // Отримуємо аудіо від агента → Asterisk
        agent.on('audio', (pcm16kBuffer) => {
          // Даунсемплінг 16kHz → 8kHz для Asterisk
          const pcm8k = agent.downsample16to8(pcm16kBuffer);
          audioOutQueue.push(pcm8k);
          playAudioQueue();
        });

        // Агент хоче перебити (користувач заговорив)
        agent.on('interruption', () => {
          audioOutQueue = []; // Очистити чергу
          sendingAudio = false;
        });

        agent.on('ended', () => {
          logger.call(`📴 ElevenLabs агент завершив розмову [${callId}]`);
          if (active && !socket.destroyed) {
            const header = Buffer.alloc(3);
            header[0] = AS_TYPE.HANGUP;
            header.writeUInt16BE(0, 1);
            socket.write(header);
            socket.destroy();
          }
          active = false;
        });

        await agent.connect();
        logger.call(`✅ ElevenLabs Agent підключено для дзвінка ${callId}`);

      } catch (err) {
        logger.error(`❌ Не вдалося підключити ElevenLabs Agent: ${err.message}`);
        active = false;
        socket.destroy();
      }
    };
  }

  get activeCount() {
    return this.activeSessions.size;
  }
}

module.exports = AudioSocketBridge;
