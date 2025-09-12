# Smartphone Automation Setup Guide

## Overview

This guide provides step-by-step instructions for setting up smartphone automation integration with the Urepli platform to manage 10 smartphones for automated social media content watching and posting.

## Prerequisites

### Hardware Requirements
- 10 Android smartphones (Android 8.0 or higher recommended)
- Dedicated server or powerful workstation for Appium hub
- USB cables and powered USB hubs
- Stable high-speed internet connection (at least 100 Mbps)
- Network switch for device connectivity

### Software Requirements
- Ubuntu 20.04+ or CentOS 8+ server
- Node.js 18+ and npm
- Java 8+ (for Appium)
- Android SDK and ADB
- Docker (recommended for containerization)

## Phase 1: Infrastructure Setup

### 1.1 Server Environment Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Java 8
sudo apt install openjdk-8-jdk -y

# Install Android SDK
wget https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip
unzip commandlinetools-linux-8512546_latest.zip
mkdir -p ~/android-sdk/cmdline-tools/latest
mv cmdline-tools/* ~/android-sdk/cmdline-tools/latest/

# Set environment variables
echo 'export ANDROID_HOME=~/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc

# Accept Android SDK licenses
yes | sdkmanager --licenses

# Install platform tools
sdkmanager "platform-tools" "platforms;android-30"
```

### 1.2 Appium Installation and Configuration

```bash
# Install Appium globally
npm install -g appium@next

# Install Appium drivers
appium driver install uiautomator2
appium driver install xcuitest  # If using iOS devices

# Install Appium Inspector (optional, for debugging)
npm install -g @appium/inspector

# Verify Appium installation
appium doctor --android
```

### 1.3 STF (Smartphone Test Farm) Setup

```bash
# Clone STF repository
git clone https://github.com/DeviceFarmer/stf.git
cd stf

# Install dependencies
npm install

# Build STF
npm run build

# Install STF globally
npm install -g stf
```

## Phase 2: Device Preparation

### 2.1 Android Device Configuration

For each of the 10 Android devices:

1. **Enable Developer Options:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Developer Options will appear in Settings

2. **Enable USB Debugging:**
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
   - Enable "Stay Awake"
   - Enable "Allow mock locations"

3. **Disable Security Features:**
   ```bash
   # Connect device via USB and run:
   adb shell settings put global verifier_verify_adb_installs 0
   adb shell settings put global package_verifier_enable 0
   ```

4. **Install Required Apps:**
   - Install TikTok, Instagram, YouTube
   - Complete initial app setup
   - Log into accounts if using existing accounts

### 2.2 Device Identification

```bash
# List all connected devices
adb devices

# Get device information for each device
adb -s <device_serial> shell getprop ro.build.version.release  # Android version
adb -s <device_serial> shell wm size  # Screen resolution
adb -s <device_serial> shell getprop ro.product.model  # Device model
```

Create a device inventory file:
```json
[
  {
    "id": "device_001",
    "udid": "emulator-5554",
    "name": "Samsung Galaxy A54",
    "platform": "android",
    "osVersion": "13.0",
    "screenResolution": {
      "width": 1080,
      "height": 2340,
      "density": 3
    }
  }
]
```

## Phase 3: Urepli Integration

### 3.1 Install Smartphone Automation Dependencies

```bash
cd /home/runner/work/Urepli/Urepli

# Install additional dependencies for smartphone automation
npm install appium webdriver selenium-webdriver pure-python-adb
```

### 3.2 Configure Environment Variables

Add to your `.env` file:

```bash
# Smartphone Automation Configuration
APPIUM_HOST=localhost
APPIUM_PORT=4723
STF_HOST=localhost
STF_PORT=7100

# Device Management
MAX_DEVICES=10
DEVICE_HEALTH_CHECK_INTERVAL=60000
SESSION_TIMEOUT=3600000

# Mobile Proxy Configuration (optional)
MOBILE_PROXY_ENABLED=false
MOBILE_PROXY_PROVIDER=brightdata
MOBILE_PROXY_USERNAME=your_username
MOBILE_PROXY_PASSWORD=your_password

# Platform API Keys (for enhanced features)
TIKTOK_API_KEY=your_tiktok_api_key
INSTAGRAM_API_KEY=your_instagram_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### 3.3 Initialize Device Configuration

Create `server/config/smartphone-devices.json`:

```json
{
  "devices": [
    {
      "id": "device_001",
      "udid": "your_device_udid_1",
      "name": "Device 1 - TikTok Primary",
      "platform": "android",
      "osVersion": "13.0",
      "capabilities": {
        "canPostVideo": true,
        "canWatchContent": true,
        "canEngageContent": true,
        "supportedPlatforms": ["tiktok", "instagram", "youtube"]
      },
      "accountAssignments": [
        {
          "platform": "tiktok",
          "accountId": "tiktok_account_1",
          "username": "your_tiktok_username"
        }
      ]
    }
  ]
}
```

## Phase 4: Service Integration

### 4.1 Update Main Server Index

Add to `server/index.ts`:

```typescript
import { SmartphoneDeviceManager } from './services/smartphone-device-manager';
import { MobileContentWatcher } from './services/mobile-content-watcher';
import { SmartphoneCoordinator } from './services/smartphone-coordinator';
import { createSmartphoneAutomationRoutes } from './routes/smartphone-automation';

// Initialize smartphone automation services
const deviceManager = new SmartphoneDeviceManager(storage);
const contentWatcher = new MobileContentWatcher(deviceManager, storage);
const coordinator = new SmartphoneCoordinator(deviceManager, contentWatcher, multiAccountPoster, storage);

// Add smartphone automation routes
app.use('/api/smartphone-automation', createSmartphoneAutomationRoutes(
  deviceManager, 
  contentWatcher, 
  coordinator, 
  storage
));
```

### 4.2 Update Frontend Navigation

Add to your main navigation component:

```tsx
import { Link } from 'wouter';

// Add to navigation menu
<Link href="/smartphone-automation">
  <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
    <Smartphone className="h-4 w-4" />
    <span>Smartphone Automation</span>
  </div>
</Link>
```

Add route in your app router:
```tsx
import { Route } from 'wouter';
import SmartphoneAutomationDashboard from './components/SmartphoneAutomationDashboard';

<Route path="/smartphone-automation" component={SmartphoneAutomationDashboard} />
```

## Phase 5: Service Startup and Testing

### 5.1 Start Required Services

1. **Start Appium Hub:**
```bash
# Terminal 1 - Start Appium
appium --relaxed-security --allow-insecure chromedriver_autodownload
```

2. **Start STF (optional, for device management UI):**
```bash
# Terminal 2 - Start STF
stf local --public-ip your_server_ip
```

3. **Start Urepli Server:**
```bash
# Terminal 3 - Start Urepli with smartphone automation
cd /home/runner/work/Urepli/Urepli
npm run dev
```

### 5.2 Initial Device Registration

Use the API or dashboard to register devices:

```bash
# Register first device via API
curl -X POST http://localhost:3000/api/smartphone-automation/devices \
  -H "Content-Type: application/json" \
  -d '{
    "udid": "your_device_udid",
    "name": "Test Device 1",
    "platform": "android",
    "osVersion": "13.0",
    "capabilities": {
      "canPostVideo": true,
      "canWatchContent": true,
      "canEngageContent": true,
      "supportedPlatforms": ["tiktok", "instagram", "youtube"]
    }
  }'
```

### 5.3 Test Basic Functionality

1. **Check Device Status:**
```bash
curl http://localhost:3000/api/smartphone-automation/devices
```

2. **Start a Test Watching Session:**
```bash
curl -X POST http://localhost:3000/api/smartphone-automation/watching/start \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "tiktok",
    "duration": 5,
    "profile": {
      "contentTypes": ["entertainment"],
      "hashtags": ["#fyp"],
      "creators": [],
      "engagementRate": 0.1,
      "watchDurationRange": {"min": 15, "max": 30},
      "scrollPattern": "natural"
    },
    "priority": "medium"
  }'
```

## Phase 6: Production Deployment

### 6.1 Docker Containerization

Create `docker-compose.smartphone.yml`:

```yaml
version: '3.8'

services:
  appium-hub:
    image: appium/appium:latest
    ports:
      - "4723:4723"
    volumes:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    environment:
      - RELAXED_SECURITY=true
      - ALLOW_INSECURE=chromedriver_autodownload
    
  stf:
    image: devicefarmer/stf:latest
    ports:
      - "7100:7100"
    volumes:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    depends_on:
      - redis
      - rethinkdb
    
  redis:
    image: redis:alpine
    
  rethinkdb:
    image: rethinkdb:latest
    ports:
      - "8080:8080"
```

### 6.2 Monitoring and Alerts

Set up monitoring for:
- Device health and connectivity
- Appium session status
- Content watching performance
- Error rates and failures

### 6.3 Backup and Recovery

1. **Device Configuration Backup:**
```bash
# Backup device configurations
adb backup -all -f device_backup.ab
```

2. **Account Data Backup:**
- Export account credentials securely
- Backup session data and statistics
- Document device-account assignments

## Phase 7: Advanced Configuration

### 7.1 Proxy Integration

For enhanced anonymity and geo-distribution:

```typescript
// Add proxy configuration to device setup
const proxyConfig = {
  server: 'mobile-proxy.provider.com',
  port: 8080,
  username: 'proxy_user',
  password: 'proxy_pass',
  country: 'JP',  // Japan for Japanese market focus
  carrier: 'docomo'
};
```

### 7.2 Advanced Anti-Detection

```typescript
// Implement advanced fingerprinting protection
const fingerprint = {
  userAgent: 'realistic_mobile_user_agent',
  screenResolution: { width: 1080, height: 2340 },
  timezone: 'Asia/Tokyo',
  locale: 'ja-JP',
  hardware: {
    deviceName: 'Samsung Galaxy S23',
    androidId: 'randomized_android_id',
    buildId: 'realistic_build_id'
  }
};
```

### 7.3 Performance Optimization

1. **Device Resource Management:**
   - Monitor CPU and memory usage
   - Implement device rotation for heavy tasks
   - Schedule maintenance windows

2. **Network Optimization:**
   - Use mobile proxies for realistic traffic patterns
   - Implement bandwidth throttling
   - Monitor data usage per device

3. **Content Strategy Optimization:**
   - A/B test different watching patterns
   - Analyze engagement effectiveness
   - Optimize timing and frequency

## Troubleshooting

### Common Issues and Solutions

1. **Device Not Detected:**
```bash
# Restart ADB server
adb kill-server
adb start-server

# Check USB permissions
lsusb
sudo chmod 666 /dev/bus/usb/*/*
```

2. **Appium Session Failures:**
```bash
# Clear Appium logs
rm -rf /tmp/appium*

