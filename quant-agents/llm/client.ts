import { LLMProvider } from '../infra/agent-base';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'mock';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultOptions?: any;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

/**
 * Mock LLM Provider for development and testing
 */
export class MockLLMProvider implements LLMProvider {
  private readonly responses: Map<string, string> = new Map();
  
  constructor() {
    this.setupMockResponses();
  }

  async generateText(prompt: string, options?: any): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simple keyword-based response matching
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('strategy') && lowerPrompt.includes('momentum')) {
      return this.getMockStrategyResponse('momentum');
    } else if (lowerPrompt.includes('strategy') && lowerPrompt.includes('reversal')) {
      return this.getMockStrategyResponse('reversal');
    } else if (lowerPrompt.includes('strategy') && lowerPrompt.includes('regime')) {
      return this.getMockStrategyResponse('regime');
    } else if (lowerPrompt.includes('narrative') || lowerPrompt.includes('macro')) {
      return this.getMockNarrativeResponse();
    } else if (lowerPrompt.includes('risk') || lowerPrompt.includes('failure')) {
      return this.getMockRiskResponse();
    }
    
    // Default response
    return this.getDefaultResponse();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate mock embedding based on text hash
    const hash = this.hashString(text);
    const embedding = [];
    
    // Generate 512-dimensional embedding
    for (let i = 0; i < 512; i++) {
      const seed = (hash + i) * 0.001;
      embedding.push(Math.sin(seed) * 0.5 + Math.cos(seed * 1.7) * 0.3 + Math.sin(seed * 2.3) * 0.2);
    }
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private setupMockResponses(): void {
    this.responses.set('default', 'I understand the request and will provide appropriate analysis.');
  }

  private getMockStrategyResponse(type: string): string {
    const strategies = {
      momentum: {
        name: 'Momentum Continuation Strategy',
        mechanismExplanation: 'Exploits price momentum persistence due to behavioral biases and institutional flow patterns',
        entryLogic: 'Enter long positions when 20-day momentum exceeds 2 standard deviations above historical mean',
        exitLogic: 'Exit when momentum decays below 1 standard deviation or after maximum 30 trading days',
        riskControls: ['Maximum 5% position size per asset', 'Sector exposure limits of 20%', 'Stop loss at -2% individual position'],
        expectedFailureModes: ['Momentum reversal during regime shifts', 'Crowding in popular momentum factors', 'Transaction cost erosion during high turnover periods'],
        innovationDistanceEstimate: 0.3,
        confidence: 0.75,
        targetRegimes: ['risk_on', 'momentum_regime']
      },
      reversal: {
        name: 'Mean Reversion Strategy',
        mechanismExplanation: 'Capitalizes on short-term price dislocations that revert due to microstructure effects and noise trading',
        entryLogic: 'Enter contrarian positions when 5-day returns exceed -2 standard deviations (oversold) or +2 standard deviations (overbought)',
        exitLogic: 'Exit when price returns to 20-day moving average or after 10 trading days maximum',
        riskControls: ['Maximum 3% position size due to higher turnover', 'Minimum liquidity requirement of $5M daily volume', 'Regime filter to avoid trend-following periods'],
        expectedFailureModes: ['Trend continuation instead of reversion', 'Liquidity drying up during stress periods', 'Signal decay due to high-frequency competition'],
        innovationDistanceEstimate: 0.4,
        confidence: 0.65,
        targetRegimes: ['range_bound', 'high_liquidity']
      },
      regime: {
        name: 'Regime Transition Strategy',
        mechanismExplanation: 'Profits from positioning changes during regime transitions by identifying early regime shift signals',
        entryLogic: 'Enter positions aligned with new regime characteristics when regime probability exceeds 70%',
        exitLogic: 'Exit when regime stabilizes (probability > 90%) or false signal detected (probability drops below 40%)',
        riskControls: ['Dynamic position sizing based on regime confidence', 'Correlation limits during regime uncertainty', 'Volatility-adjusted position sizes'],
        expectedFailureModes: ['False regime signals leading to whipsaws', 'Late regime detection missing optimal entry', 'Regime duration shorter than expected'],
        innovationDistanceEstimate: 0.7,
        confidence: 0.8,
        targetRegimes: ['transition', 'uncertainty']
      }
    };
    
    return JSON.stringify(strategies[type as keyof typeof strategies] || strategies.momentum);
  }

  private getMockNarrativeResponse(): string {
    const narratives = [
      'Current macroeconomic environment shows signs of monetary policy divergence between major central banks, creating opportunities in cross-asset momentum strategies.',
      'Geopolitical tensions are increasing market correlation breakdowns, particularly in commodity-linked sectors, suggesting dispersion strategies may outperform.',
      'Technology sector earnings growth is slowing while valuations remain elevated, indicating potential for value-momentum hybrid approaches.',
      'Credit markets are showing early signs of stress with widening spreads in lower-grade corporate debt, suggesting defensive positioning may be prudent.'
    ];
    
    return narratives[Math.floor(Math.random() * narratives.length)];
  }

  private getMockRiskResponse(): string {
    const risks = [
      'Primary risks include factor crowding, regime shift sensitivity, and liquidity constraints during market stress.',
      'Key failure modes involve model overfitting, parameter instability, and correlation breakdown during tail events.',
      'Risk mitigation should focus on position sizing, diversification across time horizons, and regime-aware allocation.',
      'Stress testing should include scenarios of factor decay, market structure changes, and regulatory interventions.'
    ];
    
    return risks[Math.floor(Math.random() * risks.length)];
  }

  private getDefaultResponse(): string {
    return 'Analysis complete. Recommend further evaluation of market conditions and risk parameters before implementation.';
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * OpenAI LLM Provider
 */
export class OpenAIProvider implements LLMProvider {
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  async generateText(prompt: string, options?: any): Promise<string> {
    // In a real implementation, this would call the OpenAI API
    // For now, fallback to mock
    console.warn('OpenAI provider not fully implemented, using mock response');
    const mock = new MockLLMProvider();
    return mock.generateText(prompt, options);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call OpenAI embeddings API
    console.warn('OpenAI embeddings not fully implemented, using mock');
    const mock = new MockLLMProvider();
    return mock.generateEmbedding(text);
  }
}

/**
 * Google Gemini LLM Provider  
 */
export class GeminiProvider implements LLMProvider {
  private config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  async generateText(prompt: string, options?: any): Promise<string> {
    // In a real implementation, this would call the Gemini API
    console.warn('Gemini provider not fully implemented, using mock response');
    const mock = new MockLLMProvider();
    return mock.generateText(prompt, options);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call Gemini embeddings API
    console.warn('Gemini embeddings not fully implemented, using mock');
    const mock = new MockLLMProvider();
    return mock.generateEmbedding(text);
  }
}

/**
 * LLM Provider Factory
 */
export class LLMProviderFactory {
  static create(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'mock':
      default:
        return new MockLLMProvider();
    }
  }
}

