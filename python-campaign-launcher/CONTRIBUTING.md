# Contributing to AI Social Campaign Launcher

## Development Setup

1. **Clone the repository**
```bash
git clone <repository>
cd python-campaign-launcher
```

2. **Set up Python environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Run database migrations**
```bash
# Start PostgreSQL
docker-compose up db -d

# Run migrations (if using Alembic)
# alembic upgrade head
```

## Development Workflow

### Running Locally
```bash
# Start dependencies
docker-compose up db redis minio -d

# Run API server
uvicorn main:app --reload

# Run Celery worker (in another terminal)
celery -A celery_app worker --loglevel=info

# Run Celery beat (in another terminal)
celery -A celery_app beat --loglevel=info
```

### Testing
```bash
# Run all tests
pytest

# Run specific test file
pytest app/tests/test_api.py

# Run with coverage
pytest --cov=app tests/
```

### Code Quality
```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

## Project Structure

```
python-campaign-launcher/
├── app/
│   ├── models.py              # Pydantic models
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database setup
│   ├── services/              # Business logic
│   │   ├── campaign_manager.py
│   │   ├── video_generator.py
│   │   ├── social_poster.py
│   │   └── analytics.py
│   ├── workers/               # Celery workers
│   │   ├── video_worker.py
│   │   ├── engagement_worker.py
│   │   └── cleanup_worker.py
│   ├── templates/             # Campaign templates
│   │   └── campaigns/
│   └── tests/                 # Test files
├── examples/                  # Example scripts
├── main.py                    # FastAPI application
├── celery_app.py             # Celery configuration
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # Docker services
├── Dockerfile               # Application container
└── README.md               # Documentation
```

## Adding New Features

### New Campaign Type
1. Add the campaign type to `CampaignType` enum in `models.py`
2. Create a YAML template in `app/templates/campaigns/`
3. Update `campaign_manager.py` to handle the new type
4. Add tests for the new campaign type

### New Social Platform
1. Add platform to `Platform` enum in `models.py`
2. Create API client in `social_poster.py`
3. Update posting logic in `SocialPosterService`
4. Add platform-specific optimization in video generation

### New AI Model Integration
1. Add configuration for the new model in `config.py`
2. Update `VideoGeneratorService` to support the new model
3. Add fallback logic for when the model is unavailable
4. Update documentation with setup instructions

## API Design Guidelines

### Endpoints
- Use RESTful conventions
- Include proper HTTP status codes
- Provide comprehensive error messages
- Support pagination for list endpoints

### Models
- Use Pydantic for data validation
- Include comprehensive field documentation
- Support both create and read models
- Use enums for constrained values

### Error Handling
- Use specific exception types
- Log errors with context
- Return user-friendly error messages
- Include error codes for API consumers

## Japanese Optimization Guidelines

### Content Guidelines
- Use appropriate Japanese language levels
- Consider cultural context and seasonal events
- Optimize for Japanese social media behaviors
- Include relevant Japanese hashtags

### Timing Optimization
- Consider Japanese time zones (JST)
- Optimize for peak engagement hours (19:00-21:00)
- Account for Japanese holidays and events
- Schedule across different platforms strategically

### Platform-Specific Considerations
- **TikTok Japan**: Focus on trends, challenges, anime culture
- **Instagram Japan**: High-quality visuals, lifestyle content
- **YouTube Japan**: Educational content, entertainment value

## Testing Guidelines

### Unit Tests
- Test all public methods
- Mock external dependencies
- Use parametrized tests for multiple scenarios
- Aim for 90%+ code coverage

### Integration Tests
- Test API endpoints end-to-end
- Test database interactions
- Test Celery task execution
- Test social media integrations (with mocks)

### Performance Tests
- Test video generation performance
- Test API response times
- Test concurrent campaign processing
- Monitor memory usage during video creation

## Deployment

### Production Checklist
- [ ] Set secure secret keys
- [ ] Configure production database
- [ ] Set up proper logging
- [ ] Configure monitoring
- [ ] Set up backup strategies
- [ ] Configure auto-scaling
- [ ] Test disaster recovery

### Environment Variables
Make sure all production environment variables are set:
- Database credentials
- API keys for all services
- Storage configuration
- Monitoring and logging setup

## Getting Help

1. Check the README for basic setup
2. Review existing code and tests for patterns
3. Create GitHub issues for bugs or feature requests
4. Join our development discussions

## License

This project is licensed under the MIT License - see LICENSE file for details.