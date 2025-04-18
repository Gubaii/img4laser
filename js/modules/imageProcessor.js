/**
 * 图像处理器模块
 * 提供核心图像处理功能
 */

import ImageAlgorithms from './algorithms.js';
import Materials from './materials.js';

const ImageProcessor = (() => {
    /**
     * 将图像转换为灰度
     * @param {ImageData} imageData - 原始图像数据
     * @returns {ImageData} 灰度图像数据
     */
    const convertToGrayscale = (imageData) => {
        const data = imageData.data;
        const grayData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            // 使用Luminosity方法: 0.299*R + 0.587*G + 0.114*B
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grayData[i] = gray;     // R
            grayData[i + 1] = gray; // G
            grayData[i + 2] = gray; // B
            grayData[i + 3] = data[i + 3]; // Alpha
        }
        
        return new ImageData(grayData, imageData.width, imageData.height);
    };
    
    /**
     * 计算图像直方图
     * @param {ImageData} imageData - 图像数据
     * @returns {Array} 直方图数据
     */
    const calculateHistogram = (imageData) => {
        const data = imageData.data;
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            // 假设已经是灰度图像，所以R=G=B，只读取R通道
            histogram[data[i]]++;
        }
        
        return histogram;
    };
    
    /**
     * 计算图像的统计数据
     * @param {ImageData} imageData - 图像数据
     * @returns {Object} 包含平均值、标准差和直方图的对象
     */
    const calculateImageStats = (imageData) => {
        const histogram = calculateHistogram(imageData);
        const data = imageData.data;
        let sum = 0;
        let pixelCount = 0;
        
        // 计算平均灰度值
        for (let i = 0; i < histogram.length; i++) {
            sum += i * histogram[i];
            pixelCount += histogram[i];
        }
        
        const mean = pixelCount > 0 ? sum / pixelCount : 128;
        
        // 计算标准差
        let sumSqDiff = 0;
        for (let i = 0; i < histogram.length; i++) {
            sumSqDiff += ((i - mean) ** 2) * histogram[i];
        }
        
        const stdDev = pixelCount > 0 ? Math.sqrt(sumSqDiff / pixelCount) : 0;
        
        // 分析直方图，查找峰值和谷值
        const { peaks, valleys } = ImageAlgorithms.analyzeHistogram(histogram);
        
        return {
            mean,
            stdDev,
            histogram,
            peaks,
            valleys
        };
    };
    
    /**
     * 检测图像类型：使用 face-api.js 检测人像， fallback 到卡通/照片
     * @param {ImageData} imageData - 原始图像数据
     * @returns {Promise<string>} 图像类型 ('photo', 'cartoon', 'portrait')
     */
    const detectImageType = async (imageData) => {
        // 提前转为灰度并获取统计信息
        const grayImage = convertToGrayscale(imageData);
        const stats = calculateImageStats(grayImage);
        
        // --- 先进行卡通图检测 ---
        console.log('开始判断是否为卡通图...');
        
        // 提取关键特征
        const textureFeatures = analyzeTextureFeatures(grayImage);
        const histFeatures = analyzeHistogramFeatures(stats.histogram);
        const edgeFeatures = analyzeEdgeFeatures(grayImage);
        
        console.log(`图像类型检测(卡通/照片) - 特征：`);
        console.log(`  颜色单一性: ${textureFeatures.colorSimplicity.toFixed(2)}`);
        console.log(`  明显边缘比例: ${edgeFeatures.distinctEdgeRatio.toFixed(3)}`);
        console.log(`  边缘对比度: ${edgeFeatures.edgeContrast.toFixed(1)}`);
        console.log(`  直方图峰值数: ${histFeatures.peakCount}`);
        console.log(`  低方差面积占比: ${textureFeatures.lowVarianceAreaRatio.toFixed(3)}`);
        console.log(`  标准差: ${stats.stdDev.toFixed(1)}`);
        console.log(`  黑白占比 (0-10, 245-255): ${histFeatures.bwRatio.toFixed(3)}`);
        
        // 1. 强卡通/图形判断 (基于黑白占比和峰值数量)
        if ((histFeatures.peakCount <= 3 || histFeatures.peakCount === 0) && histFeatures.bwRatio > 0.8) {
            console.log('判定为 卡通 (峰值<=3或0 且 黑白占比 > 0.8)');
            return 'cartoon';
        }

        // 2. 强卡通判断 (基于极高平滑度)
        // 对于极高的平滑度（>0.95），不要求黑白占比
        // 对于高平滑度（>0.92），只需要很少的黑白占比（>0.001）
        if (textureFeatures.lowVarianceAreaRatio > 0.95 || 
            (textureFeatures.lowVarianceAreaRatio > 0.92 && histFeatures.bwRatio > 0.001)) {
             console.log(`判定为 卡通 (低方差占比 ${textureFeatures.lowVarianceAreaRatio.toFixed(3)})`);
             return 'cartoon';
        }

        // 3. 高黑白对比判断
        // 黑白占比越高，越可能是卡通图
        if (histFeatures.bwRatio > 0.7) {
            // 非常高的黑白占比，直接判定为卡通
            console.log(`判定为 卡通 (极高黑白对比 ${histFeatures.bwRatio.toFixed(3)})`);
            return 'cartoon';
        } else if (histFeatures.bwRatio > 0.5 && textureFeatures.lowVarianceAreaRatio > 0.7) {
            // 中等黑白占比，配合中等平滑度
            console.log(`判定为 卡通 (黑白占比 ${histFeatures.bwRatio.toFixed(3)} 且 平滑度 ${textureFeatures.lowVarianceAreaRatio.toFixed(3)})`);
            return 'cartoon';
        }

        // 4. 几何形状特征判断
        const hasGeometricFeatures = edgeFeatures.longEdgeRatio > 0.15 && // 长直边较多
                                   textureFeatures.colorBlockCount < 10 && // 色块数量较少
                                   textureFeatures.colorSimplicity > 0.7; // 颜色简单

        if (hasGeometricFeatures && textureFeatures.lowVarianceAreaRatio > 0.8) {
            console.log('判定为 卡通 (检测到明显的几何形状特征)');
            return 'cartoon';
        }

        // 5. 高色彩一致性判断
        const hasHighColorConsistency = textureFeatures.colorSimplicity > 0.85 && // 颜色单一性非常高
                                      textureFeatures.lowVarianceAreaRatio > 0.75 && // 较高的平滑区域
                                      histFeatures.peakCount <= 4; // 颜色数量有限

        if (hasHighColorConsistency) {
            console.log('判定为 卡通 (检测到高度的色彩一致性)');
            return 'cartoon';
        }

        // 6. 中间情况判断 (检查平滑度、边缘、峰值数量)
        const sharpEdges = edgeFeatures.distinctEdgeRatio > 0.04 && edgeFeatures.edgeContrast > 50; 
        const highEnoughLowVariance = textureFeatures.lowVarianceAreaRatio > 0.85 && histFeatures.bwRatio > 0.01;

        if (highEnoughLowVariance && sharpEdges) {
             if (histFeatures.peakCount === 1 && stats.stdDev < 50) { 
                 console.log('疑似卡通，但直方图特征更像照片，继续检测...');
             } else if (histFeatures.peakCount > 5) { 
                 console.log('疑似卡通，但峰值过多 (>5)，继续检测...');
             } else if (textureFeatures.skinToneRatio > 0.3) {
                 console.log('疑似卡通，但检测到较多肤色区域，继续检测...');
             } else {
                 console.log(`判定为 卡通 (中等优先级：低方差>0.85 且 边缘锐利 且 峰值<=5 且 肤色比例<=0.3)`); 
                 return 'cartoon';
             }
        }

        // --- 如果不是卡通图，尝试人脸检测 ---
        console.log('不是卡通图，尝试人脸检测...');
        
        try {
            // 检查 face-api 是否已加载
            if (typeof faceapi === 'undefined') {
                console.error('face-api.js 未加载，回退到普通照片判定');
                throw new Error('face-api not loaded');
            }

            // 尝试从多个路径加载模型
            if (!faceapi.nets.tinyFaceDetector.params) {
                console.log('首次加载人脸检测模型...');
                const possiblePaths = ['./models', '/models', '../models', 'models'];
                let loaded = false;
                for (const path of possiblePaths) {
                    try {
                        console.log(`尝试从 ${path} 加载模型`);
                        await faceapi.nets.tinyFaceDetector.loadFromUri(path);
                        console.log(`从 ${path} 成功加载模型`);
                        loaded = true;
                        break;
                    } catch (e) {
                        console.error(`从 ${path} 加载失败，详细错误:`, e);
                    }
                }
                if (!loaded) {
                    console.error('无法从任何路径加载人脸检测模型，回退到普通照片判定');
                    throw new Error('Failed to load face detection models');
                }
                console.log('模型加载完成.');
            }
            
            // 将 ImageData 绘制到临时 Canvas 以供 face-api 使用
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            // 设置人脸检测器选项
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            }); 
            
            // 执行人脸检测
            console.log('开始人脸检测...');
            const detections = await faceapi.detectAllFaces(canvas, options);
            console.log(`人脸检测完成，检测到 ${detections ? detections.length : 0} 张人脸。`);

            if (detections && detections.length > 0) {
                console.log('判定为 人像 (face-api 检测到人脸)');
                return 'portrait';
            }
        } catch (error) {
            console.error('人脸检测失败，回退到普通照片判定:', error);
        }
        
        // 4. 默认情况：普通照片
        console.log('判定为 普通照片 (不满足所有特殊判断条件)');
        return 'photo';
    };
    
    /**
     * 分析直方图特征
     * @param {Array} histogram - 灰度直方图
     * @returns {Object} 直方图特征
     */
    function analyzeHistogramFeatures(histogram) {
        const total = histogram.reduce((sum, val) => sum + val, 0);
        const normalized = histogram.map(v => v / total);
        
        // 平滑直方图减少噪声 - 恢复窗口大小 5
        const smoothed = [];
        for (let i = 0; i < normalized.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - 2); j <= Math.min(255, i + 2); j++) { // 恢复窗口 5
                sum += normalized[j];
                count++;
            }
            smoothed[i] = sum / count;
        }
        
        // 寻找峰值 - 提高阈值和突出度要求
        const peaks = [];
        const peakThreshold = 0.002; // 阈值提高到 0.2%
        for (let i = 2; i < 254; i++) { // 调整范围避免边界
            if (smoothed[i] > peakThreshold &&
                smoothed[i] > smoothed[i - 1] &&
                smoothed[i] > smoothed[i - 2] && 
                smoothed[i] >= smoothed[i + 1] && // 使用 >= 允许平顶峰
                smoothed[i] >= smoothed[i + 2]) {
                
                // 确保峰值比附近低点高出一些 (提高要求)
                const localMinLeft = Math.min(smoothed[i - 1], smoothed[i - 2]);
                const localMinRight = Math.min(smoothed[i + 1], smoothed[i + 2]);
                if (smoothed[i] > localMinLeft * 1.1 && smoothed[i] > localMinRight * 1.1) { // 要求至少高 10%
                    peaks.push({
                        position: i,
                        height: smoothed[i]
                    });
                }
            }
        }
        
        // 如果上面没找到，尝试更简单的峰值查找 (只比较相邻点)
        if (peaks.length === 0) {
            console.log("主要峰值查找失败，尝试简化方法...");
             for (let i = 1; i < 255; i++) {
                 if (smoothed[i] > peakThreshold && 
                    smoothed[i] > smoothed[i-1] && 
                    smoothed[i] >= smoothed[i+1]) {
                    // 避免添加过于接近的峰
                    if (peaks.length === 0 || Math.abs(i - peaks[peaks.length - 1].position) > 3) {
                         peaks.push({ position: i, height: smoothed[i] });
                    }
                 }
             }
        }

        peaks.sort((a, b) => b.height - a.height); // 按高度排序
        
        // 新增：计算黑白占比
        let bwPixels = 0;
        const bwThresholdLow = 10;
        const bwThresholdHigh = 245;
        const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
        if (totalPixels > 0) {
            for (let i = 0; i <= bwThresholdLow; i++) {
                bwPixels += (histogram[i] || 0);
            }
            for (let i = bwThresholdHigh; i <= 255; i++) {
                bwPixels += (histogram[i] || 0);
            }
        }
        const bwRatio = totalPixels > 0 ? bwPixels / totalPixels : 0;

        // 重新计算谷深度 (基于找到的峰值)
        let valleyDepth = 0;
        if (peaks.length >= 2) {
            const peak1Pos = peaks[0].position;
            const peak2Pos = peaks[1].position;
            const startPos = Math.min(peak1Pos, peak2Pos);
            const endPos = Math.max(peak1Pos, peak2Pos);

            if (endPos - startPos > 5) { // 峰值间至少相隔一点距离
                let minHeightBetween = 1;
                for (let i = startPos + 1; i < endPos; i++) {
                     if (smoothed[i] < minHeightBetween) {
                        minHeightBetween = smoothed[i];
                    }
                }
                const lowerPeakHeight = Math.min(peaks[0].height, peaks[1].height);
                // 要求谷底显著低于较矮峰值
                if (lowerPeakHeight > 0 && minHeightBetween < lowerPeakHeight * 0.9) { 
                   valleyDepth = 1 - (minHeightBetween / lowerPeakHeight);
                }
            }
        }
        
        return {
            peakCount: peaks.length,
            peaks: peaks.slice(0, 3),
            valleyDepth: valleyDepth,
            bwRatio: bwRatio
        };
    }
    
    /**
     * 分析改进的边缘特征
     * @param {ImageData} grayImage - 灰度图像
     * @returns {Object} 边缘特征
     */
    function analyzeEdgeFeatures(grayImage) {
        const data = grayImage.data;
        const width = grayImage.width;
        const height = grayImage.height;
        
        // 边缘图
        const edgeMap = new Uint8Array(width * height);
        const edgeStrength = new Uint8Array(width * height);
        
        // 边缘检测 (改进版Sobel)
        let edgeCount = 0;
        let distinctEdgeCount = 0;
        let totalContrast = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // 获取3x3邻域
                const p00 = data[((y-1) * width + (x-1)) * 4];
                const p01 = data[((y-1) * width + x) * 4];
                const p02 = data[((y-1) * width + (x+1)) * 4];
                const p10 = data[(y * width + (x-1)) * 4];
                const p11 = data[(y * width + x) * 4];
                const p12 = data[(y * width + (x+1)) * 4];
                const p20 = data[((y+1) * width + (x-1)) * 4];
                const p21 = data[((y+1) * width + x) * 4];
                const p22 = data[((y+1) * width + (x+1)) * 4];
                
                // Sobel算子
                const gx = ((p02 + 2*p12 + p22) - (p00 + 2*p10 + p20));
                const gy = ((p20 + 2*p21 + p22) - (p00 + 2*p01 + p02));
                
                // 梯度幅值
                const gradient = Math.sqrt(gx*gx + gy*gy);
                
                // 边缘强度
                edgeStrength[idx] = Math.min(255, Math.round(gradient));
                
                // 判断边缘
                if (gradient > 20) {
                    edgeMap[idx] = 1;
                    edgeCount++;
                    totalContrast += gradient;
                    
                    if (gradient > 50) {
                        distinctEdgeCount++;
                    }
                }
            }
        }
        
        // 查找长边 (连通区域分析)
        let longEdgeCount = 0;
        const visited = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (edgeMap[idx] && !visited[idx]) {
                    // 使用广度优先搜索查找连通区域
                    const queue = [{x, y}];
                    let size = 0;
                    let totalX = 0, totalY = 0;
                    let minX = x, maxX = x, minY = y, maxY = y;
                    
                    visited[idx] = 1;
                    
                    while (queue.length > 0 && size < 1000) { // 限制最大搜索1000像素避免性能问题
                        const {x: cx, y: cy} = queue.shift();
                        const cidx = cy * width + cx;
                        
                        size++;
                        totalX += cx;
                        totalY += cy;
                        
                        // 更新边界
                        minX = Math.min(minX, cx);
                        maxX = Math.max(maxX, cx);
                        minY = Math.min(minY, cy);
                        maxY = Math.max(maxY, cy);
                        
                        // 检查8邻域
                        const neighbors = [
                            {x: cx-1, y: cy}, {x: cx+1, y: cy},
                            {x: cx, y: cy-1}, {x: cx, y: cy+1},
                            {x: cx-1, y: cy-1}, {x: cx+1, y: cy-1},
                            {x: cx-1, y: cy+1}, {x: cx+1, y: cy+1}
                        ];
                        
                        for (const {x: nx, y: ny} of neighbors) {
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nidx = ny * width + nx;
                                if (edgeMap[nidx] && !visited[nidx]) {
                                    queue.push({x: nx, y: ny});
                                    visited[nidx] = 1;
                                }
                            }
                        }
                    }
                    
                    // 分析连通区域特征
                    if (size > 15) { // 只考虑较长的边
                        // 计算边缘的线性度
                        const width = maxX - minX + 1;
                        const height = maxY - minY + 1;
                        const boxArea = width * height;
                        const density = size / boxArea;
                        
                        // 长直边缘的线性度高，密度低
                        if ((width > 20 || height > 20) && (density < 0.5 || size > 30)) {
                            longEdgeCount++;
                        }
                    }
                }
            }
        }
        
        // 计算平均边缘对比度
        const avgContrast = edgeCount > 0 ? totalContrast / edgeCount : 0;
        
        return {
            edgeRatio: edgeCount / (width * height),
            distinctEdgeRatio: distinctEdgeCount / (width * height),
            longEdgeRatio: longEdgeCount / (width * height * 0.01), // 归一化
            edgeContrast: avgContrast
        };
    }
    
    /**
     * 分析纹理特征
     * @param {ImageData} grayImage - 灰度图像
     * @returns {Object} 纹理特征
     */
    function analyzeTextureFeatures(grayImage) {
        const data = grayImage.data;
        const width = grayImage.width;
        const height = grayImage.height;
        
        // 降采样并量化图像来减少计算量
        const blockSize = 4; // 4x4块
        const quantizedWidth = Math.floor(width / blockSize);
        const quantizedHeight = Math.floor(height / blockSize);
        const quantized = new Uint8Array(quantizedWidth * quantizedHeight);
        
        // 计算颜色单一性
        let grayLevels = new Set();
        const colorSampleStep = 4; // 采样步长
        let colorSampledPixels = 0;
        
        for (let i = 0; i < data.length; i += 4 * colorSampleStep) {
            if (i < data.length) {
                // 量化为32个灰度级别
                const quantizedGray = Math.floor(data[i] / 8);
                grayLevels.add(quantizedGray);
                colorSampledPixels++;
            }
        }
        
        // 颜色单一性指标
        const colorSimplicity = 1 - (grayLevels.size / 32); // 值越高表示颜色越单一
        
        for (let y = 0; y < quantizedHeight; y++) {
            for (let x = 0; x < quantizedWidth; x++) {
                // 计算块的平均值
                let sum = 0;
                let count = 0;
                
                for (let by = 0; by < blockSize; by++) {
                    for (let bx = 0; bx < blockSize; bx++) {
                        const srcX = x * blockSize + bx;
                        const srcY = y * blockSize + by;
                        
                        if (srcX < width && srcY < height) {
                            const idx = (srcY * width + srcX) * 4;
                            sum += data[idx];
                            count++;
                        }
                    }
                }
                
                const avg = Math.round(sum / count);
                // 改回：8级量化 (0-7)，尝试合并更多相似灰度
                quantized[y * quantizedWidth + x] = Math.floor(avg / 32);
            }
        }
        
        // 修改：计算低方差区域的总像素面积占比
        let totalLowVariancePixels = 0;
        const varBlockSize = 3; // 3x3块
        const lowVarianceThreshold = 30; // 方差阈值从 100 降低到 30
        
        for (let y = 0; y < height - varBlockSize; y += varBlockSize) {
            for (let x = 0; x < width - varBlockSize; x += varBlockSize) {
                let sum = 0;
                let sumSq = 0;
                let count = 0;
                
                // 计算块的均值和方差
                for (let by = 0; by < varBlockSize; by++) {
                    for (let bx = 0; bx < varBlockSize; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        const val = data[idx];
                        sum += val;
                        sumSq += val * val;
                        count++;
                    }
                }
                
                const mean = sum / count;
                const variance = (sumSq / count) - (mean * mean);
                
                // 低方差 = 平滑区域
                if (variance < lowVarianceThreshold) {
                    totalLowVariancePixels += count; // 累加块内的像素数量
                }
            }
        }
        const totalPixels = width * height;
        const lowVarianceAreaRatio = totalPixels > 0 ? totalLowVariancePixels / totalPixels : 0;
        
        // 找到连通的色块
        const colorBlocks = findColorBlocks(quantized, quantizedWidth, quantizedHeight);
        
        // 检测皮肤色调
        let skinPixels = 0;
        const skipFactor = 4; // 降低采样间隔，从8改为4，提高肤色检测准确率
        let sampledPixels = 0;
        
        for (let i = 0; i < data.length; i += 4 * skipFactor) {
            if (i + 2 < data.length) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // 改进的肤色检测，更好地处理各种肤色和彩色照片
                // 基本肤色条件
                const basicSkinCondition = r > 60 && g > 40 && b > 20 && r > g && r > b;
                
                // 标准肤色 - 较严格的条件，适用于正常肤色
                const standardSkin = basicSkinCondition && 
                                 r - g > 15 && 
                                 r - b > 20 && r - b < 120;
                                 
                // 高亮肤色 - 适用于彩色照片中偏亮的肤色
                const brightSkin = r > 150 && g > 120 && b > 100 && 
                                 r > g + 10 && g > b && 
                                 r - b < 140;
                                 
                // 粉红色肤色 - 适用于带粉色色调的照片
                const pinkSkin = r > 180 && g > 120 && b > 120 && 
                               r - g > 20 && g - b < 20;
                
                if (standardSkin || brightSkin || pinkSkin) {
                    skinPixels++;
                }
                
                sampledPixels++;
            }
        }
        
        return {
            colorBlockCount: colorBlocks.length,
            lowVarianceAreaRatio: lowVarianceAreaRatio,
            skinToneRatio: skinPixels / sampledPixels,
            colorSimplicity: colorSimplicity,
            top5BlockRatio: 0 // 不再使用Top5
        };
    }
    
    /**
     * 查找色块 (连通区域)
     * @param {Uint8Array} quantized - 量化后的图像数据
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @returns {Array} 色块列表
     */
    function findColorBlocks(quantized, width, height) {
        const visited = new Uint8Array(width * height);
        const blocks = [];
        const minBlockSize = 4; // 最小色块大小
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (!visited[idx]) {
                    const color = quantized[idx];
                    // BFS寻找连通区域
                    const queue = [{x, y}];
                    let size = 0;
                    
                    visited[idx] = 1;
                    
                    while (queue.length > 0 && size < 1000) { // 限制大小避免大区域计算过久
                        const curr = queue.shift();
                        size++;
                        
                        // 检查4邻域
                        const neighbors = [
                            {x: curr.x-1, y: curr.y},
                            {x: curr.x+1, y: curr.y},
                            {x: curr.x, y: curr.y-1},
                            {x: curr.x, y: curr.y+1}
                        ];
                        
                        for (const {x: nx, y: ny} of neighbors) {
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nidx = ny * width + nx;
                                
                                if (!visited[nidx] && quantized[nidx] === color) {
                                    queue.push({x: nx, y: ny});
                                    visited[nidx] = 1;
                                }
                            }
                        }
                    }
                    
                    // 只记录大于最小值的色块
                    if (size >= minBlockSize) {
                        blocks.push({
                            color: color,
                            size: size
                        });
                    }
                }
            }
        }
        
        return blocks;
    }
    
    /**
     * 计算最佳锚点灰度值
     * @param {Object} imageStats - 图像统计信息
     * @param {string} imageType - 图像类型 ('photo', 'cartoon', 'portrait')
     * @returns {number} 最佳锚点灰度值
     */
    const calculateOptimalAnchorGray = (imageStats, imageType) => {
        const { mean, stdDev, peaks, histogram } = imageStats;
        
        // 计算中位数灰度值
        let median = 128;
        if (histogram) {
            const pixelTotal = histogram.reduce((sum, count) => sum + count, 0);
            let cumulativeCount = 0;
            const medianThreshold = pixelTotal / 2;
            for (let i = 0; i < 256; i++) {
                cumulativeCount += histogram[i];
                if (cumulativeCount >= medianThreshold) {
                    median = i;
                    break;
                }
            }
        }
        
        // 调试输出
        console.log(`锚点灰度计算 - 图像类型: ${imageType}, 均值: ${Math.round(mean)}, 中位数: ${median}, 标准差: ${Math.round(stdDev)}`);
        
        // 主要策略：使用中位数的加权平均以获得更好的平衡
        const weightedValue = median * 0.5 + mean * 0.5; // 50%中位数 + 50%均值
        
        let result = 0;
        
        switch (imageType) {
            case 'portrait':
                // 人像照片：使用我们之前调整过的系数和最小值
                result = Math.max(Math.round(weightedValue * 0.6), 65);
                console.log(`人像照片锚点计算: 加权值${Math.round(weightedValue)} * 0.6 = ${Math.round(weightedValue * 0.6)}, 最终值: ${result}`);
                return result;
                
            case 'cartoon':
                // 卡通/线稿图像：先计算基础锚点值
                let baseResult;
                if (peaks.length >= 2) {
                    const sortedPeaks = [...peaks].sort((a, b) => a.position - b.position);
                    if (sortedPeaks[1].position - sortedPeaks[0].position > 50) {
                        baseResult = Math.min(Math.round((sortedPeaks[0].position + sortedPeaks[1].position) / 2), 100);
                        console.log(`卡通图像(双峰)锚点计算: (${sortedPeaks[0].position} + ${sortedPeaks[1].position}) / 2 = ${baseResult} (限制最大值为100)`);
                    } else {
                        baseResult = Math.max(Math.round(weightedValue * 0.62), 65);
                        console.log(`卡通图像(双峰间距小)锚点计算: 加权值${Math.round(weightedValue)} * 0.62 = ${baseResult}`);
                    }
                } else {
                    baseResult = Math.max(Math.round(weightedValue * 0.62), 65);
                    console.log(`卡通图像(单峰)锚点计算: 加权值${Math.round(weightedValue)} * 0.62 = ${baseResult}`);
                }
                
                // 对卡通图降低 65% 的锚点值
                result = Math.round(baseResult * 0.35); // 降低 65% 就是乘以 0.35
                console.log(`卡通图像最终锚点: ${baseResult} * 0.35 = ${result} (降低65%)`);
                return result;
                
            case 'photo':
            default:
                // 普通照片逻辑不变
                if (stdDev < 40) {
                    result = Math.max(Math.round(weightedValue * 0.66), 72);
                    console.log(`普通照片(低对比度)锚点计算: 加权值${Math.round(weightedValue)} * 0.66 = ${Math.round(weightedValue * 0.66)}, 最终值: ${result}`);
                    return result;
                } else if (stdDev > 60) {
                    result = Math.max(Math.round(weightedValue * 0.69), 75);
                    console.log(`普通照片(高对比度)锚点计算: 加权值${Math.round(weightedValue)} * 0.69 = ${Math.round(weightedValue * 0.69)}, 最终值: ${result}`);
                    return result;
                } else {
                    result = Math.max(Math.round(weightedValue * 0.72), 77);
                    console.log(`普通照片(中对比度)锚点计算: 加权值${Math.round(weightedValue)} * 0.72 = ${Math.round(weightedValue * 0.72)}, 最终值: ${result}`);
                    return result;
                }
        }
    };
    
    /**
     * 应用亮度和对比度调整
     * @param {ImageData} imageData - 图像数据
     * @param {number} brightness - 亮度调整值 (-100 到 100)
     * @param {number} contrast - 对比度调整值 (0.1 到 3.0)
     * @param {number} anchorGray - 对比度调整的锚点灰度值 (0 到 255)
     * @returns {ImageData} 调整后的图像数据
     */
    const applyBrightnessContrast = (imageData, brightness, contrast, anchorGray = 128) => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        // 将亮度从-100~100映射到-255~255
        const brightnessAdjust = brightness * 2.55;
        
        for (let i = 0; i < data.length; i += 4) {
            // 假设已经是灰度图像，R=G=B
            let gray = data[i];
            
            // 应用亮度
            gray += brightnessAdjust;
            
            // 应用对比度 (围绕 anchorGray)
            gray = (gray - anchorGray) * contrast + anchorGray;
            
            // 限制范围
            gray = Math.max(0, Math.min(255, Math.round(gray)));
            
            // 更新RGB通道
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            // Alpha保持不变
        }
        
        return new ImageData(data, width, height);
    };
    
    /**
     * 计算自适应输入黑场值
     * @param {Array} histogram - 灰度直方图
     * @param {string} imageType - 图像类型
     * @returns {number} 自适应黑场值
     */
    const calculateAdaptiveInLow = (histogram, imageType) => {
        // 只对卡通图启用自适应黑场
        if (imageType !== 'cartoon') {
            return 0; // 非卡通图使用默认值
        }

        const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
        const targetDarkPixels = Math.floor(totalPixels * 0.005); // 取最暗的 0.5% 像素
        let darkPixelCount = 0;
        let weightedSum = 0;
        let count = 0;

        // 从最暗的开始统计，直到达到目标暗像素数量
        for (let i = 0; i < 256 && darkPixelCount < targetDarkPixels; i++) {
            if (histogram[i] > 0) {
                darkPixelCount += histogram[i];
                weightedSum += i * histogram[i];
                count += histogram[i];
            }
        }

        // 计算最暗区域的平均灰度值
        const avgDarkGray = count > 0 ? Math.round(weightedSum / count) : 0;

        // 如果最暗的颜色已经够暗，就不需要调整
        if (avgDarkGray < 30) {
            return 0;
        }

        console.log(`自适应黑场计算 - 最暗区域平均灰度: ${avgDarkGray}`);
        return avgDarkGray;
    };

    /**
     * 应用色阶调整
     * @param {ImageData} imageData - 图像数据
     * @param {number} inLow - 输入黑场 (0-254)
     * @param {number} inHigh - 输入白场 (1-255)
     * @param {number} outLow - 输出黑场 (0-254)
     * @param {number} outHigh - 输出白场 (1-255)
     * @param {string} imageType - 图像类型
     * @returns {ImageData} 调整后的图像数据
     */
    const applyLevels = (imageData, inLow, inHigh, outLow, outHigh, imageType = 'photo') => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        // 计算直方图
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        // 计算自适应输入黑场
        const adaptiveInLow = calculateAdaptiveInLow(histogram, imageType);
        // 使用自适应黑场或原始黑场中的较大值
        const finalInLow = Math.max(inLow, adaptiveInLow);
        
        console.log(`色阶调整 - 原始输入黑场: ${inLow}, 自适应黑场: ${adaptiveInLow}, 最终使用: ${finalInLow}`);
        
        const inRange = inHigh - finalInLow;
        const outRange = outHigh - outLow;
        
        if (inRange <= 0 || outRange < 0) {
            return imageData; // 避免除以零或无效的范围
        }
        
        for (let i = 0; i < data.length; i += 4) {
            // 假设已经是灰度图像，R=G=B
            let gray = data[i];
            
            // 应用色阶映射
            if (gray <= finalInLow) {
                gray = outLow;
            } else if (gray >= inHigh) {
                gray = outHigh;
            } else {
                gray = outLow + ((gray - finalInLow) / inRange) * outRange;
            }
            
            // 限制范围
            gray = Math.max(0, Math.min(255, Math.round(gray)));
            
            // 更新RGB通道
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            // Alpha保持不变
        }
        
        return new ImageData(data, width, height);
    };
    
    /**
     * 处理图像
     * @param {ImageData} imageData - 原始图像数据
     * @param {string} materialId - 材料ID
     * @param {string} variant - 材料变体 (dark, neutral, light)
     * @param {string} laserType - 激光器类型 (e.g., 'CO2', 'Diode', 'Fiber')
     * @param {Object} overrideParams - 用户覆盖的参数 (例如 { anchorGray: 100, knownImageType: 'photo' })
     * @returns {Promise<Object>} 处理结果和相关信息
     */
    const processImage = async (imageData, materialId, variant = 'neutral', laserType = 'CO2', overrideParams = {}) => {
        // 检查是否有已知的图像类型传入
        const knownImageType = overrideParams.knownImageType;
        
        console.log(`处理图像，覆盖参数:`, overrideParams);
        
        // 1. 转换为灰度图
        const grayImage = convertToGrayscale(imageData);
        
        // 2. 计算图像统计信息
        const imageStats = calculateImageStats(grayImage);
        
        // 3. 检测图像类型 (如果知道类型则跳过检测)
        let imageType;
        if (knownImageType) {
            imageType = knownImageType;
            console.log(`使用已知图像类型: ${imageType} (跳过检测)`);
        } else {
            // 只有在不知道类型时才执行检测
            console.log('首次处理或未知类型，执行图像类型检测...');
            imageType = await detectImageType(imageData);
            console.log(`检测到图像类型: ${imageType}`);
        }
        
        // 4. 获取材料基本参数
        let params = Materials.getMaterialParams(materialId, variant);
        
        // 5. 根据图像特性和激光器类型调整参数
        let { params: nonDitherParams, info: initialInfo, analysis } = 
            Materials.adjustParamsForImageStats(params, imageStats, laserType); 
        
        // 添加图像类型检测信息到分析报告
        let imageTypeText = imageType === 'portrait' ? '人像照片' : 
                             imageType === 'cartoon' ? '卡通/线稿' : '普通照片';
        
        // 添加图像类型到分析摘要
        if (!analysis.imageSummary) {
            analysis.imageSummary = '';
        }
        // 根据来源更新分析信息
        if (knownImageType) {
            analysis.imageSummary = `检测类型: ${imageTypeText} (使用之前的检测结果). ` + analysis.imageSummary;
        } else {
            analysis.imageSummary = `检测类型: ${imageTypeText}. ` + analysis.imageSummary;
        }
        
        // 添加图像特征说明
        analysis.adjustmentReasons.push(`[图像分析] 检测到图像类型为${imageTypeText}`);
        
        const materialInfo = Materials.getMaterialInfo(materialId); // 获取材料信息，包含isMetal
        
        // 6. 自动计算最佳锚点灰度值（除非用户覆盖）
        let anchorGraySource = ''; // 记录锚点来源
        if (overrideParams.anchorGray === undefined) {
            nonDitherParams.anchorGray = calculateOptimalAnchorGray(imageStats, imageType);
            anchorGraySource = 'auto_calculated';
            
            let strategyExplanation = '';
            if (imageType === 'portrait') {
                strategyExplanation = `使用人像优化锚点(${nonDitherParams.anchorGray})保留面部细节`;
            } else if (imageType === 'cartoon') {
                if (imageStats.peaks.length >= 2) {
                    strategyExplanation = `使用峰值间锚点(${nonDitherParams.anchorGray})增强线条与色块分离`;
                } else {
                    strategyExplanation = `使用中性锚点(${nonDitherParams.anchorGray})保持线条清晰度`;
                }
            } else { // photo
                strategyExplanation = `使用较高锚点值(${nonDitherParams.anchorGray})提高加工层次感`;
            }
            analysis.adjustmentReasons.push(`[锚点优化] ${strategyExplanation}`);
            
            // 修改：基于原始基础锚点，独立计算金属和深色加成
            const baseAnchorGray = nonDitherParams.anchorGray; // 保存基础值
            let totalAdjustmentFactor = 1.0;
            let adjustmentReasons = [];
            
            if (materialInfo && materialInfo.isMetal) {
                totalAdjustmentFactor += 0.10; // 金属 +10%
                adjustmentReasons.push(`金属材质(+10%)`);
                console.log(`锚点调整: 金属材质 +10%`);
            }
            if (variant === 'dark') {
                totalAdjustmentFactor += 0.05; // 深色 +5%
                adjustmentReasons.push(`深色变体(+5%)`);
                 console.log(`锚点调整: 深色变体 +5%`);
            }
            
            // 只有当系数大于1时才应用调整
            if (totalAdjustmentFactor > 1.0) {
                nonDitherParams.anchorGray = Math.round(baseAnchorGray * totalAdjustmentFactor);
                // 限制锚点灰度范围
                nonDitherParams.anchorGray = Math.max(0, Math.min(255, nonDitherParams.anchorGray));
                console.log(`锚点调整：基础 ${baseAnchorGray} -> 最终 ${nonDitherParams.anchorGray} (系数 ${totalAdjustmentFactor.toFixed(2)})`);
                
                // 添加调整说明到分析报告
                analysis.adjustmentReasons.push(`[材质/变体调整] ${adjustmentReasons.join(', ')}，最终锚点 ${nonDitherParams.anchorGray}`);
                 // 可选：移除或合并之前的[锚点优化]说明，避免冗余
                // analysis.adjustmentReasons = analysis.adjustmentReasons.filter(r => !r.startsWith('[锚点优化]')); 
            } else {
                // 没有应用调整，也要明确最终值
                 console.log(`锚点调整：未使用额外调整，最终锚点 ${nonDitherParams.anchorGray}`);
                analysis.adjustmentReasons.push(`[最终锚点] 自动计算锚点为 ${nonDitherParams.anchorGray} (无额外调整)`);
            }
            
        } else {
            // 用户覆盖了锚点值
            if (typeof overrideParams.anchorGray === 'number' && 
                overrideParams.anchorGray >= 0 && 
                overrideParams.anchorGray <= 255) {
                nonDitherParams.anchorGray = overrideParams.anchorGray;
                anchorGraySource = 'user_override';
                analysis.adjustmentReasons.push(`[用户设置] 锚点灰度被手动设置为 ${nonDitherParams.anchorGray}`);
            } else {
                // 如果覆盖值无效，则回退到默认值或基础计算？这里先用默认值
                nonDitherParams.anchorGray = Materials.defaultParams.anchorGray || 128;
                anchorGraySource = 'invalid_override_fallback';
                 analysis.adjustmentReasons.push(`[警告] 用户提供的锚点灰度无效，使用默认值 ${nonDitherParams.anchorGray}`);
            }
        }
        
        // 7. 应用基础调整
        let adjustedGrayImage = applyBrightnessContrast(
            grayImage, 
            nonDitherParams.brightness, 
            nonDitherParams.contrast,
            nonDitherParams.anchorGray
        );
        adjustedGrayImage = applyLevels(
            adjustedGrayImage, 
            nonDitherParams.levelInLow, 
            nonDitherParams.levelInHigh, 
            nonDitherParams.levelOutLow, 
            nonDitherParams.levelOutHigh,
            imageType
        );
        if (nonDitherParams.sharpness > 0) {
            adjustedGrayImage = ImageAlgorithms.applySharpening(adjustedGrayImage, nonDitherParams.sharpness);
        }
        
        // 移除自动抖动逻辑：默认不应用抖动
        let finalProcessedImage = adjustedGrayImage; // 最终处理结果（可能反色，但无抖动）
        let ditherDecisionInfo = '自动抖动已禁用，请手动选择。';
        let ditherEnabled = false;
        let ditherType = null;
        let ditherThreshold = null;
        analysis.adjustmentReasons.push("[抖动处理] 默认不启用抖动，请手动选择算法");
        
        // 新增：为深色变体应用反色
        let finalImage = finalProcessedImage;
        let wasInverted = false;
        if (variant === 'dark') {
            finalImage = ImageAlgorithms.invertColors(finalProcessedImage);
            wasInverted = true;
            console.log('为深色变体应用了反色处理。');
            analysis.adjustmentReasons.push('[颜色处理] 已为深色材料自动应用反色');
        } else {
            analysis.adjustmentReasons.push('[颜色处理] 浅色材料未应用反色');
        }
        
        const finalInfo = initialInfo + ditherDecisionInfo + (wasInverted ? '已自动反色。' : '');
        
        const finalParams = { 
            ...nonDitherParams, 
            ditherEnabled: ditherEnabled, 
            ditherType: ditherEnabled ? ditherType : null, 
            ditherThreshold: ditherEnabled ? ditherThreshold : null,
            detectedImageType: imageType 
        };

        // 恢复分析报告结构
        analysis.imageTypeDetection = {
            imageType: imageType,
            summary: `检测到图像类型: ${imageTypeText}` + (knownImageType ? ' (使用之前的检测结果)' : ''),
            confidence: knownImageType ? 0.99 : 0.85 // 已知类型给更高置信度
        };
        const strategyDescription = getStrategyDescription(imageType, imageStats);
        analysis.adjustmentStrategy = {
            strategyType: imageType,
            description: strategyDescription
        };
        if (!analysis.imageSummary.includes('优化策略')) {
            analysis.imageSummary += ` ${strategyDescription}`;
        }
        const anchorGrayInfo = `[锚点灰度] ${strategyDescription}`;
        if (!analysis.adjustmentReasons.includes(anchorGrayInfo)) {
            analysis.adjustmentReasons.push(anchorGrayInfo);
        }

        return {
            originalImage: imageData,
            grayImage: grayImage,
            processedImage: finalImage, // 使用可能已反色的 finalImage
            wasInverted: wasInverted, // 传递反色状态
            imageStats: imageStats,
            params: finalParams,
            info: finalInfo,
            analysis: analysis
        };
    };
    
    /**
     * 自定义处理图像
     * @param {ImageData} imageData - 原始图像数据
     * @param {Object} params - 自定义参数
     * @returns {Object} 处理结果
     */
    const processImageWithCustomParams = (imageData, params) => {
        console.log('使用自定义参数处理图像:', params);
        try {
            // 转换为灰度图
            const grayImage = convertToGrayscale(imageData);
            
            // 计算图像统计信息
            const imageStats = calculateImageStats(grayImage);
            
            // 提供默认值
            params = {
                brightness: 0,
                contrast: 1.2,
                sharpness: 0.5,
                anchorGray: 128,
                levelInLow: 0,
                levelInHigh: 255,
                levelOutLow: 0,
                levelOutHigh: 255,
                ditherEnabled: false,
                ditherType: 'floydSteinberg',
                ditherThreshold: 128,
                ...params // 覆盖默认值
            };
            
            console.log('最终参数:', params);
            
            // 应用调整
            let processedImage = applyBrightnessContrast(
                grayImage, 
                params.brightness, 
                params.contrast,
                params.anchorGray // 使用传入的锚点灰度值
            );
            
            processedImage = applyLevels(
                processedImage, 
                params.levelInLow, 
                params.levelInHigh, 
                params.levelOutLow, 
                params.levelOutHigh,
                params.detectedImageType
            );
            
            if (params.sharpness > 0) {
                processedImage = ImageAlgorithms.applySharpening(processedImage, params.sharpness);
            }
            
            if (params.ditherEnabled) {
                processedImage = ImageAlgorithms.applyDithering(processedImage, params);
            }
            
            return {
                originalImage: imageData,
                grayImage: grayImage,
                processedImage: processedImage,
                imageStats: imageStats,
                params: params,
                info: "使用自定义参数处理",
                wasInverted: false
            };
        } catch (error) {
            console.error('自定义参数处理失败:', error);
            throw error;
        }
    };
    
    /**
     * 绘制直方图
     * @param {HTMLCanvasElement} canvas - 目标画布
     * @param {Array} histogram - 直方图数据
     * @param {string} title - 直方图标题
     */
    const drawHistogram = (canvas, histogram, title) => {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // 找出最大值以便正确缩放
        const maxVal = Math.max(...histogram);
        const barWidth = width / 256;
        
        // 绘制背景
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        // 绘制灰度区域
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 256; i++) {
            const shade = i / 255;
            ctx.fillStyle = `rgba(${i}, ${i}, ${i}, 0.7)`;
            ctx.fillRect(i * barWidth, 0, barWidth, 10);
        }
        
        // 绘制直方图条
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        for (let i = 0; i < 256; i++) {
            const barHeight = (histogram[i] / maxVal) * (height - 15);
            ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
        
        // 可选：添加标题
        if (title) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, width / 2, 25);
        }
    };
    
    /**
     * 获取优化策略描述
     * @param {string} imageType - 图像类型 ('photo', 'cartoon', 'portrait')
     * @param {Object} statsInfo - 图像统计信息
     * @returns {string} 策略描述
     */
    function getStrategyDescription(imageType, statsInfo) {
        const { mean, stdDev, peaks } = statsInfo;
        
        let median = 128; // 默认值
        const histogram = statsInfo.histogram;
        if (histogram) {
            const pixelTotal = histogram.reduce((sum, count) => sum + count, 0);
            let cumulativeCount = 0;
            const medianThreshold = pixelTotal / 2;
            
            for (let i = 0; i < 256; i++) {
                cumulativeCount += histogram[i];
                if (cumulativeCount >= medianThreshold) {
                    median = i;
                    break;
                }
            }
        }
        
        // 计算加权值，与calculateOptimalAnchorGray保持一致
        const weightedValue = median * 0.5 + mean * 0.5;
        
        switch (imageType) {
            case 'portrait':
                return `人像照片优化策略：使用加权平均值(${Math.round(weightedValue)})，系数0.6，保留面部细节`;
            case 'cartoon':
                if (peaks && peaks.length >= 2) {
                    return `卡通/线稿优化策略：使用双峰间锚点灰度，增强线条与背景分离，标准差${Math.round(stdDev)}`;
                } else {
                    return `卡通/线稿优化策略：使用加权平均值(${Math.round(weightedValue)})，系数0.62，保持线条清晰度`;
                }
            case 'photo':
            default:
                let detail = '';
                if (stdDev < 40) {
                    detail = '低对比度图像';
                    return `普通照片优化策略：${detail}，基于加权平均值(${Math.round(weightedValue)})，系数0.66，保持自然亮度`;
                } else if (stdDev > 60) {
                    detail = '高对比度图像';
                    return `普通照片优化策略：${detail}，基于加权平均值(${Math.round(weightedValue)})，系数0.69，保持对比度和亮度平衡`;
                } else {
                    detail = '中等对比度图像';
                    return `普通照片优化策略：${detail}，基于加权平均值(${Math.round(weightedValue)})，系数0.72，优化层次感和整体亮度`;
                }
        }
    }
    
    return {
        convertToGrayscale,
        calculateHistogram,
        calculateImageStats,
        calculateOptimalAnchorGray,
        applyBrightnessContrast,
        applyLevels,
        processImage,
        processImageWithCustomParams,
        drawHistogram,
        detectImageType,
        analyzeHistogramFeatures,
        analyzeEdgeFeatures,
        analyzeTextureFeatures
    };
})();

export default ImageProcessor; 