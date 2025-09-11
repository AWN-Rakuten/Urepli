import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "AI Social Campaign Launcher API"
    assert data["version"] == "1.0.0"

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "services" in data

def test_list_campaigns_empty():
    """Test listing campaigns when none exist"""
    response = client.get("/campaigns")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_campaign():
    """Test creating a new campaign"""
    campaign_data = {
        "name": "Test Campaign",
        "description": "A test campaign for Japanese audiences",
        "campaign_type": "ai_product_reaction",
        "video_content": {
            "prompt": "Test video prompt",
            "style": "anime",
            "duration": 15,
            "aspect_ratio": "9:16",
            "subtitles": True,
            "japanese_optimized": True
        },
        "config": {
            "target_platforms": ["tiktok", "instagram"],
            "posting_schedule": {"tiktok": "19:00"},
            "auto_engage": True,
            "engagement_replies": ["すごい!", "面白い!"],
            "content_variations": 2,
            "japanese_locale": True,
            "trending_hashtags": True
        }
    }
    
    response = client.post("/campaigns", json=campaign_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == campaign_data["name"]
    assert data["status"] == "draft"
    assert "id" in data
    assert "created_at" in data

def test_list_templates():
    """Test listing campaign templates"""
    response = client.get("/templates")
    assert response.status_code == 200
    
    templates = response.json()
    assert isinstance(templates, list)
    
    # Should have our Japanese-optimized templates
    template_names = [t.get("name", "") for t in templates]
    assert any("AI商品反応" in name for name in template_names)

def test_generate_video():
    """Test video generation endpoint"""
    response = client.post(
        "/video/generate",
        params={
            "prompt": "Cute anime character waving hello",
            "style": "anime",
            "duration": 10
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "processing"

def test_video_status():
    """Test video status endpoint with invalid task ID"""
    response = client.get("/video/status/invalid-task-id")
    assert response.status_code == 200
    
    data = response.json()
    assert "error" in data

def test_campaign_not_found():
    """Test getting a non-existent campaign"""
    response = client.get("/campaigns/non-existent-id")
    assert response.status_code == 404
    assert "Campaign not found" in response.json()["detail"]

@pytest.mark.parametrize("campaign_type", [
    "ai_product_reaction",
    "mystery_product_launch", 
    "ai_vs_human_poll",
    "day_in_life",
    "memeable_content"
])
def test_campaign_types(campaign_type):
    """Test that all campaign types are supported"""
    campaign_data = {
        "name": f"Test {campaign_type}",
        "description": f"Test campaign of type {campaign_type}",
        "campaign_type": campaign_type,
        "video_content": {
            "prompt": "Test prompt",
            "style": "anime",
            "duration": 15
        },
        "config": {
            "target_platforms": ["tiktok"],
            "posting_schedule": {"tiktok": "19:00"},
            "auto_engage": True,
            "engagement_replies": ["Test reply"],
            "content_variations": 1,
            "japanese_locale": True,
            "trending_hashtags": True
        }
    }
    
    response = client.post("/campaigns", json=campaign_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["campaign_type"] == campaign_type