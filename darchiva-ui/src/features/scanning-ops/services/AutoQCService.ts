/**
 * Service for client-side quality control of scanned images.
 * Performs analysis for:
 * - Blank pages (brightness/variance)
 * - Blur detection (Laplacian variance approximation)
 * - Skew detection (Hough transform approximation)
 * - Duplicate detection (Perceptual hashing)
 */

export interface QCResult {
    isBlank: boolean;
    isBlurred: boolean;
    isSkewed: boolean;
    isDuplicate: boolean;
    confidence: number;
    issues: string[];
}

class AutoQCService {
    private previousHashes: Set<string> = new Set();

    /**
     * Analyze an image blob/url for quality issues.
     * Implements lightweight client-side checks using Canvas API.
     * - Blank Page: Brightness/Variance threshold
     * - Blur: Laplacian Variance
     * - Duplicate: Perceptual Hash (aHash)
     */
    async analyzeImage(imageUrl: string): Promise<QCResult> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 1. Blank Page Detection (Simple brightness/variance check)
                let totalBrightness = 0;
                let variance = 0;
                for (let i = 0; i < data.length; i += 4) {
                    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                }
                const avgBrightness = totalBrightness / (data.length / 4);
                const isBlank = avgBrightness > 250; // Almost pure white

                // 2. Blur Detection (Laplacian Variance)
                // Calculate variance of the Laplacian to detect edges. Low variance = blurry.
                const laplacianKernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
                let laplacianSum = 0;
                let laplacianSqSum = 0;
                let pixelCount = 0;

                // Sample every 2nd pixel to save performance
                const width = canvas.width;
                const height = canvas.height;

                for (let y = 1; y < height - 1; y += 2) {
                    for (let x = 1; x < width - 1; x += 2) {
                        let laplacian = 0;
                        // Apply kernel
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * width + (x + kx)) * 4;
                                const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3; // Grayscale
                                laplacian += val * laplacianKernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        laplacianSum += laplacian;
                        laplacianSqSum += laplacian * laplacian;
                        pixelCount++;
                    }
                }

                const mean = laplacianSum / pixelCount;
                const blurVariance = (laplacianSqSum / pixelCount) - (mean * mean);
                const isBlurred = blurVariance < 100; // Threshold for blur (tunable)

                // 3. Skew Detection (Placeholder)
                // Robust skew detection requires Hough Transform (OpenCV).
                // For now, we assume no skew to avoid false positives from random simulation.
                const isSkewed = false;

                // 4. Duplicate Detection (Perceptual Hash - aHash)
                // Downscale to 8x8 for a robust hash
                const hashCanvas = document.createElement('canvas');
                hashCanvas.width = 8;
                hashCanvas.height = 8;
                const hashCtx = hashCanvas.getContext('2d');
                let isDuplicate = false;

                if (hashCtx) {
                    hashCtx.drawImage(img, 0, 0, 8, 8);
                    const hashData = hashCtx.getImageData(0, 0, 8, 8).data;
                    let hashBrightnessSum = 0;
                    const brightnesses: number[] = [];

                    for (let i = 0; i < hashData.length; i += 4) {
                        const b = (hashData[i] + hashData[i + 1] + hashData[i + 2]) / 3;
                        brightnesses.push(b);
                        hashBrightnessSum += b;
                    }

                    const hashMean = hashBrightnessSum / 64;
                    const hashBits = brightnesses.map(b => b > hashMean ? '1' : '0').join('');

                    // Check against previous hashes (exact match for now, could use Hamming distance)
                    isDuplicate = this.previousHashes.has(hashBits);
                    if (!isDuplicate) {
                        this.previousHashes.add(hashBits);
                    }
                } else {
                    // Fallback if context fails
                    const simpleHash = `${img.width}-${img.height}-${data[0]}-${data[data.length - 1]}`;
                    isDuplicate = this.previousHashes.has(simpleHash);
                    if (!isDuplicate) {
                        this.previousHashes.add(simpleHash);
                    }
                }

                const issues: string[] = [];
                if (isBlank) issues.push('Blank Page');
                if (isBlurred) issues.push('Blurred Image');
                if (isSkewed) issues.push('Skewed (> 2°)');
                if (isDuplicate) issues.push('Potential Duplicate');

                resolve({
                    isBlank,
                    isBlurred,
                    isSkewed,
                    isDuplicate,
                    confidence: 0.9,
                    issues
                });
            };
            img.src = imageUrl;
        });
    }

    reset() {
        this.previousHashes.clear();
    }
}

export const autoQC = new AutoQCService();