/**
 * Specialized prompt templates for different agent types
 */
export class PromptTemplates {
  static getHypothesisGeneratorPrompt(context: string, anomaly: any): string {
    return `
System: You are the Hypothesis Generator in a quantitative trading system. Generate ONLY strategies whose mechanism is causally consistent with the stated anomaly and regime context.

Required Output Format (JSON):
{
  "name": "Strategy Name",
  "mechanismExplanation": "Clear causal explanation of why this works",
  "entryLogic": "Specific entry conditions",
  "exitLogic": "Specific exit conditions",
  "riskControls": ["Control 1", "Control 2"],
  "expectedFailureModes": ["Failure 1", "Failure 2"],
  "innovationDistanceEstimate": 0.XX,
  "confidence": 0.XX,
  "targetRegimes": ["regime1", "regime2"]
}

Context:
${context}

Anomaly: ${JSON.stringify(anomaly)}

Requirements:
1. Mechanism must be logically consistent with the anomaly
2. Innovation distance should reflect uniqueness (0-1 scale)
3. Include realistic failure modes
4. Confidence should reflect uncertainty in the hypothesis

Generate the strategy now:
    `.trim();
  }

  static getMacroNarrativePrompt(marketData: any, newsContext: string): string {
    return `
System: You are the Chief Macro Narrative Synthesizer. Build structured macro regime hypotheses based on market data and news flow.

Market Data Summary:
${JSON.stringify(marketData, null, 2)}

News Context:
${newsContext}

Generate a coherent macro narrative that explains current market conditions and potential regime shifts. Include:
1. Key macro themes driving markets
2. Central bank policy implications
3. Geopolitical considerations
4. Sector/asset class implications
5. Risk scenarios to monitor

Narrative:
    `.trim();
  }

  static getRedTeamPrompt(strategy: any): string {
    return `
System: You are the Adversarial Red Team Agent. Your job is to DESTROY strategy assumptions and find failure modes.

Strategy to Attack:
${JSON.stringify(strategy, null, 2)}

Required Analysis Sections:
1. Hidden Correlations: What correlations could emerge during stress?
2. Liquidity Crunch Simulation: How would this fail in illiquid markets?
3. Parameter Overfit Suspicions: Which parameters look suspicious?
4. Regime Flip Catastrophe: How would regime changes kill this strategy?
5. Synthetic Microstructure Attack: How could market makers game this?

Be ruthless and specific. Find the real weaknesses.

Analysis:
    `.trim();
  }
}

// Export singleton instance for global use
export const llmProvider = LLMProviderFactory.create({ provider: 'mock' });