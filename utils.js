/**
 * Utility functions for Fal.ai Veo 3 Image-to-Video operations
 */

import fs from 'fs/promises';
import path from 'path';

// Common prompt templates for different animation styles
export const PromptTemplates = {
    // Nature and landscapes
    nature: {
        gentle: "Gentle breeze moves through the scene with soft, natural motion",
        dramatic: "Dynamic weather changes with dramatic lighting and movement", 
        peaceful: "Serene and peaceful animation with subtle environmental details",
        seasonal: "Show the passage of time with changing seasons and natural cycles"
    },

    // People and portraits
    portrait: {
        subtle: "Subtle facial expressions and gentle eye movements",
        expressive: "Dynamic expressions showing emotion and personality",
        cinematic: "Cinematic portrait with professional lighting changes",
        lifestyle: "Natural lifestyle movements and casual interactions"
    },

    // Objects and products
    product: {
        showcase: "Elegant product showcase with smooth rotation and lighting",
        demo: "Product demonstration showing features and functionality", 
        artistic: "Artistic presentation with creative angles and effects",
        commercial: "Commercial-style product animation with brand appeal"
    },

    // Abstract and artistic
    artistic: {
        fluid: "Fluid, abstract motion with artistic visual effects",
        geometric: "Geometric patterns and shapes in motion", 
        painterly: "Painterly effects with artistic brush strokes and color flow",
        surreal: "Surreal and dreamlike transformations"
    },

    // Architecture and spaces
    architecture: {
        walkthrough: "Smooth camera walkthrough of the architectural space",
        lighting: "Dynamic lighting changes showing different times of day",
        details: "Focus on architectural details and textures",
        atmosphere: "Atmospheric effects showcasing the space's mood"
    }
};

// Video configuration presets for different use cases
export const VideoPresets = {
    // Social media optimized
    social: {
        instagram: { duration: "8s", resolution: "720p", aspectRatio: "9:16", generateAudio: true },
        youtube: { duration: "8s", resolution: "1080p", aspectRatio: "16:9", generateAudio: true },
        tiktok: { duration: "8s", resolution: "720p", aspectRatio: "9:16", generateAudio: true },
        twitter: { duration: "8s", resolution: "720p", aspectRatio: "16:9", generateAudio: false }
    },

    // Professional use
    professional: {
        presentation: { duration: "8s", resolution: "1080p", aspectRatio: "16:9", generateAudio: false },
        marketing: { duration: "8s", resolution: "1080p", aspectRatio: "16:9", generateAudio: true },
        demo: { duration: "8s", resolution: "720p", aspectRatio: "16:9", generateAudio: true },
        showcase: { duration: "8s", resolution: "1080p", aspectRatio: "auto", generateAudio: true }
    },

    // Quality focused
    quality: {
        high: { duration: "8s", resolution: "1080p", aspectRatio: "auto", generateAudio: true },
        balanced: { duration: "8s", resolution: "720p", aspectRatio: "auto", generateAudio: true },
        fast: { duration: "8s", resolution: "720p", aspectRatio: "auto", generateAudio: false }
    }
};

// File validation utilities
export class FileValidator {
    static supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    static maxSizeInMB = 8;

    static async validateFile(filePath) {
        const errors = [];

        try {
            // Check if file exists
            await fs.access(filePath);
        } catch (error) {
            errors.push(`File does not exist: ${filePath}`);
            return { valid: false, errors };
        }

        try {
            const stats = await fs.stat(filePath);
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName).toLowerCase();
            const sizeInMB = stats.size / (1024 * 1024);

            // Check file format
            if (!this.supportedFormats.includes(ext)) {
                errors.push(`Unsupported format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`);
            }

            // Check file size
            if (sizeInMB > this.maxSizeInMB) {
                errors.push(`File too large: ${sizeInMB.toFixed(2)}MB. Maximum: ${this.maxSizeInMB}MB`);
            }

            // Check if file is empty
            if (stats.size === 0) {
                errors.push('File is empty');
            }

            return {
                valid: errors.length === 0,
                errors,
                info: {
                    fileName,
                    size: sizeInMB,
                    format: ext,
                    path: filePath
                }
            };

        } catch (error) {
            errors.push(`Error reading file: ${error.message}`);
            return { valid: false, errors };
        }
    }

    static async validateMultipleFiles(filePaths) {
        const results = await Promise.allSettled(
            filePaths.map(filePath => this.validateFile(filePath))
        );

        return results.map((result, index) => ({
            filePath: filePaths[index],
            ...result.value
        }));
    }
}

