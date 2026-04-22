/**
 * ELEVENLABS CONVERSATIONAL AI AGENT — WebSocket Bridge
 *
 * Єдине з'єднання, яке обробляє ВСЕ:
 *   STT (розпізнавання мови) + LLM (мозок) + TTS (синтез мови)
 *
 * Протокол:
 *   Asterisk ──[AudioSocket TCP]──▶ Node.js ──[WebSocket]──▶ ElevenLabs Agent
 *
 *   Клієнт → сервер:
 *     { "user_audio_chunk": { "audio": "<base64 PCM>" } }
 *
 *   Сервер → клієнт:
 *     { "type": "audio", "audio_event": { "audio_base_64": "<base64>" } }
 *     { "type": "agent_response", "agent_response_event": { "agent_response": "..." } }
 *     { "type": "user_transcript", "user_transcription_event": { "user_transcript": "..." } }
 */

const WebSocket = require('ws');
const axios = require('axios');
const EventEmitter = require('events');
const logger = require('./logger');

class ElevenLabsAgent extends EventEmitter {
  constructor(config) {
    super();
    this.apiKey = config.elevenKey;
    this.agentId = config.agentId;
    this.ws = null;
    this.connected = false;
    this.conversationId = null;

    // Аудіо формат: ElevenLabs очікує 16kHz PCM, Asterisk дає 8kHz PCM
    this.inputSampleRate = 8000;   // Asterisk AudioSocket
    this.outputSampleRate = 16000; // ElevenLabs default
  }

  /**
   * Отримує signed URL для приватного агента
   */
  async _getSignedUrl() {
    try {
      const response = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${this.agentId}`,
        {
          headers: { 'xi-api-key': this.apiKey },
        }
      );
      return response.data.signed_url;
    } catch (error) {
      logger.error(`❌ Помилка отримання signed URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Підключається до ElevenLabs Conversational AI Agent
   */
  async connect() {
    logger.info('🔌 Підключення до ElevenLabs Agent...');

    let wsUrl;
    try {
      wsUrl = await this._getSignedUrl();
      logger.info('✅ Signed URL отримано');
    } catch {
      // Fallback: публічний агент
      wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.agentId}`;
      logger.warn('⚠️ Використовую публічний URL (без signed URL)');
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout (10s)'));
      }, 10000);

      this.ws.on('open', () => {
        logger.info('✅ WebSocket підключено до ElevenLabs');
        this.connected = true;

        // Надсилаємо ініціалізацію з форматом аудіо
        this._send({
          type: 'conversation_initiation_client_data',
          conversation_initiation_client_data: {
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: process.env.SYSTEM_PROMPT || undefined,
                },
                first_message: process.env.FIRST_MESSAGE || 'Вітаю! Чим можу допомогти?',
                language: process.env.AGENT_LANGUAGE || 'uk',
              },
              tts: {
                voice_id: process.env.ELEVENLABS_VOICE_ID || undefined,
              },
              asr: {
                user_input_audio_format: 'pcm_16000',
              },
            },
          },
        });
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);

          // Перша відповідь з metadata — значить підключення успішне
          if (msg.type === 'conversation_initiation_metadata') {
            clearTimeout(timeout);
            this.conversationId = msg.conversation_initiation_metadata_event?.conversation_id;
            logger.info(`✅ Розмова ініційована: ${this.conversationId}`);
            resolve();
          }
        } catch (err) {
          logger.error(`❌ Помилка парсингу WS повідомлення: ${err.message}`);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        logger.info(`📴 ElevenLabs WS закрито: ${code} ${reason}`);
        this.emit('ended');
      });

      this.ws.on('error', (err) => {
        logger.error(`❌ ElevenLabs WS помилка: ${err.message}`);
        clearTimeout(timeout);
        this.connected = false;
        reject(err);
      });
    });
  }

  /**
   * Обробка повідомлень від ElevenLabs Agent
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case 'audio':
        // Аудіо відповідь від агента → відправити в Asterisk
        if (msg.audio_event?.audio_base_64) {
          const audioBuffer = Buffer.from(msg.audio_event.audio_base_64, 'base64');
          this.emit('audio', audioBuffer);
        }
        break;

      case 'agent_response':
        // Текст відповіді агента (для логів)
        const agentText = msg.agent_response_event?.agent_response;
        if (agentText) {
          logger.info(`🤖 Агент: "${agentText}"`);
          this.emit('agent_response', agentText);
        }
        break;

      case 'user_transcript':
        // Що сказав користувач (для логів)
        const userText = msg.user_transcription_event?.user_transcript;
        if (userText) {
          logger.info(`👤 Користувач: "${userText}"`);
          this.emit('user_transcript', userText);
        }
        break;

      case 'interruption':
        logger.debug('⏸️ Перебивання — користувач заговорив');
        this.emit('interruption');
        break;

      case 'ping':
        // Heartbeat — відповідаємо pong
        this._send({ type: 'pong', event_id: msg.ping_event?.event_id });
        break;

      case 'client_tool_call':
        // Агент хоче викликати інструмент на нашій стороні
        logger.info(`🔧 Tool call: ${msg.client_tool_call?.tool_name}`);
        this.emit('tool_call', msg.client_tool_call);
        break;

      case 'conversation_initiation_metadata':
        // Вже обробляємо в connect()
        break;

      default:
        logger.debug(`📨 ElevenLabs event: ${msg.type}`);
    }
  }

  /**
   * Надсилає аудіо фрагмент від користувача (з Asterisk)
   * Приймає PCM 8kHz, апсемплює до 16kHz, кодує base64
   */
  sendAudio(pcmBuffer) {
    if (!this.connected || !this.ws) return;

    // Апсемплінг 8kHz → 16kHz (подвоюємо кожен семпл)
    const upsampled = this._upsample8to16(pcmBuffer);
    const base64Audio = upsampled.toString('base64');

    // ElevenLabs протокол: тип повідомлення + base64 рядок напряму
    this._send({
      type: 'user_audio_chunk',
      user_audio_chunk: base64Audio,
    });
  }


  /**
   * Апсемплінг PCM 8kHz → 16kHz (лінійна інтерполяція)
   */
  _upsample8to16(pcm8k) {
    const samples8k = pcm8k.length / 2;
    const pcm16k = Buffer.alloc(samples8k * 4); // Вдвічі більше семплів × 2 байти

    for (let i = 0; i < samples8k; i++) {
      const sample = pcm8k.readInt16LE(i * 2);

      // Поточний семпл
      pcm16k.writeInt16LE(sample, i * 4);

      // Інтерпольований семпл (середнє між поточним і наступним)
      let nextSample = sample;
      if (i + 1 < samples8k) {
        nextSample = pcm8k.readInt16LE((i + 1) * 2);
      }
      const interpolated = Math.round((sample + nextSample) / 2);
      pcm16k.writeInt16LE(interpolated, i * 4 + 2);
    }

    return pcm16k;
  }

  /**
   * Даунсемплінг PCM 16kHz → 8kHz (для Asterisk)
   */
  downsample16to8(pcm16k) {
    const samples16k = pcm16k.length / 2;
    const samples8k = Math.floor(samples16k / 2);
    const pcm8k = Buffer.alloc(samples8k * 2);

    for (let i = 0; i < samples8k; i++) {
      const sample = pcm16k.readInt16LE(i * 4);
      pcm8k.writeInt16LE(sample, i * 2);
    }

    return pcm8k;
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

module.exports = ElevenLabsAgent;
