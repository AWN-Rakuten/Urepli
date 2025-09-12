#!/usr/bin/env node

/**
 * Smartphone Integration Test Script
 */

async function testSmartphoneIntegration() {
  console.log('🧪 Testing Smartphone Automation Integration...\n');
  
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  try {
    // Test device management endpoint
    console.log('Testing device management...');
    const response = await fetch(`${baseUrl}/api/smartphone-automation/devices`);
    
    if (response.ok) {
      console.log('✅ Device management API working');
    } else {
      console.log('❌ Device management API failed');
    }
    
    console.log('\n🎉 Smartphone automation integration test completed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\n💡 Make sure the Urepli server is running: npm run dev');
  }
}

if (require.main === module) {
  testSmartphoneIntegration();
}

export { testSmartphoneIntegration };
