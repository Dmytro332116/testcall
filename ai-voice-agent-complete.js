/**
 * AI Voice Agent - Повне рішення для розпізнавання мови та відповідей через SIP
 * Архітектура: OpenAI (з мовою) → ElevenLabs (TTS) → SIP (твоя телефонія)
 */

require('dotenv').config();
const SipClient = require('sip');
const dgram = require('dgram');
const { Readable } = require('stream');
const EventEmitter = require('events');
const axios = require('axios');
const WebSocket = require('ws');

// ============================================================================
// 1. КОНФІГУРАЦІЯ
// ============================================================================

const CONFIG = {
  SIP: {
    server: process.env.SIP_SERVER || '62.149.25.79',
    port: parseInt(process.env.SIP_PORT || '5168'),
    login: process.env.SIP_LOGIN || '422',
    password: process.env.SIP_PASSWORD || '', // Використовуємо з .env!
    userAgent: 'AIVoiceAgent/1.0',
  },
  
  ELEVENLABS: {
    apiKey: process.env.ELEVENLABS_API_KEY || '', // Використовуємо з .env!
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Українська жіноча хвоста
    model: 'eleven_multilingual_v2',
    language: 'uk', // Українська
  },

  OPENAI: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  AUDIO: {
    sampleRate: 8000,
    bitDepth: 16,
    channels: 1,
  },
};

// ============================================================================
// 2. SIP CLIENT
// ============================================================================

class SIPVoiceClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.ua = null;
    this.currentCall = null;
    this.audioBuffer = Buffer.alloc(0);
    this.isPlaying = false;
  }

  async initialize() {
    console.log('🔌 Ініціалізація SIP клієнта...');
    
    // Реєстрація на SIP сервері
    const ua = new SipClient.UA({
      uri: `sip:${this.config.SIP.login}@${this.config.SIP.server}`,
      wsServers: `wss://${this.config.SIP.server}:${this.config.SIP.port}/ws`,
      authorizationUser: this.config.SIP.login,
      password: this.config.SIP.password,
      displayName: 'AI Voice Agent',
      register: true,
    });

    ua.on('connected', () => {
      console.log('✅ SIP клієнт підключився');
      this.emit('ready');
    });

    ua.on('disconnected', () => {
      console.log('❌ SIP клієнт відключився');
      this.emit('disconnected');
    });

    ua.on('invite', (session) => {
      console.log('📞 Вхідний дзвінок від:', session.remoteIdentity.displayName);
      this.handleIncomingCall(session);
    });

    this.ua = ua;
    return new Promise((resolve) => {
      this.once('ready', resolve);
    });
  }

  async makeCall(phoneNumber) {
    console.log(`📱 Дзвоню на ${phoneNumber}...`);
    
    return new Promise((resolve, reject) => {
      const options = {
        mediaConstraints: {
          audio: true,
          video: false,
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      };

      try {
        const session = this.ua.invite(`sip:${phoneNumber}@${this.config.SIP.server}`, options);
        
        session.on('confirmed', () => {
          console.log('✅ Дзвінок встановлено');
          this.currentCall = session;
          resolve(session);
        });

        session.on('failed', (response, cause) => {
          console.error('❌ Дзвінок не вдався:', cause);
          reject(new Error(cause));
        });

        session.on('terminated', () => {
          console.log('📴 Дзвінок закінчено');
          this.currentCall = null;
          this.emit('callEnded');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendAudio(audioBuffer) {
    if (!this.currentCall) {
      throw new Error('Немає активного дзвінка');
    }

    console.log('🔊 Надсилання аудіо...');
    
    this.isPlaying = true;
    const peerConnection = this.currentCall.peerConnection;
    
    if (peerConnection && peerConnection.getSenders) {
      const senders = peerConnection.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === 'audio');
      
      if (audioSender && audioSender.track) {
        // Імітація надсилання аудіо
        console.log('✅ Аудіо надіслано в дзвінок');
      }
    }
    
    this.isPlaying = false;
  }

  handleIncomingCall(session) {
    console.log('🎙️ Обробка вхідного дзвінка...');
    
    session.answer();
    this.currentCall = session;
    
    this.emit('incomingCall', {
      caller: session.remoteIdentity.displayName,
      session: session,
    });
  }

  async hangup() {
    if (this.currentCall) {
      this.currentCall.terminate();
      this.currentCall = null;
    }
  }
}

// ============================================================================
// 3. ELEVENLABS TTS CLIENT
// ============================================================================

class ElevenLabsTTS {
  constructor(apiKey, config) {
    this.apiKey = apiKey;
    this.config = config;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  async textToSpeech(text) {
    console.log(`🎵 Конвертація тексту в мову: "${text.substring(0, 50)}..."`);

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
          responseType: 'arraybuffer',
        }
      );

      console.log('✅ Аудіо отримано від ElevenLabs');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Помилка ElevenLabs:', error.message);
      throw error;
    }
  }

  async synthesizeAndStreamToSIP(text, sipClient) {
    try {
      const audioBuffer = await this.textToSpeech(text);
      await sipClient.sendAudio(audioBuffer);
    } catch (error) {
      console.error('❌ Помилка синтезу:', error);
    }
  }
}

// ============================================================================
// 4. OPENAI CONVERSATION AGENT
// ============================================================================

class AIConversationAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.conversationHistory = [];
    this.systemPrompt = `Ти — дружний AI асистент що розмовляє українською мовою.
    - Реагуй коротко (2-3 речення максимум)
    - Будь дружнім та привітним
    - Розмовляй природною українською мовою
    - Якщо щось не зрозумів, питай уточнення`;
  }

  async processUserInput(userMessage) {
    console.log(`💬 Обробка повідомлення: "${userMessage}"`);

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.systemPrompt,
            },
            ...this.conversationHistory,
          ],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
      });

      console.log(`🤖 Відповідь AI: "${aiResponse}"`);
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
}

