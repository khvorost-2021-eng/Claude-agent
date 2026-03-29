import ClaudeDevAgent from './core/ClaudeDevAgent.js';
import GooglePlayPublisher from './publish/GooglePlayPublisher.js';
import dotenv from 'dotenv';

dotenv.config();

const agent = new ClaudeDevAgent();
const publisher = new GooglePlayPublisher();

console.log('🧠 Claude Dev Agent запущен');
console.log('API Provider:', agent.provider);
console.log('API Key:', agent.apiKey ? '✅ Настроен' : '❌ Отсутствует');

// Demo mode if no API key
if (!agent.apiKey) {
  console.log('\n⚠️  Запущено в демо-режиме. Установите OPENROUTER_API_KEY или ANTHROPIC_API_KEY для полной функциональности.');
  console.log('OpenRouter: https://openrouter.ai/keys');
  console.log('Anthropic: https://console.anthropic.com\n');
}

export { agent, publisher };
