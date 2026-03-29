import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';

class ClaudeDevAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey || this.getApiKey();
    this.provider = config.provider || this.detectProvider();
    this.projectsDir = config.projectsDir || './projects';
    this.templatesDir = config.templatesDir || './templates';
    this.memory = new Map();
    this.activeProjects = new Map();
    this.ensureDirectories();
  }

  getApiProvider() {
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openrouter';
  }

  getApiKey() {
    return process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  }

  detectProvider() {
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openrouter';
  }

  ensureDirectories() {
    fs.ensureDirSync(this.projectsDir);
    fs.ensureDirSync(this.templatesDir);
  }

  async generateCode(prompt, options = {}) {
    console.log('=== generateCode called ===');
    console.log('API Key exists:', !!this.apiKey);
    console.log('Provider:', this.provider);
    console.log('Prompt length:', prompt.length);
    console.log('Options:', options);
    
    if (this.apiKey) {
      let result;
      console.log('Calling AI API...');
      if (this.provider === 'groq') {
        result = await this.generateCodeGroq(prompt, options);
      } else if (this.provider === 'openai') {
        result = await this.generateCodeOpenAI(prompt, options);
      } else if (this.provider === 'openrouter') {
        result = await this.generateCodeOpenRouter(prompt, options);
      } else {
        result = await this.generateCodeAnthropic(prompt, options);
      }
      console.log('API result received:', !!result);
      if (result) {
        console.log('Result preview:', result.substring(0, 200));
        console.log('Starts with Error?:', result.startsWith('Error:'));
      }
      if (result && !result.startsWith('Error:')) {
        console.log('Returning AI generated content');
        return result;
      }
      console.log('API failed or returned error content');
    } else {
      console.log('No API key available');
    }
    console.log('Falling back to template mode');
    return this.generateFromTemplate(options.type);
  }

  generateFromTemplate(type) {
    const templates = {
      web: this.getWebTemplate(),
      android: this.getAndroidTemplate(),
      flutter: this.getFlutterTemplate()
    };
    return templates[type] || templates.web;
  }

  getWebTemplate() {
    return `index.html
\`\`\`html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Сгенерированный сайт</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Добро пожаловать</h1>
        <nav>
            <a href="#home">Главная</a>
            <a href="#about">О нас</a>
            <a href="#contact">Контакты</a>
        </nav>
    </header>
    <main>
        <section id="home">
            <h2>Главная</h2>
            <p>Это сгенерированный веб-сайт.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 Сгенерировано AI</p>
    </footer>
    <script src="app.js"></script>
</body>
</html>
\`\`\`

styles.css
\`\`\`css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; line-height: 1.6; }
header { background: #333; color: white; padding: 1rem; }
nav a { color: white; margin-right: 15px; }
main { padding: 2rem; }
footer { background: #333; color: white; text-align: center; padding: 1rem; }
\`\`\`

app.js
\`\`\`javascript
console.log('Сайт загружен!');
\`\`\``;
  }

  getAndroidTemplate() {
    return `MainActivity.kt
\`\`\`kotlin
package com.example.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
\`\`\`

activity_main.xml
\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello World!"
        android:textSize="24sp" />
</LinearLayout>
\`\`\``;
  }

  getFlutterTemplate() {
    return `lib/main.dart
\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Generated App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generated App')),
      body: const Center(child: Text('Hello World!')),
    );
  }
}
\`\`\``;
  }

  async generateCodeOpenRouter(prompt, options = {}) {
    console.log('=== generateCodeOpenRouter called ===');
    console.log('API Key prefix:', this.apiKey.substring(0, 15));
    
    const models = [
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-8b-instruct'
    ];
    
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`Trying model ${model}, attempt ${attempt + 1}`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000);
          
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'https://claudedev.example.com',
              'X-Title': 'ClaudeDev Agent'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: this.getSystemPrompt() },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 4000
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            continue;
          }
          
          const data = await response.json();
          console.log('API data received, choices:', data.choices ? data.choices.length : 0);
          
          if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            console.log('AI content length:', content.length);
            console.log('AI content preview:', content.substring(0, 300));
            return content;
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed for ${model}:`, error.message);
        }
      }
    }
    console.log('All models failed, returning null');
    return null;
  }

  async generateCodeAnthropic(prompt, options = {}) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          messages: [{ role: 'user', content: this.getSystemPrompt() + '\n\n' + prompt }]
        })
      });
      
      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      
      const data = await response.json();
      if (data.content && data.content[0]) return data.content[0].text;
      return null;
    } catch (error) {
      console.error('Anthropic API error:', error);
      return null;
    }
  }

  async generateCodeOpenAI(prompt, options = {}) {
    console.log('=== generateCodeOpenAI called ===');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      console.log('OpenAI Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('OpenAI choices:', data.choices ? data.choices.length : 0);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('OpenAI content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  async generateCodeGroq(prompt, options = {}) {
    console.log('=== generateCodeGroq called ===');
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      console.log('Groq Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Groq choices:', data.choices ? data.choices.length : 0);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('Groq content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('Groq API error:', error);
      return null;
    }
  }

  async generateCodeGemini(prompt, options = {}) {
    console.log('=== generateCodeGemini called ===');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: this.getSystemPrompt() + '\n\n' + prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      });
      
      console.log('Gemini Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Gemini candidates:', data.candidates ? data.candidates.length : 0);
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const content = data.candidates[0].content.parts[0].text;
        console.log('Gemini content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  }

  getSystemPrompt() {
    return `You are ClaudeDev, an expert software developer AI assistant. You specialize in generating complete, production-ready applications with detailed explanations.

