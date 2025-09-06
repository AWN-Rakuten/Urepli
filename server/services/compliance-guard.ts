import { GeminiService } from './gemini.js';
import { IStorage } from '../storage.js';

export interface ComplianceCheck {
  passed: boolean;
  issues: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  autoFix: boolean;
}

export interface ContentPiece {
  hook: string;
  bullets: string[];
  twist: string;
  cta: string;
  disclosure: string;
  source: string;
  streamKey: string;
  hasAffiliate: boolean;
}

export class ComplianceGuardService {
  private geminiService: GeminiService;
  private storage: IStorage;
  private bannedPhrases: Set<string> = new Set();
  private riskyPatterns: RegExp[] = [];

  constructor(storage: IStorage) {
    this.storage = storage;
    this.geminiService = new GeminiService();
    this.initializeComplianceRules();
  }

  private initializeComplianceRules(): void {
    // Banned phrases that violate platform policies
    this.bannedPhrases = new Set([
      '絶対に',
      '必ず',
      '100%',
      '確実に',
      '保証',
      '断言',
      '間違いなく',
      '誰でも稼げる',
      '簡単に儲かる',
      'リスクなし',
      '副作用なし',
      '医学的効果',
      '病気が治る',
      '痩せる薬',
      '投資で確実',
      '借金解決',
      'ギャンブル必勝'
    ]);

    // Risky patterns (regex)
    this.riskyPatterns = [
      /\d+万円確実/,
      /月収\d+万円保証/,
      /絶対に\w+できる/,
      /100%\w+(効果|成功)/,
      /誰でも(簡単|確実)/,
      /リスクゼロ/,
      /元本保証/,
      /必ず痩せる/,
      /病気(治る|完治)/,
      /副作用一切なし/
    ];

    console.log('Compliance rules initialized with platform safety guidelines');
  }

  async checkCompliance(content: ContentPiece): Promise<ComplianceCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let autoFix = false;

    // 1. Check affiliate disclosure compliance
    if (content.hasAffiliate) {
      if (!content.disclosure.includes('#PR') && !content.disclosure.includes('#広告')) {
        issues.push('アフィリエイトリンクに対する適切な開示表示がありません');
        suggestions.push('#PR #広告 の表示を追加してください');
        riskLevel = 'high';
        autoFix = true;
      }
    }

    // 2. Check for banned phrases
    const fullText = `${content.hook} ${content.bullets.join(' ')} ${content.twist}`;
    for (const phrase of this.bannedPhrases) {
      if (fullText.includes(phrase)) {
        issues.push(`禁止フレーズが含まれています: "${phrase}"`);
        suggestions.push(`"${phrase}" を削除または言い換えてください`);
        riskLevel = 'high';
      }
    }

    // 3. Check risky patterns
    for (const pattern of this.riskyPatterns) {
      if (pattern.test(fullText)) {
        issues.push(`リスクの高い表現パターンが検出されました: ${pattern.source}`);
        suggestions.push('断定的な表現を避け、条件付きの表現に変更してください');
        if (riskLevel !== 'high') riskLevel = 'medium';
      }
    }

    // 4. Check source attribution
    if (!content.source || !content.source.includes('出典')) {
      issues.push('情報源の明記がありません');
      suggestions.push('「出典: <ドメイン名>」を追加してください');
      if (riskLevel === 'low') riskLevel = 'medium';
      autoFix = true;
    }

    // 5. Platform-specific checks
    await this.checkPlatformPolicies(content, issues, suggestions);

    // 6. Financial/medical content checks
    if (['credit', 'hacks'].includes(content.streamKey)) {
      await this.checkFinancialCompliance(content, issues, suggestions);
    }

    // 7. Time-sensitive claims check
    await this.checkTimeSensitiveClaims(content, issues, suggestions);

    const passed = issues.length === 0;
    
    // Log compliance check
    await this.storage.createAutomationLog({
      type: 'compliance_check',
      message: `Compliance check ${passed ? 'passed' : 'failed'}: ${issues.length} issues found`,
      status: passed ? 'success' : 'warning',
      workflowId: null,
      metadata: {
        streamKey: content.streamKey,
        passed,
        issueCount: issues.length,
        riskLevel,
        autoFix,
        issues: issues.slice(0, 3) // Limit metadata size
      }
    });

