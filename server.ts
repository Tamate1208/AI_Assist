import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const expectedPassword = process.env.APP_PASSWORD;
    if (!expectedPassword) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const clientPassword = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (req.headers['x-app-password'] as string);

    if (clientPassword === expectedPassword) {
      return next();
    }

    return res.status(401).json({ error: "認証されていません。" });
  };

  // API Route: Authentication
  app.post("/api/auth", (req, res) => {
    const { password } = req.body;
    const expectedPassword = process.env.APP_PASSWORD;

    if (!expectedPassword || password === expectedPassword) {
      return res.json({ status: "ok" });
    }
    return res.status(401).json({ error: "パスワードが正しくありません。" });
  });

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY
    });
  });

  // API Route: Gemini Proxy
  app.post("/api/chat", authMiddleware, async (req, res) => {
    const { prompt, files, history, model, systemInstruction: clientSystemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Prepare content for Gemini
      const fileParts = (files || []).map((file: any) => ({
        inlineData: {
          data: file.data.split(',')[1],
          mimeType: file.type
        }
      }));

      const defaultSystemInstruction = `
        あなたは「AIアシスタント」として、高度な専門知識を持つアシスタントの役割を担います。
        特に、土木建築技術に対して深い造詣をもち、専門的な視点からアドバイスや解説を行うことができます。
        
        以下のガイドラインを厳守して回答の精度を高めてください：
        
        1. 根拠の明示: 提供された資料の内容に基づき、可能な限り「どの資料のどの部分」を参照したか明記してください。
        2. 専門性: 土木建築、コード生成、資料要約など、各分野において正確かつ高度な情報を提供してください。
        3. 思考プロセス: 回答の前に内部で論理的なステップを組み立て、正確性を期してください。
        4. 情報の境界: 資料に記載がない場合は、自身の知識を使用しつつ「資料外の情報であること」を明記してください。
        5. 構成: 専門用語は分かりやすく解説し、Markdown形式（表、箇条書き、太字など）を積極的に活用して構造的で読みやすい回答を作成してください。
        6. 言語: 常に丁寧な日本語で回答してください。そして、より人間らしい回答に努めてください。
      `;

      const systemInstruction = clientSystemInstruction || defaultSystemInstruction;

      const relevantHistory = (history || []).slice(-6).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const targetModel = model || "gemini-2.5-flash";

      const result = await ai.models.generateContentStream({
        model: targetModel,
        contents: [
          ...relevantHistory,
          {
            role: 'user',
            parts: [
              ...fileParts,
              { text: prompt }
            ]
          }
        ],
        config: {
          systemInstruction,
          temperature: 1,
          topP: 0.95,
        }
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          res.write(text);
        }
      }
      res.end();
    } catch (error: any) {
      console.error("Server-side Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