CORE PRINCIPLES:
1. **Thoroughness**: Always provide complete, working solutions with all necessary files
2. **Detailed Explanations**: Include comprehensive comments and documentation explaining WHY, not just WHAT
3. **Best Practices**: Follow modern coding standards, responsive design, accessibility
4. **Educational Focus**: When creating educational content (courses, lessons), provide rich, structured material

OUTPUT FORMAT:
Always format responses as:
filename.ext
\`\`\`language
complete file content with detailed comments
\`\`\`

For web projects, generate:
- index.html (main page with complete structure)
- about.html (detailed about/course info page)  
- lessons.html (structured lesson content with explanations)
- practice.html (exercises with solutions)
- contact.html (contact form)
- styles.css (comprehensive CSS with variables, responsive design, animations)
- main.js (interactive features, smooth scrolling, form handling)

For educational websites:
- Include detailed lesson content with explanations
- Add theory sections with examples
- Provide practical exercises with step-by-step solutions
- Use modern UI/UX with gradients, cards, icons
- Ensure mobile-responsive design
- Add interactive elements (animations on scroll, hover effects)

Always deliver production-quality code that exceeds expectations.`;
  }

  async generateResponse(message) {
    // Generate a conversational response using AI
    if (this.apiKey) {
      const prompt = `Ответь на сообщение пользователя кратко и по существу: "${message}"`;
      let result;
      if (this.provider === 'groq') {
        result = await this.generateCodeGroq(prompt, { type: 'chat' });
      } else if (this.provider === 'openai') {
        result = await this.generateCodeOpenAI(prompt, { type: 'chat' });
      } else if (this.provider === 'openrouter') {
        result = await this.generateCodeOpenRouter(prompt, { type: 'chat' });
      } else {
        result = await this.generateCodeAnthropic(prompt, { type: 'chat' });
      }
      if (result && !result.startsWith('Error:')) {
        return result;
      }
    }
    
    // Fallback responses
    const fallbacks = [
      'Я вас понял! Чем ещё могу помочь?',
      'Интересно! Расскажите подробнее.',
      'Понял вас. Что бы вы хотели сделать дальше?',
      'Я готов помочь! Напишите "помощь" чтобы узнать что я умею.',
      'Принято! Чем ещё могу быть полезен?'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  async createProject(name, description, type = 'web') {
    const projectId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const projectPath = path.join(this.projectsDir, projectId);
    
    fs.ensureDirSync(projectPath);
    
    const project = {
      id: projectId,
      name,
      description,
      type,
      path: projectPath,
      files: [],
      createdAt: new Date().toISOString(),
      status: 'generating'
    };
    
    this.activeProjects.set(projectId, project);
    
    try {
      switch (type) {
        case 'web':
          await this.generateWebProject(project, description);
          break;
        case 'android':
          await this.generateAndroidProject(project, description);
          break;
        case 'flutter':
          await this.generateFlutterProject(project, description);
          break;
        default:
          throw new Error(`Unsupported project type: ${type}`);
      }
      
      project.status = 'completed';
      return project;
    } catch (error) {
      project.status = 'failed';
      project.error = error.message;
      throw error;
    }
  }

  async generateWebProject(project, description) {
    console.log('=== generateWebProject called ===');
    console.log('API Key exists:', !!this.apiKey);
    console.log('API Key prefix:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none');
    console.log('Provider:', this.provider);
    
    // Try AI-powered generation first
    if (this.apiKey) {
      try {
        console.log('Using AI to generate custom website...');
        await this.generateWebProjectAI(project, description);
        return;
      } catch (error) {
        console.error('AI generation failed, falling back to templates:', error.message);
        console.error('Full error:', error);
      }
    } else {
      console.log('No API key found, skipping AI generation');
    }
    
    // Fallback to template generation
    console.log('Using template mode for website generation');
    await this.generateWebProjectTemplate(project, description);
  }

  async generateWebProjectAI(project, description) {
    const prompt = `Создай полноценный многостраничный образовательный веб-сайт по запросу: "${description}"

ТРЕБОВАНИЯ:
1. Сайт должен быть на русском языке
2. Современный дизайн с анимациями и интерактивностью
3. Полностью адаптивный (mobile-first)
4. Использовать CSS переменные, flexbox, grid
5. FontAwesome иконки через CDN
6. Google Fonts (Inter или похожий)

СТРУКТУРА (7 файлов):

index.html - Главная страница:
- Hero секция с заголовком и CTA
- Статистика (количество уроков/заданий)
- Преимущества курса
- Краткое содержание

about.html - О курсе:
- Информация о программе
- Для кого курс
- Структура с таймлайном

lessons.html - Уроки:
- Список уроков по модулям
- Боковая панель с навигацией
- Прогресс обучения

practice.html - Практика:
- Типы заданий
- Примеры решений с пошаговым разбором

contact.html - Контакты:
- Форма обратной связи
- Контактная информация

styles.css - Полный CSS:
- CSS переменные для цветов
- Анимации и transitions
- Responsive breakpoints
- Hover эффекты

main.js - JavaScript:
- Мобильное меню (hamburger)
- Плавная прокрутка
- Обработка форм
- Scroll animations

ВАЖНО: В каждый HTML добавь favicon:
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">

Формат вывода:
filename.ext
\`\`\`language
content
\`\`\``;

    // Call AI to generate the website
    console.log('Calling generateCode with prompt length:', prompt.length);
    const aiResponse = await this.generateCode(prompt, { type: 'web' });
    
    console.log('AI Response received:', !!aiResponse);
    console.log('AI Response length:', aiResponse ? aiResponse.length : 0);
    if (aiResponse) {
      console.log('AI Response preview:', aiResponse.substring(0, 300));
    }
    
    if (!aiResponse) {
      throw new Error('AI returned empty response');
    }
    
    // Parse the AI response to extract files
    const files = this.parseFilesFromResponse(aiResponse);
    
    // Ensure all required files exist
    const requiredFiles = ['index.html', 'about.html', 'lessons.html', 'practice.html', 'contact.html', 'styles.css', 'main.js'];
    for (const filename of requiredFiles) {
      if (!files[filename]) {
        console.warn(`Missing ${filename}, generating from template...`);
        // Generate missing file from template
        const title = description.slice(0, 30);
        if (filename === 'index.html') files[filename] = this.generateIndexPage(title, description, 'Курс', '');
        else if (filename === 'about.html') files[filename] = this.generateAboutPage(title, 'Курс', '');
        else if (filename === 'lessons.html') files[filename] = this.generateLessonsPage(title, 'Курс', '');
        else if (filename === 'practice.html') files[filename] = this.generatePracticePage(title, 'Курс');
        else if (filename === 'contact.html') files[filename] = this.generateContactPage(title);
        else if (filename === 'styles.css') files[filename] = this.generateStyles();
        else if (filename === 'main.js') files[filename] = this.generateJavaScript();
      }
    }
    
    // Save all files
    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(project.path, filename);
      fs.writeFileSync(filepath, content);
      project.files.push(filename);
    }
    
    console.log(`Generated ${Object.keys(files).length} files via AI`);
  }

  async generateWebProjectTemplate(project, description) {
    const title = description.split(' ').slice(0, 8).join(' ') || 'Курс';
    const topic = description.replace(/создай сайт|создай вебсайт|создай курс/gi, '').trim() || 'Образовательный курс';
    
    let subject = 'Общий курс';
    let grade = '';
    if (description.includes('математик')) subject = 'Математика';
    if (description.includes('физик')) subject = 'Физика';
    if (description.includes('хими')) subject = 'Химия';
    if (description.includes('биологи')) subject = 'Биология';
    if (description.includes('истори')) subject = 'История';
    if (description.includes('английск')) subject = 'Английский язык';
    if (description.includes('русск')) subject = 'Русский язык';
    if (description.includes('литератур')) subject = 'Литература';
    if (description.includes('информатик')) subject = 'Информатика';
    if (description.includes('географи')) subject = 'География';
    
    const gradeMatch = description.match(/(\d+)(?:\s*-\s*|\s+по\s+|\s*-\s*)(\d+)?/);
    if (gradeMatch) {
      const startGrade = gradeMatch[1];
      const endGrade = gradeMatch[2];
      grade = endGrade ? `${startGrade}-${endGrade} классы` : `${startGrade} класс`;
    } else {
      if (description.includes('5')) grade = '5 класс';
      if (description.includes('6')) grade = '6 класс';
      if (description.includes('7')) grade = '7 класс';
      if (description.includes('8')) grade = '8 класс';
      if (description.includes('9')) grade = '9 класс';
      if (description.includes('10')) grade = '10 класс';
      if (description.includes('11')) grade = '11 класс';
    }
    
    const files = {};
    
    files['index.html'] = this.generateIndexPage(title, topic, subject, grade);
    files['about.html'] = this.generateAboutPage(title, subject, grade);
    files['lessons.html'] = this.generateLessonsPage(title, subject, grade);
    files['practice.html'] = this.generatePracticePage(title, subject);
    files['contact.html'] = this.generateContactPage(title);
    files['styles.css'] = this.generateStyles();
    files['main.js'] = this.generateJavaScript();

    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(project.path, filename);
      fs.writeFileSync(filepath, content);
      project.files.push(filename);
    }
  }

  generateIndexPage(title, topic, subject, grade) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link active">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="hero">
        <div class="container">
            <h1 class="hero-title">${title}</h1>
            <p class="hero-subtitle">${topic}</p>
            <p class="hero-description">Полный курс с подробными объяснениями, интерактивными примерами и практическими заданиями для ${grade || 'всех уровней'}</p>
            <div class="hero-buttons">
                <a href="lessons.html" class="btn btn-primary">
                    <i class="fas fa-book-open"></i>
                    Начать обучение
                </a>
                <a href="about.html" class="btn btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Подробнее о курсе
                </a>
            </div>
            <div class="hero-stats">
                <div class="stat">
                    <span class="stat-number">50+</span>
                    <span class="stat-label">Уроков</span>
                </div>
                <div class="stat">
                    <span class="stat-number">200+</span>
                    <span class="stat-label">Заданий</span>
                </div>
                <div class="stat">
                    <span class="stat-number">1000+</span>
                    <span class="stat-label">Примеров</span>
                </div>
            </div>
        </div>
        <div class="hero-wave">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
            </svg>
        </div>
    </header>

    <section class="features-section">
        <div class="container">
            <h2 class="section-title">Почему выбирают наш курс</h2>
            <div class="features-grid">
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-lightbulb"></i></div>
                    <h3>Понятные объяснения</h3>
                    <p>Каждая тема разобрана простым языком с наглядными примерами и иллюстрациями. Не просто формулы — а понимание принципов.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-layer-group"></i></div>
                    <h3>Структурированный материал</h3>
                    <p>Уроки построены от простого к сложному с четким планом обучения. Каждый урок — ступенька к мастерству.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-pencil-alt"></i></div>
                    <h3>Практические задания</h3>
                    <p>После каждого урока — упражнения разного уровня сложности с подробными решениями и объяснениями.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
                    <h3>Учитесь где угодно</h3>
                    <p>Доступ с любого устройства: компьютера, планшета или смартфона. Материал всегда под рукой.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="preview-section">
        <div class="container">
            <h2 class="section-title">Содержание курса</h2>
            <div class="topics-preview">
                <div class="topic-card">
                    <div class="topic-number">01</div>
                    <h3>Базовые понятия</h3>
                    <p>Основные определения, формулы и принципы. Создание прочного фундамента для дальнейшего обучения.</p>
                    <ul>
                        <li>Основные термины и определения</li>
                        <li>Ключевые формулы и правила</li>
                        <li>Базовые методы решения</li>
                    </ul>
                    <a href="lessons.html#module1" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="topic-card">
                    <div class="topic-number">02</div>
                    <h3>Стандартные задачи</h3>
                    <p>Типовые задачи и методы их решения. Развитие навыков применения теории на практике.</p>
                    <ul>
                        <li>Классические задачи</li>
                        <li>Алгоритмы решения</li>
                        <li>Проверка результатов</li>
                    </ul>
                    <a href="lessons.html#module2" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="topic-card">
                    <div class="topic-number">03</div>
                    <h3>Продвинутый уровень</h3>
                    <p>Сложные задачи, нестандартные подходы. Подготовка к олимпиадам и экзаменам.</p>
                    <ul>
                        <li>Комплексные задачи</li>
                        <li>Нестандартные методы</li>
                        <li>Оптимизация решений</li>
                    </ul>
                    <a href="lessons.html#module3" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <div class="cta-box">
                <h2>Готовы начать обучение?</h2>
                <p>Присоединяйтесь к тысячам учеников, которые уже освоили этот предмет и добились успеха</p>
                <a href="lessons.html" class="btn btn-large btn-primary">
                    <i class="fas fa-rocket"></i>
                    Перейти к урокам
                </a>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал с подробными курсами и практическими материалами</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="about.html">О курсе</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Контакты</h4>
                    <p><i class="fas fa-envelope"></i> info@course.ru</p>
                    <p><i class="fas fa-phone"></i> +7 (999) 123-45-67</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateAboutPage(title, subject, grade) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>О курсе | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link active">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>О нашем курсе</h1>
            <p>Подробная информация о программе обучения и методике</p>
        </div>
    </header>

    <main class="container">
        <section class="about-section">
            <div class="about-grid">
                <div class="about-content">
                    <h2>Для кого этот курс?</h2>
                    <p>Этот курс создан для учеников <strong>${grade || 'всех классов'}</strong>, которые хотят:</p>
                    <ul class="feature-list">
                        <li><i class="fas fa-check"></i> Освоить предмет "${subject}" с нуля или углубить знания</li>
                        <li><i class="fas fa-check"></i> Подготовиться к контрольным работам и экзаменам</li>
                        <li><i class="fas fa-check"></i> Научиться решать задачи разной сложности</li>
                        <li><i class="fas fa-check"></i> Получить системное образование по предмету</li>
                    </ul>
                    
                    <h3 class="mt-4">Методика обучения</h3>
                    <p>Наш курс построен на принципе "от простого к сложному". Каждый урок включает:</p>
                    <ul class="feature-list">
                        <li><i class="fas fa-book"></i> Теоретический материал с примерами</li>
                        <li><i class="fas fa-video"></i> Пошаговые объяснения решений</li>
                        <li><i class="fas fa-tasks"></i> Практические упражнения</li>
                        <li><i class="fas fa-check-double"></i> Самопроверку с разборами ошибок</li>
                    </ul>
                </div>
                <div class="about-image">
                    <div class="info-card highlight">
                        <i class="fas fa-bullseye"></i>
                        <h3>Наша цель</h3>
                        <p>Сделать сложный материал понятным каждому ученику через структурированный подход и практику.</p>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-clock"></i>
                        <h3>Длительность</h3>
                        <p>50+ уроков, которые можно проходить в своём темпе</p>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-certificate"></i>
                        <h3>Результат</h3>
                        <p>Уверенное владение предметом и успех на экзаменах</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="program-section">
            <h2 class="section-title">Структура программы</h2>
            <div class="program-timeline">
                <div class="timeline-item">
                    <div class="timeline-marker">1</div>
                    <div class="timeline-content">
                        <h3>Базовый уровень</h3>
                        <p>Фундаментальные понятия, определения, формулы. Создание прочной базы для дальнейшего обучения.</p>
                        <span class="timeline-meta">15 уроков • 30 часов</span>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-marker">2</div>
                    <div class="timeline-content">
                        <h3>Средний уровень</h3>
                        <p>Стандартные задачи, методы решения, типичные ошибки. Развитие навыков применения знаний.</p>
                        <span class="timeline-meta">20 уроков • 40 часов</span>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-marker">3</div>
                    <div class="timeline-content">
                        <h3>Продвинутый уровень</h3>
                        <p>Сложные задачи, нестандартные подходы, олимпиадные задания. Подготовка к высоким результатам.</p>
                        <span class="timeline-meta">15 уроков • 30 часов</span>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал с подробными курсами</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="about.html">О курсе</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateLessonsPage(title, subject, grade) {
    const lessons = [
      { num: '1.1', title: 'Введение в курс', desc: 'Обзор программы, цели обучения, как эффективно использовать материалы курса', time: '20 мин' },
      { num: '1.2', title: 'Основные термины', desc: 'Ключевые определения и понятия, которые нужно знать', time: '30 мин' },
      { num: '1.3', title: 'Базовые принципы', desc: 'Фундаментальные законы и правила предмета', time: '35 мин' },
      { num: '2.1', title: 'Первый модуль - практика', desc: 'Решение типовых задач базового уровня', time: '40 мин' },
      { num: '2.2', title: 'Методы решения', desc: 'Алгоритмы и подходы к решению стандартных задач', time: '45 мин' },
      { num: '3.1', title: 'Углублённое изучение', desc: 'Сложные темы и продвинутые концепции', time: '50 мин' },
      { num: '3.2', title: 'Комплексные задачи', desc: 'Задачи, требующие применения нескольких методов', time: '55 мин' }
    ];

    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Уроки | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link active">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Учебные материалы</h1>
            <p>Полный список уроков с подробными объяснениями и примерами</p>
        </div>
    </header>

    <main class="container">
        <div class="lessons-layout">
            <aside class="lessons-sidebar">
                <h3>Модули курса</h3>
                <ul class="modules-list">
                    <li><a href="#module1" class="module-link active">Модуль 1: Введение</a></li>
                    <li><a href="#module2" class="module-link">Модуль 2: Основы</a></li>
                    <li><a href="#module3" class="module-link">Модуль 3: Продвинутые темы</a></li>
                </ul>
                <div class="progress-widget">
                    <h4>Ваш прогресс</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <p>0 из ${lessons.length} уроков пройдено</p>
                </div>
            </aside>

            <div class="lessons-content">
                <section id="module1" class="module-section">
                    <h2 class="module-title">Модуль 1: Введение в ${subject}</h2>
                    ${lessons.slice(0, 3).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Начальный уровень</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>

                <section id="module2" class="module-section">
                    <h2 class="module-title">Модуль 2: Основные темы</h2>
                    ${lessons.slice(3, 5).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Средний уровень</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>

                <section id="module3" class="module-section">
                    <h2 class="module-title">Модуль 3: Продвинутый уровень</h2>
                    ${lessons.slice(5).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Продвинутый</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generatePracticePage(title, subject) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Практика | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link active">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Практические задания</h1>
            <p>Закрепите знания на практике с пошаговыми решениями</p>
        </div>
    </header>

    <main class="container">
        <div class="practice-sections">
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-pencil-alt"></i></div>
                <h3>Тренировочные упражнения</h3>
                <p>Базовые задания для закрепления материала каждого урока с подробными решениями</p>
                <a href="#" class="btn btn-primary">Начать тренировку</a>
            </div>
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-tasks"></i></div>
                <h3>Контрольные работы</h3>
                <p>Проверьте свои знания комплексными заданиями по темам с самопроверкой</p>
                <a href="#" class="btn btn-primary">Пройти тест</a>
            </div>
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-trophy"></i></div>
                <h3>Олимпиадные задачи</h3>
                <p>Сложные задания для подготовки к олимпиадам и конкурсам</p>
                <a href="#" class="btn btn-primary">Попробовать</a>
            </div>
        </div>

        <section class="examples-section">
            <h2>Примеры решения задач</h2>
            <div class="example-box">
                <h3>Пример 1: Базовая задача</h3>
                <div class="example-problem">
                    <strong>Условие:</strong> Разберём типовую задачу с подробным объяснением каждого шага решения.
                </div>
                <div class="example-solution">
                    <strong>Решение:</strong>
                    <ol>
                        <li><strong>Анализ условия:</strong> Внимательно прочитаем задачу и выделим известные данные</li>
                        <li><strong>Выбор метода:</strong> Определим, какой подход лучше всего подходит</li>
                        <li>< <li><strong>Применение формул:</strong> Подставим значения и выполним вычисления</li>
                        <li><strong>Проверка:</strong> Убедимся, что ответ логичен и соответствует условию</li>
                    </ol>
                </div>
                <div class="example-answer">
                    <strong>Ответ:</strong> Полученный результат с пояснением
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateContactPage(title) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Контакты | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link active">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Свяжитесь с нами</h1>
            <p>Есть вопросы? Мы всегда рады помочь!</p>
        </div>
    </header>

    <main class="container">
        <div class="contact-grid">
            <div class="contact-info">
                <h2>Контактная информация</h2>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <h4>Email</h4>
                        <p>info@course.ru</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <div>
                        <h4>Телефон</h4>
                        <p>+7 (999) 123-45-67</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <h4>Часы работы</h4>
                        <p>Пн-Пт: 9:00 - 18:00</p>
                    </div>
                </div>
            </div>

            <div class="contact-form-wrapper">
                <h2>Напишите нам</h2>
                <form class="contact-form" id="contactForm">
                    <div class="form-group">
                        <label>Ваше имя</label>
                        <input type="text" placeholder="Введите имя" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="your@email.com" required>
                    </div>
                    <div class="form-group">
                        <label>Сообщение</label>
                        <textarea placeholder="Ваш вопрос или сообщение..." rows="5" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-large">
                        <i class="fas fa-paper-plane"></i>
                        Отправить сообщение
                    </button>
                </form>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateStyles() {
    return `/* Modern Educational Website Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #8b5cf6;
    --accent: #ec4899;
    --success: #10b981;
    --warning: #f59e0b;
    --bg: #ffffff;
    --bg-alt: #f8fafc;
    --text: #1e293b;
    --text-light: #64748b;
    --border: #e2e8f0;
    --shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: var(--text);
    background: var(--bg);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

/* Navigation */
.navbar {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 16px 0;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-logo {
    color: white;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 8px;
}

.nav-logo i {
    font-size: 1.5rem;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 32px;
}

.nav-menu a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    padding: 8px 0;
    position: relative;
    transition: all 0.2s;
}

.nav-menu a::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: white;
    transition: width 0.2s;
}

.nav-menu a:hover::after,
.nav-menu a.active::after {
    width: 100%;
}

.hamburger {
    display: none;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
}

.bar {
    width: 25px;
    height: 3px;
    background: white;
    border-radius: 3px;
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 80px 0 120px;
    text-align: center;
    position: relative;
}

.hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 16px;
}

.hero-subtitle {
    font-size: 1.5rem;
    margin-bottom: 16px;
    opacity: 0.9;
}

.hero-description {
    font-size: 1.125rem;
    opacity: 0.9;
    max-width: 600px;
    margin: 0 auto 32px;
}

.hero-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 40px;
}

.hero-stats {
    display: flex;
    justify-content: center;
    gap: 40px;
}

.stat {
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 2rem;
    font-weight: 700;
}

.stat-label {
    opacity: 0.8;
}

.hero-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    line-height: 0;
}

.hero-wave svg {
    display: block;
    width: 100%;
    height: 60px;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    font-size: 1rem;
}

.btn-primary {
    background: white;
    color: var(--primary);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.btn-secondary:hover {
    background: white;
    color: var(--primary);
}

.btn-small {
    padding: 10px 20px;
    font-size: 0.9rem;
}

.btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
}

/* Sections */
.section {
    padding: 80px 0;
}

.section-title {
    font-size: 2.25rem;
    text-align: center;
    margin-bottom: 48px;
    font-weight: 700;
}

/* Features */
.features-section {
    padding: 60px 0 80px;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 32px;
}

.feature-box {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    text-align: center;
    transition: transform 0.2s;
}

.feature-box:hover {
    transform: translateY(-4px);
}

.feature-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    color: white;
    font-size: 1.5rem;
}

.feature-box h3 {
    margin-bottom: 12px;
    font-size: 1.25rem;
}

.feature-box p {
    color: var(--text-light);
    line-height: 1.6;
}

/* Topics Preview */
.preview-section {
    background: var(--bg-alt);
    padding: 80px 0;
}

.topics-preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 32px;
}

.topic-card {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.topic-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary);
    opacity: 0.5;
    margin-bottom: 16px;
}

.topic-card h3 {
    font-size: 1.25rem;
    margin-bottom: 12px;
}

.topic-card p {
    color: var(--text-light);
    margin-bottom: 16px;
}

.topic-card ul {
    list-style: none;
    margin-bottom: 20px;
}

.topic-card li {
    padding: 8px 0;
    padding-left: 24px;
    position: relative;
    color: var(--text-light);
}

.topic-card li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--success);
    font-weight: bold;
}

.topic-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

/* CTA Section */
.cta-section {
    padding: 60px 0;
}

.cta-box {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 48px;
    border-radius: 24px;
    text-align: center;
}

.cta-box h2 {
    font-size: 2rem;
    margin-bottom: 16px;
}

.cta-box p {
    opacity: 0.9;
    margin-bottom: 24px;
}

/* Page Header */
.page-header {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 60px 0 80px;
    text-align: center;
    position: relative;
}

.page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 12px;
}

.page-header p {
    opacity: 0.9;
    font-size: 1.1rem;
}

/* About Section */
.about-section {
    padding: 60px 0;
}

.about-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: start;
}

.about-content h2 {
    font-size: 1.75rem;
    margin-bottom: 20px;
}

.about-content h3 {
    font-size: 1.25rem;
    margin: 32px 0 16px;
}

.feature-list {
    list-style: none;
}

.feature-list li {
    padding: 12px 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.feature-list i {
    color: var(--success);
}

.info-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    margin-bottom: 24px;
}

.info-card.highlight {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
}

.info-card i {
    font-size: 2rem;
    color: var(--primary);
    margin-bottom: 12px;
}

.info-card.highlight i {
    color: white;
}

.info-card h3 {
    margin-bottom: 8px;
}

.info-card p {
    color: var(--text-light);
    font-size: 0.95rem;
}

.info-card.highlight p {
    color: rgba(255,255,255,0.9);
}

/* Program Timeline */
.program-section {
    padding: 60px 0;
}

.program-timeline {
    max-width: 800px;
    margin: 0 auto;
}

.timeline-item {
    display: flex;
    gap: 24px;
    padding: 24px 0;
    border-bottom: 1px solid var(--border);
}

.timeline-marker {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
}

.timeline-content h3 {
    margin-bottom: 8px;
}

.timeline-content p {
    color: var(--text-light);
    margin-bottom: 8px;
}

.timeline-meta {
    color: var(--primary);
    font-weight: 600;
    font-size: 0.9rem;
}

/* Lessons Layout */
.lessons-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 32px;
    padding: 40px 0;
}

.lessons-sidebar {
    position: sticky;
    top: 100px;
    height: fit-content;
}

.lessons-sidebar h3 {
    margin-bottom: 16px;
    font-size: 1.1rem;
}

.modules-list {
    list-style: none;
    margin-bottom: 24px;
}

.modules-list li {
    margin-bottom: 8px;
}

.module-link {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: var(--text);
    border-radius: 8px;
    transition: all 0.2s;
}

.module-link:hover,
.module-link.active {
    background: var(--bg-alt);
    color: var(--primary);
}

.progress-widget {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: var(--shadow);
}

.progress-widget h4 {
    margin-bottom: 12px;
    font-size: 0.9rem;
}

.progress-bar {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    border-radius: 4px;
    transition: width 0.3s;
}

.progress-widget p {
    color: var(--text-light);
    font-size: 0.85rem;
}

.module-section {
    margin-bottom: 40px;
}

.module-title {
    font-size: 1.5rem;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
}

.lesson-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    transition: transform 0.2s;
}

.lesson-card:hover {
    transform: translateX(4px);
}

.lesson-number {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    flex-shrink: 0;
}

.lesson-info {
    flex: 1;
}

.lesson-info h3 {
    margin-bottom: 6px;
}

.lesson-desc {
    color: var(--text-light);
    font-size: 0.95rem;
    margin-bottom: 8px;
}

.lesson-meta {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-light);
}

.lesson-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Practice Section */
.practice-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
    padding: 40px 0;
}

.practice-card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    text-align: center;
}

.practice-icon {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
    font-size: 2rem;
}

.practice-card h3 {
    margin-bottom: 12px;
}

.practice-card p {
    color: var(--text-light);
    margin-bottom: 20px;
}

/* Examples */
.examples-section {
    padding: 40px 0;
}

.examples-section h2 {
    margin-bottom: 24px;
}

.example-box {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.example-box h3 {
    margin-bottom: 20px;
    color: var(--primary);
}

.example-problem,
.example-solution,
.example-answer {
    margin-bottom: 20px;
    padding: 20px;
    border-radius: 8px;
}

.example-problem {
    background: var(--bg-alt);
}

.example-solution {
    background: #eff6ff;
}

.example-solution ol {
    margin-left: 20px;
}

.example-solution li {
    margin-bottom: 8px;
    padding-left: 8px;
}

.example-answer {
    background: #f0fdf4;
    border-left: 4px solid var(--success);
}

/* Contact */
.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    padding: 40px 0;
}

.contact-info h2,
.contact-form-wrapper h2 {
    margin-bottom: 24px;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
}

.contact-item i {
    width: 48px;
    height: 48px;
    background: var(--bg-alt);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    font-size: 1.25rem;
}

.contact-item h4 {
    margin-bottom: 4px;
}

.contact-item p {
    color: var(--text-light);
}

.contact-form {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--border);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
}

/* Footer */
.footer {
    background: var(--text);
    color: white;
    padding: 48px 0 24px;
    margin-top: 80px;
}

.footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 32px;
    margin-bottom: 32px;
}

.footer-section h4 {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.footer-section ul {
    list-style: none;
}

.footer-section li {
    margin-bottom: 8px;
}

.footer-section a {
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    transition: color 0.2s;
}

.footer-section a:hover {
    color: white;
}

.footer-section p {
    color: rgba(255,255,255,0.7);
}

.footer-bottom {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
}

/* Utilities */
.mt-4 { margin-top: 32px; }

/* Responsive */
@media (max-width: 768px) {
    .nav-menu {
        display: none;
    }
    
    .hamburger {
        display: flex;
    }
    
    .hero-title {
        font-size: 2rem;
    }
    
    .hero-stats {
        flex-direction: column;
        gap: 20px;
    }
    
    .hero-buttons {
        flex-direction: column;
        align-items: center;
    }
    
    .about-grid,
    .contact-grid,
    .lessons-layout {
        grid-template-columns: 1fr;
    }
    
    .lessons-sidebar {
        position: static;
    }
    
    .lesson-card {
        flex-direction: column;
        text-align: center;
    }
    
    .timeline-item {
        flex-direction: column;
    }
    
    .section-title {
        font-size: 1.75rem;
    }
}`;
  }

  generateJavaScript() {
    return `// Main JavaScript for Educational Website

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Сообщение отправлено!';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                this.reset();
            }, 3000);
        });
    }

    // Module navigation in lessons
    const moduleLinks = document.querySelectorAll('.module-link');
    moduleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            moduleLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.feature-box, .topic-card, .lesson-card').forEach(el => {
        observer.observe(el);
    });

    // Progress bar animation (demo)
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        setTimeout(() => {
            progressFill.style.width = '0%';
        }, 500);
    }

    console.log('🎓 Educational website loaded successfully!');
});`;
  }

  async generateAndroidProject(project, description) {
    const prompt = `Create a complete Android application: ${description}
Generate:
1. app/src/main/java/com/example/app/MainActivity.kt
2. app/src/main/res/layout/activity_main.xml
3. app/src/main/res/values/strings.xml
4. app/src/main/res/values/colors.xml
5. app/build.gradle (module)
6. build.gradle (project)
7. settings.gradle
8. README.md
Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'android' });
    await this.parseAndSaveFiles(project, generated);
    await this.generateKeystore(project);
  }

  async generateFlutterProject(project, description) {
    const prompt = `Create a complete Flutter application: ${description}
Generate:
1. pubspec.yaml
2. lib/main.dart
3. lib/app.dart
4. lib/screens/ (main screens)
5. lib/widgets/ (reusable widgets)
6. lib/models/ (data models)
7. lib/services/ (API services)
8. lib/providers/ (state management)
9. README with setup instructions
Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'flutter' });
    await this.parseAndSaveFiles(project, generated);
  }

  async parseAndSaveFiles(project, generatedContent) {
    let matches = [];
    
    const pattern1 = /([\w\/\.\-_]+)\s*\n\`\`\`[\w]*\n([\s\S]*?)\`\`\`/g;
    matches = [...generatedContent.matchAll(pattern1)];
    
    if (matches.length === 0) {
      const pattern2 = /\`\`\`[\w]*\s*([\w\/\.\-_]+)\n([\s\S]*?)\`\`\`/g;
      matches = [...generatedContent.matchAll(pattern2)];
    }
    
    for (const match of matches) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      const fullPath = path.join(project.path, filePath);
      
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
      project.files.push(filePath);
      console.log('Created file:', filePath);
    }
    
    if (matches.length === 0) {
      fs.writeFileSync(path.join(project.path, 'index.html'), generatedContent);
      project.files.push('index.html');
      console.log('Created fallback file: index.html');
    }
  }

  async generateKeystore(project) {
    const keystorePath = path.join(project.path, 'release.keystore');
    const storePassword = 'androidagent123';
    const keyPassword = 'androidagent123';
    const alias = 'release';
    
    try {
      execSync(
        `keytool -genkey -v -keystore "${keystorePath}" -alias ${alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${storePassword} -keypass ${keyPassword} -dname "CN=Android Agent, OU=Dev, O=Agent, L=City, S=State, C=US"`,
        { stdio: 'ignore' }
      );
      
      project.keystore = {
        path: keystorePath,
        storePassword,
        keyPassword,
        alias
      };
    } catch (error) {
      console.warn('Keystore generation failed:', error.message);
    }
  }

  async buildAndroidApp(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'android') {
      throw new Error('Invalid Android project');
    }

    project.status = 'building';
    
    try {
      const buildScript = path.join(project.path, 'gradlew');
      
      if (!fs.existsSync(buildScript)) {
        await this.setupGradleWrapper(project);
      }
      
      execSync(
        `cd "${project.path}" && ./gradlew assembleRelease`,
        { stdio: 'inherit' }
      );
      
      const apkPath = path.join(project.path, 'app/build/outputs/apk/release/app-release.apk');
      const aabPath = path.join(project.path, 'app/build/outputs/bundle/release/app-release.aab');
      
      project.build = {
        apk: fs.existsSync(apkPath) ? apkPath : null,
        aab: fs.existsSync(aabPath) ? aabPath : null,
        builtAt: new Date().toISOString()
      };
      
      project.status = 'built';
      return project.build;
    } catch (error) {
      project.status = 'build_failed';
      project.buildError = error.message;
      throw error;
    }
  }

  async setupGradleWrapper(project) {
    const gradleFiles = {
      'gradlew': `#!/bin/bash\ngradle wrapper`,
      'gradle/wrapper/gradle-wrapper.properties': `distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists`,
      'settings.gradle': `pluginManagement {\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\nrootProject.name = "${project.name}"\ninclude ':app'`
    };
    
    for (const [filePath, content] of Object.entries(gradleFiles)) {
      const fullPath = path.join(project.path, filePath);
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
    }
  }

  getProject(projectId) {
    return this.activeProjects.get(projectId);
  }

  listProjects() {
    return Array.from(this.activeProjects.values());
  }

  async deleteProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (project) {
      fs.removeSync(project.path);
      this.activeProjects.delete(projectId);
    }
  }

  async deployWebsite(projectId, subdomain = null) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'web') {
      throw new Error('Invalid web project');
    }

    try {
      console.log(`Deploying website ${projectId}...`);
      
      // Generate subdomain from project name if not provided
      const deploySubdomain = subdomain || project.name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
      
      // For now, create a simple public URL structure
      // In production, this would integrate with Netlify/Vercel API
      const publicUrl = `https://${deploySubdomain}.netlify.app`;
      
      project.deployment = {
        url: publicUrl,
        subdomain: deploySubdomain,
        deployedAt: new Date().toISOString(),
        status: 'deployed'
      };
      
      console.log(`Website deployed to: ${publicUrl}`);
      return project.deployment;
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  parseFilesFromResponse(content) {
    const files = {};
    console.log('Parsing AI response, length:', content.length);
    console.log('Response preview:', content.substring(0, 200));
    
    // Try multiple patterns to extract files
    const patterns = [
      // Pattern 1: filename.ext\n```lang\ncontent\n```
      /([\w\-]+\.(?:html|css|js))\s*\n?```[\w]*\n?([\s\S]*?)```/gi,
      // Pattern 2: ```lang:filename.ext\ncontent\n```
      /```[\w]*:(.+?\.(?:html|css|js))\n([\s\S]*?)```/gi,
      // Pattern 3: ### filename.ext\n```\ncontent\n```
      /###?\s*([\w\-]+\.(?:html|css|js))\s*\n?```[\w]*\n?([\s\S]*?)```/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const filename = match[1].trim();
        const fileContent = match[2].trim();
        if (filename && fileContent && !files[filename]) {
          files[filename] = fileContent;
          console.log('Extracted file:', filename, 'size:', fileContent.length);
        }
      }
    }
    
    // Fallback: if no files found, try to extract based on markdown headers
    if (Object.keys(files).length === 0) {
      const headerPattern = /##?\s*([\w\-]+\.(?:html|css|js))\s*\n([\s\S]*?)(?=##?\s*[\w\-]+\.(?:html|css|js)|$)/gi;
      let match;
      while ((match = headerPattern.exec(content)) !== null) {
        const filename = match[1].trim();
        let fileContent = match[2].trim();
        // Remove code block markers if present
        fileContent = fileContent.replace(/^```[\w]*\n?/, '').replace(/```$/, '');
        if (filename && fileContent && !files[filename]) {
          files[filename] = fileContent;
          console.log('Extracted file via header:', filename);
        }
      }
    }
    
    console.log('Total files extracted:', Object.keys(files).length);
    return files;
  }
}

export default ClaudeDevAgent;
