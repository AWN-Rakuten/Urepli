import { AffiliateNetwork } from '../../shared/types/affiliate';

export interface ComplianceConfig {
  networks: AffiliateNetwork[];
  platform: string; // 'line', 'instagram', 'tiktok', 'youtube', etc.
  include_amazon_associates?: boolean;
}

export interface DisclosureResult {
  required: boolean;
  text: string;
  position: 'beginning' | 'end' | 'both';
}

/**
 * Japanese Compliance Service for Stealth Marketing Rules (ステマ規制)
 * Implements Consumer Affairs Agency (CAA) requirements from October 2023
 */
export class ComplianceService {
  
  /**
   * Generate appropriate disclosure text for Japanese stealth marketing rules
   * Based on CAA guidelines: https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/
   */
  getJapaneseDisclosure(config: ComplianceConfig): DisclosureResult {
    const { networks, platform, include_amazon_associates } = config;
    
    const disclosures: string[] = [];
    
    // Base Japanese disclosure (required for all affiliate content)
    if (networks.length > 0) {
      disclosures.push('本コンテンツには広告（アフィリエイトリンク）を含みます。');
    }
    
    // Amazon Associates specific disclosure (required by Amazon)
    if (include_amazon_associates && networks.includes('amazon')) {
      disclosures.push('As an Amazon Associate I earn from qualifying purchases.');
    }
    
    // Platform-specific adjustments
    let finalText = disclosures.join(' ');
    
    switch (platform.toLowerCase()) {
      case 'line':
        // LINE messages can be shorter, but must be clear
        finalText = disclosures.join('\n');
        break;
      
      case 'instagram':
        // Instagram posts should have disclosure at the beginning
        finalText = `【PR】${disclosures.join(' ')}`;
        break;
      
      case 'tiktok':
        // TikTok videos should have clear disclosure
        finalText = `#PR #広告 ${disclosures.join(' ')}`;
        break;
      
      case 'youtube':
        // YouTube descriptions should have clear disclosure
        finalText = `※${disclosures.join(' ')}`;
        break;
      
      default:
        // Default format
        finalText = `※${disclosures.join(' ')}`;
        break;
    }
    
    return {
      required: networks.length > 0,
      text: finalText,
      position: this.getDisclosurePosition(platform)
    };
  }
  
  /**
   * Get Amazon Associates compliant disclosure
   */
  getAmazonAssociatesDisclosure(): string {
    return 'As an Amazon Associate I earn from qualifying purchases.';
  }
  
  /**
   * Validate if content includes required disclosures
   */
  validateDisclosure(content: string, config: ComplianceConfig): {
    isCompliant: boolean;
    missing: string[];
    suggestions: string[];
  } {
    const { networks, include_amazon_associates } = config;
    const missing: string[] = [];
    const suggestions: string[] = [];
    
    const lowerContent = content.toLowerCase();
    
    // Check for Japanese affiliate disclosure
    if (networks.length > 0) {
      const hasJapaneseDisclosure = 
        lowerContent.includes('広告') || 
        lowerContent.includes('アフィリエイト') || 
        lowerContent.includes('pr') ||
        lowerContent.includes('プロモーション');
      
      if (!hasJapaneseDisclosure) {
        missing.push('Japanese affiliate disclosure');
        suggestions.push('本コンテンツには広告（アフィリエイトリンク）を含みます。');
      }
    }
    
    // Check for Amazon Associates disclosure
    if (include_amazon_associates && networks.includes('amazon')) {
      const hasAmazonDisclosure = 
        lowerContent.includes('amazon associate') ||
        lowerContent.includes('qualifying purchases');
      
      if (!hasAmazonDisclosure) {
        missing.push('Amazon Associates disclosure');
        suggestions.push(this.getAmazonAssociatesDisclosure());
      }
    }
    
    return {
      isCompliant: missing.length === 0,
      missing,
      suggestions
    };
  }
  
  /**
   * Auto-inject disclosure into content
   */
  injectDisclosure(content: string, config: ComplianceConfig): string {
    const disclosure = this.getJapaneseDisclosure(config);
    
    if (!disclosure.required) {
      return content;
    }
    
    // Check if disclosure already exists
    const validation = this.validateDisclosure(content, config);
    if (validation.isCompliant) {
      return content;
    }
    
    // Inject disclosure based on position
    switch (disclosure.position) {
      case 'beginning':
        return `${disclosure.text}\n\n${content}`;
      
      case 'end':
        return `${content}\n\n${disclosure.text}`;
      
      case 'both':
        return `${disclosure.text}\n\n${content}\n\n${disclosure.text}`;
      
      default:
        return `${content}\n\n${disclosure.text}`;
    }
  }
  
  /**
   * Get recommended disclosure position for platform
   */
  private getDisclosurePosition(platform: string): 'beginning' | 'end' | 'both' {
    switch (platform.toLowerCase()) {
      case 'instagram':
      case 'tiktok':
        return 'beginning'; // Visual platforms need upfront disclosure
      
      case 'youtube':
        return 'both'; // Both description and during video
      
      case 'line':
        return 'beginning'; // Messages should be clear from start
      
      default:
        return 'end'; // Default to end for other platforms
    }
  }
  
  /**
   * Get platform-specific compliance guidelines
   */
  getPlatformGuidelines(platform: string): {
    requirements: string[];
    best_practices: string[];
    examples: string[];
  } {
    const baseRequirements = [
      '広告・アフィリエイトリンクを含む旨を明記',
      'Consumer Affairs Agency (CAA) ステマ規制への準拠'
    ];
    
    switch (platform.toLowerCase()) {
      case 'instagram':
        return {
          requirements: [
            ...baseRequirements,
            'ハッシュタグ #PR または #広告 の使用推奨',
            '投稿の最初に【PR】表示'
          ],
          best_practices: [
            'キャプションの冒頭に明確な表示',
            'ストーリーズでも同様の表示'
          ],
          examples: [
            '【PR】本コンテンツには広告（アフィリエイトリンク）を含みます。',
            '#PR #広告 本コンテンツには広告を含みます。'
          ]
        };
      
      case 'tiktok':
        return {
          requirements: [
            ...baseRequirements,
            '動画内およびキャプションでの明示'
          ],
          best_practices: [
            '動画の最初3秒以内での表示',
            'ハッシュタグ #PR #広告 の併用'
          ],
          examples: [
            '#PR #広告 本コンテンツには広告（アフィリエイトリンク）を含みます。'
          ]
        };
      
      case 'youtube':
        return {
          requirements: [
            ...baseRequirements,
            '動画内での口頭による告知',
            '説明欄での明記'
          ],
          best_practices: [
            '動画開始時の口頭での告知',
            '説明欄の冒頭での明記'
          ],
          examples: [
            '※本動画には広告（アフィリエイトリンク）を含みます。',
            'この動画にはプロモーションが含まれています。'
          ]
        };
      
      case 'line':
        return {
          requirements: [
            ...baseRequirements,
            'メッセージ内での明示'
          ],
          best_practices: [
            'Flex Message使用時も明記',
            'リッチメニューでの表示'
          ],
          examples: [
            '本メッセージには広告を含みます。',
            '※アフィリエイトリンクを含みます'
          ]
        };
      
      default:
        return {
          requirements: baseRequirements,
          best_practices: [
            '分かりやすい位置への明示',
            '読者が理解しやすい表現'
          ],
          examples: [
            '※本コンテンツには広告（アフィリエイトリンク）を含みます。'
          ]
        };
    }
  }
}

export const complianceService = new ComplianceService();