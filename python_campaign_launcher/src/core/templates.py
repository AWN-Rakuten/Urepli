import yaml
import os
from typing import List, Dict, Any
from ..models.campaign import CampaignTemplate


class CampaignTemplateLoader:
    """Load campaign templates from YAML configuration files"""
    
    def __init__(self, config_path: str = None):
        if config_path is None:
            # Default to the existing streams.yaml in the repo
            self.config_path = os.path.join(
                os.path.dirname(__file__), 
                "../../../server/config/streams.yaml"
            )
        else:
            self.config_path = config_path
    
    def load_templates(self) -> List[CampaignTemplate]:
        """Load campaign templates from YAML file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
                
            templates = []
            for stream in data.get('streams', []):
                template = CampaignTemplate(
                    key=stream['key'],
                    display=stream['display'],
                    style_primary=stream['style_primary'],
                    style_secondary=stream['style_secondary'],
                    has_affiliate=stream['has_affiliate'],
                    keywords=stream['keywords'],
                    sources_rss=stream['sources_rss'],
                    affiliate_url_env=stream.get('affiliate_url_env')
                )
                templates.append(template)
                
            return templates
        except FileNotFoundError:
            # Return default Japanese-optimized templates if file not found
            return self._get_default_templates()
        except Exception as e:
            print(f"Error loading templates: {e}")
            return self._get_default_templates()
    
    def _get_default_templates(self) -> List[CampaignTemplate]:
        """Return default Japanese-optimized campaign templates"""
        return [
            CampaignTemplate(
                key="mnp",
                display="MNP/携帯乗換",
                style_primary="serious",
                style_secondary="kawaii",
                has_affiliate=True,
                keywords=["mnp", "乗り換え", "スマホ", "端末割引", "ポイント還元"],
                sources_rss=["https://news.yahoo.co.jp/rss/topics/it.xml"],
                affiliate_url_env="AFFILIATE_MNP_URL"
            ),
            CampaignTemplate(
                key="anime",
                display="アニメ/エンタメ",
                style_primary="kawaii",
                style_secondary="fun",
                has_affiliate=True,
                keywords=["アニメ", "声優", "映画化", "コラボ"],
                sources_rss=["https://news.yahoo.co.jp/rss/topics/entertainment.xml"],
                affiliate_url_env="AFFILIATE_ANIME_URL"
            ),
            CampaignTemplate(
                key="tech",
                display="テック/ガジェット", 
                style_primary="tech",
                style_secondary="serious",
                has_affiliate=False,
                keywords=["発表", "発売", "比較", "性能", "レビュー", "新製品"],
                sources_rss=["https://news.yahoo.co.jp/rss/topics/it.xml"]
            )
        ]
    
    def get_template_by_key(self, key: str) -> CampaignTemplate:
        """Get a specific template by its key"""
        templates = self.load_templates()
        for template in templates:
            if template.key == key:
                return template
        raise ValueError(f"Template with key '{key}' not found")