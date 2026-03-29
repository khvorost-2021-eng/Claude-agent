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
    if (this.provider === 'openrouter') {
      return this.generateCodeOpenRouter(prompt, options);
    }
    return this.generateCodeAnthropic(prompt, options);
  }

  async generateCodeOpenRouter(prompt, options = {}) {
    // Free models: google/gemma-2-9b-it, meta-llama/llama-3.1-8b-instruct
    // Cheap models: anthropic/claude-3-haiku, google/gemini-flash-1.5
    const model = options.model || 'google/gemini-flash-1.5';
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
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

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenRouter error:', data.error);
      return `Error: ${data.error.message}`;
    }
    
    return data.choices?.[0]?.message?.content || 'Generation failed';
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
    const fileRegex = /```[\w]*\s*([\w\/.\-]+)\n([\s\S]*?)```/g;
    const matches = [...generatedContent.matchAll(fileRegex)];
    
    for (const match of matches) {
      const filePath = match[1];
      const content = match[2];
      const fullPath = path.join(project.path, filePath);
      
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
      project.files.push(filePath);
    }
    
    // Save generated content as raw text if no code blocks found
    if (matches.length === 0) {
      fs.writeFileSync(path.join(project.path, 'generated.txt'), generatedContent);
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
