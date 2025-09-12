#!/usr/bin/env node

/**
 * Smartphone Automation Setup Script
 * Sets up the integration between Urepli and smartphone automation services
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🤖 Setting up Smartphone Automation Integration...\n');

// Check if we're in the correct directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the Urepli root directory');
  process.exit(1);
}

// Function to safely execute commands
function safeExec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.warn(`⚠️  Warning: ${command} failed - ${error.message}`);
    return null;
  }
}

// Function to update package.json with smartphone automation scripts
function updatePackageJson() {
  console.log('📦 Updating package.json with smartphone automation scripts...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add smartphone automation specific scripts
  if (!packageJson.scripts['smartphone:setup']) {
    packageJson.scripts['smartphone:setup'] = 'node scripts/setup-smartphone-automation.js';
    packageJson.scripts['smartphone:devices'] = 'adb devices';
    packageJson.scripts['smartphone:appium'] = 'appium --relaxed-security --allow-insecure chromedriver_autodownload';
    packageJson.scripts['smartphone:test'] = 'node scripts/test-smartphone-integration.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added smartphone automation scripts to package.json');
  } else {
    console.log('✅ Smartphone automation scripts already exist');
  }
}

// Function to create example configuration files
function createExampleConfigs() {
  console.log('📋 Creating example configuration files...');
  
  // Create smartphone devices example config
  const deviceConfigDir = path.join(process.cwd(), 'server', 'config');
  if (!fs.existsSync(deviceConfigDir)) {
    fs.mkdirSync(deviceConfigDir, { recursive: true });
  }
  
  const exampleDeviceConfig = {
    devices: [
      {
        id: 'device_001',
        udid: 'REPLACE_WITH_ACTUAL_UDID',
        name: 'Device 1 - TikTok Primary',
        platform: 'android',
        osVersion: '13.0',
        screenResolution: {
          width: 1080,
          height: 2340,
          density: 3
        },
        capabilities: {
          canPostVideo: true,
          canWatchContent: true,
          canEngageContent: true,
          supportedPlatforms: ['tiktok', 'instagram', 'youtube']
        },
        proxyConfig: {
          server: 'your-mobile-proxy.com',
          port: 8080,
          username: 'proxy_user',
          password: 'proxy_pass',
          country: 'JP'
        },
        accountAssignments: [
          {
            platform: 'tiktok',
            accountId: 'tiktok_account_1',
            username: 'your_tiktok_username'
          }
        ]
      }
    ]
  };
  
  const deviceConfigPath = path.join(deviceConfigDir, 'smartphone-devices.example.json');
  if (!fs.existsSync(deviceConfigPath)) {
    fs.writeFileSync(deviceConfigPath, JSON.stringify(exampleDeviceConfig, null, 2));
    console.log('✅ Created example device configuration');
  }
  
  // Update .env.example with smartphone automation variables
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    let envExample = fs.readFileSync(envExamplePath, 'utf8');
    
    const smartphoneEnvVars = `

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

# Platform Enhancement Keys
TIKTOK_AUTOMATION_ENABLED=true
INSTAGRAM_AUTOMATION_ENABLED=true
YOUTUBE_AUTOMATION_ENABLED=true
`;

    if (!envExample.includes('SMARTPHONE AUTOMATION')) {
      envExample += smartphoneEnvVars;
      fs.writeFileSync(envExamplePath, envExample);
      console.log('✅ Added smartphone automation environment variables to .env.example');
    }
  }
}

// Function to check system prerequisites
function checkPrerequisites() {
  console.log('🔍 Checking system prerequisites...\n');
  
  const checks = [
    {
      name: 'Node.js (18+)',
      command: 'node --version',
      test: (output) => output && parseFloat(output.match(/v(\d+)/)?.[1] || '0') >= 18
    },
    {
      name: 'npm',
      command: 'npm --version',
      test: (output) => output && output.trim().length > 0
    },
    {
      name: 'Java (for Appium)',
      command: 'java -version',
      test: (output) => output && output.includes('version')
    },
    {
      name: 'ADB (Android Debug Bridge)',
      command: 'adb version',
      test: (output) => output && output.includes('Android Debug Bridge')
    },
    {
      name: 'Appium',
      command: 'appium --version',
      test: (output) => output && output.trim().length > 0
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const output = safeExec(check.command);
    const passed = check.test(output);
    
    console.log(`${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'OK' : 'NOT FOUND'}`);
    
    if (!passed) {
      allPassed = false;
    }
  });
  
  console.log('');
  
  if (!allPassed) {
    console.log('⚠️  Some prerequisites are missing. Please refer to docs/SMARTPHONE_SETUP_GUIDE.md for installation instructions.\n');
  }
  
  return allPassed;
}

// Function to check connected devices
function checkConnectedDevices() {
  console.log('📱 Checking connected Android devices...');
  
  const adbOutput = safeExec('adb devices');
  if (adbOutput) {
    const devices = adbOutput.split('\n')
      .filter(line => line.includes('\tdevice'))
      .map(line => line.split('\t')[0]);
    
    console.log(`✅ Found ${devices.length} connected device(s):`);
    devices.forEach(device => console.log(`   - ${device}`));
    
    if (devices.length === 0) {
      console.log('⚠️  No devices connected. Please connect your Android devices via USB and enable USB debugging.');
    }
    
    return devices;
  } else {
    console.log('❌ Could not check devices (ADB not available)');
    return [];
  }
}

// Function to create a test script
function createTestScript() {
  console.log('🧪 Creating integration test script...');
  
  const testScript = `#!/usr/bin/env node

/**
 * Smartphone Integration Test Script
 */

