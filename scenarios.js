/**
 * ПРИКЛАДИ ВИКОРИСТАННЯ AI VOICE AGENT
 * 
 * Скрипти для різних сценаріїв: опитування, напоминання, продажі та ін.
 */

const {
  FullFeaturedAIVoiceAgent,
  AdvancedAIAgent
} = require('./ai-voice-agent-v2-with-stt.js');

require('dotenv').config();

// ============================================================================
// СЦЕНАРІЙ 1: ТЕЛЕМАРКЕТИНГ / ПРОДАЖІ
// ============================================================================

async function salesScenario() {
  console.log('📱 СЦЕНАРІЙ: Вихідна розмова з потенційним клієнтом\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для продажів
  agent.setSystemPrompt(`Ти — агент продажів.
  - Професійна та дружня мова
  - Запропонуй нашу послугу
  - Відповідай на заперечення
  - Спробуй зробити угоду
  - Розмовляй українською
  - Якщо не зацікавлено, попроси рекомендацію друзів`);

  try {
    await agent.initialize();

    // Список телефонів для дзвінків
    const phoneNumbers = [
      '+380733830069',
      '+380673830069',
      '+380503830069',
    ];

    for (const phone of phoneNumbers) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Дзвінок на ${phone}`);
      console.log('='.repeat(50));

      await agent.startOutgoingCall(
        phone,
        'Добрий день! Це ШІ асистент компанії. Маю цікаву пропозицію для вас!'
      );

      // Пауза між дзвінками
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 2: СЛУЖБА ПІДТРИМКИ
// ============================================================================

async function supportScenario() {
  console.log('🎧 СЦЕНАРІЙ: Служба технічної підтримки\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для підтримки
  agent.setSystemPrompt(`Ти — агент технічної підтримки.
  - Слухай проблему уважно
  - Пропонуй практичні рішення
  - Якщо не можеш розв'язати, переведи на людину
  - Будь терпеливим і вежливим
  - Розмовляй українською`);

  try {
    await agent.initialize();

    console.log('⏳ Чекаємо на вхідні дзвінки від клієнтів...\n');

    // Утримання процесу
    setInterval(() => {}, 1000);

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 3: ОПИТУВАННЯ / АНКЕТА
// ============================================================================

async function surveyScenario() {
  console.log('📊 СЦЕНАРІЙ: Опитування клієнтів\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для опитування
  agent.setSystemPrompt(`Ти — модератор опитування.
  - Задавай питання чітко
  - Слухай відповідь
  - Переходь до наступного питання
  - Дякуй за участь
  - Розмовляй українською
  - Будь дружнім`);

  const survey = [
    'Чи були ви задоволені якістю сервісу?',
    'Чи рекомендуватимете вас нас своїм друзям?',
    'Що можна поліпшити?',
  ];

  try {
    await agent.initialize();

    const phone = '+380733830069';
    await agent.startOutgoingCall(phone, 'Добрий день! Маємо для вас короткий опит.');

    for (const question of survey) {
      console.log(`\n📝 Запитання: ${question}`);
      await agent.sleep(2000);
    }

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 4: СПОВІЩЕННЯ / НАПОМИНАННЯ
// ============================================================================

async function notificationScenario() {
  console.log('🔔 СЦЕНАРІЙ: Автоматичні сповіщення\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Список сповіщень
  const notifications = [
    {
      phone: '+380733830069',
      message: 'Ваш посилок доставлено! Нажміть 1 для підтвердження',
    },
    {
      phone: '+380673830069',
      message: 'Напоминаємо про запис до лікаря на завтра о 10:00',
    },
    {
      phone: '+380503830069',
      message: 'Ваш рахунок готовий до оплати. Сума: 1500 грн',
    },
  ];

  try {
    await agent.initialize();

    for (const notification of notifications) {
      console.log(`\n📱 Дзвінок на ${notification.phone}`);
      console.log(`📢 Сповіщення: ${notification.message}`);

      await agent.startOutgoingCall(notification.phone, notification.message);

      // Пауза між сповіщеннями
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 5: НЕРУХОМІСТЬ / РОЗІСКИ КВАРТИР
// ============================================================================

async function realEstateScenario() {
  console.log('🏠 СЦЕНАРІЙ: Агент з нерухомості\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для агента нерухомості
  agent.setSystemPrompt(`Ти — агент з продажу нерухомості.
  - Пропонуй властивості залежно від потреб
  - Описуй переваги локації
  - Готовий організувати показ
  - Розмовляй українською
  - Професіонально та дружелюбно`);

  try {
    await agent.initialize();

    await agent.startOutgoingCall(
      '+380733830069',
      'Добрий день! Я маю чудову квартиру 2х кімнатну в центрі міста, яка вас може зацікавити!'
    );

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 6: БАНКІВСЬКІ ПОСЛУГИ
// ============================================================================

async function bankingScenario() {
  console.log('🏦 СЦЕНАРІЙ: Банківський асистент\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для банку
  agent.setSystemPrompt(`Ти — агент банку.
  - Інформуй про кредитні пропозиції
  - Обговорюй депозити
  - Розмовляй про збереження коштів
  - Будь інформативним
  - Розмовляй українською
  - Розповідай про переваги пропозиції`);

  try {
    await agent.initialize();

    await agent.startOutgoingCall(
      '+380733830069',
      'Добрий день! Мені б хотілось запропонувати вам спеціальний пропозицію по кредиту з низькою ставкою!'
    );

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// СЦЕНАРІЙ 7: СТРАХУВАННЯ
// ============================================================================

async function insuranceScenario() {
  console.log('🛡️ СЦЕНАРІЙ: Агент страхування\n');

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
    },
    OPENAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  const agent = new FullFeaturedAIVoiceAgent(CONFIG);

  // Налаштування для страху
  agent.setSystemPrompt(`Ти — агент страхування.
  - Розмовляй про типи страхування
  - Пояснюй переваги полісу
  - Розповідай про покриття
  - Допомагай обирати пакет
  - Розмовляй українською
  - Будь чесним та прямолінійним`);

  try {
    await agent.initialize();

    await agent.startOutgoingCall(
      '+380733830069',
      'Добрий день! Маю для вас спеціальну пропозицію по страхуванню здоров\'я з мінімальною премією!'
    );

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

// ============================================================================
// ЗАПУСК: ВИБІР СЦЕНАРІЮ
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'support';

  console.log('\n' + '='.repeat(60));
  console.log('AI VOICE AGENT - ПРИКЛАДИ ВИКОРИСТАННЯ');
  console.log('='.repeat(60) + '\n');

  switch (scenario) {
    case 'sales':
      await salesScenario();
      break;
    case 'support':
      await supportScenario();
      break;
    case 'survey':
      await surveyScenario();
      break;
    case 'notification':
      await notificationScenario();
      break;
    case 'realestate':
      await realEstateScenario();
      break;
    case 'banking':
      await bankingScenario();
      break;
    case 'insurance':
      await insuranceScenario();
      break;
    default:
      console.log('Доступні сценарії:');
      console.log('  npm run scenario -- sales        (Продажі)');
      console.log('  npm run scenario -- support      (Підтримка)');
      console.log('  npm run scenario -- survey       (Опитування)');
      console.log('  npm run scenario -- notification (Сповіщення)');
      console.log('  npm run scenario -- realestate   (Нерухомість)');
      console.log('  npm run scenario -- banking      (Банк)');
      console.log('  npm run scenario -- insurance    (Страхування)');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  salesScenario,
  supportScenario,
  surveyScenario,
  notificationScenario,
  realEstateScenario,
  bankingScenario,
  insuranceScenario,
};
