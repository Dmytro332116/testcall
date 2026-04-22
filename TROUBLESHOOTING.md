# 🛠️ ТROUBLEСHOOTING: ВИРІШЕННЯ ПРОБЛЕМ

## ❌ SIP Проблеми

### ❌ "SIP клієнт не підключився"

**Симптом:**
```
❌ SIP клієнт відключився
❌ Помилка: Connection refused
```

**Причини і рішення:**

| Причина | Перевірка | Рішення |
|---------|-----------|---------|
| **Неправильна IP/порт** | `ping 62.149.25.79` | Перевірте адресу в .env |
| **Неправильний пароль** | Спробуйте на SIP клієнті (Bria) | Змініть пароль на новий |
| **Брандмауер блокує** | `telnet 62.149.25.79 5168` | Відкрийте порти 5060-5080 |
| **VPN/Проксі** | Перевірте звичайне з'єднання | Відключіть VPN тимчасово |
| **SIP сервер offline** | Спитайте провайдера | Чекайте восстановления |

**Коди помилок SIP:**

```
400 Bad Request       → Невірний синтаксис запиту
401 Unauthorized      → Неправильні credentials
403 Forbidden         → Запит заборонений
480 Temporarily       → Адресат недоступний
500 Server Error      → Помилка серверу
603 Decline          → Дзвінок відхилено
```

### ❌ "Дзвінок встановлюється але аудіо не передається"

**Симптом:**
```
✅ Дзвінок прийнято
❌ Аудіо не чути
```

**Причини:**

```
┌─────────────────────────────────────────┐
│     ПОТІК АУДІО ПЕРЕРВАНО              │
├─────────────────────────────────────────┤
│ ✓ Перевіри RTP потоки (не UDP блокатор)│
│ ✓ Перевіри codec (ulaw, alaw)          │
│ ✓ Перевіри мікрофон/динамік            │
│ ✓ Перевіри WebRTC з'єднання            │
│ ✓ Логи: LOG_LEVEL=debug                │
└─────────────────────────────────────────┘
```

**Рішення:**

```bash
# 1. Перевіри отримання аудіо
tail -f logs/agent.log | grep "RTP\|Audio"

# 2. Перевіри codec підтримку
asterisk -rx "core show translation"

# 3. Перезав'яжи сесію
systemctl restart asterisk

# 4. Тест з SIP клієнтом (Bria, Linphone)
# Якщо працює з клієнтом - проблема в Node.js коді
```

### ❌ "SIP Register не проходить (403 Forbidden)"

**Симптом:**
```
❌ 403 Forbidden
❌ Registration failed
```

**Рішення:**

```javascript
// Перевір .env
SIP_PASSWORD=NEW_PASSWORD  // Не старий!

// Перевір формат в коді
uri: `sip:${login}@${server}`,
authorizationUser: login,
password: password,
```

---

## ❌ OpenAI / GPT-4 Проблеми

### ❌ "OpenAI API error: 401 Unauthorized"

**Причина:** Неправильний API ключ

**Рішення:**

```bash
# 1. Отримай новий ключ:
# Йди на https://platform.openai.com/api-keys
# Click "Create new secret key"

# 2. Замініть в .env:
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE

# 3. Перезапусти агента
npm run start
```

### ❌ "OpenAI API error: 429 Rate Limited"

**Причина:** Занадто багато запитів

**Рішення:**

```javascript
// Додати retry логіку в AIConversationAgent:

async chat(userMessage, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // запит...
      return response;
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### ❌ "OpenAI API error: 503 Service Unavailable"

**Причина:** OpenAI сервіс недоступний

**Рішення:**

```bash
# 1. Перевір статус:
# https://status.openai.com

# 2. Попроб пізніше (зазвичай 5-10 хвилин)

# 3. Додай резервну відповідь:
catch (error) {
  if (error.status === 503) {
    return 'Сервіс тимчасово недоступний. Спробуйте пізніше.';
  }
}
```

### ❌ "Whisper API: No speech detected"

**Причина:** Аудіо занадто тихе або шумне

**Рішення:**

```javascript
// Збільш чутливість або фільтруй шум
const response = await axios.post(
  `${baseUrl}/audio/transcriptions`,
  form,
  {
    headers: {...},
    // Додай параметри
    params: {
      temperature: 0, // Менш креативний (точніший)
      language: 'uk', // Явно вкажи мову
    }
  }
);
```

---

## ❌ ElevenLabs Проблеми

### ❌ "ElevenLabs API error: 401 Unauthorized"

**Причина:** Неправильний API ключ

**Рішення:**

```bash
# 1. Йди на https://elevenlabs.io/app/settings/api-keys
# 2. Регенеруй або скопіюй існуючий ключ
# 3. Замініть в .env:
ELEVENLABS_API_KEY=sk_XXXXX...

