interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  required: boolean;
  category: 'disclosure' | 'affiliate' | 'personal_info' | 'advertising' | 'general';
  penalty: 'error' | 'warning' | 'info';
}

interface ComplianceCheck {
  rule: ComplianceRule;
  passed: boolean;
  message: string;
  position?: number;
  suggestion?: string;
}

interface ComplianceReport {
  contentId: string;
  overallScore: number;
  passed: boolean;
  checks: ComplianceCheck[];
  requiredFixes: ComplianceCheck[];
  warnings: ComplianceCheck[];
  autoFixAvailable: boolean;
  generatedTimestamp: Date;
}

interface AutoFixResult {
  originalContent: string;
  fixedContent: string;
  appliedFixes: string[];
  remainingIssues: ComplianceCheck[];
}

class JapaneseComplianceService {
  private complianceRules: ComplianceRule[] = [
    // Affiliate Disclosure Rules
    {
      id: 'affiliate_disclosure_main',
      name: 'アフィリエイト開示義務',
      description: '「本コンテンツには広告（アフィリエイトリンク）を含みます。」の記載が必要',
      pattern: /本コンテンツには広告（アフィリエイトリンク）を含みます/,
      required: true,
      category: 'affiliate',
      penalty: 'error'
    },
    {
      id: 'amazon_associates_disclosure',
      name: 'Amazon Associates開示',
      description: 'Amazon商品リンクがある場合のAmazonアソシエイト開示',
      pattern: /Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています/,
      required: false,
      category: 'affiliate',
      penalty: 'warning'
    },
    {
      id: 'rakuten_affiliate_disclosure',
      name: '楽天アフィリエイト開示',
      description: '楽天商品リンクがある場合の楽天アフィリエイト開示',
      pattern: /楽天アフィリエイトを利用しており、商品購入時に収益が発生する場合があります/,
      required: false,
      category: 'affiliate',
      penalty: 'warning'
    },
    
    // Personal Information Rules
    {
      id: 'privacy_policy_link',
      name: 'プライバシーポリシーリンク',
      description: 'プライバシーポリシーへのリンクが必要',
      pattern: /プライバシーポリシー|個人情報保護方針/,
      required: true,
      category: 'personal_info',
      penalty: 'error'
    },
    {
      id: 'cookie_notice',
      name: 'Cookie利用通知',
      description: 'Cookie利用に関する通知',
      pattern: /クッキー|Cookie.*使用|利用/i,
      required: false,
      category: 'personal_info',
      penalty: 'info'
    },
    
    // Advertising Standards
    {
      id: 'no_guaranteed_results',
      name: '効果保証の禁止',
      description: '「必ず」「絶対」「確実に」などの断定的表現の禁止',
      pattern: /(必ず|絶対に?|確実に?|100%|完全に).*効果|成果|結果/,
      required: true,
      category: 'advertising',
      penalty: 'error'
    },
    {
      id: 'comparative_expression',
      name: '比較表現の適切性',
      description: '「最高」「No.1」などの最上級表現には根拠が必要',
      pattern: /(最高|最強|最適|No\.?1|ナンバーワン|一番)/,
      required: false,
      category: 'advertising',
      penalty: 'warning'
    },
    {
      id: 'medical_claims',
      name: '医療・健康効果の表現制限',
      description: '医療効果や健康効果の断定的表現は禁止',
      pattern: /(病気|疾患|症状).*治る|治療|完治|根治|改善.*保証/,
      required: true,
      category: 'advertising',
      penalty: 'error'
    },
    
    // General Content Rules
    {
      id: 'content_source',
      name: '情報源の明記',
      description: '統計や調査結果には情報源の明記が推奨',
      pattern: /出典|情報源|引用|参考|調査|統計.*（.*）|※.*調査/,
      required: false,
      category: 'general',
      penalty: 'info'
    },
    {
      id: 'update_date',
      name: '更新日の記載',
      description: '記事の更新日または公開日の記載',
      pattern: /更新日|公開日|最終更新|最新情報|\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}/,
      required: false,
      category: 'general',
      penalty: 'info'
    }
  ];

  /**
   * Check content compliance against Japanese regulations
   */
  checkCompliance(content: {
    title?: string;
    body: string;
    hasAffiliateLinks?: boolean;
    hasAmazonLinks?: boolean;
    hasRakutenLinks?: boolean;
    platform?: string;
  }): ComplianceReport {
    const checks: ComplianceCheck[] = [];
    const fullContent = `${content.title || ''} ${content.body}`;
    
    for (const rule of this.complianceRules) {
      const check = this.checkRule(rule, fullContent, content);
      checks.push(check);
    }

    const requiredFixes = checks.filter(c => !c.passed && c.rule.penalty === 'error');
    const warnings = checks.filter(c => !c.passed && c.rule.penalty === 'warning');
    const infos = checks.filter(c => !c.passed && c.rule.penalty === 'info');

    const passedChecks = checks.filter(c => c.passed).length;
    const overallScore = (passedChecks / checks.length) * 100;
    const passed = requiredFixes.length === 0;

    return {
      contentId: content.title || 'content',
      overallScore: Math.round(overallScore),
      passed,
      checks,
      requiredFixes,
      warnings,
      autoFixAvailable: requiredFixes.length > 0,
      generatedTimestamp: new Date()
    };
  }

  /**
   * Check individual rule against content
   */
  private checkRule(
    rule: ComplianceRule,
    content: string,
    metadata: any
  ): ComplianceCheck {
    let passed = true;
    let message = `✓ ${rule.name}: 適合`;
    let position: number | undefined;
    let suggestion: string | undefined;

    // Special handling for context-dependent rules
    if (rule.id === 'amazon_associates_disclosure') {
      if (metadata.hasAmazonLinks) {
        passed = rule.pattern ? rule.pattern.test(content) : true;
        if (!passed) {
          message = `✗ ${rule.name}: Amazonアソシエイト開示が必要です`;
          suggestion = 'コンテンツに「Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています。」を追加してください。';
        }
      } else {
        // No Amazon links, so this rule doesn't apply
        passed = true;
        message = `- ${rule.name}: 対象外（Amazonリンクなし）`;
      }
    } else if (rule.id === 'rakuten_affiliate_disclosure') {
      if (metadata.hasRakutenLinks) {
        passed = rule.pattern ? rule.pattern.test(content) : true;
        if (!passed) {
          message = `✗ ${rule.name}: 楽天アフィリエイト開示が必要です`;
          suggestion = 'コンテンツに「楽天アフィリエイトを利用しており、商品購入時に収益が発生する場合があります。」を追加してください。';
        }
      } else {
        passed = true;
        message = `- ${rule.name}: 対象外（楽天リンクなし）`;
      }
    } else if (rule.id === 'affiliate_disclosure_main') {
      if (metadata.hasAffiliateLinks) {
        passed = rule.pattern ? rule.pattern.test(content) : true;
        if (!passed) {
          message = `✗ ${rule.name}: 必須の開示文が不足`;
          suggestion = 'コンテンツの冒頭または末尾に「本コンテンツには広告（アフィリエイトリンク）を含みます。」を追加してください。';
        }
      } else {
        passed = true;
        message = `- ${rule.name}: 対象外（アフィリエイトリンクなし）`;
      }
    } else {
      // Standard pattern matching
      if (rule.pattern) {
        if (rule.category === 'advertising' && rule.id === 'no_guaranteed_results') {
          // For prohibited expressions, we want NO matches
          passed = !rule.pattern.test(content);
          if (!passed) {
            const match = content.match(rule.pattern);
            position = match?.index;
            message = `✗ ${rule.name}: 禁止表現が検出されました`;
            suggestion = '「必ず」「絶対」「確実に」などの断定的表現を避け、「多くの場合」「一般的に」などの表現に変更してください。';
          }
        } else if (rule.category === 'advertising' && rule.id === 'medical_claims') {
          passed = !rule.pattern.test(content);
          if (!passed) {
            message = `✗ ${rule.name}: 医療効果の断定表現が検出されました`;
            suggestion = '医療効果や健康効果の断定的表現を削除し、「個人差があります」「医師にご相談ください」などの文言を追加してください。';
          }
        } else {
          // For required content, we want matches
          passed = rule.pattern.test(content);
          if (!passed && rule.required) {
            message = `✗ ${rule.name}: 必須項目が不足`;
            suggestion = this.getSuggestionForRule(rule);
          } else if (!passed) {
            message = `⚠ ${rule.name}: 推奨項目が不足`;
            suggestion = this.getSuggestionForRule(rule);
          }
        }
      }
    }

    return {
      rule,
      passed,
      message,
      position,
      suggestion
    };
  }

  /**
   * Get suggestion for fixing rule violation
   */
  private getSuggestionForRule(rule: ComplianceRule): string {
    const suggestions: { [key: string]: string } = {
      'privacy_policy_link': 'フッターまたはサイドバーに「プライバシーポリシー」へのリンクを追加してください。',
      'cookie_notice': 'サイトでCookieを使用している場合は、その旨を明記してください。',
      'content_source': '統計や調査結果を引用する際は、「出典：○○調査（2024年）」のように情報源を明記してください。',
      'update_date': '記事の公開日または最終更新日を明記してください。',
      'comparative_expression': '「最高」「No.1」などの表現を使用する場合は、その根拠となるデータや調査結果を併記してください。'
    };

    return suggestions[rule.id] || `${rule.description}を確認してください。`;
  }

  /**
   * Automatically fix compliance issues where possible
   */
  autoFixContent(
    content: string,
    metadata: {
      hasAffiliateLinks?: boolean;
      hasAmazonLinks?: boolean;
      hasRakutenLinks?: boolean;
    }
  ): AutoFixResult {
    let fixedContent = content;
    const appliedFixes: string[] = [];

    // Add required affiliate disclosures
    if (metadata.hasAffiliateLinks) {
      const affiliateDisclosure = '本コンテンツには広告（アフィリエイトリンク）を含みます。';
      if (!fixedContent.includes(affiliateDisclosure)) {
        fixedContent = `${affiliateDisclosure}\n\n${fixedContent}`;
        appliedFixes.push('アフィリエイト開示文を追加');
      }
    }

    if (metadata.hasAmazonLinks) {
      const amazonDisclosure = 'Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています。';
      if (!fixedContent.includes(amazonDisclosure)) {
        fixedContent += `\n\n${amazonDisclosure}`;
        appliedFixes.push('Amazon Associates開示文を追加');
      }
    }

    if (metadata.hasRakutenLinks) {
      const rakutenDisclosure = '楽天アフィリエイトを利用しており、商品購入時に収益が発生する場合があります。';
      if (!fixedContent.includes(rakutenDisclosure)) {
        fixedContent += `\n\n${rakutenDisclosure}`;
        appliedFixes.push('楽天アフィリエイト開示文を追加');
      }
    }

    // Fix prohibited expressions
    fixedContent = fixedContent.replace(
      /(必ず|絶対に?|確実に?).*効果/g,
      (match) => {
        appliedFixes.push(`禁止表現「${match}」を修正`);
        return match.replace(/必ず|絶対に?|確実に?/, '多くの場合');
      }
    );

    // Add update date if missing
    const hasUpdateDate = /更新日|公開日|最終更新|\d{4}年\d{1,2}月\d{1,2}日/.test(fixedContent);
    if (!hasUpdateDate) {
      const currentDate = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      fixedContent += `\n\n最終更新日: ${currentDate}`;
      appliedFixes.push('更新日を追加');
    }

    // Check remaining issues
    const complianceReport = this.checkCompliance({
      body: fixedContent,
      hasAffiliateLinks: metadata.hasAffiliateLinks,
      hasAmazonLinks: metadata.hasAmazonLinks,
      hasRakutenLinks: metadata.hasRakutenLinks
    });

    const remainingIssues = complianceReport.checks.filter(c => !c.passed && c.rule.penalty === 'error');

    return {
      originalContent: content,
      fixedContent,
      appliedFixes,
      remainingIssues
    };
  }

  /**
   * Generate compliance-aware content
   */
  generateComplianceTemplate(contentType: 'blog' | 'video' | 'social', niche: string): string {
    let template = '';

    // Add disclosure header
    template += '本コンテンツには広告（アフィリエイトリンク）を含みます。\n\n';

    // Content-specific templates
    if (contentType === 'blog') {
      template += `# ${niche}について\n\n`;
      template += '## 重要な注意事項\n\n';
      template += '当サイトで紹介する商品やサービスは、個人差があります。効果や結果を保証するものではありません。\n\n';
      template += '## 記事内容について\n\n';
      template += '本記事の情報は執筆時点のものです。最新情報については各公式サイトをご確認ください。\n\n';
    } else if (contentType === 'video') {
      template += `${niche}に関する情報をお届けします。\n\n`;
      template += '※個人の感想であり、効果を保証するものではありません。\n';
      template += '※商品の詳細は各公式サイトでご確認ください。\n\n';
    } else if (contentType === 'social') {
      template += `${niche}情報をシェア！\n`;
      template += '#PR #広告 #アフィリエイト\n';
    }

    // Add footer disclosures
    if (contentType === 'blog') {
      template += '\n\n## 免責事項\n\n';
      template += '当サイトの情報は一般的な情報提供を目的としており、個別の投資や購入についてのアドバイスではありません。\n';
      template += '最終的な判断はお客様ご自身でお願いいたします。\n\n';
      
      const currentDate = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
      template += `最終更新日: ${currentDate}\n`;
    }

    return template;
  }

  /**
   * Validate content before publishing
   */
  validateForPublishing(content: {
    title: string;
    body: string;
    hasAffiliateLinks: boolean;
    hasAmazonLinks?: boolean;
    hasRakutenLinks?: boolean;
    platform: string;
  }): {
    canPublish: boolean;
    blockers: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const report = this.checkCompliance(content);
    
    const blockers = report.requiredFixes.map(fix => fix.message);
    const warnings = report.warnings.map(warning => warning.message);
    const recommendations = report.checks
      .filter(c => !c.passed && c.rule.penalty === 'info')
      .map(c => c.suggestion || c.message);

    return {
      canPublish: report.passed,
      blockers,
      warnings,
      recommendations
    };
  }

  /**
   * Get compliance score for analytics
   */
  getComplianceScore(content: {
    title?: string;
    body: string;
    hasAffiliateLinks?: boolean;
    hasAmazonLinks?: boolean;
    hasRakutenLinks?: boolean;
  }): number {
    const report = this.checkCompliance(content);
    return report.overallScore;
  }

  /**
   * Get compliance statistics
   */
  getComplianceStatistics(): {
    totalRules: number;
    criticalRules: number;
    warningRules: number;
    infoRules: number;
    rulesByCategory: { [category: string]: number };
  } {
    const rulesByCategory: { [category: string]: number } = {};
    let critical = 0;
    let warning = 0;
    let info = 0;

    for (const rule of this.complianceRules) {
      rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1;
      
      switch (rule.penalty) {
        case 'error':
          critical++;
          break;
        case 'warning':
          warning++;
          break;
        case 'info':
          info++;
          break;
      }
    }

    return {
      totalRules: this.complianceRules.length,
      criticalRules: critical,
      warningRules: warning,
      infoRules: info,
      rulesByCategory
    };
  }
}

export const japaneseCompliance = new JapaneseComplianceService();
export { JapaneseComplianceService, ComplianceReport, ComplianceCheck, AutoFixResult };