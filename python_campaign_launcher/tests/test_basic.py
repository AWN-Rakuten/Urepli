import pytest
import asyncio
from src.services.content_generator import GeminiContentGenerator
from src.models.campaign import ContentType
from src.core.templates import CampaignTemplateLoader


@pytest.mark.asyncio
async def test_content_generator_mock():
    """Test content generator with mock data (when API key not available)"""
    generator = GeminiContentGenerator()
    
    # Load a template
    template_loader = CampaignTemplateLoader()
    template = template_loader.get_template_by_key("tech")
    
    # Generate script
    script = await generator.generate_script(
        template=template,
        content_type=ContentType.AI_PRODUCT_REACTION,
        topic="新しいスマートフォン"
    )
    
    # Verify script structure
    assert "hook" in script
    assert "bullets" in script
    assert "twist" in script
    assert "cta" in script
    assert "hashtags" in script
    assert script["style"] == template.style_primary
    assert len(script["bullets"]) >= 1
    assert len(script["hashtags"]) >= 1


def test_template_loader():
    """Test loading campaign templates"""
    loader = CampaignTemplateLoader()
    
    # Load all templates
    templates = loader.load_templates()
    assert len(templates) > 0
    
    # Test specific template
    template = loader.get_template_by_key("tech")
    assert template.key == "tech"
    assert template.display == "テック/ガジェット"
    assert template.style_primary == "tech"
    
    # Test invalid template
    with pytest.raises(ValueError):
        loader.get_template_by_key("nonexistent")


def test_campaign_models():
    """Test campaign model validation"""
    from src.models.campaign import CampaignConfig, VideoGenerationRequest, PlatformType, ContentType
    
    # Test valid campaign config
    video_config = VideoGenerationRequest(
        script="Test script",
        style="kawaii",
        voice_language="ja"
    )
    
    config = CampaignConfig(
        name="Test Campaign",
        template_key="tech",
        platforms=[PlatformType.TIKTOK, PlatformType.INSTAGRAM],
        content_type=ContentType.AI_PRODUCT_REACTION,
        video_config=video_config
    )
    
    assert config.name == "Test Campaign"
    assert len(config.platforms) == 2
    assert config.content_type == ContentType.AI_PRODUCT_REACTION


if __name__ == "__main__":
    pytest.main([__file__, "-v"])