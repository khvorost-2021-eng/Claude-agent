import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';

class ClaudeDevAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.provider = config.provider || this.detectProvider();
    this.projectsDir = config.projectsDir || './projects';
    this.templatesDir = config.templatesDir || './templates';
    this.memory = new Map();
    this.activeProjects = new Map();
    this.ensureDirectories();
  }

  detectProvider() {
    if (process.env.OPENROUTER_API_KEY) return 'openrouter';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openrouter';
  }

  ensureDirectories() {
    fs.ensureDirSync(this.projectsDir);
    fs.ensureDirSync(this.templatesDir);
  }

  async generateCode(prompt, options = {}) {
    if (this.apiKey) {
      let result;
      if (this.provider === 'openrouter') {
        result = await this.generateCodeOpenRouter(prompt, options);
      } else {
        result = await this.generateCodeAnthropic(prompt, options);
      }
      if (result && !result.startsWith('Error:')) {
        return result;
      }
      console.log('API failed or returned no content, falling back to templates');
    }
    console.log('Using template mode');
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
    const models = [
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-8b-instruct'
    ];
    
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
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
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed for ${model}:`, error.message);
        }
      }
    }
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

  getSystemPrompt() {
    return `You are ClaudeDev, an expert software developer. Generate complete, runnable code based on the user's request.

IMPORTANT: Always format your response with file paths followed by code blocks.
Format: filename.ext followed by code block with content.

Example:
index.html
\`\`\`html
<!DOCTYPE html>
<html>...</html>
\`\`\`

Generate complete, working code with all necessary files.`;
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
    const title = description.split(' ').slice(0, 8).join(' ') || 'Курс';
    const topic = description.replace(/создай сайт|создай вебсайт|создай курс/gi, '').trim() || 'Образовательный курс';
    
    let subject = 'Общий курс';
    let grade = '';
    if (description.includes('математик')) subject = 'Математика';
    if (description.includes('физик')) subject = 'Физика';
    if (description.includes('хими')) subject = 'Химия';
    if (description.includes('биологи')) subject = 'Биология';
    if (description.includes('истори')) subject = 'История';
    if (description.includes('5')) grade = '5 класс';
    if (description.includes('6')) grade = '6 класс';
    if (description.includes('11')) grade = '11 класс';
    
    const files = {};
    
    files['index.html'] = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo"><span>${title}</span></a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link active">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
            </ul>
        </div>
    </nav>
    <header class="hero">
        <div class="container">
            <h1>${title}</h1>
            <p class="hero-subtitle">${topic}</p>
            <p class="hero-description">Полный курс с подробными объяснениями и практическими заданиями</p>
            <div class="hero-buttons">
                <a href="lessons.html" class="btn btn-primary">Начать обучение</a>
                <a href="about.html" class="btn btn-secondary">Подробнее</a>
            </div>
        </div>
    </header>
    <section class="features-section">
        <div class="container">
            <h2 class="section-title">Почему наш курс</h2>
            <div class="features-grid">
                <div class="feature-box">
                    <h3>Понятные объяснения</h3>
                    <p>Каждая тема разобрана простым языком с наглядными примерами</p>
                </div>
                <div class="feature-box">
                    <h3>Структурированный материал</h3>
                    <p>Уроки построены от простого к сложному</p>
                </div>
                <div class="feature-box">
                    <h3>Практические задания</h3>
                    <p>Упражнения для закрепления материала</p>
                </div>
            </div>
        </div>
    </section>
    <footer class="footer">
        <div class="container"><p>&copy; 2024 ${title}</p></div>
    </footer>
</body>
</html>`;

    files['about.html'] = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>О курсе | ${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo"><span>${title}</span></a>
            <ul class="nav-menu">
                <li><a href="index.html">Главная</a></li>
                <li><a href="about.html" class="active">О курсе</a></li>
                <li><a href="lessons.html">Уроки</a></li>
                <li><a href="practice.html">Практика</a></li>
            </ul>
        </div>
    </nav>
    <header class="page-header">
        <div class="container"><h1>О нашем курсе</h1></div>
    </header>
    <main class="container">
        <section class="about-section">
            <h2>Для кого этот курс?</h2>
            <p>Курс для учеников ${grade || 'всех классов'} по предмету "${subject}"</p>
            <ul class="feature-list">
                <li>Освоить предмет с нуля</li>
                <li>Подготовиться к контрольным</li>
                <li>Углубить знания</li>
            </ul>
        </section>
    </main>
    <footer class="footer"><p>&copy; 2024 ${title}</p></footer>
</body>
</html>`;

    files['lessons.html'] = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Уроки | ${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo"><span>${title}</span></a>
            <ul class="nav-menu">
                <li><a href="index.html">Главная</a></li>
                <li><a href="about.html">О курсе</a></li>
                <li><a href="lessons.html" class="active">Уроки</a></li>
                <li><a href="practice.html">Практика</a></li>
            </ul>
        </div>
    </nav>
    <header class="page-header">
        <div class="container"><h1>Уроки курса</h1></div>
    </header>
    <main class="container">
        <div class="lessons-list">
            <div class="lesson-card">
                <div class="lesson-number">1</div>
                <div class="lesson-info">
                    <h3>Введение в ${subject}</h3>
                    <p>Основные понятия и определения</p>
                </div>
            </div>
            <div class="lesson-card">
                <div class="lesson-number">2</div>
                <div class="lesson-info">
                    <h3>Базовые принципы</h3>
                    <p>Фундаментальные концепции</p>
                </div>
            </div>
        </div>
    </main>
    <footer class="footer"><p>&copy; 2024 ${title}</p></footer>
</body>
</html>`;

    files['practice.html'] = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Практика | ${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo"><span>${title}</span></a>
            <ul class="nav-menu">
                <li><a href="index.html">Главная</a></li>
                <li><a href="about.html">О курсе</a></li>
                <li><a href="lessons.html">Уроки</a></li>
                <li><a href="practice.html" class="active">Практика</a></li>
            </ul>
        </div>
    </nav>
    <header class="page-header">
        <div class="container"><h1>Практические задания</h1></div>
    </header>
    <main class="container">
        <div class="practice-cards">
            <div class="practice-card"><h3>Упражнения</h3><p>Закрепление материала</p></div>
            <div class="practice-card"><h3>Тесты</h3><p>Проверка знаний</p></div>
        </div>
    </main>
    <footer class="footer"><p>&copy; 2024 ${title}</p></footer>
</body>
</html>`;

    files['styles.css'] = `* { margin: 0; padding: 0; box-sizing: border-box; }
:root { --primary: #6366f1; --secondary: #8b5cf6; --text: #1e293b; --bg: #ffffff; --shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
body { font-family: 'Inter', sans-serif; line-height: 1.6; color: var(--text); background: var(--bg); }
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.navbar { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 16px 0; position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow); }
.nav-container { display: flex; justify-content: space-between; align-items: center; }
.nav-logo { color: white; text-decoration: none; font-weight: 700; font-size: 1.25rem; }
.nav-menu { display: flex; list-style: none; gap: 32px; }
.nav-menu a { color: white; text-decoration: none; font-weight: 500; }
.nav-menu a.active { border-bottom: 2px solid white; }
.hero { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 100px 0; text-align: center; }
.hero h1 { font-size: 3rem; font-weight: 700; margin-bottom: 16px; }
.hero-subtitle { font-size: 1.5rem; margin-bottom: 16px; }
.hero-description { font-size: 1.125rem; opacity: 0.9; margin-bottom: 32px; }
.hero-buttons { display: flex; gap: 16px; justify-content: center; }
.btn { display: inline-block; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; }
.btn-primary { background: white; color: var(--primary); }
.btn-secondary { background: transparent; color: white; border: 2px solid white; }
.page-header { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 60px 0; text-align: center; }
.page-header h1 { font-size: 2.5rem; }
.section { padding: 80px 0; }
.section-title { font-size: 2rem; text-align: center; margin-bottom: 48px; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; }
.feature-box { background: white; padding: 32px; border-radius: 16px; box-shadow: var(--shadow); text-align: center; }
.lessons-list { display: flex; flex-direction: column; gap: 20px; padding: 48px 0; }
.lesson-card { background: white; padding: 24px; border-radius: 12px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 24px; }
.lesson-number { width: 56px; height: 56px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem; }
.practice-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; padding: 48px 0; }
.practice-card { background: white; padding: 40px; border-radius: 16px; box-shadow: var(--shadow); text-align: center; }
.footer { background: var(--text); color: white; padding: 32px 0; text-align: center; margin-top: 60px; }
.about-section { padding: 48px 0; }
.feature-list { list-style: none; margin-top: 24px; }
.feature-list li { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
@media (max-width: 768px) { 
    .hero h1 { font-size: 2rem; } 
    .nav-menu { display: none; } 
    .hero-buttons { flex-direction: column; align-items: center; } 
    .lesson-card { flex-direction: column; text-align: center; } 
}`;

    for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(project.path, filename);
        fs.writeFileSync(filepath, content);
        project.files.push(filename);
    }
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
}

export default ClaudeDevAgent;
