/**
 * Mock Gemini Service for Development
 * Provides fallback responses when actual API keys are not available
 */

export class MockGeminiClient {
  constructor(apiKey?: string) {
    console.log('Using Mock Gemini Client for development');
  }

  getGenerativeModel(config: { model: string }) {
    return new MockGenerativeModel();
  }
}

class MockGenerativeModel {
  async generateContent(prompt: string) {
    console.log('Mock Gemini generating content for prompt length:', prompt.length);
    
    return {
      response: {
        text: () => JSON.stringify({
          outline: {
            mainTopic: "モックコンテンツ",
            subTopics: ["サブトピック1", "サブトピック2", "サブトピック3"],
            structure: ["導入", "本文1", "本文2", "まとめ", "CTA"]
          },
          keywords: [
            {
              primary: "メインキーワード",
              related: ["関連キーワード1", "関連キーワード2"],
              searchVolume: 1000,
              difficulty: 60
            }
          ],
          faq: [
            {
              question: "よくある質問1",
              answer: "回答1"
            }
          ],
          contentAngles: [
            {
              title: "コンテンツ角度1",
              hook: "読者を引きつけるフック",
              keyPoints: ["要点1", "要点2", "要点3"],
              cta: "行動喚起"
            }
          ]
        })
      }
    };
  }
}

// Create a wrapper function that returns the appropriate client
export function createGeminiClient(apiKey?: string) {
  if (apiKey && apiKey !== 'test_key_for_development') {
    try {
      const { GoogleGenAI } = require('@google/genai');
      return new GoogleGenAI({ apiKey });
    } catch (error) {
      console.warn('Failed to create real Gemini client, using mock:', error);
      return new MockGeminiClient(apiKey);
    }
  }
  return new MockGeminiClient(apiKey);
}

export default MockGeminiClient;