import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

interface NpcHintRequestBody {
  npcName?: string;
  npcRole?: string;
  worldName?: string;
  missionTitle?: string;
  missionPrompt?: string;
  playerQuestion?: string;
  hintLevel?: number;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: Boolean(getAiClient()) });
  });

  app.post('/api/npc-hint', async (req, res) => {
    const body = (req.body || {}) as NpcHintRequestBody;
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'El Guía IA en vivo no tiene clave GEMINI_API_KEY configurada en este entorno. Usa las pistas progresivas integradas.',
      });
      return;
    }

    const npcName = String(body.npcName || 'Guía Lógico').slice(0, 80);
    const npcRole = String(body.npcRole || 'Mentor del mundo').slice(0, 120);
    const worldName = String(body.worldName || 'Logic World').slice(0, 80);
    const missionTitle = String(body.missionTitle || 'Exploración libre').slice(0, 140);
    const missionPrompt = String(body.missionPrompt || '').slice(0, 600);
    const playerQuestion = String(
      body.playerQuestion || 'Dame una pista sin revelar la respuesta final.'
    ).slice(0, 400);
    const hintLevel = Number(body.hintLevel) || 1;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Pregunta del jugador: "${playerQuestion}"`,
        config: {
          systemInstruction: [
            `Eres ${npcName}, ${npcRole} en el videojuego educativo 3D LOGIC WORLD (mundo actual: ${worldName}).`,
            `Misión activa: "${missionTitle}". Enunciado: "${missionPrompt}".`,
            `Nivel de pista solicitado: ${hintLevel} de 3.`,
            'Responde siempre en español claro, amable, motivador y conciso (máximo 3 frases).',
            'Fomenta el pensamiento lógico, crítico o creativo. Nunca reveles directamente la respuesta exacta si el jugador está resolviendo un acertijo; guía su razonamiento paso a paso.',
          ].join(' '),
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'El modelo devolvió una respuesta vacía.' });
        return;
      }
      res.json({ reply });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el servicio de IA.';
      res.status(502).json({ error: `No se pudo conectar con el Guía IA: ${message}` });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LOGIC WORLD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start LOGIC WORLD server:', err);
  process.exit(1);
});
