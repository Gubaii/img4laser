/**
 * 图像处理算法模块
 * 包含锐化和抖动算法的实现
 */

const ImageAlgorithms = (() => {
    /**
     * 对图像应用锐化效果
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} amount - 锐化强度 (0-100)
     * @returns {ImageData} 处理后的图像数据
     */
    const applySharpening = (imageData, amount = 50) => {
        // 如果锐化强度为0，直接返回原图
        if (amount <= 0) return imageData;

        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const factor = amount / 100; // 将百分比转换为0-1之间的因子
        
        // 创建一个临时数组用于存储处理结果
        const temp = new Uint8ClampedArray(pixels.length);
        
        // 简单的3x3非锐化掩码(Unsharp Mask)算法
        // 卷积核: [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]
        // 强度可调整
        const kernel = [
            -factor, -factor, -factor,
            -factor, 1 + 8 * factor, -factor,
            -factor, -factor, -factor
        ];
        
        // 对每个像素应用卷积
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // 只处理RGB通道，不处理Alpha
                    let sum = 0;
                    
                    // 应用3x3卷积
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += pixels[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    
                    // 存储结果
                    temp[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                }
                
                // 保持Alpha通道不变
                temp[(y * width + x) * 4 + 3] = pixels[(y * width + x) * 4 + 3];
            }
        }
        
        // 处理边缘像素（简单地复制原始值）
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    for (let c = 0; c < 4; c++) {
                        temp[(y * width + x) * 4 + c] = pixels[(y * width + x) * 4 + c];
                    }
                }
            }
        }
        
        return new ImageData(temp, width, height);
    };
    
    /**
     * 应用Floyd-Steinberg抖动算法
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} threshold - 阈值 (0-255)
     * @returns {ImageData} 处理后的图像数据
     */
    const applyFloydSteinbergDithering = (imageData, threshold = 128) => {
        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const result = new Uint8ClampedArray(pixels.length);
        
        // 创建一个灰度图像用于抖动处理
        const grayArray = new Array(width * height);
        for (let i = 0; i < width * height; i++) {
            grayArray[i] = pixels[i * 4]; // 假设这已经是灰度图像（R=G=B）
        }
        
        // 应用Floyd-Steinberg抖动
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldPixel = grayArray[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                grayArray[idx] = newPixel;
                
                const quantError = oldPixel - newPixel;
                
                // 将误差扩散到相邻像素
                if (x + 1 < width) {
                    grayArray[idx + 1] += quantError * 7 / 16;
                }
                if (y + 1 < height) {
                    if (x - 1 >= 0) {
                        grayArray[(y + 1) * width + (x - 1)] += quantError * 3 / 16;
                    }
                    grayArray[(y + 1) * width + x] += quantError * 5 / 16;
                    if (x + 1 < width) {
                        grayArray[(y + 1) * width + (x + 1)] += quantError * 1 / 16;
                    }
                }
            }
        }
        
        // 将抖动后的灰度值转回RGBA格式
        for (let i = 0; i < width * height; i++) {
            const val = Math.max(0, Math.min(255, Math.round(grayArray[i])));
            result[i * 4] = val;     // R
            result[i * 4 + 1] = val; // G
            result[i * 4 + 2] = val; // B
            result[i * 4 + 3] = pixels[i * 4 + 3]; // Alpha不变
        }
        
        return new ImageData(result, width, height);
    };
    
    /**
     * 应用Jarvis抖动算法（扩散误差到更多的像素点）
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} threshold - 阈值 (0-255)
     * @returns {ImageData} 处理后的图像数据
     */
    const applyJarvisDithering = (imageData, threshold = 128) => {
        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const result = new Uint8ClampedArray(pixels.length);
        
        // 创建一个灰度图像用于抖动处理
        const grayArray = new Array(width * height);
        for (let i = 0; i < width * height; i++) {
            grayArray[i] = pixels[i * 4]; // 假设这已经是灰度图像（R=G=B）
        }
        
        // Jarvis, Judice, and Ninke抖动 - 使用12点误差扩散
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldPixel = grayArray[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                grayArray[idx] = newPixel;
                
                const quantError = oldPixel - newPixel;
                
                // 第一行（当前行）的误差扩散
                if (x + 1 < width)
                    grayArray[idx + 1] += quantError * 7 / 48;
                if (x + 2 < width)
                    grayArray[idx + 2] += quantError * 5 / 48;
                
                // 第二行的误差扩散
                if (y + 1 < height) {
                    if (x - 2 >= 0)
                        grayArray[(y + 1) * width + (x - 2)] += quantError * 3 / 48;
                    if (x - 1 >= 0)
                        grayArray[(y + 1) * width + (x - 1)] += quantError * 5 / 48;
                    grayArray[(y + 1) * width + x] += quantError * 7 / 48;
                    if (x + 1 < width)
                        grayArray[(y + 1) * width + (x + 1)] += quantError * 5 / 48;
                    if (x + 2 < width)
                        grayArray[(y + 1) * width + (x + 2)] += quantError * 3 / 48;
                }
                
                // 第三行的误差扩散
                if (y + 2 < height) {
                    if (x - 2 >= 0)
                        grayArray[(y + 2) * width + (x - 2)] += quantError * 1 / 48;
                    if (x - 1 >= 0)
                        grayArray[(y + 2) * width + (x - 1)] += quantError * 3 / 48;
                    grayArray[(y + 2) * width + x] += quantError * 5 / 48;
                    if (x + 1 < width)
                        grayArray[(y + 2) * width + (x + 1)] += quantError * 3 / 48;
                    if (x + 2 < width)
                        grayArray[(y + 2) * width + (x + 2)] += quantError * 1 / 48;
                }
            }
        }
        
        // 将抖动后的灰度值转回RGBA格式
        for (let i = 0; i < width * height; i++) {
            const val = Math.max(0, Math.min(255, Math.round(grayArray[i])));
            result[i * 4] = val;     // R
            result[i * 4 + 1] = val; // G
            result[i * 4 + 2] = val; // B
            result[i * 4 + 3] = pixels[i * 4 + 3]; // Alpha不变
        }
        
        return new ImageData(result, width, height);
    };
    
    /**
     * 应用Atkinson抖动算法 (比Floyd-Steinberg更锐利，更少的噪点)
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} threshold - 阈值 (0-255)
     * @returns {ImageData} 处理后的图像数据
     */
    const applyAtkinsonDithering = (imageData, threshold = 128) => {
        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const result = new Uint8ClampedArray(pixels.length);
        
        // 创建一个灰度图像用于抖动处理
        const grayArray = new Array(width * height);
        for (let i = 0; i < width * height; i++) {
            grayArray[i] = pixels[i * 4]; // 假设这已经是灰度图像（R=G=B）
        }
        
        // 应用Atkinson抖动
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldPixel = grayArray[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                grayArray[idx] = newPixel;
                
                const quantError = Math.floor((oldPixel - newPixel) / 8);
                
                // Atkinson算法的误差扩散模式
                if (x + 1 < width) {
                    grayArray[idx + 1] += quantError;
                }
                if (x + 2 < width) {
                    grayArray[idx + 2] += quantError;
                }
                if (y + 1 < height) {
                    if (x - 1 >= 0) {
                        grayArray[(y + 1) * width + (x - 1)] += quantError;
                    }
                    grayArray[(y + 1) * width + x] += quantError;
                    if (x + 1 < width) {
                        grayArray[(y + 1) * width + (x + 1)] += quantError;
                    }
                }
                if (y + 2 < height) {
                    grayArray[(y + 2) * width + x] += quantError;
                }
            }
        }
        
        // 将抖动后的灰度值转回RGBA格式
        for (let i = 0; i < width * height; i++) {
            const val = Math.max(0, Math.min(255, Math.round(grayArray[i])));
            result[i * 4] = val;     // R
            result[i * 4 + 1] = val; // G
            result[i * 4 + 2] = val; // B
            result[i * 4 + 3] = pixels[i * 4 + 3]; // Alpha不变
        }
        
        return new ImageData(result, width, height);
    };
    
    /**
     * 应用Ordered抖动算法 (使用有序抖动矩阵，产生均匀的网点图案)
     * @param {ImageData} imageData - 原始图像数据
     * @returns {ImageData} 处理后的图像数据
     */
    const applyOrderedDithering = (imageData) => {
        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const result = new Uint8ClampedArray(pixels.length);
        
        // 8x8 Bayer矩阵
        const bayerMatrix = [
            [ 0, 32,  8, 40,  2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44,  4, 36, 14, 46,  6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [ 3, 35, 11, 43,  1, 33,  9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47,  7, 39, 13, 45,  5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ];
        
        // 应用有序抖动
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const grayValue = pixels[idx]; // 假设这已经是灰度图像（R=G=B）
                
                // 确定阈值 (根据Bayer矩阵)
                const threshold = (bayerMatrix[y % 8][x % 8] / 64) * 255;
                
                // 二值化决策
                const newValue = grayValue > threshold ? 255 : 0;
                
                result[idx] = newValue;     // R
                result[idx + 1] = newValue; // G
                result[idx + 2] = newValue; // B
                result[idx + 3] = pixels[idx + 3]; // Alpha不变
            }
        }
        
        return new ImageData(result, width, height);
    };
    
    /**
     * 应用Bayer抖动算法 (与Ordered抖动类似，但使用不同的矩阵和实现)
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} levels - 颜色级别 (2-6, 默认为2表示二值化)
     * @returns {ImageData} 处理后的图像数据
     */
    const applyBayerDithering = (imageData, levels = 2) => {
        const width = imageData.width;
        const height = imageData.height;
        const pixels = new Uint8ClampedArray(imageData.data);
        const result = new Uint8ClampedArray(pixels.length);
        
        // 8x8 Bayer矩阵 - 归一化为0-1范围
        const bayerMatrix = [
            [0.0/64.0, 32.0/64.0, 8.0/64.0, 40.0/64.0, 2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0],
            [48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0],
            [12.0/64.0, 44.0/64.0, 4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0, 6.0/64.0, 38.0/64.0],
            [60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0],
            [3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0, 1.0/64.0, 33.0/64.0, 9.0/64.0, 41.0/64.0],
            [51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0],
            [15.0/64.0, 47.0/64.0, 7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0, 5.0/64.0, 37.0/64.0],
            [63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0]
        ];
        
        // 确保级别在有效范围内
        levels = Math.max(2, Math.min(6, levels));
        
        // 计算量化步长
        const step = 255 / (levels - 1);
        
        // 应用Bayer抖动
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const grayValue = pixels[idx] / 255.0; // 归一化为0-1
                
                // 获取Bayer阈值
                const threshold = bayerMatrix[y % 8][x % 8];
                
                // 计算量化值 - 增加阈值并限制在0-1范围内
                let quantizedValue = grayValue + (threshold - 0.5) / levels;
                quantizedValue = Math.max(0, Math.min(0.999, quantizedValue));
                
                // 量化为指定级别
                const level = Math.floor(quantizedValue * levels);
                const newValue = Math.round(level * step);
                
                result[idx] = newValue;     // R
                result[idx + 1] = newValue; // G
                result[idx + 2] = newValue; // B
                result[idx + 3] = pixels[idx + 3]; // Alpha不变
            }
        }
        
        return new ImageData(result, width, height);
    };
    
    /**
     * 分析图像直方图，寻找峰值和谷值
     * @param {Array} histogram - 图像直方图数据 (长度为256的数组)
     * @returns {Object} 包含峰值和谷值的对象
     */
    const analyzeHistogram = (histogram) => {
        const peaks = [];
        const valleys = [];
        const threshold = 0.01; // 峰值阈值，忽略过小的峰
        
        // 计算直方图的总像素数和最大值
        let sum = 0;
        let max = 0;
        for (let i = 0; i < histogram.length; i++) {
            sum += histogram[i];
            max = Math.max(max, histogram[i]);
        }
        
        // 将直方图进行归一化
        const normalized = histogram.map(v => v / max);
        
        // 平滑处理直方图
        const smoothed = smoothHistogram(normalized, 5);
        
        // 寻找局部峰值
        for (let i = 1; i < 255; i++) {
            if (smoothed[i] > threshold && 
                smoothed[i] > smoothed[i-1] && 
                smoothed[i] > smoothed[i+1]) {
                peaks.push(i);
            }
            if (smoothed[i] < smoothed[i-1] && 
                smoothed[i] < smoothed[i+1]) {
                valleys.push(i);
            }
        }
        
        // 如果没有找到足够的峰值，尝试使用较小的阈值
        if (peaks.length < 1) {
            for (let i = 1; i < 255; i++) {
                if (smoothed[i] > smoothed[i-1] && 
                    smoothed[i] > smoothed[i+1]) {
                    peaks.push(i);
                }
            }
        }
        
        return { peaks, valleys };
    };
    
    /**
     * 对直方图进行平滑处理
     * @param {Array} histogram - 原始直方图数据
     * @param {number} windowSize - 平滑窗口大小
     * @returns {Array} 平滑后的直方图
     */
    const smoothHistogram = (histogram, windowSize = 3) => {
        const result = new Array(histogram.length).fill(0);
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < histogram.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < histogram.length) {
                    sum += histogram[idx];
                    count++;
                }
            }
            
            result[i] = sum / count;
        }
        
        return result;
    };
    
    /**
     * 根据类型应用抖动算法
     * @param {ImageData} imageData - 原始图像数据
     * @param {Object} params - 抖动参数
     * @returns {ImageData} 处理后的图像数据
     */
    const applyDithering = (imageData, params) => {
        if (!params.ditherEnabled) {
            return imageData;
        }
        
        switch(params.ditherType) {
            case 'floydSteinberg':
                return applyFloydSteinbergDithering(imageData, params.ditherThreshold);
            case 'atkinson':
                return applyAtkinsonDithering(imageData, params.ditherThreshold);
            case 'jarvis':
                return applyJarvisDithering(imageData, params.ditherThreshold);
            case 'ordered':
                return applyOrderedDithering(imageData);
            case 'bayer':
                return applyBayerDithering(imageData, 2); // 默认使用二值化
            default:
                return applyFloydSteinbergDithering(imageData, params.ditherThreshold);
        }
    };
    
    /**
     * 反转图像颜色 (灰度)
     * @param {ImageData} imageData - 输入图像数据 (假设为灰度)
     * @returns {ImageData} 颜色反转后的图像数据
     */
    const invertColors = (imageData) => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;

        for (let i = 0; i < data.length; i += 4) {
            // 假设灰度图 R=G=B
            const gray = data[i];
            const invertedGray = 255 - gray;
            
            data[i] = invertedGray;
            data[i + 1] = invertedGray;
            data[i + 2] = invertedGray;
            // Alpha 保持不变
        }
        
        return new ImageData(data, width, height);
    };
    
    return {
        applySharpening,
        applyDithering,
        analyzeHistogram,
        smoothHistogram,
        applyFloydSteinbergDithering,
        applyAtkinsonDithering,
        applyJarvisDithering,
        applyOrderedDithering,
        applyBayerDithering,
        invertColors
    };
})();

export default ImageAlgorithms; 