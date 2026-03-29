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
    return 'openrouter'; // default
  }

  ensureDirectories() {
    fs.ensureDirSync(this.projectsDir);
    fs.ensureDirSync(this.templatesDir);
  }

  async generateCode(prompt, options = {}) {
    // Если API ключа нет или запрос падает - используем шаблоны
    if (!this.apiKey) {
      console.log('Demo mode: using templates instead of API');
      return this.generateFromTemplate(options.type);
    }
    
    if (this.provider === 'openrouter') {
      return this.generateCodeOpenRouter(prompt, options);
    }
    return this.generateCodeAnthropic(prompt, options);
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
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    text-align: center;
}

nav {
    margin-top: 1rem;
}

nav a {
    color: white;
    text-decoration: none;
    margin: 0 1rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background 0.3s;
}

nav a:hover {
    background: rgba(255,255,255,0.2);
}

main {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 2rem;
}

section {
    margin: 2rem 0;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
}

footer {
    text-align: center;
    padding: 2rem;
    background: #333;
    color: white;
    margin-top: 2rem;
}
\`\`\`

app.js
\`\`\`javascript
// Основная логика приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('Сайт загружен!');
    
    // Плавная прокрутка для навигации
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
\`\`\`

package.json
\`\`\`json
{
  "name": "generated-website",
  "version": "1.0.0",
  "description": "AI Generated Website",
  "main": "index.html",
  "scripts": {
    "start": "npx serve .",
    "dev": "npx live-server ."
  }
}
\`\`\``;
  }

  getAndroidTemplate() {
    return `app/build.gradle
\`\`\`gradle
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.agent.generatedapp'
    compileSdk 34

    defaultConfig {
        applicationId "com.agent.generatedapp"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
    buildFeatures {
        compose true
    }
    composeOptions {
        kotlinCompilerExtensionVersion '1.5.1'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'
    implementation 'androidx.activity:activity-compose:1.8.2'
    implementation platform('androidx.compose:compose-bom:2023.08.00')
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.ui:ui-graphics'
    implementation 'androidx.compose.ui:ui-tooling-preview'
    implementation 'androidx.compose.material3:material3'
}
\`\`\`

app/src/main/java/com/agent/generatedapp/MainActivity.kt
\`\`\`kotlin
package com.agent.generatedapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.agent.generatedapp.ui.theme.GeneratedAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GeneratedAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Greeting("Android")
                }
            }
        }
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier.padding(16.dp)
    )
}
\`\`\`

app/src/main/AndroidManifest.xml
\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.GeneratedApp"
        tools:targetApi="31">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.GeneratedApp">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
\`\`\``;
  }

  getFlutterTemplate() {
    return `pubspec.yaml
\`\`\`yaml
name: generated_app
description: AI Generated Flutter App

publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
\`\`\`

lib/main.dart
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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Главная'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'Счётчик:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
\`\`\``;
  }

  async generateCodeOpenRouter(prompt, options = {}) {
    const model = options.model || 'google/gemini-flash-1.5';
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 сек таймаут
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://claude-dev-agent.render.com',
          'X-Title': 'Claude Dev Agent'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(options.type)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options.maxTokens || 4096
        })
      });

      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter HTTP error:', response.status, errorText);
        return `Error: API returned ${response.status}. ${errorText}`;
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('OpenRouter error:', data.error);
        return `Error: ${data.error.message}`;
      }
      
      return data.choices?.[0]?.message?.content || 'Generation failed';
    } catch (error) {
      clearTimeout(timeout);
      console.error('OpenRouter fetch error:', error.message);
      if (error.name === 'AbortError') {
        return 'Error: Request timeout (30s). API is slow or unavailable.';
      }
      return `Error: ${error.message}`;
    }
  }

  async generateCodeAnthropic(prompt, options = {}) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens || 4096,
        messages: [
          {
            role: 'user',
            content: `${this.getSystemPrompt(options.type)}\n\n${prompt}`
          }
        ]
      })
    });

    const data = await response.json();
    return data.content?.[0]?.text || data.error?.message || 'Generation failed';
  }

  getSystemPrompt(type) {
    const prompts = {
      android: `You are an expert Android developer. Generate complete, production-ready Android code.
Follow these rules:
- Use modern Android architecture (Jetpack Compose, ViewModel, Repository pattern)
- Include proper error handling and logging
- Follow Material Design 3 guidelines
- Generate modular, testable code
- Include necessary AndroidManifest.xml configurations`,
      
      web: `You are an expert full-stack web developer. Generate complete, production-ready web applications.
Follow these rules:
- Use modern frameworks (React, Vue, or vanilla JS with modern ES6+)
- Include responsive design with CSS Grid/Flexbox
- Proper semantic HTML structure
- Include client-side form validation
- Optimize for performance and accessibility`,
      
      flutter: `You are an expert Flutter developer. Generate complete, production-ready Flutter apps.
Follow these rules:
- Use clean architecture with BLoC pattern or Riverpod
- Include proper state management
- Follow Material Design 3 guidelines
- Support both Android and iOS
- Include proper error handling`
    };
    
    return prompts[type] || prompts.web;
  }

  async createProject(projectType, name, description) {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const projectPath = path.join(this.projectsDir, projectId);
    
    const project = {
      id: projectId,
      name,
      type: projectType,
      description,
      path: projectPath,
      status: 'generating',
      createdAt: new Date().toISOString(),
      files: []
    };
    
    this.activeProjects.set(projectId, project);
    fs.ensureDirSync(projectPath);
    
    // Generate project based on type
    switch (projectType) {
      case 'android':
        await this.generateAndroidProject(project, description);
        break;
      case 'web':
        await this.generateWebProject(project, description);
        break;
      case 'flutter':
        await this.generateFlutterProject(project, description);
        break;
      default:
        throw new Error(`Unknown project type: ${projectType}`);
    }
    
    project.status = 'ready';
    return project;
  }

  async generateAndroidProject(project, description) {
    const prompt = `Create a complete Android application: ${description}

Generate:
1. build.gradle (app level)
2. build.gradle (project level)
3. AndroidManifest.xml
4. MainActivity.kt with Jetpack Compose UI
5. ViewModel for business logic
6. Data models
7. Repository class
8. Resource files (strings.xml, colors.xml, themes.xml)
9. README with setup instructions

Package name: com.agent.${project.name.toLowerCase().replace(/\s+/g, '_')}
Min SDK: 24
Target SDK: 34

Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'android' });
    await this.parseAndSaveFiles(project, generated);
    
    // Generate keystore for signing
    await this.generateKeystore(project);
  }

  async generateWebProject(project, description) {
    const prompt = `Create a complete web application: ${description}

Generate:
1. index.html (main HTML file)
2. styles.css (modern CSS with variables, grid, flexbox)
3. app.js (JavaScript with ES6+ modules)
4. package.json with dependencies
5. README with setup instructions
6. Any additional components needed

Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'web' });
    await this.parseAndSaveFiles(project, generated);
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
    // Try multiple patterns for file extraction
    let matches = [];
    
    // Pattern 1: filename followed by code block (used in templates)
    const pattern1 = /([\w\/.\-_]+)\s*\n```[\w]*\n([\s\S]*?)```/g;
    matches = [...generatedContent.matchAll(pattern1)];
    
    // Pattern 2: code block with filename inside (used by AI models)
    if (matches.length === 0) {
      const pattern2 = /```[\w]*\s*([\w\/.\-_]+)\n([\s\S]*?)```/g;
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
    
    // If no code blocks found, try to create simple files
    if (matches.length === 0) {
      // Create index.html as fallback
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
      // Use Docker or local Gradle to build
      const buildScript = path.join(project.path, 'gradlew');
      
      // Create wrapper if doesn't exist
      if (!fs.existsSync(buildScript)) {
        await this.setupGradleWrapper(project);
      }
      
      // Build release APK
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
