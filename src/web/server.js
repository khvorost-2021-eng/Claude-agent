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
  
  // MODIFICATION PATTERNS - Check these FIRST (before create)
  // These indicate the user wants to modify/extend an existing project
  const modifyPatterns = [
    'дополни', 'доработай', 'улучши', 'измени', 'обнови', 'переделай', 'исправь',
    'добавь', 'внеси изменения', 'модифицируй', 'расширь', 'редактируй',
    'сделай лучше', 'сделай красивее', 'сделай более',
    'который ты уже создал', 'существующий проект', 'в текущий проект',
    'в существующий', 'в уже созданный'
  ];
  
  // Check for modification intent FIRST
  const isModification = modifyPatterns.some(pattern => lower.includes(pattern));
  
  // Website patterns
  const websitePatterns = [
    'сайт', 'веб', 'website', 'web', 'курс', 'страница', 'landing', 'сайд',
    'создай сайт', 'сделай сайт', 'создать сайт', 'сделать сайт',
    'создай веб', 'сделай веб', 'создать веб', 'сделать веб',
    'веб-сайт', 'вебсайт', 'веб приложение', 'веб-приложение'
  ];
  
  // Check for website intent (create or modify)
  if (websitePatterns.some(pattern => lower.includes(pattern))) {
    if (isModification) {
      return { type: 'modify_website', description: message };
    }
    return { type: 'create_website', description: message };
  }
  
  // Android app patterns
  const appPatterns = [
    'приложение', 'app', 'android', 'апк', 'apk',
    'создай приложение', 'сделай приложение', 'создать приложение',
    'создай андроид', 'сделай андроид', 'мобильное приложение'
  ];
  
  // Check for Android app intent (create or modify)
  if (appPatterns.some(pattern => lower.includes(pattern))) {
    if (isModification) {
      return { type: 'modify_app', description: message };
    }
    return { type: 'create_app', description: message };
  }
  
  // If modification requested but no specific type detected, treat as modify for latest project
  if (isModification) {
    return { type: 'modify_project', description: message };
  }
  
  // Publish patterns
  if (lower.includes('публикуй') || lower.includes('publish') || lower.includes('google play') || lower.includes('опубликуй')) {
    return { type: 'publish', description: message };
  }
  
  // Build patterns
  if (lower.includes('собери') || lower.includes('build') || lower.includes('скомпилируй') || lower.includes('сборка') || lower.includes('скомпилировать')) {
    return { type: 'build', description: message };
  }
  
  // Status patterns
  if (lower.includes('статус') || lower.includes('проекты') || lower.includes('status') || lower.includes('список')) {
    return { type: 'status' };
  }
  
  // Feedback / Issue patterns
  const feedbackPatterns = [
    'не работает', 'баг', 'ошибка', 'проблема', 'исправь', 'почини', 
    'не запускается', 'не открывается', 'сломалось', 'bug', 'error', 'fix',
    'кнопка', 'не нажимается', 'не отвечает', 'зависло'
  ];
  
  // Check for feedback/issue intent
  if (feedbackPatterns.some(pattern => lower.includes(pattern))) {
    return { type: 'feedback', description: message };
  }
  
  // Help patterns
  if (lower.includes('помощь') || lower.includes('help') || lower.includes('?') || lower.includes('как') || lower.includes('что делать')) {
    return { type: 'help', description: message };
  }
  
  // Chat/Conversation patterns - any question or statement that's not a command
  if (lower.length > 0) {
    // Treat any remaining input as a conversation/chat
    return { type: 'chat', description: message };
  }
  
  return { type: 'unknown' };
}

async function handleCreateApp(intent, agent) {
  const project = await agent.createProject('GeneratedApp', intent.description, 'android');
  return {
    type: 'project_created',
    content: `Создан новый Android проект: ${project.name}`,
    projectId: project.id,
    actions: ['build', 'download', 'publish']
  };
}

