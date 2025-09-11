#!/usr/bin/env python3
"""
Campaign creation example script
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def create_ai_product_reaction_campaign():
    """Create an AI Product Reaction campaign"""
    campaign_data = {
        "name": "AI新商品反応キャンペーン",
        "description": "AIキャラクターが新しい日本の商品に驚きの反応を示すバイラルコンテンツ",
        "campaign_type": "ai_product_reaction",
        "video_content": {
            "prompt": "可愛いアニメキャラクターが新しい日本のスマートフォンを見て、目を大きく見開いて驚く表情。商品を手に取って詳しく調べる様子。背景は明るくてポップな日本の電気店",
            "style": "anime",
            "duration": 15,
            "japanese_optimized": True
        },
        "config": {
            "target_platforms": ["tiktok", "instagram", "youtube"],
            "posting_schedule": {"tiktok": "19:00"},
            "auto_engage": True,
            "engagement_replies": ["すごいですよね！😍", "これは絶対バイラルになる！"],
            "content_variations": 3,
            "japanese_locale": True,
            "trending_hashtags": True
        }
    }
    
    response = requests.post(f"{BASE_URL}/campaigns", json=campaign_data)
    return response.json()

def main():
    """Main function to demonstrate campaign creation"""
    print("🚀 AI Social Campaign Launcher - Example Usage")
    campaign = create_ai_product_reaction_campaign()
    print(f"Created campaign: {campaign.get('name', 'Error')}")

if __name__ == "__main__":
    main()