// Batch processing utilities
export class BatchProcessor {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 2;
        this.delayBetweenBatches = options.delayBetweenBatches || 5000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 10000;
    }

    async processBatch(items, processingFunction, options = {}) {
        const concurrent = options.concurrent || this.maxConcurrent;
        const delay = options.delay || this.delayBetweenBatches;

        console.log(`🔄 Processing ${items.length} items in batches of ${concurrent}`);
        
        const results = [];
        
        for (let i = 0; i < items.length; i += concurrent) {
            const batch = items.slice(i, i + concurrent);
            const batchNumber = Math.floor(i / concurrent) + 1;
            const totalBatches = Math.ceil(items.length / concurrent);
            
            console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
            
            const batchPromises = batch.map(async (item, batchIndex) => {
                const itemIndex = i + batchIndex;
                return await this.processWithRetry(
                    () => processingFunction(item, itemIndex),
                    `Item ${itemIndex + 1}`,
                    options
                );
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results
            batchResults.forEach((result, batchIndex) => {
                const itemIndex = i + batchIndex;
                if (result.status === 'fulfilled') {
                    results.push({ index: itemIndex, success: true, data: result.value });
                } else {
                    results.push({ 
                        index: itemIndex, 
                        success: false, 
                        error: result.reason?.message || 'Unknown error' 
                    });
                }
            });
            
            // Delay between batches (except for the last batch)
            if (i + concurrent < items.length && delay > 0) {
                console.log(`⏳ Waiting ${delay/1000}s before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Batch processing completed: ${successful} successful, ${failed} failed`);
        
        return {
            results,
            summary: {
                total: items.length,
                successful,
                failed,
                successRate: (successful / items.length) * 100
            }
        };
    }

    async processWithRetry(fn, itemName, options = {}) {
        const maxAttempts = options.retryAttempts || this.retryAttempts;
        const retryDelay = options.retryDelay || this.retryDelay;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 ${itemName} - Attempt ${attempt}/${maxAttempts}`);
                const result = await fn();
                if (attempt > 1) {
                    console.log(`✅ ${itemName} - Succeeded on attempt ${attempt}`);
                }
                return result;
            } catch (error) {
                console.error(`❌ ${itemName} - Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxAttempts) {
                    console.log(`⏳ ${itemName} - Retrying in ${retryDelay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    console.error(`💥 ${itemName} - All attempts failed`);
                    throw error;
                }
            }
        }
    }
}

// URL validation utilities
export class UrlValidator {
    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    static async checkUrlAccessibility(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return {
                accessible: response.ok,
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
            };
        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }
}

// Progress tracking utilities
export class ProgressTracker {
    constructor(taskName = 'Task') {
        this.taskName = taskName;
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.updateInterval = 10000; // 10 seconds
    }

    createHandler() {
        return {
            onQueueUpdate: (update) => {
                const now = Date.now();
                const elapsed = Math.round((now - this.startTime) / 1000);
                
                switch (update.status) {
                    case 'IN_QUEUE':
                        const position = update.queue_position || 'Unknown';
                        console.log(`⏳ [${elapsed}s] ${this.taskName} - Queued (Position: ${position})`);
                        break;
                        
                    case 'IN_PROGRESS':
                        if (now - this.lastUpdate > this.updateInterval) {
                            console.log(`🔄 [${elapsed}s] ${this.taskName} - Processing...`);
                            this.lastUpdate = now;
                        }
                        
                        // Log progress messages
                        if (update.logs && update.logs.length > 0) {
                            update.logs.forEach(log => {
                                if (log.level === 'info' || log.level === 'progress') {
                                    console.log(`   📋 ${log.message}`);
                                }
                            });
                        }
                        break;
                        
                    case 'COMPLETED':
                        console.log(`✅ [${elapsed}s] ${this.taskName} - Completed!`);
                        break;
                        
                    case 'FAILED':
                        console.log(`❌ [${elapsed}s] ${this.taskName} - Failed!`);
                        break;
                        
                    default:
                        console.log(`📊 [${elapsed}s] ${this.taskName} - ${update.status}`);
                }
            }
        };
    }
}

// Configuration builder utilities
export class ConfigBuilder {
    constructor() {
        this.config = {};
    }

    setImage(input, uploadMethod = 'auto') {
        if (typeof input === 'string' && input.startsWith('http')) {
            this.config.imageUrl = input;
        } else {
            this.config.imagePath = input;
            this.config.uploadMethod = uploadMethod;
        }
        return this;
    }

    setPrompt(template, style = null) {
        if (typeof template === 'string') {
            this.config.prompt = template;
        } else if (template && style && PromptTemplates[template] && PromptTemplates[template][style]) {
            this.config.prompt = PromptTemplates[template][style];
        } else {
            throw new Error('Invalid prompt template or style');
        }
        return this;
    }

    setPreset(category, type) {
        if (VideoPresets[category] && VideoPresets[category][type]) {
            Object.assign(this.config, VideoPresets[category][type]);
        } else {
            throw new Error('Invalid preset category or type');
        }
        return this;
    }

    setVideoOptions(options) {
        const validOptions = ['duration', 'resolution', 'aspectRatio', 'generateAudio'];
        validOptions.forEach(option => {
            if (options[option] !== undefined) {
                this.config[option] = options[option];
            }
        });
        return this;
    }

    setProcessingOptions(options) {
        const validOptions = ['useQueue', 'webhookUrl', 'downloadVideo', 'outputFileName'];
        validOptions.forEach(option => {
            if (options[option] !== undefined) {
                this.config[option] = options[option];
            }
        });
        return this;
    }

    build() {
        return { ...this.config };
    }

    // Validate the built configuration
    validate() {
        const errors = [];
        
        if (!this.config.imagePath && !this.config.imageUrl) {
            errors.push('Image input is required (imagePath or imageUrl)');
        }
        
        if (!this.config.prompt) {
            errors.push('Prompt is required');
        }
        
        // Validate duration
        if (this.config.duration && !['8s'].includes(this.config.duration)) {
            errors.push('Invalid duration. Supported: 8s');
        }
        
        // Validate resolution
        if (this.config.resolution && !['720p', '1080p'].includes(this.config.resolution)) {
            errors.push('Invalid resolution. Supported: 720p, 1080p');
        }
        
        // Validate aspect ratio
        if (this.config.aspectRatio && !['auto', '16:9', '9:16'].includes(this.config.aspectRatio)) {
            errors.push('Invalid aspect ratio. Supported: auto, 16:9, 9:16');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            config: this.config
        };
    }
}

// Export all utilities as default
export default {
    PromptTemplates,
    VideoPresets,
    FileValidator,
    BatchProcessor,
    UrlValidator,
    ProgressTracker,
    ConfigBuilder
};
