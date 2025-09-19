import { fal } from '@fal-ai/client';
import fs from 'fs/promises';

console.log('🔑 Fal.ai API Key Setup Helper');
console.log('==============================');
console.log('');

// Check if user provided a key as argument
const newApiKey = process.argv[2];

if (!newApiKey) {
    console.log('📋 Step-by-Step Instructions:');
    console.log('');
    console.log('1. 🌐 Open https://fal.ai/dashboard in your browser');
    console.log('2. 🔐 Sign in or create an account');
    console.log('3. 📱 Find "API Keys" section (usually in Settings or sidebar)');
    console.log('4. ➕ Click "Create API Key" or "Generate New Key"');
    console.log('5. 📋 Copy the complete key (69 characters long)');
    console.log('6. 🧪 Test it with this command:');
    console.log('');
    console.log('   node setup-api-key.js "your-copied-key-here"');
    console.log('');
    console.log('💡 The key format looks like:');
    console.log('   12345678-1234-1234-1234-123456789012:abcdef1234567890abcdef1234567890');
    console.log('');
    console.log('⚠️  IMPORTANT: Copy the key immediately - you won\'t see it again!');
    
    // Try to open browser again if it didn't work
    console.log('');
    console.log('🔄 Opening Fal.ai dashboard...');
    
    return;
}

// If user provided a key, test it
console.log('🔐 Testing your API key...');
console.log('Key format:', `${newApiKey.substring(0, 8)}...${newApiKey.slice(-8)}`);
console.log('Key length:', newApiKey.length);

// Validate format
const keyPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}:[a-f0-9]{32}$/;
const isValidFormat = keyPattern.test(newApiKey);

if (!isValidFormat) {
    console.log('');
    console.log('❌ Invalid API key format!');
    console.log('');
    console.log('Expected format:');
    console.log('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('');
    console.log('Make sure you copied the complete key including the colon (:)');
    console.log('');
    console.log('🔄 Try again with the complete key:');
    console.log(`   node setup-api-key.js "your-complete-key-here"`);
    return;
}

console.log('✅ Format looks good!');
console.log('');
console.log('🧪 Testing API connection...');

try {
    // Configure client
    fal.config({ credentials: newApiKey });
    
    // Test with a simple API call
    console.log('📤 Submitting test request...');
    
    const startTime = Date.now();
    const result = await fal.queue.submit('fal-ai/veo3/fast/image-to-video', {
        input: {
            prompt: "A peaceful test scene with gentle motion",
            image_url: "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
            duration: "8s",
            resolution: "720p"
        }
    });
    
    const testTime = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 SUCCESS! Your API key is working perfectly!');
    console.log('✅ Request submitted successfully');
    console.log('🆔 Request ID:', result.request_id);
    console.log('⏱️ Response time:', `${testTime}ms`);
    
    // Check status
    console.log('📊 Checking request status...');
    const status = await fal.queue.status('fal-ai/veo3/fast/image-to-video', {
        requestId: result.request_id
    });
    
    console.log('📈 Status:', status.status);
    console.log('');
    console.log('💾 Saving your working API key to .env file...');
    
    // Save to .env file
    try {
        let envContent = '';
        try {
            envContent = await fs.readFile('.env', 'utf8');
        } catch (error) {
            // File doesn't exist, create new
        }
        
        const lines = envContent.split('\n');
        let keyUpdated = false;
        
        const newLines = lines.map(line => {
            if (line.startsWith('FAL_KEY=')) {
                keyUpdated = true;
                return `FAL_KEY=${newApiKey}`;
            }
            return line;
        });
        
        if (!keyUpdated) {
            newLines.push(`FAL_KEY=${newApiKey}`);
        }
        
        await fs.writeFile('.env', newLines.join('\n'));
        
        console.log('✅ API key saved to .env file!');
        console.log('');
        console.log('🚀 You\'re all set! Try these commands:');
        console.log('');
        console.log('   npm run basic           # Simple video generation');
        console.log('   npm run advanced        # Advanced features');
        console.log('   npm run comprehensive   # Full-featured examples');
        console.log('');
        console.log('🎬 Start creating amazing AI videos!');
        
    } catch (saveError) {
        console.log('⚠️  Couldn\'t save to .env file automatically');
        console.log('💡 Please manually add this line to your .env file:');
        console.log(`   FAL_KEY=${newApiKey}`);
        console.log('');
        console.log('🚀 Then you can run:');
        console.log('   npm run basic');
    }
    
} catch (error) {
    console.log('');
    console.log('❌ API key test failed:', error.message);
    console.log('');
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
        console.log('🔍 This means:');
        console.log('• Your account might need credits added');
        console.log('• You might need to verify your account');
        console.log('• Your plan might not include Veo 3 access');
        console.log('');
        console.log('💡 Solutions:');
        console.log('• Check your account status at https://fal.ai/dashboard');
        console.log('• Add credits or update your payment method');
        console.log('• Contact Fal.ai support if needed');
        
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('🔍 This means the API key is invalid');
        console.log('• Double-check you copied the complete key');
        console.log('• Make sure you included the colon (:) and everything after it');
        console.log('• Try generating a new API key');
        
    } else {
        console.log('🔍 This might be a network or temporary issue');
        console.log('• Check your internet connection');
        console.log('• Try again in a few minutes');
    }
}

console.log('');
console.log('📚 Need help? Check these files:');
console.log('• QUICK-START.md     - Quick reference');
console.log('• README.md          - Complete documentation');
console.log('• TESTING-SUMMARY.md - Detailed testing guide');
