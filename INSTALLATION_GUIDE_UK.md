# 🚀 ПОВНА ІНСТРУКЦІЯ: AI VOICE AGENT З SIP

## 📋 ЧО РОБИТЬ ЦЕ РІШЕННЯ

```
┌─────────────────────────────────────────────────────────────┐
│                    АРХІТЕКТУРА СИСТЕМИ                      │
└─────────────────────────────────────────────────────────────┘

  ВХІДНІ ДЗВІНКИ              ВИХІДНІ ДЗВІНКИ
         ↓                           ↓
    Дзвінок на             Програма інціює
    твій номер             дзвінок на номер
         ↓                           ↓
    ┌──────────────────────────────────────┐
    │      SIP CLIENT (Node.js)            │
    │   Підключення до 62.149.25.79:5168   │
    └──────────────────────────────────────┘
         ↓                           ↓
    Розпізнання мови         Відправлення мови
    (STT)                    (TTS - ElevenLabs)
         ↓                           ↓
    ┌──────────────────────────────────────┐
    │   OPENAI GPT-4 AGENT                 │
    │   (Розуміння та відповідь)           │
    └──────────────────────────────────────┘
```

---

## 🛠️ КРОК 1: ВСТАНОВЛЕННЯ

### 1.1 Вимоги
- Node.js v16+ ([https://nodejs.org](https://nodejs.org))
- npm або yarn
- Linux/Mac/Windows з інтернетом
- Дозволи брандмауера на порт 5168 (для SIP)

### 1.2 Встановлення залежностей
```bash
# Клонування або створення папки проекту
mkdir ai-voice-agent
cd ai-voice-agent

# Копіюємо файли (ai-voice-agent-complete.js, package.json, .env)

# Встановлюємо пакети
npm install
```

### 1.3 Налаштування конфігурації

**ВАЖЛИВО!** Спочатку змініть паролі та ключи:

```bash
# Відкрийте .env файл
nano .env
```

**Замініть на нові значення:**

```env
# 1️⃣ SIP - ВАШІ ДАНІ
SIP_SERVER=62.149.25.79
SIP_PORT=5168
SIP_LOGIN=422
SIP_PASSWORD=YOUR_NEW_PASSWORD  # ← НОВИЙ пароль (не T6ecK2zjH8xI!)

# 2️⃣ ELEVENLABS - НОВИЙ КЛЮЧ
# Йдіть на https://elevenlabs.io/app/settings/api-keys
# Регенеруйте ключ та вставте сюди:
ELEVENLABS_API_KEY=sk_XXXXX...  # ← НОВИЙ ключ

# 3️⃣ OPENAI - ВАШИЙ КЛЮЧ
# Йдіть на https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-XXXXX...
```

---

## 🎯 КРОК 2: РОЗУМІННЯ КОД

### Як це все працює?

#### **Модуль 1: SIPVoiceClient**
```javascript
// Підключається до твого SIP сервера
const client = new SIPVoiceClient({
  server: '62.149.25.79',
  login: '422',
  password: 'пароль',
  port: 5168
});

// Очікує дзвінків
// Може телефонувати
```

**Що воно робить:**
- ✅ Реєструється на SIP сервері
- ✅ Чекає на вхідні дзвінки
- ✅ Може дзвонити іншим номерам
- ✅ Передає аудіо в реальному часі

---

#### **Модуль 2: ElevenLabsTTS**
```javascript
// Конвертує текст в мову українською
const tts = new ElevenLabsTTS(apiKey, {
  voiceId: 'pNInz6obpgDQGcFmaJgB',  // Українська жіночка
  model: 'eleven_multilingual_v2'
});

// Приклад:
const audioBuffer = await tts.textToSpeech('Привіт!');
// audioBuffer = аудіо файл у форматі PCM
```

**Що воно робить:**
- ✅ Отправляет текст на ElevenLabs API
- ✅ Отримує аудіо в реальному часі
- ✅ Підтримує українську мову
- ✅ Звучить як справжня людина

---

#### **Модуль 3: AIConversationAgent**
```javascript
// Интеллектуальный помощник
const ai = new AIConversationAgent(openaiApiKey);

// Обработка текста пользователя
const response = await ai.processUserInput('Привіт!');
// response = "Привіт! Як справи?"
```

**Що воно робить:**
- ✅ Розуміє вхідне повідомлення
- ✅ Генерує розумну відповідь
- ✅ Пам'ятає контекст розмови
- ✅ Відповідає українською

---

#### **Модуль 4: AIVoiceAgent (Головний)**
```javascript
const agent = new AIVoiceAgent(CONFIG);

// Об'єднує все разом
await agent.initialize();

// Вхідний дзвінок:
// дзвінок → STT (мова→текст) → AI (розуміння) → 
// TTS (текст→мова) → SIP (відправка звука)

// Вихідний дзвінок:
await agent.makeOutgoingCall('+380733830069', 'Привіт!');
```

---

## 🔄 КРОК 3: ЗАПУСК

### Простий запуск
```bash
node ai-voice-agent-complete.js
```

**Вивід повинен бути:**
```
========================================
🚀 Запуск AI Voice Agent...
========================================

🔌 Ініціалізація SIP клієнта...
✅ SIP клієнт підключився
✅ AI Voice Agent готовий до роботи!

⏳ Очікування на вхідні дзвінки...
```

### З автоперезавантаженням (для розробки)
```bash
npm run dev
```

---

## 📞 КРОК 4: ТЕСТУВАННЯ

### Сценарій 1: Вхідний дзвінок
```
1. Хтось дзвонить на твій номер (+380 (73) 383 00 69)
2. SIP клієнт отримує дзвінок
3. Програма каже: "Привіт! Це ШІ асистент..."
4. Людина говорить щось
5. STT розпізнає текст
6. GPT генерує відповідь
7. ElevenLabs конвертує в мову
8. Людина чує відповідь
```

### Сценарій 2: Вихідний дзвінок (тестування)

Розкоментуй в кінці файлу (рядок ~350):
```javascript
// Приклад 2: Здійснити вихідний дзвінок
const phoneNumber = '+380733830069'; // Замініть на реальний номер
const initialMessage = 'Привіт! Це ШІ асистент. Як справи?';

await agent.makeOutgoingCall(phoneNumber, initialMessage);

// Імітація розмови
setTimeout(async () => {
  await agent.startConversationTurn('Все добре, спасибо!');
}, 3000);
```

Потім:
```bash
node ai-voice-agent-complete.js
```

---

## 🎛️ КОНФІГУРАЦІЯ ГОЛОСІВ

### Змінити голос/мову

В файлі `ai-voice-agent-complete.js` строка ~50:

```javascript
ELEVENLABS: {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: 'pNInz6obpgDQGcFmaJgB', // ← Змініть тут
  model: 'eleven_multilingual_v2',
  language: 'uk', // ← Або тут
},
```

**Популярні голоси ElevenLabs:**
- `21m00Tcm4TlvDq8ikWAM` - Англійський (чоловік)
- `pNInz6obpgDQGcFmaJgB` - Український (жінка)
- `EXAVITQu4vr4xnSDxMaL` - Український (чоловік)

Отримати всі голоси:
```bash
curl -H "xi-api-key: YOUR_API_KEY" \
  https://api.elevenlabs.io/v1/voices
```

---

## 🛠️ НАЛАГОДЖЕННЯ

### Помилка: "SIP клієнт не підключився"
```
✗ Причина: неправильний пароль або IP сервера
✓ Рішення: перевір .env файл, замініть пароль
```

### Помилка: "ElevenLabs API error"
```
✗ Причина: неправильний API ключ або вичерпаний ліміт
✓ Рішення: регенеруй ключ на https://elevenlabs.io/app/settings/api-keys
```

### Помилка: "OpenAI API error"
```
✗ Причина: неправильний ключ або відсутність коштів
✓ Рішення: перевір ключ, додай карту платежу
```

### Дзвінок не працює
```
✓ Перевір:
  1. Дозволи брандмауера на порт 5168
  2. SIP сервер онлайн: ping 62.149.25.79
  3. Логи: включи LOG_LEVEL=debug в .env
```

---

## 📊 МОНІТОРИНГ (ЛОГИ)

Для детальніших логів змініть в `.env`:
```env
LOG_LEVEL=debug
```

Логи покажуть:
```
🔌 Ініціалізація SIP клієнта...
✅ SIP клієнт підключився
📞 Вхідний дзвінок від: John Doe
💬 Обробка повідомлення: "Привіт!"
🤖 Відповідь AI: "Привіт! Як дела?"
🎵 Конвертація тексту в мову...
✅ Аудіо отримано від ElevenLabs
🔊 Надсилання аудіо...
```

---

## 📈 РОЗШИРЕНА КОНФІГУРАЦІЯ

### Змінити температуру AI (більше креативності)
В `AIConversationAgent`:
```javascript
temperature: 0.7,  // 0.1-1.0, більше = креативніше
max_tokens: 150,   // Довжина відповіді
```

### Додати власні інструкції для AI
В `systemPrompt`:
```javascript
const systemPrompt = `Ти — дружний AI асистент...
  - Спеціаліст з продажів автомобілів
  - Розповідай про специфікації авто
  - Пропонуй тест-драйв`;
```

### Багатомовність
```javascript
// Додай в processUserInput:
const language = 'uk'; // uk, en, ru, etc.
// Используй в ElevenLabs та OpenAI
```

---

## 🚀 ПРОДАКШЕН РОЗГОРТАННЯ

### На сервері (Ubuntu/Debian)

```bash
# 1. Встановлення Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Клонування проекту
git clone YOUR_REPO ai-voice-agent
cd ai-voice-agent

# 3. Встановлення залежностей
npm install --production

# 4. Запуск через PM2 (для постійного запуску)
npm install -g pm2
pm2 start ai-voice-agent-complete.js --name "voice-agent"
pm2 startup
pm2 save
```

### З Docker (більш надійно)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "ai-voice-agent-complete.js"]
```

```bash
docker build -t ai-voice-agent .
docker run -d --name voice-agent --env-file .env ai-voice-agent
```

---

## 🔐 БЕЗПЕКА

⚠️ **КРИТИЧНО ВАЖНО:**

1. **Ніколи не публікуй .env файл!**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Регулярно міняй паролі**
   - SIP пароль: щомісячно
   - API ключі: щоквартально

3. **Обмежуй доступ**
   - Встанови IP whitelist на сервері
   - Використовуй VPN для連接

4. **Моніторинг вартості**
   - ElevenLabs: 0.30$/1000 символів
   - OpenAI: ~0.005$/1000 токенів
   - SIP: залежить від провайдера

---

## 💡 ПРИКЛАДИ ВИКОРИСТАННЯ

### Приклад 1: Розвідне повідомлення
```javascript
agent.aiAgent.systemPrompt = `Ти — агент технічної підтримки`;
await agent.makeOutgoingCall('+380733830069', 
  'Добрий день! Назвіть вашу проблему');
```

### Приклад 2: Опитування
```javascript
const questions = [
  'Яка оцінка нашому сервісу?',
  'Чи рекомендуватимете вас нас друзям?'
];

for (const q of questions) {
  await agent.startConversationTurn(q);
  await sleep(3000);
}
```

### Приклад 3: Сповіщення
```javascript
await agent.makeOutgoingCall('+380733830069',
  'Ваш посилок доставлено! Натисніть 1, щоб підтвердити');
```

---

## 📞 ПІДТРИМКА

При проблемах:
1. Перевір логи (LOG_LEVEL=debug)
2. Тестуй кожен модуль окремо
3. Читай документацію: 
   - SIP.js: https://sipjs.zetaproxies.com/
   - ElevenLabs: https://elevenlabs.io/docs
   - OpenAI: https://platform.openai.com/docs

---

## ✅ ЧЕКЛИСТ ЗАПУСКУ

- [ ] Node.js встановлено (v16+)
- [ ] npm залежності встановлені
- [ ] .env файл налаштований з новими паролями
- [ ] Тестовий дзвінок на SIP сервер пройшов
- [ ] ElevenLabs API ключ робочий
- [ ] OpenAI API ключ робочий
- [ ] Брандмауер дозволяє порт 5168
- [ ] Логування включено для налагодження
- [ ] Програма запускається без помилок
- [ ] Готово до боюу! 🚀

---

**Успіхів з AI Voice Agent!** 🎉
