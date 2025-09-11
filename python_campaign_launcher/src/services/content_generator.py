import google.generativeai as genai
from typing import Dict, Any, Optional
import random
from ..core.config import settings
from ..models.campaign import CampaignTemplate, ContentType


class GeminiContentGenerator:
    """Generate content using Google Gemini AI API"""
    
    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
    
    async def generate_script(
        self, 
        template: CampaignTemplate,
        content_type: ContentType,
        topic: str = None
    ) -> Dict[str, Any]:
        """Generate a Japanese social media script"""
        
        if not self.model:
            # Return mock content when API is not available
            return self._generate_mock_script(template, content_type)
        
        try:
            prompt = self._build_prompt(template, content_type, topic)
            response = self.model.generate_content(prompt)
            
            # Parse the response into structured format
            script_content = response.text
            return self._parse_script_response(script_content, template)
            
        except Exception as e:
            print(f"Error generating content with Gemini: {e}")
            return self._generate_mock_script(template, content_type)
    
    def _build_prompt(
        self, 
        template: CampaignTemplate, 
        content_type: ContentType,
        topic: str = None
    ) -> str:
        """Build the prompt for Gemini AI"""
        
        base_prompt = f"""
あなたは日本のソーシャルメディア向けの短尺動画コンテンツを作成するプロのライターです。

テンプレート: {template.display}
コンテンツタイプ: {content_type.value}
スタイル: {template.style_primary} + {template.style_secondary}
キーワード: {', '.join(template.keywords)}
"""
        
        if topic:
            base_prompt += f"トピック: {topic}\n"
        
        content_type_prompts = {
            ContentType.AI_PRODUCT_REACTION: """
AI商品リアクション動画を作成してください：
- 新商品への驚きと興奮を表現
- 「えっ、これすごくない？」のような自然なリアクション
- 商品の特徴を3つのポイントで説明
- 視聴者への質問で終わる
""",
            ContentType.MYSTERY_LAUNCH: """
ミステリー商品発表動画を作成してください：
- 「実は...」で始まる謎めいた導入
- 段階的に情報を明かす構成
- 最後に大きな発表
- 続きが気になる終わり方
""",
            ContentType.AI_VS_HUMAN_POLL: """
AI vs 人間の投票動画を作成してください：
- 面白い比較テーマを設定
- AIと人間の違いを強調
- 視聴者に投票を促す
- コメント欄での議論を誘発
""",
            ContentType.DAY_IN_LIFE: """
一日の生活動画を作成してください：
- 朝から夜までの流れ
- 商品/サービスの自然な使用場面
- リアルな日常感
- 共感できるエピソード
""",
            ContentType.MEMEABLE_CONTENT: """
ミーム性のあるコンテンツを作成してください：
- トレンドを意識した内容
- シェアしたくなる要素
- キャッチーなフレーズ
- 真似しやすい構成
"""
        }
        
        base_prompt += content_type_prompts.get(content_type, "")
        base_prompt += """

以下の形式で15-30秒の動画用スクリプトを作成してください：

フック（最初の3秒）: [視聴者の注意を引く一言]
メインコンテンツ（3つのポイント）:
1. [ポイント1]
2. [ポイント2] 
3. [ポイント3]
ツイスト（意外な要素）: [驚きや新情報]
CTA（行動喚起）: [視聴者に求める行動]

ハッシュタグ: #関連タグ #日本語ハッシュタグ
"""
        
        return base_prompt
    
    def _parse_script_response(self, response: str, template: CampaignTemplate) -> Dict[str, Any]:
        """Parse Gemini response into structured script format"""
        
        lines = response.strip().split('\n')
        script = {
            'hook': '',
            'bullets': [],
            'twist': '',
            'cta': '',
            'hashtags': [],
            'style': template.style_primary,
            'estimated_duration': 25
        }
        
        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if 'フック' in line or 'hook' in line.lower():
                current_section = 'hook'
                if ':' in line:
                    script['hook'] = line.split(':', 1)[1].strip()
            elif 'メインコンテンツ' in line or 'ポイント' in line:
                current_section = 'bullets'
            elif 'ツイスト' in line or 'twist' in line.lower():
                current_section = 'twist'
                if ':' in line:
                    script['twist'] = line.split(':', 1)[1].strip()
            elif 'CTA' in line or '行動喚起' in line:
                current_section = 'cta'
                if ':' in line:
                    script['cta'] = line.split(':', 1)[1].strip()
            elif 'ハッシュタグ' in line or '#' in line:
                hashtags = [tag.strip() for tag in line.split() if tag.startswith('#')]
                script['hashtags'].extend(hashtags)
            elif current_section == 'bullets' and (line.startswith(('1.', '2.', '3.', '-', '・'))):
                bullet_text = line.split('.', 1)[1].strip() if '.' in line else line[1:].strip()
                script['bullets'].append(bullet_text)
            elif current_section == 'hook' and not script['hook']:
                script['hook'] = line
            elif current_section == 'twist' and not script['twist']:
                script['twist'] = line
            elif current_section == 'cta' and not script['cta']:
                script['cta'] = line
        
        return script
    
    def _generate_mock_script(self, template: CampaignTemplate, content_type: ContentType) -> Dict[str, Any]:
        """Generate mock content when API is not available"""
        
        mock_hooks = [
            f"今話題の{template.display}について知ってる？",
            f"これは知らないと損する{template.display}の話",
            f"みんな！{template.display}で大変なことが起きてる！"
        ]
        
        mock_bullets = [
            f"{template.keywords[0]}の最新情報をチェック",
            f"実はこんなメリットがあるんです",
            f"みんなが知らない裏技を公開"
        ]
        
        mock_twists = [
            "でも実は、もっとすごいことがあるんです！",
            "実際に試してみたら、予想を超える結果が...",
            "最後にとっておきの情報を教えます"
        ]
        
        mock_ctas = [
            "あなたはどう思う？コメントで教えて！",
            "続きが気になる人はフォローしてね",
            "この情報、役に立った人はいいね！"
        ]
        
        return {
            'hook': random.choice(mock_hooks),
            'bullets': random.sample(mock_bullets, 3),
            'twist': random.choice(mock_twists),
            'cta': random.choice(mock_ctas),
            'hashtags': [f"#{keyword}" for keyword in template.keywords[:3]],
            'style': template.style_primary,
            'estimated_duration': random.randint(20, 35)
        }