async function handleCreateWebsite(intent, agent) {
  const project = await agent.createProject('GeneratedWebsite', intent.description, 'web');
  return {
    type: 'project_created',
    content: `Создан новый веб-проект: ${project.name}`,
    projectId: project.id,
    actions: ['download', 'deploy']
  };
}

// Store chat history for each WebSocket connection
const chatHistories = new Map();

// Store chat history by session ID for persistence across reconnections
const persistentHistories = new Map();

// Helper to get or create chat history for a connection
function getChatHistory(ws, sessionId = null) {
  // If we have a sessionId, use persistent storage
  if (sessionId && persistentHistories.has(sessionId)) {
    return persistentHistories.get(sessionId);
  }
  
  // Fallback to connection-based storage
  if (!chatHistories.has(ws)) {
    chatHistories.set(ws, []);
  }
  return chatHistories.get(ws);
}

// Helper to add message to history
function addToHistory(ws, role, content, sessionId = null) {
  const history = sessionId ? (persistentHistories.get(sessionId) || []) : getChatHistory(ws);
  
  history.push({ role, content, timestamp: new Date().toISOString() });
  
  // Keep only last 20 messages to prevent memory issues
  if (history.length > 20) {
    history.shift();
  }
  
  // Update persistent storage if we have sessionId
  if (sessionId) {
    persistentHistories.set(sessionId, history);
  }
}

// Helper to get or create session ID
function getOrCreateSessionId(ws, providedId = null) {
  if (providedId && persistentHistories.has(providedId)) {
    return providedId;
  }
  
  // Check if ws already has a session
  if (ws.sessionId && persistentHistories.has(ws.sessionId)) {
    return ws.sessionId;
  }
  
  // Generate new session ID
  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  ws.sessionId = newSessionId;
  persistentHistories.set(newSessionId, []);
  return newSessionId;
}

async function handleChat(intent, agent, history = []) {
  // Use AI to generate a conversational response with history context
  const response = await agent.generateResponse(intent.description, history);
  return {
    type: 'chat_response',
    content: response || 'Я вас понял! Чем ещё могу помочь?'
  };
}

async function handleFeedback(intent, agent, history = []) {
  // Log the feedback for analysis
  console.log('User feedback/issue:', intent.description);
  
  // Generate a helpful response with context
  const response = await agent.generateResponse(`Пользователь сообщает о проблеме: ${intent.description}. Предложи решение.`, history);
  
  return {
    type: 'feedback_received',
    content: response || 'Спасибо за сообщение! Я записал эту проблему и постараюсь её решить. Попробуйте перезагрузить страницу или создать новый проект.'
  };
}

function handleHelp(agent) {
  return {
    type: 'help',
    content: `Я Claude Dev Agent — ваш AI-помощник в разработке!

**Что я умею:**
🌐 **Создавать веб-сайты** — напишите "создай сайт про..."
📱 **Создавать Android приложения** — напишите "создай приложение..."
📊 **Показывать проекты** — напишите "статус" или "проекты"
🔧 **Помогать с проблемами** — просто опишите что не работает

**Примеры команд:**
- "создай сайт курс по математике"
- "сделай приложение для заметок"
- "не работает кнопка" (опишите проблему)
- "что ты умеешь?"

Что хотите создать?`,
    actions: ['create_website', 'create_app']
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

// Deploy endpoint for websites
app.post('/api/deploy/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { subdomain } = req.body;
    
    const deployment = await agent.deployWebsite(projectId, subdomain);
    
    res.json({
      success: true,
      url: deployment.url,
      subdomain: deployment.subdomain,
      deployedAt: deployment.deployedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth endpoints (like base44)
app.post('/api/auth/login', async (req, res) => {
  // Simple token-based auth
  const { email, password } = req.body;
  // TODO: Implement proper auth
  res.json({ token: 'demo-token', user: { email } });
});

app.get('/api/auth/me', (req, res) => {
  // Return current user
  res.json({ user: null }); // No auth yet
});

// Settings endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    features: {
      aiGeneration: true,
      deploy: true,
      auth: false, // Coming soon
      mediaUpload: true // Enable media upload
    }
  });
});