async function testSmartphoneIntegration() {
  console.log('🧪 Testing Smartphone Automation Integration...\\n');
  
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  try {
    // Test device management endpoint
    console.log('Testing device management...');
    const response = await fetch(\`\${baseUrl}/api/smartphone-automation/devices\`);
    
    if (response.ok) {
      console.log('✅ Device management API working');
    } else {
      console.log('❌ Device management API failed');
    }
    
    console.log('\\n🎉 Smartphone automation integration test completed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\\n💡 Make sure the Urepli server is running: npm run dev');
  }
}

if (require.main === module) {
  testSmartphoneIntegration();
}

export { testSmartphoneIntegration };
`;

  const testScriptPath = path.join(process.cwd(), 'scripts', 'test-smartphone-integration.js');
  
  fs.writeFileSync(testScriptPath, testScript);
  console.log('✅ Created integration test script');
}

// Main setup function
async function setupSmartphoneAutomation() {
  try {
    console.log('🚀 Starting Smartphone Automation Setup...\n');
    
    // Check prerequisites
    const prereqsPassed = checkPrerequisites();
    
    // Update package.json
    updatePackageJson();
    
    // Create configuration files
    createExampleConfigs();
    
    // Check connected devices
    const devices = checkConnectedDevices();
    
    // Create test script
    createTestScript();
    
    console.log('\n🎉 Smartphone Automation Setup Complete!\n');
    
    // Print next steps
    console.log('📋 Next Steps:');
    console.log('1. Review and update server/config/smartphone-devices.example.json with your actual device UDIDs');
    console.log('2. Copy .env.example to .env and configure smartphone automation variables');
    console.log('3. Install required system dependencies (see docs/SMARTPHONE_SETUP_GUIDE.md)');
    console.log('4. Connect your Android devices and run: npm run smartphone:devices');
    console.log('5. Start the Urepli server: npm run dev');
    console.log('6. Test the integration: npm run smartphone:test');
    console.log('\\n📚 Full setup guide: docs/SMARTPHONE_SETUP_GUIDE.md');
    
    if (!prereqsPassed) {
      console.log('\\n⚠️  Please install missing prerequisites before proceeding.');
    }
    
    if (devices.length > 0) {
      console.log(`\\n✅ Great! You have ${devices.length} device(s) connected and ready to configure.`);
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupSmartphoneAutomation();

export { setupSmartphoneAutomation };