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
     * 检测图像类型：区分照片和卡通/线稿图像
     * @param {ImageData} imageData - 原始图像数据
     * @returns {string} 图像类型 ('photo', 'cartoon', 'portrait')
     */
    const detectImageType = (imageData) => {
        // 转为灰度并获取统计信息
        const grayImage = convertToGrayscale(imageData);
        const stats = calculateImageStats(grayImage);
        
        // 提取关键特征
        // 1. 直方图特征分析
        const histFeatures = analyzeHistogramFeatures(stats.histogram);
        
        // 2. 改进的边缘特征分析
        const edgeFeatures = analyzeEdgeFeatures(grayImage);
        
        // 3. 纹理特征分析
        const textureFeatures = analyzeTextureFeatures(grayImage);
        
        // 构建卡通/线稿评分 (0-100)
        let cartoonScore = 0;
        
        // 直方图特征得分 (最高40分) - 提高标准
        if (histFeatures.isEmpty && histFeatures.peakCount >= 2) cartoonScore += 15; // 要求同时满足空白区域和多峰
        if (histFeatures.peakCount >= 2 && histFeatures.valleyDepth > 0.6) cartoonScore += 20; // 提高谷深度要求
        
        // 边缘特征得分 (最高35分) - 提高阈值
        if (edgeFeatures.distinctEdgeRatio > 0.07) cartoonScore += 15; // 提高明显边缘比例阈值
        if (edgeFeatures.longEdgeRatio > 0.1) cartoonScore += 10; // 提高长边比例阈值
        if (edgeFeatures.edgeContrast > 70) cartoonScore += 10; // 提高边缘对比度阈值
        
        // 纹理特征得分 (最高25分) - 更严格的标准
        if (textureFeatures.smoothAreaRatio > 0.5) cartoonScore += 15; // 提高平滑区域要求
        if (textureFeatures.colorBlockCount < 100) cartoonScore += 10; // 降低色块数量阈值
        
        // 颜色单一性加分 (新增)
        if (textureFeatures.colorSimplicity > 0.7) cartoonScore += 25; // 颜色非常单一
        else if (textureFeatures.colorSimplicity > 0.5) cartoonScore += 15; // 颜色比较单一
        
        // 特殊扣分条件 - 对照片特征进行惩罚
        if (histFeatures.peakCount === 1 && histFeatures.valleyDepth < 0.3) cartoonScore -= 20; // 单峰且谷浅，典型照片特征
        if (edgeFeatures.edgeRatio > 0.3) cartoonScore -= 15; // 边缘比例过高，可能是纹理丰富的照片
        if (textureFeatures.smoothAreaRatio < 0.2) cartoonScore -= 10; // 平滑区域太少，可能是照片
        
        // 提高卡通图像识别的门槛 (调整为55分)
        const cartoonThreshold = 55;
        
        // 打印调试信息
        console.log(`图像类型检测评分 - 卡通分数: ${cartoonScore}/${cartoonThreshold}`);
        console.log(`直方图特征: 峰值数=${histFeatures.peakCount}, 空直方图=${histFeatures.isEmpty}, 谷深度=${histFeatures.valleyDepth.toFixed(2)}`);
        console.log(`边缘特征: 明显边缘=${edgeFeatures.distinctEdgeRatio.toFixed(3)}, 长边比=${edgeFeatures.longEdgeRatio.toFixed(3)}, 边缘比例=${edgeFeatures.edgeRatio.toFixed(3)}`);
        console.log(`纹理特征: 平滑区域=${textureFeatures.smoothAreaRatio.toFixed(2)}, 色块数=${textureFeatures.colorBlockCount}, 颜色单一性=${textureFeatures.colorSimplicity.toFixed(2)}`);
        
        // 判断结果
        if (cartoonScore >= cartoonThreshold) {
            return 'cartoon';
        } else if (textureFeatures.skinToneRatio > 0.15) {
            return 'portrait';
        } else {
            return 'photo';
        }
    };
    
    /**
     * 分析直方图特征
     * @param {Array} histogram - 灰度直方图
     * @returns {Object} 直方图特征
     */
    function analyzeHistogramFeatures(histogram) {
        const total = histogram.reduce((sum, val) => sum + val, 0);
        const normalized = histogram.map(v => v / total);
        
        // 平滑直方图减少噪声
        const smoothed = [];
        for (let i = 0; i < normalized.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i-2); j <= Math.min(255, i+2); j++) {
                sum += normalized[j];
                count++;
            }
            smoothed[i] = sum / count;
        }
        
        // 寻找峰值
        const peaks = [];
        for (let i = 5; i < 250; i++) {
            if (smoothed[i] > 0.005 && // 至少占总像素的0.5%
                smoothed[i] > smoothed[i-1] && 
                smoothed[i] > smoothed[i-2] && 
                smoothed[i] > smoothed[i-3] && 
                smoothed[i] > smoothed[i+1] && 
                smoothed[i] > smoothed[i+2] && 
                smoothed[i] > smoothed[i+3]) {
                peaks.push({
                    position: i,
                    height: smoothed[i]
                });
            }
        }
        
        // 按高度排序
        peaks.sort((a, b) => b.height - a.height);
        
        // 计算峰值间谷的深度
        let valleyDepth = 0;
        if (peaks.length >= 2) {
            const peak1 = peaks[0].position;
            const peak2 = peaks[1].position;
            
            const startPos = Math.min(peak1, peak2);
            const endPos = Math.max(peak1, peak2);
            
            if (endPos - startPos > 20) { // 峰值之间至少相距20
                // 找出峰值间的最小值
                let minHeight = 1;
                for (let i = startPos + 5; i < endPos - 5; i++) {
                    if (smoothed[i] < minHeight) {
                        minHeight = smoothed[i];
                    }
                }
                
                // 谷的深度 = 1 - (谷底/较低峰值高度)
                valleyDepth = 1 - (minHeight / Math.min(peaks[0].height, peaks[1].height));
            }
        }
        
        // 检查直方图是否有大片空白区域
        let emptyBins = 0;
        for (let i = 10; i < 245; i++) {
            if (normalized[i] < 0.0005) { // 小于0.05%的区域视为空白
                emptyBins++;
            }
        }
        
        return {
            peakCount: peaks.length,
            peaks: peaks.slice(0, 3), // 保留最高的3个峰
            valleyDepth: valleyDepth,
            isEmpty: emptyBins > 100 // 超过100个bin为空则认为有大片空白
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
                // 8级量化 (0-7)
                quantized[y * quantizedWidth + x] = Math.floor(avg / 32);
            }
        }
        
        // 计算平滑区域 (方差低的区域)
        let smoothAreaCount = 0;
        const varBlockSize = 3; // 3x3块
        
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
                if (variance < 100) {
                    smoothAreaCount++;
                }
            }
        }
        
        // 找到连通的色块
        const colorBlocks = findColorBlocks(quantized, quantizedWidth, quantizedHeight);
        
        // 检测皮肤色调
        let skinPixels = 0;
        const skipFactor = 8; // 每8个像素采样一次以加速
        let sampledPixels = 0;
        
        for (let i = 0; i < data.length; i += 4 * skipFactor) {
            if (i + 2 < data.length) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // 简化的肤色检测
                if (r > 60 && g > 40 && b > 20 && 
                    r > g && r > b && 
                    r - g > 15 && 
                    r - b > 20 && r - b < 120) {
                    skinPixels++;
                }
                sampledPixels++;
            }
        }
        
        const totalVarBlocks = Math.floor((height / varBlockSize) * (width / varBlockSize));
        
        return {
            colorBlockCount: colorBlocks.length,
            smoothAreaRatio: smoothAreaCount / totalVarBlocks,
            skinToneRatio: skinPixels / sampledPixels,
            colorSimplicity: colorSimplicity // 添加新的颜色单一性指标
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
        
        // 主要策略：基于图像类型选择不同的锚点灰度计算方法
        switch (imageType) {
            case 'portrait':
                // 人像照片：使用较低锚点灰度以保留面部暗部细节
                return Math.round(mean * 0.5);
                
            case 'cartoon':
                // 卡通/线稿图像：检查直方图峰值
                if (peaks.length >= 2) {
                    // 双峰或多峰分布，使用两个主要峰值之间的值作为锚点
                    // 这有助于线条与背景/填充色之间的分离
                    const sortedPeaks = [...peaks].sort((a, b) => a.position - b.position);
                    
                    // 如果峰值间距很大，使用两个主要峰值之间的值
                    if (sortedPeaks[1].position - sortedPeaks[0].position > 50) {
                        return Math.round((sortedPeaks[0].position + sortedPeaks[1].position) / 2);
                    }
                }
                
                // 单峰分布或峰值间距较小，使用略低于均值的锚点
                return Math.round(mean * 0.8);
                
            case 'photo':
            default:
                // 普通照片：根据标准差调整锚点灰度值
                // 低标准差（低对比度图像）使用更低的锚点以增加对比度
                // 高标准差（高对比度图像）使用适中的锚点以平衡效果
                
                // 原来的计算方法 (修改前): return Math.max(Math.round(mean * 0.85), 80);
                
                if (stdDev < 40) {
                    // 低对比度图像，使用更低的锚点值（约为均值的60%）
                    return Math.max(Math.round(mean * 0.6), 55);
                } else if (stdDev > 60) {
                    // 高对比度图像，使用适中偏低的锚点值（约为均值的65%）
                    return Math.max(Math.round(mean * 0.65), 60);
                } else {
                    // 中等对比度图像，使用均值的70%作为锚点
                    return Math.max(Math.round(mean * 0.7), 60);
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
     * 应用色阶调整
     * @param {ImageData} imageData - 图像数据
     * @param {number} inLow - 输入黑场 (0-254)
     * @param {number} inHigh - 输入白场 (1-255)
     * @param {number} outLow - 输出黑场 (0-254)
     * @param {number} outHigh - 输出白场 (1-255)
     * @returns {ImageData} 调整后的图像数据
     */
    const applyLevels = (imageData, inLow, inHigh, outLow, outHigh) => {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        
        const inRange = inHigh - inLow;
        const outRange = outHigh - outLow;
        
        if (inRange <= 0 || outRange < 0) {
            return imageData; // 避免除以零或无效的范围
        }
        
        for (let i = 0; i < data.length; i += 4) {
            // 假设已经是灰度图像，R=G=B
            let gray = data[i];
            
            // 应用色阶映射
            if (gray <= inLow) {
                gray = outLow;
            } else if (gray >= inHigh) {
                gray = outHigh;
            } else {
                gray = outLow + ((gray - inLow) / inRange) * outRange;
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
     * @param {Object} overrideParams - 用户覆盖的参数 (例如 { anchorGray: 100 })
     * @returns {Object} 处理结果和相关信息
     */
    const processImage = (imageData, materialId, variant = 'neutral', laserType = 'CO2', overrideParams = {}) => {
        // 1. 转换为灰度图
        const grayImage = convertToGrayscale(imageData);
        
        // 2. 计算图像统计信息
        const imageStats = calculateImageStats(grayImage);
        
        // 3. 检测图像类型
        const imageType = detectImageType(imageData);
        
        // 4. 获取材料基本参数
        let params = Materials.getMaterialParams(materialId, variant);
        
        // 5. 根据图像特性和激光器类型调整参数 (仅基础调整)
        let { params: nonDitherParams, info: initialInfo, analysis } = 
            Materials.adjustParamsForImageStats(params, imageStats, laserType); 
        
        // 添加图像类型检测信息到分析报告
        const imageTypeText = imageType === 'portrait' ? '人像照片' : 
                             imageType === 'cartoon' ? '卡通/线稿' : '普通照片';
        
        // 添加图像类型到分析摘要
        if (!analysis.imageSummary) {
            analysis.imageSummary = '';
        }
        analysis.imageSummary = `检测类型: ${imageTypeText}. ` + analysis.imageSummary;
        
        // 添加图像特征说明
        analysis.adjustmentReasons.push(`[图像分析] 检测到图像类型为${imageTypeText}`);
        
        // 6. 自动计算最佳锚点灰度值（除非用户覆盖）
        if (overrideParams.anchorGray === undefined) {
            nonDitherParams.anchorGray = calculateOptimalAnchorGray(imageStats, imageType);
            
            // 根据图像类型添加详细的调整策略说明
            let strategyExplanation = '';
            if (imageType === 'portrait') {
                strategyExplanation = `使用较低锚点灰度(${nonDitherParams.anchorGray})保留面部暗部细节`;
            } else if (imageType === 'cartoon') {
                if (imageStats.peaks.length >= 2) {
                    strategyExplanation = `使用峰值间锚点(${nonDitherParams.anchorGray})增强线条与色块分离`;
                } else {
                    strategyExplanation = `使用中性锚点(${nonDitherParams.anchorGray})保持线条清晰度`;
                }
            } else { // photo
                strategyExplanation = `使用较低锚点值(${nonDitherParams.anchorGray})提高加工层次感`;
            }
            
            analysis.adjustmentReasons.push(`[锚点优化] ${strategyExplanation}`);
            
        } else {
            // --- 应用用户覆盖参数 ---
            if (typeof overrideParams.anchorGray === 'number' && 
                overrideParams.anchorGray >= 0 && 
                overrideParams.anchorGray <= 255) {
                nonDitherParams.anchorGray = overrideParams.anchorGray;
                // 添加覆盖说明到分析报告
                analysis.adjustmentReasons.push(`[用户覆盖] 锚点灰度被手动设置为 ${overrideParams.anchorGray}`);
            }
        }
        
        // 7. 应用基础调整 (亮度/对比度, 色阶, 锐化) - 使用可能被覆盖过的 nonDitherParams
        let adjustedGrayImage = applyBrightnessContrast(
            grayImage, 
            nonDitherParams.brightness, 
            nonDitherParams.contrast,
            nonDitherParams.anchorGray // 传递锚点灰度值
        );
        adjustedGrayImage = applyLevels(
            adjustedGrayImage, 
            nonDitherParams.levelInLow, 
            nonDitherParams.levelInHigh, 
            nonDitherParams.levelOutLow, // 仍然使用params里的 (固定为0)
            nonDitherParams.levelOutHigh // 仍然使用params里的 (固定为255)
        );
        if (nonDitherParams.sharpness > 0) {
            adjustedGrayImage = ImageAlgorithms.applySharpening(adjustedGrayImage, nonDitherParams.sharpness);
        }
        
        // --- 移除：不再根据 variant 自动反色 ---
        let isInverted = false; // 保留标志位，但始终为 false（除非未来通过参数控制）
        
        // --- 新增：基于调整后图像的智能抖动决策 ---
        let finalProcessedImage = adjustedGrayImage; 
        let ditherDecisionInfo = '';
        let ditherEnabled = false;
        let ditherType = 'floydSteinberg'; // Default type if enabled
        let ditherThreshold = 128; // 添加默认阈值

        if (laserType !== 'Fiber') {
            // 重新计算调整后图像的标准差
            const adjustedStats = calculateImageStats(adjustedGrayImage);
            const adjustedStdDev = adjustedStats.stdDev;
            
            // 根据材料类型和图像类型设置不同的对比度阈值
            let ditherStdDevThreshold = 60; // 默认阈值
            
            // 调整卡通图像的抖动阈值
            if (imageType === 'cartoon') {
                ditherStdDevThreshold = 70; // 卡通图像允许更高对比度而不用抖动
            } else if (materialId === 'walnut' || materialId === 'leather') {
                ditherStdDevThreshold = 70; // 木材或皮革，稍放宽
            }
            
            if (adjustedStdDev < ditherStdDevThreshold) { // 调整后对比度仍不高，启用抖动
                ditherEnabled = true;
                
                // 根据图像类型选择抖动算法
                if (imageType === 'cartoon') {
                    // 卡通图像优先使用Ordered抖动
                    ditherType = 'ordered';
                    ditherDecisionInfo = `卡通/线稿图像，对比度(${adjustedStdDev.toFixed(1)})<${ditherStdDevThreshold}，自动启用Ordered抖动；`;
                    analysis.adjustmentReasons.push(`[智能抖动] 卡通/线稿图像，对比度(${adjustedStdDev.toFixed(1)})，应用Ordered抖动提升线条质感`);
                } else if (adjustedStdDev < 40) {
                    // 非常低对比度，用 Floyd-Steinberg
                    ditherType = 'floydSteinberg';
                    ditherDecisionInfo = `调整后对比度低(${adjustedStdDev.toFixed(1)})<${ditherStdDevThreshold}，自动启用Floyd-Steinberg抖动；`;
                    analysis.adjustmentReasons.push(`[智能抖动] 调整后对比度低(${adjustedStdDev.toFixed(1)})，自动启用Floyd-Steinberg抖动模拟灰阶`);
                } else {
                    // 中等偏低，用 Ordered
                    ditherType = 'ordered';
                    ditherDecisionInfo = `调整后对比度适中(${adjustedStdDev.toFixed(1)})<${ditherStdDevThreshold}，自动启用Ordered抖动；`;
                    analysis.adjustmentReasons.push(`[智能抖动] 调整后对比度适中(${adjustedStdDev.toFixed(1)})，自动启用Ordered抖动增加质感`);
                }
                
                // 应用抖动
                finalProcessedImage = ImageAlgorithms.applyDithering(adjustedGrayImage, { 
                    ditherEnabled: true, 
                    ditherType: ditherType, 
                    ditherThreshold: ditherThreshold // 使用默认阈值
                });
            } else {
                ditherDecisionInfo = `调整后对比度高(${adjustedStdDev.toFixed(1)})>=${ditherStdDevThreshold}，未自动启用抖动；`;
                analysis.adjustmentReasons.push(`[智能抖动] 调整后对比度高(${adjustedStdDev.toFixed(1)})，未自动启用抖动`);
            }
        } else {
             ditherDecisionInfo = "Fiber激光器默认不自动启用抖动；";
             analysis.adjustmentReasons.push("[智能抖动] Fiber激光器默认不自动启用抖动");
        }
        
        // 合并处理信息
        const finalInfo = initialInfo + ditherDecisionInfo;
        
        // 更新最终参数对象以反映抖动决策 (用于报告)
        const finalParams = { 
            ...nonDitherParams, 
            ditherEnabled: ditherEnabled, 
            ditherType: ditherEnabled ? ditherType : null, // 只有启用时才显示类型
            ditherThreshold: ditherEnabled ? ditherThreshold : null, // 只有启用时才显示阈值
            detectedImageType: imageType // 添加检测到的图像类型信息
        };

        // 添加图像类型检测结果到分析报告
        analysis.imageTypeDetection = {
            imageType: imageType,
            summary: `检测到图像类型: ${imageTypeText}`,
            confidence: 0.85
        };

        // 获取完整的策略描述
        const strategyDescription = getStrategyDescription(imageType, imageStats);

        // 添加基于图像类型的调整策略到分析报告
        analysis.adjustmentStrategy = {
            strategyType: imageType,
            description: strategyDescription
        };

        // 在图像摘要中添加策略信息
        if (!analysis.imageSummary.includes('优化策略')) {
            analysis.imageSummary += ` ${strategyDescription}`;
        }

        // 添加锚点灰度调整策略到调整原因列表
        const anchorGrayInfo = `[锚点灰度] ${strategyDescription}`;
        if (!analysis.adjustmentReasons.includes(anchorGrayInfo)) {
            analysis.adjustmentReasons.push(anchorGrayInfo);
        }

        return {
            originalImage: imageData,
            grayImage: grayImage,
            processedImage: finalProcessedImage,
            wasInverted: isInverted,
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
        // 转换为灰度图
        const grayImage = convertToGrayscale(imageData);
        
        // 计算图像统计信息
        const imageStats = calculateImageStats(grayImage);
        
        // 应用调整
        let processedImage = applyBrightnessContrast(
            grayImage, 
            params.brightness, 
            params.contrast,
            params.anchorGray // 新增：传递锚点灰度值 (如果 params 中存在)
        );
        
        processedImage = applyLevels(
            processedImage, 
            params.levelInLow, 
            params.levelInHigh, 
            params.levelOutLow, 
            params.levelOutHigh
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
            info: "使用自定义参数处理"
        };
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
    
    // 在processImage函数外部添加这个辅助函数
    function getStrategyDescription(imageType, statsInfo) {
        const { mean, stdDev, peaks } = statsInfo;
        
        let median = 128; // 默认值
        const histogram = statsInfo.histogram;
        if (histogram) {
            // 计算中位数灰度值
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
        
        switch (imageType) {
            case 'portrait':
                return `人像照片优化策略：使用较低锚点灰度(${Math.round(mean * 0.5)})提升面部细节，在均值${Math.round(mean)}基础上优化`;
            case 'cartoon':
                if (peaks && peaks.length >= 2) {
                    return `卡通/线稿优化策略：使用双峰间锚点灰度，增强线条与背景分离，标准差${Math.round(stdDev)}`;
                } else {
                    return `卡通/线稿优化策略：使用中性锚点灰度，保持线条清晰度，标准差${Math.round(stdDev)}`;
                }
            case 'photo':
            default:
                let detail = '';
                if (stdDev < 40) {
                    detail = '低对比度图像';
                    return `普通照片优化策略：${detail}，锚点灰度降低至均值(${Math.round(mean)})的60%左右(${Math.round(mean * 0.6)})，显著增强层次感和暗部细节`;
                } else if (stdDev > 60) {
                    detail = '高对比度图像';
                    return `普通照片优化策略：${detail}，锚点灰度降低至均值(${Math.round(mean)})的65%左右(${Math.round(mean * 0.65)})，增强层次感同时保持对比度`;
                } else {
                    detail = '中等对比度图像';
                    return `普通照片优化策略：${detail}，锚点灰度降低至均值(${Math.round(mean)})的70%左右(${Math.round(mean * 0.7)})，平衡增强层次感和细节表现`;
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