# 4. Перезапусти
npm run start
```

### ❌ "ElevenLabs: Insufficient credits"

**Причина:** Бюджет вичерпаний

**Рішення:**

```
ElevenLabs ціни:
- Starter: $0 (10,000 символів/місяць)
- Pro: $11 (100,000 символів/місяць)
- Business: $99+ (обмежено мільйонами)

Дія:
1. Йди на https://elevenlabs.io/billing
2. Додай способ оплати (карта)
3. Виберіть план
```

**Коли закінчилися кредити:**
```javascript
catch (error) {
  if (error.response?.status === 402) { // Payment Required
    console.error('Кредити вичерпані!');
    return 'Вибачте, послуга тимчасово недоступна';
  }
}
```

### ❌ "ElevenLabs: Voice ID не знайдено"

**Причина:** Неправильний voiceId

**Рішення:**

```javascript
// Отримати всі доступні голоси:
const voices = await ttsClient.getVoices();
console.log(voices.map(v => ({ id: v.voice_id, name: v.name })));

// Вихід:
// { id: 'pNInz6obpgDQGcFmaJgB', name: 'Anna (Ukrainian)' }
// { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Artem (Ukrainian)' }

// Замініть voiceId на правильний
ELEVENLABS: {
  voiceId: 'pNInz6obpgDQGcFmaJgB',
}
```

### ❌ "ElevenLabs: Stream timeout"

**Причина:** TTS тривалий

**Рішення:**

```javascript
// Збільш timeout:
const response = await axios.post(
  url,
  data,
  {
    headers,
    timeout: 60000, // 60 секунд (замість 30)
    responseType: 'stream'
  }
);
```

---

## ❌ Node.js / Код Проблеми

### ❌ "Cannot find module 'sip'"

**Причина:** Залежність не встановлена

**Рішення:**

```bash
npm install
# або
npm install sip.js axios dotenv ws jssip
```

### ❌ "Port 5168 already in use"

**Причина:** Другий процес використовує порт

**Рішення:**

```bash
# Знайти процес на порту 5168:
lsof -i :5168
# або на Windows:
netstat -ano | findstr :5168

# Закрити процес:
kill -9 <PID>
# або на Windows:
taskkill /PID <PID> /F
```

### ❌ "Memory leak - RAM постійно зростає"

**Симптом:**
```
Початок: 200 MB
Через час: 500 MB → 1 GB → OOM Kill
```

**Причини:**

```javascript
// ❌ ПРОБЛЕМА: Нескінченна історія розмов
this.conversationHistory = []; // Росте нескінченно!

// ✅ РІШЕННЯ: Обмеж розмір
if (this.conversationHistory.length > 20) {
  this.conversationHistory.shift(); // Видаль старіші
}

// ❌ ПРОБЛЕМА: Забуті timers
setInterval(() => {}, 1000); // Без clearInterval

// ✅ РІШЕННЯ:
const interval = setInterval(...);
// ... потім ...
clearInterval(interval);

// ❌ ПРОБЛЕМА: Великі буфери
this.audioBuffer = Buffer.alloc(10000000); // 10 MB

// ✅ РІШЕННЯ:
const audioBuffer = Buffer.allocUnsafe(audioSize);
// ... use ...
audioBuffer = null; // Звільни пам'ять
```

### ❌ ".env файл не читається"

**Причина:** Неправильна локація або формат

**Рішення:**

```bash
# Перевір наявність .env в корені проекту:
ls -la .env

# Перевір формат:
cat .env
# Повинно бути:
# SIP_SERVER=62.149.25.79
# SIP_PORT=5168
# Не з пробілами!

# Перевір порядок завантаження в коді:
require('dotenv').config(); // МУСИТ бути першим!
const CONFIG = {
  server: process.env.SIP_SERVER, // Тепер доступне
}
```

---

## ⚠️ Перформанс Проблеми

### ⚠️ "Дзвінок дуже повільний (5+ секунд на відповідь)"

**Профілювання затримок:**

```javascript
// Додай timestamp логування:
console.time('STT');
const text = await stt.recognize(audio);
console.timeEnd('STT'); // STT: 1200ms

