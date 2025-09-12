/**
 * Compliance Autopilot Service
 * Ensures Japanese affiliate marketing and advertising compliance
 */

export interface ComplianceCheck {
  id: string;
  type: 'disclosure' | 'content' | 'link' | 'claim';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  isBlocking: boolean;
}

export interface ComplianceResult {
  isCompliant: boolean;
  checks: ComplianceCheck[];
  disclosureString: string;
  contentId?: string;
}

export interface JapaneseComplianceRules {
  // ステマ規制 (Stealth Marketing Regulations)
  stealthMarketingDisclosure: boolean;
  
  // アフィリエイト開示 (Affiliate Disclosure)
  affiliateDisclosure: boolean;
  
  // Amazon Associates開示
  amazonAssociatesDisclosure: boolean;
  
  // 景品表示法 (Act Against Unjustifiable Premiums and Misleading Representations)
  misleadingClaimsCheck: boolean;
  
  // 薬機法 (Pharmaceutical and Medical Device Act) - for health/beauty products
  yakujiLawCompliance: boolean;
  
  // 特定商取引法 (Specified Commercial Transactions Act)
  commercialTransactionDisclosure: boolean;
}

/**
 * Japanese Market Compliance Service
 */
export class ComplianceAutopilotService {
  
  private readonly REQUIRED_DISCLOSURES = {
    AFFILIATE_BASE: '広告（アフィリエイトリンク）を含みます。',
    AMAZON_ASSOCIATES: 'Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています。',
    STEALTH_MARKETING: 'PR・広告を含む投稿です。',
    COMMERCIAL_TRANSACTION: '特定商取引法に基づく表記: [事業者情報]'
  };

  private readonly PROHIBITED_CLAIMS = [
    // 薬機法関連 (Drug and Medical Device Act)
    '病気が治る', '痩せる', '必ず効果がある', '医学的に証明',
    '即効性', '永久的効果', '副作用なし', '100%安全',
    
    // 景品表示法関連 (Misleading Advertisement)
    '限定', '今だけ', '最安値', '業界最高', '絶対',
    'ランキング1位', '売上No.1', '顧客満足度100%',
    
    // 過度な表現
    '奇跡', '革命的', '秘密の', '裏技', '禁断の'
  ];

  private readonly SENSITIVE_CATEGORIES = [
    'health', 'beauty', 'supplement', 'medical', 'finance', 'investment', 'diet'
  ];

  /**
   * Comprehensive compliance check for content
   */
  async checkCompliance(
    content: {
      id: string;
      text: string;
      title: string;
      category?: string;
      hasAffiliateLinks: boolean;
      hasAmazonLinks: boolean;
      platform: string;
    }
  ): Promise<ComplianceResult> {
    const checks: ComplianceCheck[] = [];
    let disclosureString = '';
    
    // 1. Check affiliate disclosure requirements
    if (content.hasAffiliateLinks) {
      const affiliateCheck = this.checkAffiliateDisclosure(content.text);
      checks.push(...affiliateCheck);
      
      if (!disclosureString.includes(this.REQUIRED_DISCLOSURES.AFFILIATE_BASE)) {
        disclosureString += this.REQUIRED_DISCLOSURES.AFFILIATE_BASE + ' ';
      }
    }

    // 2. Check Amazon Associates disclosure
    if (content.hasAmazonLinks) {
      const amazonCheck = this.checkAmazonAssociatesDisclosure(content.text);
      checks.push(...amazonCheck);
      
      if (!disclosureString.includes(this.REQUIRED_DISCLOSURES.AMAZON_ASSOCIATES)) {
        disclosureString += this.REQUIRED_DISCLOSURES.AMAZON_ASSOCIATES + ' ';
      }
    }

    // 3. Check for prohibited claims (景品表示法)
    const claimsCheck = this.checkProhibitedClaims(content.text + ' ' + content.title);
    checks.push(...claimsCheck);

    // 4. Check category-specific compliance (薬機法 etc.)
    if (content.category && this.SENSITIVE_CATEGORIES.includes(content.category)) {
      const categoryCheck = this.checkCategoryCompliance(content, content.category);
      checks.push(...categoryCheck);
    }

    // 5. Check stealth marketing disclosure (ステマ規制)
    const stealthCheck = this.checkStealthMarketingCompliance(content);
    checks.push(...stealthCheck);

    // 6. Platform-specific compliance
    const platformCheck = this.checkPlatformCompliance(content, content.platform);
    checks.push(...platformCheck);

    const hasErrors = checks.some(c => c.severity === 'error' && c.isBlocking);
    
    return {
      isCompliant: !hasErrors,
      checks,
      disclosureString: disclosureString.trim(),
      contentId: content.id
    };
  }

  /**
   * Auto-insert required disclosures
   */
  autoInsertDisclosures(
    content: string,
    hasAffiliateLinks: boolean,
    hasAmazonLinks: boolean,
    category?: string
  ): string {
    let updatedContent = content;
    let disclosures: string[] = [];

    // Add affiliate disclosure
    if (hasAffiliateLinks) {
      disclosures.push(this.REQUIRED_DISCLOSURES.AFFILIATE_BASE);
    }

    // Add Amazon Associates disclosure
    if (hasAmazonLinks) {
      disclosures.push(this.REQUIRED_DISCLOSURES.AMAZON_ASSOCIATES);
    }

    // Add stealth marketing disclosure for sponsored content
    if (hasAffiliateLinks || hasAmazonLinks) {
      disclosures.push(this.REQUIRED_DISCLOSURES.STEALTH_MARKETING);
    }

    // Insert disclosures at the end of content
    if (disclosures.length > 0) {
      const disclosureText = '\n\n' + disclosures.join('\n');
      updatedContent += disclosureText;
    }

    return updatedContent;
  }

