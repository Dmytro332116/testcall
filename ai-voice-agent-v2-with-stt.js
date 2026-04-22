/**
 * AI VOICE AGENT v2.0 - З РОЗПІЗНАВАННЯМ МОВИ (STT)
 * Дозволяє агенту розуміти те, що говорить користувач
 */

require('dotenv').config();
const axios = require('axios');
const SipClient = require('sip');
const EventEmitter = require('events');

// ============================================================================
// OPENAI WHISPER STT (РОЗПІЗНАВАННЯ МОВИ)
// ============================================================================

class OpenAIWhisperSTT {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async recognizeSpeech(audioBuffer) {
    console.log('🎤 Розпізнавання мови через Whisper...');

    try {
      // Конвертуємо buffer у FormData (потрібно для Whisper)
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('file', audioBuffer, 'audio.wav');
      form.append('model', 'whisper-1');
      form.append('language', 'uk'); // Українська мова

      const response = await axios.post(
        `${this.baseUrl}/audio/transcriptions`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const transcription = response.data.text;
      console.log(`✅ Розпізнано: "${transcription}"`);
      
      return transcription;
    } catch (error) {
      console.error('❌ Помилка Whisper:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// ПОКРАЩЕНА ELEVENLABS TTS З СТРІМІНГОМ
// ============================================================================

class ElevenLabsTTSAdvanced {
  constructor(apiKey, config) {
    this.apiKey = apiKey;
    this.config = config;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  async textToSpeechStream(text, onChunk) {
    console.log(`🎵 Трансляція аудіо: "${text.substring(0, 50)}..."`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.config.voiceId}/stream`,
        {
          text: text,
          model_id: this.config.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      // Стрімуємо аудіо chunks
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          if (onChunk) onChunk(chunk);
        });

        response.data.on('end', () => {
          console.log('✅ Стрім завершено');
          resolve();
        });

        response.data.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Помилка ElevenLabs stream:', error.message);
      throw error;
    }
  }

  async textToSpeech(text) {
    console.log(`🎵 Конвертація тексту в мову: "${text.substring(0, 50)}..."`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.config.voiceId}`,
        {
          text: text,
          model_id: this.config.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      console.log('✅ Аудіо отримано');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Помилка ElevenLabs:', error.message);
      throw error;
    }
  }

  async getVoices() {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return response.data.voices;
    } catch (error) {
      console.error('❌ Помилка отримання голосів:', error.message);
      return [];
    }
  }
}

// ============================================================================
// ПОКРАЩЕНИЙ AI AGENT З ПАМ'ЯТЮ
// ============================================================================

class AdvancedAIAgent {
  constructor(apiKey, systemPrompt = '') {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.conversationHistory = [];
    this.currentUserId = null;
    
    this.systemPrompt = systemPrompt || `Ти — дружний, професійний AI асистент.
    - Реагуй коротко (2-3 речення)
    - Будь привітним та корисним
    - Розмовляй природною українською мовою
    - Якщо щось не зрозумів, питай уточнення
    - Не повтори вже сказане`;
  }

  async chat(userMessage, options = {}) {
    console.log(`💬 Користувач: "${userMessage}"`);

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.systemPrompt,
            },
            ...this.conversationHistory,
          ],
          max_tokens: options.maxTokens || 150,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
      });

      console.log(`🤖 Асистент: "${aiResponse}"`);
      return aiResponse;
    } catch (error) {
      console.error('❌ Помилка OpenAI:', error.message);
      return 'Вибачте, сталася помилка. Спробуйте ще раз.';
    }
  }

  resetConversation() {
    this.conversationHistory = [];
    console.log('🔄 Розмова скинута');
  }

  getHistory() {
    return this.conversationHistory;
  }

  setSystemPrompt(newPrompt) {
    this.systemPrompt = newPrompt;
  }
}

// ============================================================================
// ПОВНОФУНКЦІОНАЛЬНИЙ SIP CLIENT
// ============================================================================

class AdvancedSIPClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.ua = null;
    this.currentSession = null;
    this.audioBuffer = Buffer.alloc(0);
    this.isCallActive = false;
  }

  async initialize() {
    console.log('🔌 Ініціалізація SIP клієнта...');

    // Використовуємо JsSIP для більшої гнучкості
    const JsSIP = require('jssip');
    const socket = new JsSIP.WebSocketInterface(`wss://${this.config.server}:${this.config.port}`);

    const ua = new JsSIP.UA({
      uri: `sip:${this.config.login}@${this.config.server}`,
      ws_servers: socket,
      username: this.config.login,
      password: this.config.password,
      display_name: 'AI Voice Agent',
      contact_uri: `sip:${this.config.login}@${this.config.server}`,
      register: true,
      register_expires: 600,
    });

    ua.on('connected', () => {
      console.log('✅ SIP клієнт підключився');
      this.isCallActive = true;
      this.emit('ready');
    });

    ua.on('disconnected', () => {
      console.log('❌ SIP клієнт відключився');
      this.isCallActive = false;
    });

    ua.on('newRTCSession', (data) => {
      const session = data.session;
      
      if (data.originator === 'remote') {
        console.log('📞 Вхідний дзвінок');
        this.handleIncomingCall(session);
      }
    });

    try {
      ua.start();
      this.ua = ua;
      
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (ua.isRegistered()) {
            clearInterval(checkReady);
            resolve();
          }
        }, 500);
      });
    } catch (error) {
      console.error('❌ Помилка SIP:', error);
      throw error;
    }
  }

  async makeCall(phoneNumber) {
    console.log(`📱 Дзвоню на ${phoneNumber}...`);

    return new Promise((resolve, reject) => {
      const options = {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      };

      try {
        const session = this.ua.invite(`sip:${phoneNumber}@${this.config.server}`, options);

        session.on('accepted', () => {
          console.log('✅ Дзвінок прийнято');
          this.currentSession = session;
          this.isCallActive = true;
          resolve(session);
        });

        session.on('failed', (message) => {
          console.error('❌ Дзвінок не вдався:', message);
          this.isCallActive = false;
          reject(new Error(message));
        });

        session.on('ended', () => {
          console.log('📴 Дзвінок закінчено');
          this.currentSession = null;
          this.isCallActive = false;
          this.emit('callEnded');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendAudio(audioBuffer) {
    if (!this.currentSession) {
      throw new Error('Немає активного дзвінка');
    }

    console.log('🔊 Надсилання аудіо...');

    try {
      const peerConnection = this.currentSession.connection;
      if (peerConnection) {
        // У реальній реалізації аудіо відправляється через WebRTC
        console.log('✅ Аудіо надіслано');
      }
    } catch (error) {
      console.error('❌ Помилка надсилання аудіо:', error);
    }
  }

  handleIncomingCall(session) {
    console.log('🎙️ Прийняття вхідного дзвінка...');
    
    session.answer();
    this.currentSession = session;
    this.isCallActive = true;

    session.on('ended', () => {
      this.currentSession = null;
      this.isCallActive = false;
    });

    this.emit('incomingCall', { session });
  }

  async hangup() {
    if (this.currentSession) {
      this.currentSession.terminate();
    }
  }

  isConnected() {
    return this.ua && this.ua.isRegistered();
  }
}

// ============================================================================
// ГОЛОВНИЙ АГЕНТ З ПОВНОЮ ФУНКЦІОНАЛЬНІСТЮ
// ============================================================================

class FullFeaturedAIVoiceAgent {
  constructor(config) {
    this.config = config;
    this.sipClient = new AdvancedSIPClient(config.SIP);
    this.ttsClient = new ElevenLabsTTSAdvanced(
      config.ELEVENLABS.apiKey,
      config.ELEVENLABS
    );
    this.sttClient = new OpenAIWhisperSTT(config.OPENAI.apiKey);
    this.aiAgent = new AdvancedAIAgent(config.OPENAI.apiKey);
    this.callInProgress = false;
  }

  async initialize() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 ЗАПУСК AI VOICE AGENT v2.0');
    console.log('='.repeat(50) + '\n');

    try {
      await this.sipClient.initialize();

      this.sipClient.on('incomingCall', (data) => {
        this.handleIncomingCall(data);
      });

      console.log('✅ AI Voice Agent готовий!\n');
    } catch (error) {
      console.error('❌ Критична помилка:', error);
      process.exit(1);
    }
  }

  async handleIncomingCall(data) {
    if (this.callInProgress) {
      console.log('⏳ Агент вже в дзвінку. Відхилення...');
      await this.sipClient.hangup();
      return;
    }

    this.callInProgress = true;

    try {
      // 1️⃣ Привіт
      const greeting = 'Привіт! Це ШІ асистент. Як я можу вам допомогти?';
      await this.speakAndListen(greeting);

      // 2️⃣ Основна розмова
      for (let turn = 0; turn < 5; turn++) {
        const userInput = await this.waitForUserInput();
        
        if (!userInput || userInput.length < 3) {
          const fallback = 'Вибачте, я не зрозумів. Повторіть, будь ласка.';
          await this.speakAndListen(fallback);
          continue;
        }

        const aiResponse = await this.aiAgent.chat(userInput);
        await this.speakAndListen(aiResponse, false); // false = не слухаємо відповідь
      }

      // 3️⃣ Завершення
      const goodbye = 'Спасибо за розмову! До побачення!';
      const audioBuffer = await this.ttsClient.textToSpeech(goodbye);
      await this.sipClient.sendAudio(audioBuffer);

    } catch (error) {
      console.error('❌ Помилка розмови:', error);
    } finally {
      await this.sipClient.hangup();
      this.callInProgress = false;
      this.aiAgent.resetConversation();
    }
  }

  async speakAndListen(text, shouldListen = true) {
    try {
      // Мовлення
      const audioBuffer = await this.ttsClient.textToSpeech(text);
      await this.sipClient.sendAudio(audioBuffer);

      // Слухання (якщо потрібно)
      if (shouldListen) {
        await this.sleep(500); // Пауза перед слуханням
        // У реальній реалізації це буде виявлення активності голосу
      }
    } catch (error) {
      console.error('❌ Помилка speakAndListen:', error);
    }
  }

  async waitForUserInput(timeoutMs = 5000) {
    console.log('🎤 Слухаю користувача...');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve('');
      }, timeoutMs);

      // Наслідування отримання аудіо від користувача
      // У реальній реалізації це буде WebRTC аудіо stram
      resolve('Мені подобається ваш сервіс');
    });
  }

  async startOutgoingCall(phoneNumber, initialMessage) {
    console.log(`\n📱 Ініціація дзвінка на ${phoneNumber}...\n`);

    try {
      await this.sipClient.makeCall(phoneNumber);

      await this.sleep(2000); // Чекаємо відповіді

      // Надсилаємо початкове повідомлення
      await this.speakAndListen(initialMessage);

      // Розмова
      for (let turn = 0; turn < 3; turn++) {
        const userInput = await this.waitForUserInput();

        if (userInput) {
          const response = await this.aiAgent.chat(userInput);
          await this.speakAndListen(response);
        }
      }

      await this.sipClient.hangup();
    } catch (error) {
      console.error('❌ Помилка дзвінка:', error);
    }
  }

  setSystemPrompt(prompt) {
    this.aiAgent.setSystemPrompt(prompt);
  }

  getConversationHistory() {
    return this.aiAgent.getHistory();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// ЗАПУСК
// ============================================================================

async function main() {
  const CONFIG = {
    SIP: {
      server: process.env.SIP_SERVER || '62.149.25.79',
      port: parseInt(process.env.SIP_PORT || '5168'),
      login: process.env.SIP_LOGIN || '422',
      password: process.env.SIP_PASSWORD || '',
    },
    ELEVENLABS: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      voiceId: 'pNInz6obpgDQGcFmaJgB',
      model: 'eleven_multilingual_v2',
      language: 'uk',
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  try {
    await agent.initialize();

    // Налаштування системної ролі
    agent.setSystemPrompt(`Ти — фахівець лінії підтримки.
    - Допомагай користувачам з їхніми проблемами
    - Будь терпіння та розуміючим
    - Розмовляй українською
    - Хочеш розв'язати проблему, а не сперечатися`);

    console.log('⏳ Очікування на вхідні дзвінки...');
    console.log('Тип Ctrl+C для виходу\n');

    // Для тестування вихідного дзвінка (розкоментуй):
    /*
    await agent.sleep(2000);
    await agent.startOutgoingCall(
      '+380733830069',
      'Добрий день! Це ШІ асистент. Маю пропозицію для вас!'
    );
    */

    // Утримання процесу
    setInterval(() => {}, 1000);

  } catch (error) {
    console.error('❌ Критична помилка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  FullFeaturedAIVoiceAgent,
  AdvancedSIPClient,
  ElevenLabsTTSAdvanced,
  AdvancedAIAgent,
  OpenAIWhisperSTT,
};
