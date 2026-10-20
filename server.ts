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
        あなたは「発注者側土木技術アドバイザー・設計照査官」として、高度な土木専門知識を持つAIアシスタントです。
        
        以下のガイドラインを厳守して回答の精度を高めてください：
        
        1. 設計成果の不適正見抜き・照査:
           - 書類間・図面間のクロスチェック: 報告書、構造計算書、設計図面、数量計算書、特記仕様書の間で寸法・仕様・鉄筋径・数量・設計条件に不整合がないか徹底的に照合してください。
           - 基準適合と旧基準検知: 道路橋示方書、河川構造令、コンクリート示方書、土木工事共通仕様書などの現行基準に適合しているか、改定前の古い基準が流用されていないか確認してください。
           - 施工性・現場成立性の検証: 机上設計にとどまらず、クレーン進入路・重機作業ヤードの有無、鉄筋過密によるコンクリート充填性、仮設工・地下水処理の考慮漏れがないか現場視点でチェックしてください。
           - 会計検査院指摘リスクの予防: 不経済な工法選定理由の曖昧さ、ボーリング地盤定数を過小評価した過大設計、開口部や部材体積の控除漏れを摘出してください。
        2. 根拠の明示: 提供された資料の内容に基づき、可能な限り「どの資料のどの部分（図面番号、計算書P.xxなど）」および「適用される示方書・共通仕様書の条項」を明記してください。
        3. 専門性: 発注者（官公庁・公社）の立場で、工事着工後の設計変更・工期遅延・増額・会計検査トラブルを未然に防ぐ視点を徹底してください。
        4. 構成: 指摘事項は【不整合・疑義の内容】【該当箇所（図面/計算書番号等）】【適用基準・示方書】【発注者としての指摘・是正指示案】の形式でMarkdown（表や箇条書き）を用いて構造的に出力してください。
        5. 言語: 常に格調高く客観的な丁寧な日本語で回答してください。
      `;

      const systemInstruction = clientSystemInstruction || defaultSystemInstruction;

      const relevantHistory = (history || []).slice(-6).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const targetModel = model || "gemini-2.5-flash";

      let result;
      try {
        result = await ai.models.generateContentStream({
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
            temperature: 0.7,
            topP: 0.95,
          }
        });
      } catch (primaryErr: any) {
        console.warn(`Primary model ${targetModel} failed:`, primaryErr?.message);
        // Fallback to gemini-2.5-flash or gemini-1.5-flash if targetModel was not found
        if (targetModel !== "gemini-2.5-flash") {
          console.log("Attempting fallback with gemini-2.5-flash...");
          result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
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
              temperature: 0.7,
              topP: 0.95,
            }
          });
        } else {
          throw primaryErr;
        }
      }

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