console.time('GPT');
const response = await ai.chat(text);
console.timeEnd('GPT'); // GPT: 2000ms

console.time('TTS');
const audio = await tts.textToSpeech(response);
console.timeEnd('TTS'); // TTS: 800ms
```

**Очікувані значення:**
```
STT (Whisper):      0.5 - 2.0s  ✓
GPT-4:              1.0 - 3.0s  ✓
TTS (ElevenLabs):   0.5 - 2.0s  ✓
──────────────────────────────────
ВСЬОГО:             2.0 - 7.0s  ✓
```

### ⚠️ "CPU 100%, але нічого не робиш"

**Причини:**

```javascript
// ❌ ПРОБЛЕМА: Busy loop
while (true) {
  // Обробка...
  // Без затримки!
}

// ✅ РІШЕННЯ:
while (true) {
  // Обробка...
  await sleep(100); // Дай CPU відпочити
}

// ❌ ПРОБЛЕМА: Синхронна операція
const data = fs.readFileSync('huge-file.json');

// ✅ РІШЕННЯ:
const data = await fs.promises.readFile('huge-file.json');
```

### ⚠️ "Дзвінки падають після 10 хвилин"

**Причина:** Network timeout

**Рішення:**

```javascript
// Додай keep-alive:
const options = {
  mediaConstraints: { audio: true },
  rtcOfferConstraints: {
    offerToReceiveAudio: true,
  },
  sessionTimersExpires: 600, // 10 хвилин
};

// Або регенеруй SIP реєстрацію:
ua.on('disconnected', async () => {
  console.log('Переконнект...');
  await sleep(5000);
  ua.start(); // Повторна реєстрація
});
```

---

## 🔍 Налагодження з логами

### Включити детальне логування

```bash
# В .env:
LOG_LEVEL=debug
NODE_DEBUG=http,https

# Запусти з логами:
node ai-voice-agent-complete.js 2>&1 | tee debug.log

# Після тестування, аналізуй логи:
grep "ERROR" debug.log
grep "❌" debug.log
```

### Приклад логів та їх значення

```
🔌 Ініціалізація SIP клієнта...
   → Процес почав запускатися

✅ SIP клієнт підключився
   → З'єднання встановлено успішно

📞 Вхідний дзвінок від John
   → Користувач дзвонить

💬 Користувач: "Привіт!"
   → Whisper розпізнав текст

🤖 Відповідь AI: "Привіт, як дела?"
   → GPT-4 згенерував відповідь

🎵 Конвертація тексту в мову
   → TTS почав синтез

✅ Аудіо отримано
   → TTS завершено

🔊 Надсилання аудіо
   → Аудіо передається користувачу

❌ Error: Connection reset
   → Мережева помилка

📴 Дзвінок закінчено
   → Розмова завершена
```

---

## 📞 Contacting Support

### Якщо нічого не допомогло:

**1. OpenAI Support:**
- https://help.openai.com
- Чат у console.openai.com

**2. ElevenLabs Support:**
- https://elevenlabs.io/contact
- Discord: https://discord.gg/elevenlabs

**3. SIP провайдер (ваш оператор):**
- Контакт технічної підтримки
- Надай логи дзвінків

**4. Node.js Community:**
- Stack Overflow (tag: node.js)
- GitHub Issues

---

## ✅ Чеклист перед контактом з підтримкою

Перед тим як писати, переконайся:

- [ ] Перевірив .env файл (пароли, ключі)
- [ ] Перезапустив агента кілька разів
- [ ] Включив LOG_LEVEL=debug
- [ ] Скопіював повний error message
- [ ] Перевірив мережевість (ping, telnet)
- [ ] Дочитав цей guide до кінця
- [ ] Гуглив помилку
- [ ] Спробував на чистій установці (нова папка)

---

## 🎯 Швидкі рішення

| Проблема | Рішення |
|----------|---------|
| Не працює вообще | `npm install` + перезапуск |
| Дзвінок не йде | Перевір IP сервера: `ping 62.149.25.79` |
| Аудіо не чути | LOG_LEVEL=debug + перевір codec |
| Помилка API | Замініть ключ на новий |
| Пам'ять растет | Очисти conversationHistory |
| CPU 100% | Додай `await sleep()` |
| Все впадає | Docker: `docker-compose restart` |

---

**Успіхів з налаганням!** 🚀
