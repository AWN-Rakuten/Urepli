# Urepli N8N Workflow Automation

This directory contains importable N8N workflows for the Urepli profit-optimized growth engine. These workflows automate the entire process from viral content discovery to ads optimization and learning.

## 📋 Available Workflows

### 1. **viral-to-ads-learn.json** - Main Automation Pipeline
**Description:** Complete automation of Japanese viral content → ads → learning cycle

**Triggers:**
- **Daily 05:00 JST:** Trend harvesting, content generation, and posting
- **Hourly:** Viral content detection and ad campaign creation  
- **Nightly 02:00 JST:** Attribution learning and bandit optimization

**Flow A (Daily 05:00 JST):**
```
Trends → Creative Gen → Offer Router → Post → Queue "Boost Watcher"
```

**Flow B (Hourly):**
```  
If trigger met → Ads create (TT/Meta/Google) → notify dashboard
```

**Flow C (Nightly 02:00 JST):**
```
Affiliate conversions ingest → Update bandits → Email report
```

### 2. **budget-optimization.json** - Budget & Performance Monitor
**Description:** Automated budget allocation and performance monitoring

**Triggers:**
- **Daily 08:00 JST:** Budget optimization using ROAS constraints
- **Every 4 hours:** Performance monitoring and auto-adjustments

**Features:**
- Greedy budget allocation in ¥1K chunks
- ROAS-based constraint optimization
- Automatic campaign pause/scaling
- Real-time performance alerts

### 3. **compliance-monitor.json** - Japanese Compliance Automation  
**Description:** Ensures Japanese market regulatory compliance

**Triggers:**
- **Every 30 minutes:** Content compliance checking
- **Weekly Monday 9AM JST:** Compliance reporting

**Compliance Checks:**
- ステマ規制 (Stealth Marketing Regulations)
- 薬機法 (Pharmaceutical and Medical Device Act)
- 景品表示法 (Act Against Unjustifiable Premiums)
- Amazon Associates disclosure
- Affiliate link disclosure

## 🚀 Installation Instructions

### Prerequisites
1. N8N instance running (latest version)
2. Urepli API endpoints accessible
3. Required API keys configured

### Setup Steps

1. **Install N8N (if not already installed):**
```bash
npm install n8n@latest -g
```

2. **Start N8N:**
```bash
n8n start --tunnel
```

3. **Import Workflows:**
```bash
# Import main automation workflow
n8n import:workflow --file=./n8n-workflows/viral-to-ads-learn.json

# Import budget optimization workflow  
n8n import:workflow --file=./n8n-workflows/budget-optimization.json

# Import compliance monitor workflow
n8n import:workflow --file=./n8n-workflows/compliance-monitor.json
```

4. **Configure Environment Variables:**
Set the following variables in your N8N environment:
```bash
UREPLI_BASE_URL=https://your-urepli-instance.com
UREPLI_API_KEY=your_api_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_url
EMAIL_CONFIG=your_email_configuration
```

5. **Activate Workflows:**
- Go to N8N web interface
- Enable each imported workflow
- Test trigger execution
- Monitor execution logs

## ⚙️ Configuration

### API Endpoints Required
The workflows expect these Urepli API endpoints to be available:

**Trend & Content:**
- `GET /api/trends/tiktok/harvest`
- `POST /api/creative/generate-batch`
- `POST /api/social/multi-platform-post`

**Ads & Budget:**
- `POST /api/boost/scan-opportunities` 
- `POST /api/ads/create-campaigns`
- `POST /api/budget/optimize`
- `POST /api/budget/apply-changes`

**Attribution & Learning:**
- `POST /api/attribution/ingest-conversions`
- `POST /api/bandit/update-priors`

**Compliance:**
- `POST /api/compliance/check`
- `POST /api/compliance/auto-fix`

### Customization Options

