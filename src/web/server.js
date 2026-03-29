import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import multer from 'multer';
import ClaudeDevAgent from '../core/ClaudeDevAgent.js';
import GooglePlayPublisher from '../publish/GooglePlayPublisher.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const agent = new ClaudeDevAgent();
const publisher = new GooglePlayPublisher();

const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.post('/api/projects', async (req, res) => {
  try {
    const { type, name, description } = req.body;
    const project = await agent.createProject(type, name, description);
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  res.json({ projects: agent.listProjects() });
});

app.get('/api/projects/:id', (req, res) => {
  const project = agent.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

app.post('/api/projects/:id/build', async (req, res) => {
  try {
    const build = await agent.buildAndroidApp(req.params.id);
    res.json({ success: true, build });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects/:id/publish', async (req, res) => {
  try {
    const project = agent.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await publisher.publishToPlayStore(project, req.body.track || 'internal');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects/:id/download', (req, res) => {
  const project = agent.getProject(req.params.id);
  if (!project || !project.build) {
    return res.status(404).json({ error: 'Build not found' });
  }
  
  const file = req.query.type === 'aab' ? project.build.aab : project.build.apk;
  if (!file || !fs.existsSync(file)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(file);
});

// Preview - serve generated projects
app.use('/preview', express.static('projects'));

// Get project files for code viewer
app.get('/api/projects/:id/files', (req, res) => {
  const project = agent.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const files = [];
  const projectPath = project.path;
  
  function readDirRecursive(dir, basePath = '') {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDirRecursive(fullPath, relativePath);
      } else {
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          content: fs.readFileSync(fullPath, 'utf-8')
        });
      }
    }
  }
  
  if (fs.existsSync(projectPath)) {
    readDirRecursive(projectPath);
  }
  
  res.json({ files, previewUrl: `/preview/${project.id}` });
});

// Get preview URL for project
app.get('/api/projects/:id/preview', (req, res) => {
  const project = agent.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const previewUrl = project.type === 'web' 
    ? `/preview/${project.id}`
    : null;
    
  res.json({ previewUrl, type: project.type });
});

// Chat endpoint for agent interaction
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // Parse user intent
    const intent = parseIntent(message);
    
    let response;
    switch (intent.type) {
      case 'create_app':
        response = await handleCreateApp(intent, agent);
        break;
      case 'create_website':
        response = await handleCreateWebsite(intent, agent);
        break;
      case 'publish':
        response = await handlePublish(intent, agent, publisher);
        break;
      case 'build':
        response = await handleBuild(intent, agent);
        break;
      case 'status':
        response = handleStatus(agent);
        break;
      default:
        response = { 
          type: 'text', 
          content: 'Я могу создавать приложения для Android, веб-сайты и публиковать их в Google Play. Что вы хотите создать?' 
        };
    }
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function parseIntent(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('приложение') || lower.includes('app') || lower.includes('android')) {
    return { type: 'create_app', description: message };
  }
  if (lower.includes('сайт') || lower.includes('веб') || lower.includes('website') || lower.includes('web')) {
    return { type: 'create_website', description: message };
  }
  if (lower.includes('публикуй') || lower.includes('publish') || lower.includes('google play')) {
    return { type: 'publish', description: message };
  }
  if (lower.includes('собери') || lower.includes('build') || lower.includes('скомпилируй')) {
    return { type: 'build', description: message };
  }
  if (lower.includes('статус') || lower.includes('проекты') || lower.includes('status')) {
    return { type: 'status' };
  }
  
  return { type: 'unknown' };
}

async function handleCreateApp(intent, agent) {
  const project = await agent.createProject('android', 'GeneratedApp', intent.description);
  return {
    type: 'project_created',
    content: `Создан новый Android проект: ${project.name}`,
    projectId: project.id,
    actions: ['build', 'download', 'publish']
  };
}

async function handleCreateWebsite(intent, agent) {
  const project = await agent.createProject('web', 'GeneratedWebsite', intent.description);
  return {
    type: 'project_created',
    content: `Создан новый веб-проект: ${project.name}`,
    projectId: project.id,
    actions: ['download', 'deploy']
  };
}

async function handleBuild(intent, agent) {
  // Extract project ID from message or use latest
  const projects = agent.listProjects();
  if (projects.length === 0) {
    return { type: 'error', content: 'Нет активных проектов для сборки' };
  }
  
  const project = projects[projects.length - 1];
  const build = await agent.buildAndroidApp(project.id);
  
  return {
    type: 'build_complete',
    content: `Сборка завершена. APK: ${build.apk ? 'готов' : 'недоступен'}, AAB: ${build.aab ? 'готов' : 'недоступен'}`,
    projectId: project.id,
    actions: ['download', 'publish']
  };
}

async function handlePublish(intent, agent, publisher) {
  const projects = agent.listProjects();
  if (projects.length === 0) {
    return { type: 'error', content: 'Нет проектов для публикации' };
  }
  
  const project = projects.find(p => p.build) || projects[projects.length - 1];
  
  if (!project.build) {
    return { type: 'error', content: 'Сначала нужно собрать проект' };
  }
  
  const result = await publisher.publishToPlayStore(project);
  
  if (result.success) {
    return {
      type: 'published',
      content: `Приложение опубликовано в Google Play (track: ${result.track})`,
      packageName: result.packageName,
      versionCode: result.versionCode
    };
  } else {
    return { type: 'error', content: `Ошибка публикации: ${result.error}` };
  }
}

function handleStatus(agent) {
  const projects = agent.listProjects();
  return {
    type: 'status',
    content: `Активных проектов: ${projects.length}`,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status
    }))
  };
}

// WebSocket for real-time updates
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    if (msg.type === 'chat') {
      const intent = parseIntent(msg.content);
      
      ws.send(JSON.stringify({
        type: 'thinking',
        content: 'Обрабатываю запрос...'
      }));
      
      try {
        // Broadcast progress updates
        switch (intent.type) {
          case 'create_app':
            ws.send(JSON.stringify({ type: 'progress', step: 'generating', content: 'Генерирую код приложения...' }));
            const appProject = await agent.createProject('android', 'App', msg.content);
        ws.send(JSON.stringify({ 
          type: 'project_created', 
          content: '✅ Android проект создан',
          project: appProject,
          previewUrl: `/preview/${appProject.id}`
        }));
        break;
            
          case 'create_website':
            ws.send(JSON.stringify({ type: 'progress', step: 'generating', content: 'Генерирую веб-сайт...' }));
            const webProject = await agent.createProject('web', 'Website', msg.content);
        ws.send(JSON.stringify({ 
          type: 'project_created', 
          content: '✅ Веб-сайт создан',
          project: webProject,
          previewUrl: `/preview/${webProject.id}`
        }));
        break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              content: 'Неизвестная команда. Попробуйте: создать Android приложение или веб-сайт'
            }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          content: `Ошибка: ${error.message}`
        }));
      }
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AI Agent server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});

export { app, agent, publisher };
