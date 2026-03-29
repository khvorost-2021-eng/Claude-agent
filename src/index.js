import ClaudeDevAgent from './core/ClaudeDevAgent.js';
import dotenv from 'dotenv';

dotenv.config();

const agent = new ClaudeDevAgent({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  projectsDir: './projects',
  templatesDir: './templates'
});

console.log('🧠 Claude Dev Agent запущен');
console.log('API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Настроен' : '❌ Отсутствует');

// Demo mode if no API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.log('\n⚠️  Запущено в демо-режиме. Установите ANTHROPIC_API_KEY для полной функциональности.');
  console.log('Создайте файл .env с содержимым:');
  console.log('ANTHROPIC_API_KEY=your_key_here\n');
}

export { agent };