  /**
   * Block content publication if non-compliant
   */
  shouldBlockPublication(complianceResult: ComplianceResult): boolean {
    return complianceResult.checks.some(check => 
      check.severity === 'error' && check.isBlocking
    );
  }

  /**
   * Private compliance check methods
   */
  private checkAffiliateDisclosure(text: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    const hasDisclosure = text.includes('広告') || text.includes('アフィリエイト') || 
                         text.includes('PR') || text.includes('sponsored');
    
    if (!hasDisclosure) {
      checks.push({
        id: 'affiliate-disclosure-missing',
        type: 'disclosure',
        severity: 'error',
        message: 'アフィリエイト開示が不足しています',
        suggestion: `"${this.REQUIRED_DISCLOSURES.AFFILIATE_BASE}"を追加してください`,
        isBlocking: true
      });
    }

    return checks;
  }

  private checkAmazonAssociatesDisclosure(text: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    const hasAmazonDisclosure = text.includes('Amazon') && text.includes('アソシエイト');
    
    if (!hasAmazonDisclosure) {
      checks.push({
        id: 'amazon-disclosure-missing',
        type: 'disclosure',
        severity: 'error',
        message: 'Amazon Associates開示が不足しています',
        suggestion: `"${this.REQUIRED_DISCLOSURES.AMAZON_ASSOCIATES}"を追加してください`,
        isBlocking: true
      });
    }

    return checks;
  }

  private checkProhibitedClaims(text: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    for (const claim of this.PROHIBITED_CLAIMS) {
      if (text.includes(claim)) {
        checks.push({
          id: `prohibited-claim-${claim}`,
          type: 'claim',
          severity: 'error',
          message: `禁止されている表現が含まれています: "${claim}"`,
          suggestion: 'より客観的で控えめな表現に変更してください',
          isBlocking: true
        });
      }
    }

    return checks;
  }

  private checkCategoryCompliance(content: any, category: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    if (category === 'health' || category === 'beauty' || category === 'supplement') {
      // 薬機法チェック
      const hasHealthClaims = this.containsHealthClaims(content.text);
      
      if (hasHealthClaims) {
        checks.push({
          id: 'yakuji-law-violation',
          type: 'content',
          severity: 'error',
          message: '薬機法に抵触する可能性のある表現が含まれています',
          suggestion: '効果・効能を謳わず、体験談として記載してください',
          isBlocking: true
        });
      }
    }

    return checks;
  }

  private checkStealthMarketingCompliance(content: any): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    if (content.hasAffiliateLinks) {
      const hasStealthDisclosure = content.text.includes('PR') || 
                                  content.text.includes('広告') ||
                                  content.text.includes('sponsored');
      
      if (!hasStealthDisclosure) {
        checks.push({
          id: 'stealth-marketing-violation',
          type: 'disclosure',
          severity: 'warning',
          message: 'ステマ規制対応の開示が推奨されます',
          suggestion: 'PR・広告であることを明確に示してください',
          isBlocking: false
        });
      }
    }

    return checks;
  }

  private checkPlatformCompliance(content: any, platform: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    
    switch (platform) {
      case 'tiktok':
        if (content.text.length > 150) {
          checks.push({
            id: 'tiktok-caption-length',
            type: 'content',
            severity: 'warning',
            message: 'TikTokキャプションが長すぎます',
            suggestion: '150文字以内に収めることを推奨します',
            isBlocking: false
          });
        }
        break;
        
      case 'instagram':
        if (!content.text.includes('#')) {
          checks.push({
            id: 'instagram-hashtag-missing',
            type: 'content',
            severity: 'info',
            message: 'Instagramではハッシュタグの使用を推奨します',
            suggestion: '関連するハッシュタグを追加してください',
            isBlocking: false
          });
        }
        break;
    }

    return checks;
  }

  private containsHealthClaims(text: string): boolean {
    const healthClaimPatterns = [
      '効果がある', '治る', '改善する', '痩せる', '美白', 
      '若返る', 'アンチエイジング', '予防する'
    ];
    
    return healthClaimPatterns.some(pattern => text.includes(pattern));
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(results: ComplianceResult[]): string {
    const totalContent = results.length;
    const compliantContent = results.filter(r => r.isCompliant).length;
    const blockedContent = results.filter(r => this.shouldBlockPublication(r)).length;
    
    const errorChecks = results.flatMap(r => r.checks.filter(c => c.severity === 'error'));
    const warningChecks = results.flatMap(r => r.checks.filter(c => c.severity === 'warning'));
    
    return `
📊 コンプライアンスレポート

総コンテンツ数: ${totalContent}
適合コンテンツ: ${compliantContent} (${((compliantContent/totalContent)*100).toFixed(1)}%)
ブロック対象: ${blockedContent}

エラー: ${errorChecks.length}件
警告: ${warningChecks.length}件

主な違反項目:
${this.getTopViolations(errorChecks).join('\n')}
    `.trim();
  }

  private getTopViolations(errorChecks: ComplianceCheck[]): string[] {
    const violationCounts = new Map<string, number>();
    
    errorChecks.forEach(check => {
      violationCounts.set(check.type, (violationCounts.get(check.type) || 0) + 1);
    });
    
    return Array.from(violationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `- ${type}: ${count}件`);
  }
}

export const complianceAutopilot = new ComplianceAutopilotService();