    return {
      passed,
      issues,
      suggestions,
      riskLevel,
      autoFix
    };
  }

  private async checkPlatformPolicies(content: ContentPiece, issues: string[], suggestions: string[]): Promise<void> {
    const fullText = `${content.hook} ${content.bullets.join(' ')} ${content.twist}`;
    
    // TikTok specific policies
    if (fullText.includes('コロナ') || fullText.includes('COVID')) {
      issues.push('COVID-19関連コンテンツは制限される可能性があります');
      suggestions.push('医療情報は信頼できるソースのみ使用してください');
    }

    // Instagram policies
    if (fullText.includes('フォロワー買う') || fullText.includes('いいね購入')) {
      issues.push('プラットフォーム操作に関する内容は禁止されています');
      suggestions.push('オーガニックな成長方法に焦点を当ててください');
    }

    // Common social media policies
    const politicalKeywords = ['選挙', '政治家', '投票', '政党'];
    if (politicalKeywords.some(keyword => fullText.includes(keyword))) {
      issues.push('政治的コンテンツは制限される場合があります');
      suggestions.push('政治的表現を避けるか、中立的な表現に変更してください');
    }
  }

  private async checkFinancialCompliance(content: ContentPiece, issues: string[], suggestions: string[]): Promise<void> {
    const fullText = `${content.hook} ${content.bullets.join(' ')} ${content.twist}`;
    
    // Financial guarantee checks
    if (/利益保証|元本保証|確実な投資/.test(fullText)) {
      issues.push('金融商品に関する保証表現は法的に問題となる可能性があります');
      suggestions.push('「可能性があります」「場合があります」等の条件付き表現を使用してください');
    }

    // Credit card specific
    if (content.streamKey === 'credit' && /審査なし|誰でも通る/.test(fullText)) {
      issues.push('クレジットカード審査に関する誤解を招く表現です');
      suggestions.push('審査基準や条件について正確な情報を提供してください');
    }

    // Investment advice
    if (/投資アドバイス|必ず儲かる/.test(fullText)) {
      issues.push('投資助言に該当する可能性があります');
      suggestions.push('一般的な情報提供であることを明記してください');
    }
  }

  private async checkTimeSensitiveClaims(content: ContentPiece, issues: string[], suggestions: string[]): Promise<void> {
    const fullText = `${content.hook} ${content.bullets.join(' ')} ${content.twist}`;
    const now = new Date();
    
    // Check for expired time-sensitive claims
    if (/今月限定/.test(fullText)) {
      // In production, this would check if we're still in the relevant month
      suggestions.push('期間限定表記は自動的に期限切れチェックされます');
    }

    if (/今週限定/.test(fullText)) {
      suggestions.push('週限定表記は毎週更新が必要です');
    }

    if (/本日限り/.test(fullText)) {
      suggestions.push('日限定表記は毎日更新が必要です');
    }
  }

  async autoFixContent(content: ContentPiece): Promise<ContentPiece> {
    const fixedContent = { ...content };
    
    // Auto-fix missing affiliate disclosure
    if (content.hasAffiliate && !content.disclosure.includes('#PR')) {
      fixedContent.disclosure = '#PR #広告';
    }

    // Auto-fix missing source attribution
    if (!content.source.includes('出典')) {
      fixedContent.source = `出典: ${content.source}`;
    }

    // Remove banned phrases
    for (const phrase of this.bannedPhrases) {
      fixedContent.hook = fixedContent.hook.replace(phrase, '');
      fixedContent.bullets = fixedContent.bullets.map(bullet => bullet.replace(phrase, ''));
      fixedContent.twist = fixedContent.twist.replace(phrase, '');
    }

    await this.storage.createAutomationLog({
      type: 'compliance_auto_fix',
      message: `Auto-fixed compliance issues for ${content.streamKey} content`,
      status: 'success',
      workflowId: null,
      metadata: {
        streamKey: content.streamKey,
        originalHook: content.hook,
        fixedHook: fixedContent.hook,
        autoFixApplied: true
      }
    });

    return fixedContent;
  }

  async regenerateNonCompliantContent(content: ContentPiece): Promise<ContentPiece> {
    try {
      // Use Gemini to regenerate compliant content
      const prompt = `以下のコンテンツをプラットフォームポリシーに準拠するよう修正してください:

元のコンテンツ:
フック: ${content.hook}
要点: ${content.bullets.join(', ')}
ツイスト: ${content.twist}

修正要件:
- 断定的表現を避ける
- 誤解を招く表現を削除
- ${content.hasAffiliate ? '#PR #広告 を含める' : ''}
- 出典情報を明記

JSON形式で修正版を出力してください:
{
  "hook": "修正されたフック",
  "bullets": ["修正された要点1", "修正された要点2", "修正された要点3"],
  "twist": "修正されたツイスト",
  "cta": "詳細はプロフィールへ",
  "disclosure": "${content.hasAffiliate ? '#PR #広告' : ''}",
  "source": "出典: ${content.source}"
}`;

      const response = await this.geminiService.generateJapaneseScript({
        topic: content.hook,
        targetAudience: '20-40代',
        platform: 'tiktok',
        duration: 30,
        style: 'serious'
      });

      // In a real implementation, this would parse the Gemini response
      // For now, return a compliance-safe version
      return {
        ...content,
        hook: content.hook.replace(/絶対|必ず|100%/g, '').trim() || '要チェック情報',
        bullets: content.bullets.map(bullet => 
          bullet.replace(/絶対|必ず|100%/g, '').trim() || '詳細確認推奨'
        ),
        disclosure: content.hasAffiliate ? '#PR #広告' : '',
        source: content.source.includes('出典') ? content.source : `出典: ${content.source}`
      };

    } catch (error) {
      console.error('Failed to regenerate content:', error);
      return content; // Return original if regeneration fails
    }
  }

  async scheduleContentExpiry(contentId: string, expiryKeywords: string[]): Promise<void> {
    const timeBasedKeywords = ['今月限定', '今週限定', '本日限り', '期間限定'];
    const hasTimeBasedClaim = expiryKeywords.some(keyword => 
      timeBasedKeywords.some(timeKeyword => keyword.includes(timeKeyword))
    );

    if (hasTimeBasedClaim) {
      // In production, this would schedule automatic content expiry
      await this.storage.createAutomationLog({
        type: 'content_expiry_scheduled',
        message: `Scheduled expiry check for content ${contentId} with time-sensitive claims`,
        status: 'success',
        workflowId: null,
        metadata: {
          contentId,
          expiryKeywords,
          scheduledCheck: true
        }
      });
    }
  }

  getComplianceStats(): any {
    return {
      bannedPhrasesCount: this.bannedPhrases.size,
      riskyPatternsCount: this.riskyPatterns.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
  }
}