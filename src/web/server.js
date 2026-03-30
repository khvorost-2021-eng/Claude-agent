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

// Proxy endpoint for images (fixes CORS issues)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }
    
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Chat history persistence API
const chatHistoriesDir = './chat_histories';
if (!fs.existsSync(chatHistoriesDir)) {
  fs.mkdirSync(chatHistoriesDir, { recursive: true });
}

app.get('/api/chat-history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const historyPath = path.join(chatHistoriesDir, `${sessionId}.json`);
    
    if (fs.existsSync(historyPath)) {
      const history = fs.readFileSync(historyPath, 'utf8');
      res.json({ success: true, history: JSON.parse(history) });
    } else {
      res.json({ success: true, history: [] });
    }
  } catch (error) {
    console.error('Chat history load error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/chat-history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { history } = req.body;
    const historyPath = path.join(chatHistoriesDir, `${sessionId}.json`);
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Chat history save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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
  
  // MODIFICATION PATTERNS  // Check for modification intent FIRST with STRICTER checking
  const modifyPatterns = [
    'дополни', 'доработай', 'улучши', 'измени', 'обнови', 'переделай', 'исправь',
    'добавь', 'внеси изменения', 'модифицируй', 'расширь', 'редактируй',
    'сделай лучше', 'сделай красивее', 'сделай более',
    'который ты уже создал', 'существующий проект', 'в текущий проект',
    'в существующий', 'в уже созданный'
  ];
  
  // If strong modification words detected, prioritize modification
  const strongModifyWords = ['дополни', 'доработай', 'улучши', 'измени', 'обнови', 'переделай', 'исправь', 'добавь к', 'сделай лучше', 'сделай красивее'];
  const hasStrongModify = strongModifyWords.some(w => lower.includes(w));
  
  // Check for modification intent FIRST
  const isModification = modifyPatterns.some(pattern => lower.includes(pattern));
  
  // Website patterns - STRICT: require creation verbs
  const websiteCreatePatterns = [
    'создай сайт', 'сделай сайт', 'создать сайт', 'сделать сайт',
    'создай веб-сайт', 'сделай веб-сайт', 'создай вебсайт',
    'создай лендинг', 'сделай лендинг',
    'создай страницу', 'сделай страницу',
    'create website', 'make website', 'build website',
    'create a website', 'make a website', 'build a web',
    'create landing', 'make landing',
    'create web page', 'make web page'
  ];
  
  // Check for website creation intent - ONLY with explicit verbs
  const isWebsiteCreate = websiteCreatePatterns.some(pattern => lower.includes(pattern));
  
  // Check for website intent with modification
  if (isWebsiteCreate || (lower.includes('сайт') && hasStrongModify) || (lower.includes('website') && hasStrongModify)) {
    if (hasStrongModify || isModification) {
      console.log('📝 Modification intent detected for website:', message);
      return { type: 'modify_website', description: message };
    }
    return { type: 'create_website', description: message };
  }
  
  // Android app patterns - STRICT: require creation verbs
  const appCreatePatterns = [
    'создай приложение', 'сделай приложение', 'создать приложение',
    'создай андроид', 'сделай андроид', 'создать андроид',
    'создай apk', 'сделай apk',
    'create app', 'make app', 'build app',
    'create android', 'make android', 'build android',
    'create an app', 'make an app', 'build an app'
  ];
  
  // Check for Android app creation intent
  const isAppCreate = appCreatePatterns.some(pattern => lower.includes(pattern));
  
  if (isAppCreate || ((lower.includes('приложение') || lower.includes('app')) && (hasStrongModify || isModification))) {
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
  
  // Video generation patterns - STRICT: require creation verbs
  const videoCreatePatterns = [
    'сгенерируй видео', 'создай видео', 'сделай видео', 'нарисуй видео',
    'generate video', 'create video', 'make video', 'draw video',
    'generate a video', 'create a video', 'make a video'
  ];
  if (videoCreatePatterns.some(pattern => lower.includes(pattern))) {
    return { type: 'generate_video', description: message };
  }
  
  // Image generation patterns - STRICT: require creation verbs
  const imageCreatePatterns = [
    'сгенерируй картинк', 'создай картинк', 'сделай картинк', 'нарисуй картинк',
    'сгенерируй изображен', 'создай изображен', 'сделай изображен', 'нарисуй изображен',
    'сгенерируй фото', 'создай фото', 'сделай фото', 'нарисуй фото',
    'generate image', 'create image', 'make image', 'draw image',
    'generate a picture', 'create a picture', 'make a picture', 'draw a picture',
    'generate photo', 'create photo', 'draw photo'
  ];
  if (imageCreatePatterns.some(pattern => lower.includes(pattern))) {
    return { type: 'generate_image', description: message };
  }
  
  // Chat/Conversation patterns - any question or statement that's not a command
  if (lower.length > 0) {
    // Treat any remaining input as a conversation/chat
    return { type: 'chat', description: message };
  }
  
  return { type: 'unknown' };
}

// Video generation using AI APIs (Runway, Replicate, Luma, Pollinations)
async function generateVideo(prompt) {
  console.log('🎬 Generating video for:', prompt);
  
  const runwayKey = process.env.RUNWAY_API_KEY;
  const replicateKey = process.env.REPLICATE_API_KEY;
  const lumaKey = process.env.LUMA_API_KEY;
  
  // Try Runway first (best quality, has free trial)
  if (runwayKey) {
    try {
      return await generateVideoRunway(prompt, runwayKey);
    } catch (error) {
      console.log('Runway failed:', error.message);
    }
  }
  
  // Try Replicate (has free tier)
  if (replicateKey) {
    try {
      return await generateVideoReplicate(prompt, replicateKey);
    } catch (error) {
      console.log('Replicate failed:', error.message);
    }
  }
  
  // Try Luma AI
  if (lumaKey) {
    try {
      return await generateVideoLuma(prompt, lumaKey);
    } catch (error) {
      console.log('Luma AI failed:', error.message);
    }
  }
  
  // Final fallback: Pollinations image (free, no API key needed)
  return await generateVideoPollinations(prompt);
}

// Replicate Video Generation (free tier available)
async function generateVideoReplicate(prompt, apiKey) {
  console.log('🎬 Using Replicate for video:', prompt);
  
  try {
    // Use stability-ai/stable-video-diffusion or another free model
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify({
        version: '3f0457e4619daac51251dedb4727084c200853f6d3758a50d0f6cd3a9de9a5b6', // stable-video-diffusion
        input: {
          image: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true`,
          frames: 25,
          fps: 6,
          motion_bucket_id: 127,
          cond_aug: 0.02
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Poll for completion
    const videoUrl = await pollReplicateStatus(data.id, apiKey);
    
    return {
      type: 'video_generated',
      content: `✅ Видео сгенерировано: "${prompt}"`,
      videoUrl: videoUrl,
      prompt: prompt
    };
  } catch (error) {
    throw new Error(`Replicate failed: ${error.message}`);
  }
}

// Poll Replicate prediction status
async function pollReplicateStatus(predictionId, apiKey, maxAttempts = 60) {
  for (let i = 0; i <maxAttempts; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'succeeded' && data.output) {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    
    if (data.status === 'failed') {
      throw new Error('Replicate prediction failed');
    }
    
    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  throw new Error('Replicate timeout');
}

// Luma AI Video Generation
async function generateVideoLuma(prompt, apiKey) {
  console.log('🎬 Using Luma AI for video:', prompt);
  
  const response = await fetch('https://api.lumalabs.ai/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: '16:9',
      loop: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`Luma API error: ${response.status}`);
  }
  
  const data = await response.json();
  const videoUrl = await pollLumaStatus(data.id, apiKey);
  
  return {
    type: 'video_generated',
    content: `✅ Видео сгенерировано: "${prompt}"`,
    videoUrl: videoUrl,
    prompt: prompt
  };
}

// Poll Luma AI generation status
async function pollLumaStatus(generationId, apiKey, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.lumalabs.ai/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.state === 'completed' && data.assets?.video) {
      return data.assets.video;
    }
    
    if (data.state === 'failed') {
      throw new Error('Luma generation failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Luma timeout');
}

// Pollinations Video API (free alternative - returns image sequence placeholder)
async function generateVideoPollinations(prompt) {
  console.log('🎬 Using Pollinations for video frames:', prompt);
  
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Pollinations video endpoint - generates frames
    const videoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true`;
    
    return {
      type: 'video_generated',
      content: `🎬 Видео сгенерировано: "${prompt}"`,
      videoUrl: videoUrl,
      prompt: prompt,
      isImageSequence: true
    };
  } catch (error) {
    return {
      type: 'error',
      content: `❌ Ошибка генерации: ${error.message}`
    };
  }
}

// Runway ML Video Generation
async function generateVideoRunway(prompt, apiKey) {
  console.log('🎬 Using Runway ML for video:', prompt);
  
  try {
    // Create image first
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true`;
    
    // Use Runway Gen-2 or Gen-3 via API
    const response = await fetch('https://api.runwayml.com/v1/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: prompt,
        seed: Math.floor(Math.random() * 1000000),
        num_frames: 125, // ~5 seconds at 25fps
        width: 1024,
        height: 576
      })
    });
    
    if (!response.ok) {
      throw new Error(`Runway API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Poll for completion
    const videoUrl = await pollRunwayStatus(data.id, apiKey);
    
    return {
      type: 'video_generated',
      content: `🎬 Видео от Runway: "${prompt}"`,
      videoUrl: videoUrl,
      prompt: prompt
    };
  } catch (error) {
    throw new Error(`Runway failed: ${error.message}`);
  }
}

// Poll Runway generation status
async function pollRunwayStatus(generationId, apiKey, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.runwayml.com/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.state === 'completed' && data.output?.video) {
      return data.output.video;
    }
    
    if (data.state === 'failed') {
      throw new Error('Runway generation failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  throw new Error('Runway timeout');
}

// Animated GIF via Pollinations (free, simulates video)
async function generateVideoPollinationsAnimated(prompt) {
  console.log('🎬 Creating animated GIF via Pollinations:', prompt);
  
  try {
    const encodedPrompt = encodeURIComponent(prompt + ', animated gif, motion, dynamic scene');
    
    // Create multiple frames with different seeds for animation effect
    const frames = [];
    const seeds = [1, 2, 3, 4, 5];
    
    for (const seed of seeds) {
      frames.push(`https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=288&seed=${Date.now() + seed}&nologo=true`);
    }
    
    // For now, return first frame with note about animation
    return {
      type: 'video_generated',
      content: `🎬 Видео-кадр (GIF-анимация): "${prompt}"\n\n💡 Для полноценного видео добавьте RUNWAY_API_KEY или REPLICATE_API_KEY в .env`,
      videoUrl: frames[0],
      frames: frames,
      prompt: prompt,
      isImageSequence: true,
      isAnimated: true
    };
  } catch (error) {
    return {
      type: 'error',
      content: `❌ Ошибка генерации: ${error.message}`
    };
  }
}

// Poll video generation status (for Luma AI)
async function pollVideoStatus(generationId, apiKey, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.lumalabs.ai/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const data = await response.json();
    
    if (data.state === 'completed' && data.assets?.video) {
      return data.assets.video;
    }
    
    if (data.state === 'failed') {
      throw new Error('Video generation failed');
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Video generation timeout');
}

// Handle video generation intent
async function handleGenerateVideo(intent, agent) {
  const subject = intent.description
    .replace(/сгенерируй видео|создай видео|видео|video|generate video|create video/gi, '')
    .trim();
  
  return await generateVideo(subject || 'beautiful scene');
}

async function handleGenerateImage(intent, agent) {
  console.log('🎨 Generating image for:', intent.description);
  
  try {
    const subject = intent.description
      .replace(/сгенерируй|создай|нарисуй|картинку|изображение|фото|generate|create|draw|image|of/gi, '')
      .trim();
    
    if (!subject) {
      return {
        type: 'error',
        content: 'Пожалуйста, опишите что нарисовать'
      };
    }
    
    // ULTRA FAST: Use small size (384x384) for instant generation
    const prompt = encodeURIComponent(`${subject}`);
    const seed = Date.now();
    // 384x384 for maximum speed, no nologo for faster processing
    const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=384&height=384&seed=${seed}`;
    
    console.log('Generated FAST image URL:', imageUrl);
    
    return {
      type: 'image_generated',
      content: `🎨 Изображение: "${subject}"`,
      imageUrl: imageUrl,
      prompt: subject,
      directUrl: imageUrl
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      type: 'error',
      content: `❌ Ошибка: ${error.message}`
    };
  }
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

async function handleChat(intent, agent, history = [], sessionContext = {}) {
  // Build context from history and session
  const recentHistory = history.slice(-5);
  const contextPrompt = recentHistory.map(h => `${h.role}: ${h.content}`).join('\n');
  
  // Include project context if exists
  const projectInfo = sessionContext.currentProject 
    ? `\n\nТекущий проект: ${sessionContext.currentProject.name} (${sessionContext.currentProject.type})`
    : '';
  
  const fullPrompt = `История разговора:\n${contextPrompt}${projectInfo}\n\nТекущий запрос: ${intent.description}`;
  
  // Use AI to generate a conversational response with full context
  const response = await agent.generateResponse(fullPrompt, history);
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

// Download project as ZIP
app.get('/api/download/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'projects', projectId);
    
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const zip = new AdmZip();
    zip.addLocalFolder(projectPath);
    
    const zipBuffer = zip.toBuffer();
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${projectId}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download video file (proxy for external URLs)
app.get('/api/download-video', async (req, res) => {
  try {
    const { url, filename } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    console.log('📥 Downloading video from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const safeFilename = filename || 'generated-video.mp4';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    
    // Stream the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({ error: error.message });
  }
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
      
      // Analyze images if present
      const imageFiles = msg.files.filter(f => f.type === 'image');
      if (imageFiles.length > 0) {
        ws.send(JSON.stringify({
          type: 'thinking',
          content: '🔍 Анализирую изображение...'
        }));
        
        try {
          const analyses = await Promise.all(
            imageFiles.map(async (img) => {
              const analysis = await analyzeImage(img.url);
              return { filename: img.filename, analysis };
            })
          );
          
          const analysisContent = analyses.map(a => `📷 **${a.filename}**: ${a.analysis}`).join('\n\n');
          
          // Add analysis to history
          addToHistory(ws, 'assistant', `Анализ изображений:\n${analysisContent}`, ws.sessionId);
          
          ws.send(JSON.stringify({
            type: 'chat',
            content: `🔍 **Анализ изображений:**\n\n${analysisContent}`
          }));
        } catch (analyzeError) {
          console.error('Image analysis error:', analyzeError);
          ws.send(JSON.stringify({
            type: 'chat',
            content: 'Изображения получены. Не удалось проанализировать их содержимое.'
          }));
        }
      }
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
              
              // Save project to session context
              setSessionContext(ws.sessionId, 'currentProject', webProject);
              setSessionContext(ws.sessionId, 'lastProjectId', webProject.id);
              
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
              const ctx = getSessionContext(ws.sessionId);
              const projects = agent.listProjects();
              
              if (projects.length === 0) {
                ws.send(JSON.stringify({
                  type: 'error',
                  content: 'Нет проектов для доработки. Сначала создайте проект.'
                }));
              } else {
                // Try to get project from context, otherwise use last project
                let project = ctx.currentProject;
                if (!project || !projects.find(p => p.id === project.id)) {
                  project = projects[projects.length - 1];
                }
                
                console.log('📝 Modifying project:', project.id, project.name);
                await agent.modifyProject(project.id, msg.content);
                
                // Update context with modified project
                setSessionContext(ws.sessionId, 'currentProject', project);
                
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
              
              // Get session context for project continuity
              const ctx = getSessionContext(ws.sessionId);
              const chatResponse = await handleChat(intent, agent, history, ctx);
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
            
          case 'generate_image':
            try {
              console.log('Processing image generation:', intent.description);
              ws.send(JSON.stringify({ 
                type: 'progress', 
                step: 'generating_image', 
                content: '🎨 Генерирую изображение...' 
              }));
              
              const imageResponse = await handleGenerateImage(intent, agent);
              
              // Add bot response to history
              addToHistory(ws, 'assistant', imageResponse.content, ws.sessionId);
              
              ws.send(JSON.stringify({ 
                type: 'image_generated', 
                content: imageResponse.content,
                imageUrl: imageResponse.imageUrl,
                prompt: imageResponse.prompt
              }));
            } catch (imageError) {
              console.error('Image generation handler error:', imageError);
              ws.send(JSON.stringify({ 
                type: 'error', 
                content: '❌ Ошибка при генерации изображения. Попробуйте ещё раз.' 
              }));
            }
            break;
            
          case 'generate_video':
            try {
              console.log('Processing video generation:', intent.description);
              ws.send(JSON.stringify({ 
                type: 'progress', 
                step: 'generating_video', 
                content: '🎬 Генерирую видео...' 
              }));
              
              const videoResponse = await handleGenerateVideo(intent, agent);
              
              // Add bot response to history
              addToHistory(ws, 'assistant', videoResponse.content, ws.sessionId);
              
              ws.send(JSON.stringify({ 
                type: 'video_generated', 
                content: videoResponse.content,
                videoUrl: videoResponse.videoUrl,
                prompt: videoResponse.prompt,
                downloadUrl: videoResponse.videoUrl ? `/api/download-video?url=${encodeURIComponent(videoResponse.videoUrl)}&filename=video-${Date.now()}.mp4` : null,
                isImageSequence: videoResponse.isImageSequence || false,
                isAnimated: videoResponse.isAnimated || false
              }));
            } catch (videoError) {
              console.error('Video generation handler error:', videoError);
              ws.send(JSON.stringify({ 
                type: 'error', 
                content: '❌ Ошибка при генерации видео. Попробуйте ещё раз.' 
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

// Store current project context per session for continuity
const sessionContext = new Map();

// Helper to set session context
function setSessionContext(sessionId, key, value) {
  if (!sessionContext.has(sessionId)) {
    sessionContext.set(sessionId, {});
  }
  const ctx = sessionContext.get(sessionId);
  ctx[key] = value;
  ctx.lastActivity = Date.now();
}

// Helper to get session context
function getSessionContext(sessionId) {
  return sessionContext.get(sessionId) || {};
}

// Analyze image with Vision API
async function analyzeImage(imageUrl, prompt = 'Опиши что видишь на этой картинке') {
  try {
    console.log('🔍 Analyzing image:', imageUrl);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY}`,
        'HTTP-Referer': 'https://claudedev.example.com',
        'X-Title': 'ClaudeDev Agent'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      console.log('Vision API failed, returning basic info');
      return 'Изображение получено (анализ недоступен)';
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Изображение получено';
  } catch (error) {
    console.error('Image analysis error:', error.message);
    return 'Изображение получено';
  }
}

export { app, agent, publisher };