# Restart Appium with verbose logging
appium --log-level debug
```

3. **App Installation Issues:**
```bash
# Force install APK
adb install -r -g app.apk

# Grant permissions
adb shell pm grant com.package.name android.permission.CAMERA
```

4. **Performance Issues:**
```bash
# Monitor device performance
adb shell top
adb shell dumpsys meminfo
adb shell dumpsys battery
```

## Security Considerations

### Account Safety
- Use unique accounts per device
- Implement account warming periods
- Monitor for unusual activity patterns
- Regular account health checks

### Network Security
- Use VPNs or mobile proxies
- Rotate IP addresses regularly
- Monitor for rate limiting
- Implement circuit breakers

### Data Protection
- Encrypt sensitive account data
- Secure API keys and tokens
- Implement audit logging
- Regular security assessments

## Maintenance Schedule

### Daily Tasks
- Check device health status
- Monitor active sessions
- Review error logs
- Verify account status

### Weekly Tasks
- Update device software
- Clean temporary files
- Backup configuration data
- Performance analysis

### Monthly Tasks
- Full system backup
- Security audit
- Hardware maintenance
- Strategy optimization

## Performance Metrics

### Key Performance Indicators (KPIs)
- Device uptime percentage
- Content watching hours per day
- Engagement rates by platform
- Success rate of posting operations
- Account health scores

### Monitoring Dashboards
- Real-time device status
- Session analytics
- Performance trends
- Alert notifications

This setup guide provides a comprehensive foundation for integrating smartphone automation with the Urepli platform. Start with Phase 1-3 for basic functionality, then gradually implement advanced features as needed.