**Budget Constraints (budget-optimization.json):**
```javascript
// Modify in "Calculate Budget Constraints" node
const constraints = {
  totalBudgetJPY: totalBudget,           // Total daily budget
  minROAS: minROAS,                      // Minimum ROAS threshold
  maxMER: maxMER,                        // Maximum MER allowed
  minBudgetPerChannel: 1000,             // Min ¥1K per channel
  maxBudgetPerChannel: totalBudget * 0.6, // Max 60% per channel
  channelLimits: {
    tiktok: { min: 1000, max: totalBudget * 0.4 },
    meta: { min: 1000, max: totalBudget * 0.4 },
    google: { min: 1000, max: totalBudget * 0.5 }
  }
};
```

**Boost Thresholds (viral-to-ads-learn.json):**
```javascript
// Modify performance thresholds
const BOOST_THRESHOLDS = {
  VIEWS_60M: 1000,      // Minimum views in 60 minutes
  CTR_THRESHOLD: 0.03,  // 3% CTR threshold  
  MIN_ENGAGEMENT: 50,   // Minimum engagement
  ROAS_FORECAST_MIN: 2.0 // Minimum forecasted ROAS
};
```

**Compliance Rules (compliance-monitor.json):**
```javascript
// Modify compliance rules
const rules = {
  stealthMarketingDisclosure: true,      // ステマ規制
  affiliateDisclosure: true,             // Affiliate disclosure
  amazonAssociatesDisclosure: true,      // Amazon disclosure
  misleadingClaimsCheck: true,           // 景品表示法
  yakujiLawCompliance: true,             // 薬機法
  commercialTransactionDisclosure: false // 特定商取引法
};
```

## 📊 Monitoring & Analytics

### Workflow Execution Logs
Monitor workflow performance in N8N:
- Execution success rate
- Average execution time  
- Error frequency and types
- Resource usage

### Key Metrics Tracked
- **Content Performance:** Views, CTR, conversions per post
- **Budget Efficiency:** ROAS, MER, profit per channel
- **Compliance Rate:** Approval rate, auto-fix success rate
- **Attribution Accuracy:** Conversion tracking accuracy

### Alerts & Notifications
Workflows send notifications via:
- **Slack:** Real-time alerts for performance issues
- **Email:** Daily/weekly reports
- **Dashboard:** Live performance updates

## 🔧 Troubleshooting

### Common Issues

**1. Workflow Fails to Trigger:**
- Check cron expression syntax
- Verify N8N timezone settings (should be UTC)
- Ensure workflow is activated

**2. API Requests Fail:**  
- Verify base URL configuration
- Check API key validity
- Monitor rate limits

**3. Budget Optimization Errors:**
- Ensure performance data is available
- Check budget constraint values
- Verify ad platform API connectivity

**4. Compliance Check Failures:**
- Update compliance rules if regulations change
- Check content format expectations
- Verify Japanese language processing

### Debug Mode
Enable debug logging by setting:
```bash
N8N_LOG_LEVEL=debug
```

### Performance Optimization
- Adjust batch sizes for large content volumes
- Use webhook triggers for real-time processing
- Implement caching for frequently accessed data

## 📈 Success Metrics

### Target Performance (Japanese Market)
- **Content Approval Rate:** >90% automated compliance
- **Boost Trigger Rate:** 15-20% of posts meeting viral criteria  
- **Budget Optimization:** >3.0 ROAS across all channels
- **Attribution Accuracy:** >85% conversion tracking
- **Execution Reliability:** >99.5% workflow success rate

### Scaling Considerations
- Monitor N8N resource usage as content volume grows
- Consider workflow splitting for high-volume scenarios
- Implement queue-based processing for peak periods

## 🆘 Support

For workflow issues:
1. Check N8N execution logs
2. Verify API endpoint connectivity
3. Review configuration parameters
4. Contact technical support with execution IDs

---

**Created for Urepli Profit-Optimized Growth Engine**  
*Automating Japanese affiliate marketing at scale* 🚀