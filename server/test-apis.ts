import { GoogleGenAI } from "@google/genai";

// Simple API connectivity test
export async function testGeminiConnectivity() {
  console.log("🧪 Testing Gemini API connectivity...");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("❌ GEMINI_API_KEY not found");
    return false;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log("✅ Gemini client initialized successfully");
    
    // Test with a simple prompt
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say 'Hello, API test successful!'"
    });
    
    const text = response.text || "";
    console.log("✅ Gemini API response:", text.substring(0, 100));
    return true;
    
  } catch (error) {
    console.log("❌ Gemini API error:", error);
    return false;
  }
}

export async function testVideoAPIs() {
  console.log("🧪 Testing Video Generation APIs...");
  
  const mochiKey = process.env.MOCHI_API_KEY;
  const lumaKey = process.env.LUMA_API_KEY;
  
  console.log("Mochi API Key:", mochiKey ? "✅ Present" : "❌ Missing");
  console.log("Luma API Key:", lumaKey ? "✅ Present" : "❌ Missing");
  
  return {
    mochi: !!mochiKey,
    luma: !!lumaKey
  };
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting API Connectivity Tests\n");
  
  const geminiResult = await testGeminiConnectivity();
  const videoResults = await testVideoAPIs();
  
  console.log("\n📊 Test Results Summary:");
  console.log("Gemini API:", geminiResult ? "✅ Working" : "❌ Failed");
  console.log("Mochi API:", videoResults.mochi ? "✅ Key Present" : "❌ Key Missing");
  console.log("Luma API:", videoResults.luma ? "✅ Key Present" : "❌ Key Missing");
}

// Export for manual testing
if (require.main === module) {
  runAllTests();
}