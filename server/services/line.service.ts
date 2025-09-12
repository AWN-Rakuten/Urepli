import fetch from 'node-fetch';
import crypto from 'crypto';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
}

export interface FlexContainer {
  type: 'bubble' | 'carousel';
  header?: FlexComponent;
  hero?: FlexComponent;
  body?: FlexComponent;
  footer?: FlexComponent;
  styles?: any;
}

export interface FlexComponent {
  type: string;
  layout?: string;
  contents?: FlexComponent[];
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  action?: FlexAction;
  url?: string;
  aspectRatio?: string;
  aspectMode?: string;
  backgroundColor?: string;
  paddingAll?: string;
  spacing?: string;
}

export interface FlexAction {
  type: 'uri' | 'message' | 'postback';
  uri?: string;
  label?: string;
  text?: string;
  data?: string;
}

export interface DealPayload {
  title: string;
  price: number;
  original_price?: number;
  shop_name: string;
  affiliate_url: string;
  image_url?: string;
  badge_text?: string;
  discount_percentage?: number;
  points_multiplier?: number;
}

export class LineService {
  private channelAccessToken: string;
  private channelSecret: string;

  constructor() {
    const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = process.env;
    
    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_CHANNEL_SECRET) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be configured');
    }
    
    this.channelAccessToken = LINE_CHANNEL_ACCESS_TOKEN;
    this.channelSecret = LINE_CHANNEL_SECRET;
  }

  /**
   * Verify LINE webhook signature
   */
  verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.channelSecret)
      .update(body, 'utf8')
      .digest('base64');
    
    return hash === signature;
  }

  /**
   * Send a push message to a user
   */
  async pushMessage(userId: string, message: any): Promise<boolean> {
    try {
      const response = await fetch(`${LINE_API_BASE}/message/push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: userId,
          messages: Array.isArray(message) ? message : [message]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('LINE push message error:', response.status, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('LINE push message exception:', error);
      return false;
    }
  }

  /**
   * Reply to a message
   */
  async replyMessage(replyToken: string, message: any): Promise<boolean> {
    try {
      const response = await fetch(`${LINE_API_BASE}/message/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          replyToken,
          messages: Array.isArray(message) ? message : [message]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('LINE reply message error:', response.status, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('LINE reply message exception:', error);
      return false;
    }
  }

  /**
   * Create a deal notification Flex message
   */
  createDealFlexMessage(deal: DealPayload): FlexMessage {
    const discountText = deal.discount_percentage 
      ? `${deal.discount_percentage}%OFF` 
      : deal.badge_text || '';

    const pointsText = deal.points_multiplier 
      ? `ポイント${deal.points_multiplier}倍` 
      : '';

    const flexMessage: FlexMessage = {
      type: 'flex',
      altText: `${deal.title} - ¥${deal.price.toLocaleString()}`,
      contents: {
        type: 'bubble',
        hero: deal.image_url ? {
          type: 'image',
          url: deal.image_url,
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover',
          action: {
            type: 'uri',
            uri: deal.affiliate_url
          }
        } : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: deal.title,
              weight: 'bold',
              size: 'md',
              color: '#333333'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: `¥${deal.price.toLocaleString()}`,
                      weight: 'bold',
                      size: 'xl',
                      color: '#ff334b'
                    },
                    ...(deal.original_price && deal.original_price > deal.price ? [{
                      type: 'text',
                      text: `¥${deal.original_price.toLocaleString()}`,
                      size: 'sm',
                      color: '#999999'
                    }] : [])
                  ]
                },
                ...(discountText || pointsText ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    ...(discountText ? [{
                      type: 'text',
                      text: discountText,
                      size: 'xs',
                      color: '#ffffff',
                      backgroundColor: '#ff334b',
                      paddingAll: 'xs'
                    }] : []),
                    ...(pointsText ? [{
                      type: 'text',
                      text: pointsText,
                      size: 'xs',
                      color: '#ffffff',
                      backgroundColor: '#ff6b00',
                      paddingAll: 'xs'
                    }] : [])
                  ],
                  spacing: 'xs'
                }] : []),
                {
                  type: 'text',
                  text: deal.shop_name,
                  size: 'sm',
                  color: '#999999'
                },
                {
                  type: 'text',
                  text: '※本メッセージには広告を含みます',
                  size: 'xxs',
                  color: '#aaaaaa'
                }
              ],
              spacing: 'sm'
            }
          ],
          spacing: 'sm',
          paddingAll: 'lg'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '詳細を見る',
                uri: deal.affiliate_url
              },
              style: 'primary',
              color: '#ff334b'
            }
          ]
        }
      }
    };

    return flexMessage;
  }

  /**
   * Send deal notification to user
   */
  async sendDealNotification(userId: string, deal: DealPayload): Promise<boolean> {
    const flexMessage = this.createDealFlexMessage(deal);
    return await this.pushMessage(userId, flexMessage);
  }

  /**
   * Broadcast deal to multiple users
   */
  async broadcastDeal(userIds: string[], deal: DealPayload): Promise<{ sent: number; failed: number }> {
    const flexMessage = this.createDealFlexMessage(deal);
    let sent = 0;
    let failed = 0;

    // Send messages with delay to avoid rate limiting
    for (const userId of userIds) {
      try {
        const success = await this.pushMessage(userId, flexMessage);
        if (success) {
          sent++;
        } else {
          failed++;
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send to ${userId}:`, error);
      }
    }

    return { sent, failed };
  }

  /**
   * Create rich menu for affiliate deals
   */
  async createRichMenu(richMenuData: any): Promise<string | null> {
    try {
      const response = await fetch(`${LINE_API_BASE}/richmenu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(richMenuData)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('LINE rich menu creation error:', error);
        return null;
      }

      const result = await response.json();
      return result.richMenuId;
    } catch (error) {
      console.error('LINE rich menu creation exception:', error);
      return null;
    }
  }
}

export const lineService = new LineService();