
import { GoogleGenAI } from "@google/genai";
import { FileItem, ChatMessage } from "../types";

export async function* askGeminiStream(
  prompt: string,
  files: FileItem[],
  history: ChatMessage[]
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  // Prepare file parts for Gemini
  const fileParts = files.map(file => ({
    inlineData: {
      data: file.data.split(',')[1],
      mimeType: file.type
    }
  }));

  const systemInstruction = `
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

  const relevantHistory = history.slice(-6).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  try {
    const result = await ai.models.generateContentStream({
      model: "gemini-1.5-flash-latest", // Use a widely available stable model for better reliability
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

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    console.error("Chat Error:", error);
    
    let errorMessage = "AIとの通信中にエラーが発生しました。";
    if (error.message && error.message.includes("exceeds the supported page limit of 1000")) {
      errorMessage = "資料のページ数が上限（1000ページ）を超えています。資料を分割してアップロードするか、重要な箇所のみを抽出したファイルを使用してください。";
    } else if (error.message && error.message.includes("429")) {
      errorMessage = "リクエストが多すぎます。少し時間を置いてから再度お試しください。";
    } else if (error.message && (error.message.includes("not found") || error.message.includes("404"))) {
      errorMessage = "指定されたモデルが見つかりません。API設定を確認してください。";
    } else if (error.message && error.message.includes("API key")) {
      errorMessage = "APIキーが無効、または設定されていません。環境変数をご確認ください。";
    }
    
    throw new Error(errorMessage);
  }
}