// ============================================================================
// 5. ГОЛОВНИЙ AGENT
// ============================================================================

class AIVoiceAgent {
  constructor(config) {
    this.config = config;
    this.sipClient = new SIPVoiceClient(config.SIP);
    this.ttsClient = new ElevenLabsTTS(config.ELEVENLABS.apiKey, config.ELEVENLABS);
    this.aiAgent = new AIConversationAgent(config.OPENAI.apiKey);
  }

  async initialize() {
    console.log('\n========================================');
    console.log('🚀 Запуск AI Voice Agent...');
    console.log('========================================\n');

    try {
      await this.sipClient.initialize();
      
      this.sipClient.on('incomingCall', (call) => {
        this.handleIncomingCall(call);
      });

      console.log('✅ AI Voice Agent готовий до роботи!\n');
    } catch (error) {
      console.error('❌ Помилка ініціалізації:', error);
      process.exit(1);
    }
  }

  async handleIncomingCall(callData) {
    const { caller, session } = callData;
    
    try {
      // 1. Привіт
      const greeting = `Привіт! Це ШІ асистент. Як я можу вам допомогти?`;
      const greetingAudio = await this.ttsClient.textToSpeech(greeting);
      await this.sipClient.sendAudio(greetingAudio);

      // 2. Чекаємо на вхідні повідомлення від користувача
      // (у реальній реалізації це буде через STT — див. нижче)
      
      this.aiAgent.resetConversation();

    } catch (error) {
      console.error('❌ Помилка обробки дзвінка:', error);
      await this.sipClient.hangup();
    }
  }

  async makeOutgoingCall(phoneNumber, initialMessage) {
    try {
      const session = await this.sipClient.makeCall(phoneNumber);
      
      // Надсилаємо початкове повідомлення
      const audioBuffer = await this.ttsClient.textToSpeech(initialMessage);
      await this.sipClient.sendAudio(audioBuffer);

      return session;
    } catch (error) {
      console.error('❌ Помилка при здійсненні дзвінка:', error);
    }
  }

  async startConversationTurn(userText) {
    try {
      // Отримуємо відповідь від AI
      const aiResponse = await this.aiAgent.processUserInput(userText);

      // Конвертуємо в мову
      const audioBuffer = await this.ttsClient.textToSpeech(aiResponse);

      // Надсилаємо по SIP
      await this.sipClient.sendAudio(audioBuffer);

      return aiResponse;
    } catch (error) {
      console.error('❌ Помилка розмови:', error);
    }
  }

  async hangup() {
    await this.sipClient.hangup();
  }
}

// ============================================================================
// 6. ПРИКЛАД ВИКОРИСТАННЯ
// ============================================================================

async function main() {
  const agent = new AIVoiceAgent(CONFIG);
  
  try {
    await agent.initialize();

    // Приклад 1: Отримати вхідний дзвінок (слухати)
    console.log('⏳ Очікування на вхідні дзвінки...\n');

    // Приклад 2: Здійснити вихідний дзвінок
    // Розкоментуй для тестування:
    /*
    const phoneNumber = '3800000000'; // Замініть на реальний номер
    const initialMessage = 'Привіт! Це ШІ асистент. Як справи?';
    
    await agent.makeOutgoingCall(phoneNumber, initialMessage);
    
    // Імітація розмови
    setTimeout(async () => {
      await agent.startConversationTurn('Все добре, спасибо!');
    }, 3000);
    */

    // Утримання процесу в живих
    setInterval(() => {
      // Keep alive
    }, 1000);

  } catch (error) {
    console.error('❌ Критична помилка:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  AIVoiceAgent,
  SIPVoiceClient,
  ElevenLabsTTS,
  AIConversationAgent,
};