// Media upload endpoint
app.post('/api/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => {
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');
      const url = `/uploads/${file.filename}`;
      
      return {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: url,
        type: isImage ? 'image' : isVideo ? 'video' : 'file'
      };
    });

    // Move files to permanent uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.ensureDirSync(uploadsDir);
    
    for (const file of req.files) {
      const tempPath = file.path;
      const targetPath = path.join(uploadsDir, file.filename);
      fs.moveSync(tempPath, targetPath);
    }

    res.json({ 
      success: true, 
      files: files,
      message: `Uploaded ${files.length} files`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join('public', 'uploads')));

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Initialize session - will be set when client sends first message with sessionId
  ws.sessionId = null;
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    // Handle session init
    if (msg.type === 'init_session') {
      ws.sessionId = getOrCreateSessionId(ws, msg.sessionId);
      console.log('Session initialized:', ws.sessionId);
      
      // Send session ID back to client
      ws.send(JSON.stringify({
        type: 'session_init',
        sessionId: ws.sessionId,
        history: persistentHistories.get(ws.sessionId) || []
      }));
      return;
    }
    
    // Ensure we have a session ID for regular messages
    if (!ws.sessionId) {
      ws.sessionId = getOrCreateSessionId(ws);
    }
    
    // Handle media messages
    if (msg.type === 'media') {
      console.log('Received media files:', msg.files);
      
      // Add media to history
      const mediaContent = msg.files.map(f => `[${f.type}: ${f.filename}]`).join(', ');
      addToHistory(ws, 'user', `Отправил файлы: ${mediaContent}`, ws.sessionId);
      
      // Broadcast media to client for display
      ws.send(JSON.stringify({
        type: 'media_received',
        files: msg.files,
        content: `Получены файлы: ${msg.files.map(f => f.filename).join(', ')}`
      }));
      return;
    }
    
    if (msg.type === 'chat') {
      const intent = parseIntent(msg.content);
      
      // Add user message to history (persistently)
      addToHistory(ws, 'user', msg.content, ws.sessionId);
      
      ws.send(JSON.stringify({
        type: 'thinking',
        content: 'Обрабатываю запрос...'
      }));
      
      try {
        // Get current chat history (from persistent storage)
        const history = getChatHistory(ws, ws.sessionId);
        
        console.log('Using session:', ws.sessionId);
        console.log('History length:', history.length);
        
        // Broadcast progress updates
        switch (intent.type) {
          case 'create_app':
            ws.send(JSON.stringify({ type: 'progress', step: 'generating', content: 'Генерирую код приложения...' }));
            const appProject = await agent.createProject('App', msg.content, 'android');
        ws.send(JSON.stringify({ 
          type: 'project_created', 
          content: '✅ Android проект создан',
          project: appProject,
          previewUrl: `/preview/${appProject.id}`
        }));
        break;
            
          case 'create_website':
            ws.send(JSON.stringify({ type: 'progress', step: 'generating', content: 'Генерирую веб-сайт...' }));
            try {
              // Add 2 minute timeout for project creation
              const createPromise = agent.createProject('Website', msg.content, 'web');
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Создание сайта заняло слишком много времени')), 120000)
              );
              const webProject = await Promise.race([createPromise, timeoutPromise]);
              
              ws.send(JSON.stringify({ 
                type: 'project_created', 
                content: '✅ Веб-сайт создан',
                project: webProject,
                previewUrl: `/preview/${webProject.id}`
              }));
            } catch (createError) {
              console.error('Website creation error:', createError);
              ws.send(JSON.stringify({ 
                type: 'error', 
                content: `Ошибка при создании сайта: ${createError.message}. Попробуйте ещё раз или проверьте настройки API.` 
              }));
            }
            break;
            
          case 'modify_website':
          case 'modify_app':
          case 'modify_project':
            ws.send(JSON.stringify({ type: 'progress', step: 'modifying', content: 'Дорабатываю проект...' }));
            try {
              const projects = agent.listProjects();
              if (projects.length === 0) {
                ws.send(JSON.stringify({
                  type: 'error',
                  content: 'Нет проектов для доработки. Сначала создайте проект.'
                }));
              } else {
                const project = projects[projects.length - 1];
                await agent.modifyProject(project.id, msg.content);
                ws.send(JSON.stringify({
                  type: 'project_modified',
                  content: `✅ Проект "${project.name}" доработан`,
                  projectId: project.id,
                  previewUrl: `/preview/${project.id}`
                }));
              }
            } catch (modifyError) {
              console.error('Modify project error:', modifyError);
              ws.send(JSON.stringify({
                type: 'error',
                content: `Ошибка при доработке: ${modifyError.message}`
              }));
            }
            break;
            
          case 'chat':
            try {
              console.log('Processing chat intent:', intent.description);
              console.log('History length:', history.length);
              const chatResponse = await handleChat(intent, agent, history);
              console.log('Chat response:', chatResponse);
              
              // Add bot response to history (persistently)
              addToHistory(ws, 'assistant', chatResponse.content, ws.sessionId);
              
              ws.send(JSON.stringify({ 
                type: 'chat', 
                content: chatResponse.content 
              }));
            } catch (chatError) {
              console.error('Chat handler error:', chatError);
              ws.send(JSON.stringify({ 
                type: 'chat', 
                content: 'Извините, произошла ошибка. Попробуйте ещё раз или напишите "помощь".' 
              }));
            }
            break;
            
          case 'feedback':
            try {
              console.log('Processing feedback intent:', intent.description);
              console.log('History length:', history.length);
              const feedbackResponse = await handleFeedback(intent, agent, history);
              
              // Add bot response to history (persistently)
              addToHistory(ws, 'assistant', feedbackResponse.content, ws.sessionId);
              
              ws.send(JSON.stringify({ 
                type: 'chat', 
                content: feedbackResponse.content 
              }));
            } catch (feedbackError) {
              console.error('Feedback handler error:', feedbackError);
              ws.send(JSON.stringify({ 
                type: 'chat', 
                content: 'Спасибо за сообщение! Я записал эту проблему.' 
              }));
            }
            break;
            
          case 'deploy':
            ws.send(JSON.stringify({ type: 'progress', step: 'deploying', content: 'Публикуем сайт...' }));
            try {
              const projects = agent.listProjects();
              const webProject = projects.find(p => p.type === 'web') || projects[projects.length - 1];
              if (webProject && webProject.type === 'web') {
                const deployment = await agent.deployWebsite(webProject.id);
                ws.send(JSON.stringify({
                  type: 'deployed',
                  content: `✅ Сайт опубликован: ${deployment.url}`,
                  url: deployment.url,
                  projectId: webProject.id
                }));
              } else {
                ws.send(JSON.stringify({ type: 'error', content: 'Нет веб-проекта для публикации' }));
              }
            } catch (deployError) {
              ws.send(JSON.stringify({ type: 'error', content: `Ошибка публикации: ${deployError.message}` }));
            }
            break;
            
          case 'help':
            const helpResponse = handleHelp(agent);
            ws.send(JSON.stringify({ 
              type: 'chat', 
              content: helpResponse.content 
            }));
            break;
            
          default:
            // Treat anything else as a chat message
            const defaultResponse = await handleChat(intent, agent, history);
            
            // Add bot response to history (persistently)
            addToHistory(ws, 'assistant', defaultResponse.content, ws.sessionId);
            
            ws.send(JSON.stringify({ 
              type: 'chat', 
              content: defaultResponse.content 
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
    console.log('Client disconnected, session preserved:', ws.sessionId);
    // Note: We intentionally do NOT delete the persistent history
    // so it can be restored when the client reconnects with the same sessionId
    chatHistories.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AI Agent server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});

export { app, agent, publisher };
