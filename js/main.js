/**
 * 主脚本
 * 处理页面初始化、事件绑定和主要处理流程
 */

import ImageProcessor from './modules/imageProcessor.js';
import UI from './modules/ui.js';
import Materials from './modules/materials.js';
import ImageAlgorithms from './modules/algorithms.js';

document.addEventListener('DOMContentLoaded', () => {
    // 获取页面元素
    const imageLoader = document.getElementById('imageLoader');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');
    const originalImage = document.getElementById('originalImage');
    const processedCanvas = document.getElementById('processedCanvas');
    const originalHistogramCanvas = document.getElementById('originalHistogramCanvas');
    const processedHistogramCanvas = document.getElementById('processedHistogramCanvas');
    const loadingDiv = document.getElementById('loading');
    const processingInfoDiv = document.getElementById('processingInfo');
    
    const originalContainer = document.getElementById('originalContainer');
    const processedContainer = document.getElementById('processedContainer');
    const originalHistContainer = document.getElementById('originalHistContainer');
    const processedHistContainer = document.getElementById('processedHistContainer');
    
    // 参数控件 (只保留 anchorGray)
    const anchorGraySlider = document.getElementById('anchorGray-slider');
    const anchorGrayValue = document.getElementById('anchorGray-value');
    const invertButton = document.getElementById('invertButton');
    const optimizeAnchorButton = document.getElementById('optimizeAnchorButton');
    
    // 状态变量
    let originalImageData = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let processedImageData = null;
    let baseProcessedImageData = null;
    let isCurrentlyInverted = false;
    let materialSelector = null;
    let laserTypeSelector = null;
    let lastProcessingResult = null;
    let currentImageFaceDetectionRan = false;
    let currentImageDetectedType = null;
    
    // 初始化材料选择器
    materialSelector = UI.createMaterialSelector('materialControls', processImage);
    
    // 初始化激光器类型选择器，并添加变更回调
    laserTypeSelector = UI.createLaserTypeSelector('materialControls', processImage);
    
    // 初始化抖动算法按钮
    UI.createDitherAlgorithmButtons('algorithmButtons', handleAlgorithmSelect);
    
    // 绑定事件处理函数
    imageLoader.addEventListener('change', handleImage);
    imageLoader.addEventListener('click', () => {
        imageLoader.value = '';
    });
    processButton.addEventListener('click', processImage);
    downloadButton.addEventListener('click', downloadImage);
    
    // 锚点灰度滑块事件监听
    anchorGraySlider.addEventListener('input', () => {
        anchorGrayValue.textContent = anchorGraySlider.value;
        if (originalImageData) {
            // 标记用户已手动修改
            anchorGraySlider.dataset.userModified = 'true'; 
            processImage(); 
        }
    });
    
    // 新增："自动优化"按钮事件监听
    optimizeAnchorButton.addEventListener('click', async () => {
        if (!originalImageData) {
            showError('请先上传图片');
            return;
        }
        
        loadingDiv.style.display = 'block';
        processingInfoDiv.textContent = '正在计算最佳锚点灰度...';
        optimizeAnchorButton.disabled = true;

        try {
            // 1. 获取图像统计
            const grayImage = ImageProcessor.convertToGrayscale(originalImageData);
            const imageStats = ImageProcessor.calculateImageStats(grayImage);
            
            // 2. 获取图像类型 (复用已检测的或重新检测)
            let imageType = currentImageDetectedType;
            if (!currentImageFaceDetectionRan || !imageType) {
                console.log('重新检测图像类型以优化锚点...');
                imageType = await ImageProcessor.detectImageType(originalImageData);
                currentImageFaceDetectionRan = true; // 标记已运行
                currentImageDetectedType = imageType; // 保存结果
                console.log('检测到类型:', imageType);
            }
            
            // 3. 计算基础最佳锚点
            let optimalAnchorGray = ImageProcessor.calculateOptimalAnchorGray(imageStats, imageType);
            console.log(`计算得到的原始最佳锚点: ${optimalAnchorGray}`);

            // 4. 应用金属和深色变体调整
            const materialId = materialSelector.getSelectedMaterial();
            const variant = materialSelector.getSelectedVariant();
            const materialInfo = Materials.getMaterialInfo(materialId);
            const initialCalculated = optimalAnchorGray;
            
            if (materialInfo && materialInfo.isMetal) {
                optimalAnchorGray = Math.round(optimalAnchorGray * 1.10);
                console.log(`金属调整 (+10%): ${optimalAnchorGray}`);
            }
            if (variant === 'dark') {
                optimalAnchorGray = Math.round(optimalAnchorGray * 1.05);
                 console.log(`深色调整 (+5%): ${optimalAnchorGray}`);
            }
            optimalAnchorGray = Math.max(0, Math.min(255, optimalAnchorGray)); // 限制范围
            console.log(`最终优化锚点: ${optimalAnchorGray}`);

            // 5. 更新UI
            anchorGraySlider.value = optimalAnchorGray;
            anchorGrayValue.textContent = optimalAnchorGray;
            anchorGraySlider.dataset.userModified = 'false'; // 重置用户修改标记
            
            // 6. 重新处理图像
            processingInfoDiv.textContent = `已优化锚点灰度为 ${optimalAnchorGray}，正在重新处理...`;
            await processImage(); // 调用 processImage 使用新值
            processingInfoDiv.textContent = `已优化锚点灰度为 ${optimalAnchorGray}，处理完成。`;
            
        } catch (error) {
            console.error("优化锚点灰度失败:", error);
            showError("优化锚点灰度时出错: " + error.message);
            processingInfoDiv.textContent = '优化锚点灰度失败';
        } finally {
            loadingDiv.style.display = 'none';
            optimizeAnchorButton.disabled = false;
        }
    });

    // 新增："反色"按钮事件监听
    invertButton.addEventListener('click', () => {
        if (!baseProcessedImageData) {
            // 如果还没有基础处理图像，则不执行任何操作
            return;
        }
        
        // 切换反色状态
        isCurrentlyInverted = !isCurrentlyInverted;
        console.log(`切换反色状态为: ${isCurrentlyInverted}`);
        
        // 更新按钮样式
        if (isCurrentlyInverted) {
            invertButton.classList.add('active');
        } else {
            invertButton.classList.remove('active');
        }
        
        // 应用或取消反色
        try {
            const processedCtx = processedCanvas.getContext('2d');
            let imageDataToDraw;
            if (isCurrentlyInverted) {
                // 应用反色
                console.log('应用客户端反色...');
                imageDataToDraw = ImageAlgorithms.invertColors(baseProcessedImageData);
            } else {
                // 取消反色，恢复基础图像
                 console.log('取消客户端反色，恢复基础图像...');
                imageDataToDraw = baseProcessedImageData;
            }
            
            // 更新 processedImageData 以供下载等使用
            processedImageData = new ImageData(
                new Uint8ClampedArray(imageDataToDraw.data),
                imageDataToDraw.width,
                imageDataToDraw.height
            );
            
            // 重绘画布
            processedCanvas.width = imageDataToDraw.width;
            processedCanvas.height = imageDataToDraw.height;
            processedCtx.putImageData(processedImageData, 0, 0);
            
            // 更新处理后的直方图
            const processedHistogram = ImageProcessor.calculateHistogram(processedImageData);
            ImageProcessor.drawHistogram(processedHistogramCanvas, processedHistogram, '处理后灰度直方图');

        } catch (error) {
            console.error("切换反色时出错:", error);
            showError("切换反色效果时出错: " + error.message);
            // 出错时尝试恢复状态
            isCurrentlyInverted = !isCurrentlyInverted;
            invertButton.classList.toggle('active');
        }
    });
    
    // 按ESC键关闭模态窗口
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modalOverlay = document.getElementById('paramsModalOverlay');
            if (modalOverlay && getComputedStyle(modalOverlay).display !== 'none') {
                modalOverlay.style.display = 'none';
            }
        }
    });
    
    // 处理算法选择
    function handleAlgorithmSelect(algorithmId) {
        if (!lastProcessingResult) return;
        
        loadingDiv.style.display = 'block';
        processingInfoDiv.textContent = '正在应用抖动设置...';
        
        setTimeout(() => {
            try {
                let result;
                const baseParams = { ...lastProcessingResult.params }; 
                
                // 更新：传递当前滑块的值作为覆盖参数，因为用户可能在上次处理后调整了滑块
                baseParams.anchorGray = parseInt(anchorGraySlider.value, 10);
                
                if (algorithmId === 'none') {
                    baseParams.ditherEnabled = false;
                } else {
                    baseParams.ditherEnabled = true;
                    baseParams.ditherType = algorithmId;
                }
                
                result = ImageProcessor.processImageWithCustomParams(originalImageData, baseParams);
                
                const currentVariant = materialSelector.getSelectedVariant();
                // if (currentVariant === 'dark') {
                //     result.processedImage = ImageAlgorithms.invertColors(result.processedImage);
                //     console.log("Applied inversion for dark variant after algorithm select.");
                // }
                
                const detectedImageType = result.params?.detectedImageType || 'unknown';
                const imageTypeText = detectedImageType === 'portrait' ? '人像照片' : 
                                    detectedImageType === 'cartoon' ? '卡通/线稿' : '普通照片';
                const analysis = {
                    imageSummary: `重新应用抖动设置 (算法: ${algorithmId === 'none' ? '无抖动' : algorithmId}, 锚点灰度: ${baseParams.anchorGray}, 图像类型: ${imageTypeText})`,
                    adjustmentReasons: [
                        `[抖动调整] 算法更改为 ${algorithmId === 'none' ? '无抖动' : algorithmId}`,
                        `[用户设置] 锚点灰度保持为 ${baseParams.anchorGray}`,
                        // 更新反色说明，直接反映基础处理的反色状态
                        lastProcessingResult.wasInverted ? '[颜色处理] 深色材料已应用反色' : '[颜色处理] 浅色材料未应用反色' 
                    ],
                    technicalDetails: { 
                        meanBrightness: result.imageStats?.mean.toFixed(2) || 'N/A',
                        standardDeviation: result.imageStats?.stdDev.toFixed(2) || 'N/A',
                        peaks: result.imageStats?.peaks?.map(p => p.toFixed(0)).join(', ') || 'N/A',
                        valleys: result.imageStats?.valleys?.map(v => v.toFixed(0)).join(', ') || 'N/A',
                        imageType: detectedImageType
                    },
                    imageTypeDetection: {
                        imageType: detectedImageType,
                        summary: `图像类型: ${imageTypeText}`,
                        confidence: 0.85
                    }
                };
                result.analysis = analysis;
                
                lastProcessingResult = result;
                baseProcessedImageData = new ImageData(
                    new Uint8ClampedArray(result.processedImage.data),
                    result.processedImage.width,
                    result.processedImage.height
                );
                processedImageData = baseProcessedImageData; 
                // 更新反色状态
                isCurrentlyInverted = lastProcessingResult.wasInverted; 
                if (isCurrentlyInverted) {
                    invertButton.classList.add('active');
                } else {
                invertButton.classList.remove('active');
                }
                
                // 更新UI元素
                anchorGraySlider.value = result.params.anchorGray;
                anchorGrayValue.textContent = result.params.anchorGray;
                
                updateResults(result);
                
                processingInfoDiv.textContent = `已应用${algorithmId === 'none' ? '无抖动' : algorithmId + '抖动'}设置`;
                
            } catch (error) {
                console.error("处理错误:", error);
                showError("应用抖动设置时发生错误: " + error.message);
            } finally {
                loadingDiv.style.display = 'none';
            }
        }, 50);
    }
    
    // 处理图片加载
    function handleImage(e) {
        const errorMessageDiv = document.getElementById('errorMessage');
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';
        
        if (!e.target.files || e.target.files.length === 0) {
            console.log("文件选择已取消");
            return;
        }
        
        // 重置人脸检测状态
        currentImageFaceDetectionRan = false;
        currentImageDetectedType = null;
        console.log('新图像加载，重置人脸检测状态');
        
        const file = e.target.files[0];
        const fileSize = file.size / (1024 * 1024); // 转换为MB
        
        // 检查文件大小
        if (fileSize > 10) { // 超过10MB
            showWarning(`图像文件过大 (${fileSize.toFixed(2)}MB)，可能影响处理性能。`);
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                originalImage.onload = () => {
                    originalWidth = originalImage.naturalWidth;
                    originalHeight = originalImage.naturalHeight;
                    
                    // 检查图像尺寸
                    if (originalWidth * originalHeight > 4000 * 3000) {
                        showWarning("图像分辨率较大，处理过程可能会较慢。");
                    }
                    
                    // 绘制原始图像到临时画布获取图像数据
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = originalWidth;
                    tempCanvas.height = originalHeight;
                    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                    tempCtx.drawImage(originalImage, 0, 0);
                    
                    try {
                        originalImageData = tempCtx.getImageData(0, 0, originalWidth, originalHeight);
                        processButton.disabled = false;
                        downloadButton.disabled = true;
                        originalContainer.style.display = 'block';
                        processedContainer.style.display = 'none';
                        originalHistContainer.style.display = 'none';
                        processedHistContainer.style.display = 'none';
                        processingInfoDiv.textContent = '';
                        
                        // --- 恢复：计算并设置初始最佳锚点灰度 --- 
                        console.log('计算初始最佳锚点灰度...');
                        const grayImage = ImageProcessor.convertToGrayscale(originalImageData);
                        const imageStats = ImageProcessor.calculateImageStats(grayImage);
                        // 注意：这里调用 calculateOptimalAnchorGray 时不传入 imageType，
                        // 让它使用默认的基于统计的计算方法，首次 processImage 时会根据检测结果再次优化。
                        // 或者，如果我们想让初始值更准，可以在这里做一个快速的非人脸检测判断，
                        // 但为了逻辑分离，先用纯统计计算。
                        const optimalAnchorGray = ImageProcessor.calculateOptimalAnchorGray(imageStats); // 恢复调用
                        
                        // 设置滑块值和显示
                        anchorGraySlider.value = optimalAnchorGray;
                        anchorGrayValue.textContent = optimalAnchorGray;
                        console.log(`初始最佳锚点灰度计算完成: ${optimalAnchorGray}`);
                        // --- 恢复结束 --- 
                        
                        const originalHistogram = imageStats.histogram; // 复用 imageStats
                        ImageProcessor.drawHistogram(originalHistogramCanvas, originalHistogram, '原始灰度直方图');
                        originalHistContainer.style.display = 'block';
                        processingInfoDiv.textContent = `已自动优化锚点灰度为 ${optimalAnchorGray}。请选择材料并处理。`; // 更新提示
                        
                    } catch (err) {
                        console.error("获取图像数据错误:", err);
                        showError("处理图像数据时出错: " + err.message);
                    }
                };
                
                originalImage.onerror = (err) => {
                    console.error("图像加载错误:", err);
                    showError("无法加载图像，图像格式可能不受支持。");
                };
                
                originalImage.src = event.target.result;
            } catch (error) {
                console.error("读取文件时发生错误:", error);
                showError("读取文件时发生错误: " + error.message);
            }
        };
        
        reader.onerror = function(error) {
            console.error("文件读取错误:", error);
            showError("文件读取失败，请重试。");
        };
        
        reader.readAsDataURL(file);
    }
    
    // 重置UI状态
    function resetUI() {
        originalImage.src = "#";
        originalImageData = null;
        processButton.disabled = true;
        downloadButton.disabled = true;
        originalContainer.style.display = 'none';
        processedContainer.style.display = 'none';
        originalHistContainer.style.display = 'none';
        processedHistContainer.style.display = 'none';
        loadingDiv.style.display = 'none';
        processingInfoDiv.textContent = '';
        resetParams(); // 重置锚点滑块
    }
    
    // 处理图像
    async function processImage() {
        const errorMessageDiv = document.getElementById('errorMessage');
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';
        
        if (!originalImageData) {
            if (event && event.target === anchorGraySlider) return;
            showError("请先上传图片");
            return;
        }
        
        loadingDiv.style.display = 'block';
        processButton.disabled = true;
        downloadButton.disabled = true;
        // 根据是否已检测过，设置不同的提示信息
        if (!currentImageFaceDetectionRan) {
            processingInfoDiv.textContent = '正在分析图像并检测人脸(首次)，请稍候...';
        } else {
            processingInfoDiv.textContent = '正在重新处理图像，请稍候...';
        }
        
        try {
            const materialId = materialSelector.getSelectedMaterial();
            const variant = materialSelector.getSelectedVariant();
            const laserType = laserTypeSelector.getSelectedLaserType();
            const currentAnchorGray = parseInt(anchorGraySlider.value, 10);
            
            console.log('开始处理图像...');
            
            // 标记用户是否修改了滑块，以便 processImage 判断是否使用 override
            const userModifiedAnchor = anchorGraySlider.dataset.userModified === 'true';
            
            // 构建传递给 ImageProcessor 的参数
            const processorParams = {};
            // 只有当用户手动修改了滑块时，才传递 anchorGray 作为覆盖参数
            if (userModifiedAnchor) {
                processorParams.anchorGray = currentAnchorGray;
                console.log('用户已手动修改锚点，传递覆盖值:', currentAnchorGray);
            } else {
                 console.log('用户未手动修改锚点，将由后端自动计算');
            }
            
            // 如果之前已经运行过检测，则传递已知类型
            if (currentImageFaceDetectionRan) {
                processorParams.knownImageType = currentImageDetectedType;
                console.log('传递已知图像类型:', currentImageDetectedType);
            } else {
                console.log('首次处理，不传递已知图像类型，将执行检测。');
            }
            
            // 调用恢复后的 ImageProcessor.processImage
            const result = await ImageProcessor.processImage(
                originalImageData, 
                materialId, 
                variant, 
                laserType, 
                processorParams // 传递可能包含 knownImageType 的参数
            );
            console.log('图像处理完成');
            
            // 如果是首次运行检测，则记录结果
            if (!currentImageFaceDetectionRan) {
                currentImageFaceDetectionRan = true;
                currentImageDetectedType = result.params?.detectedImageType;
                console.log('首次图像类型检测完成，记录结果:', currentImageDetectedType);
                
                // 添加人脸检测结果提示
                if (currentImageDetectedType === 'portrait') {
                    // 短暂显示提示后恢复默认信息或处理信息
                    const originalInfo = processingInfoDiv.textContent;
                    UI.showProcessingInfo('processingInfo', '检测到人像照片，已优化处理参数。', 2000, () => {
                         UI.showProcessingInfo('processingInfo', result.info);
                    });
                } else {
                    // 如果不是人像，直接显示处理信息
                    UI.showProcessingInfo('processingInfo', result.info);
                }
            } else {
                // 如果不是首次，直接显示处理信息
                UI.showProcessingInfo('processingInfo', result.info);
            }

            lastProcessingResult = result;
            baseProcessedImageData = new ImageData(
                new Uint8ClampedArray(result.processedImage.data),
                result.processedImage.width,
                result.processedImage.height
            );
            processedImageData = baseProcessedImageData;
            // 设置反色状态
            isCurrentlyInverted = result.wasInverted;
            if (isCurrentlyInverted) {
                invertButton.classList.add('active');
            } else {
            invertButton.classList.remove('active');
            }
            
            // 更新UI元素
            anchorGraySlider.value = result.params.anchorGray;
            anchorGrayValue.textContent = result.params.anchorGray;
            
            updateResults(result);
            
        } catch (error) {
            console.error("处理错误:", error);
            showError("处理图像时发生错误: " + error.message);
            
            // 保留回退逻辑
            try {
                console.log('尝试使用回退方法处理图像...');
                const materialId = materialSelector.getSelectedMaterial();
                const variant = materialSelector.getSelectedVariant();
                const laserType = laserTypeSelector.getSelectedLaserType();
                const currentAnchorGray = parseInt(anchorGraySlider.value, 10);
                const customParams = { 
                    anchorGray: currentAnchorGray,
                    brightness: 0, contrast: 1.2, sharpness: 0.5, 
                    levelInLow: 0, levelInHigh: 255, levelOutLow: 0, levelOutHigh: 255,
                    ditherEnabled: false
                };
                
                const fallbackResult = ImageProcessor.processImageWithCustomParams(
                    originalImageData, 
                    customParams
                );
                console.log('回退处理成功');
                
                // 移除手动反色逻辑
                // if (variant === 'dark') {
                //     fallbackResult.processedImage = ImageAlgorithms.invertColors(fallbackResult.processedImage);
                // }
                
                lastProcessingResult = fallbackResult;
                baseProcessedImageData = new ImageData(
                    new Uint8ClampedArray(fallbackResult.processedImage.data),
                    fallbackResult.processedImage.width,
                    fallbackResult.processedImage.height
                );
                processedImageData = baseProcessedImageData;
                // 设置反色状态
                isCurrentlyInverted = fallbackResult.wasInverted || (variant === 'dark'); // 回退模式假设深色需要反色
                if (isCurrentlyInverted) {
                    invertButton.classList.add('active');
                } else {
                invertButton.classList.remove('active');
                }
                
                // 更新UI元素 (回退模式)
                anchorGraySlider.value = customParams.anchorGray; // 回退模式使用用户输入值
                anchorGrayValue.textContent = customParams.anchorGray;
                
                updateResults(fallbackResult);
                showWarning("人脸检测功能可能存在问题，已使用基本处理模式。");
                
            } catch (fallbackError) {
                console.error("回退处理也失败:", fallbackError);
                showError("所有处理方法均失败，请检查图像格式是否正确。");
                resetUI();
            }
        } finally {
            loadingDiv.style.display = 'none';
            processButton.disabled = false;
        }
    }
    
    // 显示错误信息
    function showError(message) {
        const errorMessageDiv = document.getElementById('errorMessage');
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        console.error(message);
    }
    
    // 显示警告信息
    function showWarning(message) {
        const errorMessageDiv = document.getElementById('errorMessage');
        errorMessageDiv.textContent = "⚠️ " + message;
        errorMessageDiv.style.backgroundColor = "#fff3cd";
        errorMessageDiv.style.color = "#856404";
        errorMessageDiv.style.borderLeftColor = "#ffeeba";
        errorMessageDiv.style.display = 'block';
        console.warn(message);
    }
    
    // 更新处理结果显示
    function updateResults(result) {
        baseProcessedImageData = new ImageData(
            new Uint8ClampedArray(result.processedImage.data),
            result.processedImage.width,
            result.processedImage.height
        );
        processedImageData = baseProcessedImageData;
        isCurrentlyInverted = result.wasInverted;
        if (isCurrentlyInverted) {
            invertButton.classList.add('active');
        } else {
        invertButton.classList.remove('active');
        }
        
        processedCanvas.width = originalWidth;
        processedCanvas.height = originalHeight;
        const processedCtx = processedCanvas.getContext('2d');
        processedCtx.putImageData(result.processedImage, 0, 0);
        
        const grayHistogram = ImageProcessor.calculateHistogram(result.grayImage);
        const processedHistogram = ImageProcessor.calculateHistogram(baseProcessedImageData);
        
        originalHistogramCanvas.width = 300;
        originalHistogramCanvas.height = 150;
        processedHistogramCanvas.width = 300;
        processedHistogramCanvas.height = 150;
        
        ImageProcessor.drawHistogram(originalHistogramCanvas, grayHistogram, '原始灰度直方图');
        ImageProcessor.drawHistogram(processedHistogramCanvas, processedHistogram, '处理后灰度直方图');
        
        UI.showProcessingInfo('processingInfo', result.info);
        
        const selectedAlgorithm = result.params.ditherEnabled ? result.params.ditherType : 'none';
        UI.updateDitherButtonSelection(selectedAlgorithm);
        
        originalHistContainer.style.display = 'block';
        processedContainer.style.display = 'block';
        processedHistContainer.style.display = 'block';
        downloadButton.disabled = false;
        
        if (result.analysis) {
            displayAnalysisReport(result.analysis, result.imageStats, result.params);
        }
    }
    
    // 显示分析报告
    function displayAnalysisReport(analysis, imageStats, params) {
        const existingPanel = document.getElementById('analysisPanel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const analysisPanel = document.createElement('div');
        analysisPanel.id = 'analysisPanel';
        analysisPanel.className = 'analysis-panel';
        
        const panelTitle = document.createElement('h3');
        panelTitle.textContent = '图像分析报告';
        analysisPanel.appendChild(panelTitle);
        
        if (analysis.imageSummary) {
            const summarySection = document.createElement('div');
            summarySection.className = 'analysis-section';
            
            const summaryTitle = document.createElement('h4');
            summaryTitle.textContent = '图像特性';
            summarySection.appendChild(summaryTitle);
            
            const summaryText = document.createElement('p');
            summaryText.textContent = analysis.imageSummary;
            summaryText.className = 'summary-text';
            summarySection.appendChild(summaryText);
            
            analysisPanel.appendChild(summarySection);
        }
        
        if (analysis.adjustmentReasons && analysis.adjustmentReasons.length > 0) {
            const reasonsSection = document.createElement('div');
            reasonsSection.className = 'analysis-section';
            
            const reasonsTitle = document.createElement('h4');
            reasonsTitle.textContent = '调整说明';
            reasonsSection.appendChild(reasonsTitle);
            
            const reasonsList = document.createElement('ul');
            reasonsList.className = 'adjustments-list';
            
            analysis.adjustmentReasons.forEach(reason => {
                const item = document.createElement('li');
                item.textContent = reason;
                reasonsList.appendChild(item);
            });
            
            reasonsSection.appendChild(reasonsList);
            analysisPanel.appendChild(reasonsSection);
        }
        
        if (analysis.technicalDetails) {
            const techSection = document.createElement('div');
            techSection.className = 'analysis-section tech-details';
            
            const techTitle = document.createElement('h4');
            techTitle.textContent = '技术详情';
            techTitle.className = 'collapsible';
            techSection.appendChild(techTitle);
            
            const techContent = document.createElement('div');
            techContent.className = 'tech-content';
            techContent.style.display = 'none';
            
            const statsList = document.createElement('ul');
            
            const meanItem = document.createElement('li');
            meanItem.textContent = `平均亮度: ${analysis.technicalDetails.meanBrightness}`;
            statsList.appendChild(meanItem);
            
            const stdDevItem = document.createElement('li');
            stdDevItem.textContent = `标准差: ${analysis.technicalDetails.standardDeviation}`;
            statsList.appendChild(stdDevItem);
            
            if (analysis.technicalDetails.peaks) {
                const peaksItem = document.createElement('li');
                peaksItem.textContent = `直方图峰值: ${analysis.technicalDetails.peaks}`;
                statsList.appendChild(peaksItem);
            }
            
            if (analysis.technicalDetails.valleys) {
                const valleysItem = document.createElement('li');
                valleysItem.textContent = `直方图谷值: ${analysis.technicalDetails.valleys}`;
                statsList.appendChild(valleysItem);
            }
            
            techContent.appendChild(statsList);
            
            const paramsTitle = document.createElement('h5');
            paramsTitle.textContent = '应用参数';
            techContent.appendChild(paramsTitle);
            
            const paramsList = document.createElement('ul');
            paramsList.className = 'params-list';
            
            Object.entries(params).forEach(([key, value]) => {
                if (key === 'levelOutLow' || key === 'levelOutHigh') {
                    return; 
                }
                
                if (!params.ditherEnabled && (key === 'ditherThreshold' || key === 'ditherType')) {
                    return;
                }

                const item = document.createElement('li');
                let displayValue = value;
                
                if (key === 'contrast') {
                    displayValue = (value * 100).toFixed(0) + '%';
                } else if (key === 'ditherEnabled') {
                    displayValue = value ? '是' : '否';
                } else if (key === 'ditherType' && value) {
                    const typeNames = { 'floydSteinberg': 'Floyd-Steinberg', 'atkinson': 'Atkinson', 'jarvis': 'Jarvis', 'ordered': 'Ordered', 'bayer': 'Bayer' };
                    displayValue = typeNames[value] || value;
                } else if (typeof value === 'number' && !Number.isInteger(value)) {
                    displayValue = value.toFixed(2);
                }
                
                item.textContent = `${getParamDisplayName(key)}: ${displayValue}`;
                paramsList.appendChild(item);
            });
            
            techContent.appendChild(paramsList);
            techSection.appendChild(techContent);
            
            techTitle.addEventListener('click', () => {
                if (techContent.style.display === 'none') {
                    techContent.style.display = 'block';
                    techTitle.classList.add('active');
                } else {
                    techContent.style.display = 'none';
                    techTitle.classList.remove('active');
                }
            });
            
            analysisPanel.appendChild(techSection);
        }
        
        const reportContainer = document.getElementById('analysisReportContainer');
        if (reportContainer) {
            reportContainer.innerHTML = '';
            reportContainer.appendChild(analysisPanel);
        } else {
            console.error("Analysis report container not found!");
        }
    }
    
    function getParamDisplayName(paramKey) {
        const displayNames = {
            brightness: '亮度',
            contrast: '对比度',
            anchorGray: '锚点灰度',
            levelInLow: '输入黑场',
            levelInHigh: '输入白场',
            levelOutLow: '输出黑场',
            levelOutHigh: '输出白场',
            sharpness: '锐化',
            ditherEnabled: '启用抖动',
            ditherThreshold: '抖动阈值',
            ditherType: '抖动类型'
        };
        
        return displayNames[paramKey] || paramKey;
    }
    
    function downloadImage() {
        if (!processedImageData) {
            alert("没有处理后的图像可供下载。");
            return;
        }
        
        const finalCanvas = document.getElementById('processedCanvas');
        finalCanvas.width = processedImageData.width;
        finalCanvas.height = processedImageData.height;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.putImageData(processedImageData, 0, 0);
        
        const link = document.createElement('a');
        const materialId = materialSelector.getSelectedMaterial();
        const variant = materialSelector.getSelectedVariant();
        const filename = `laser_processed_${materialId}_${variant}_${new Date().getTime()}.png`;
        link.download = filename;
        
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
    }

    function resetParams() {
        const defaultAnchorGray = Materials.defaultParams.anchorGray || 128;
        anchorGraySlider.value = defaultAnchorGray;
        anchorGrayValue.textContent = defaultAnchorGray;
        
        if (processingInfoDiv) {
            processingInfoDiv.textContent = '已重置锚点灰度为默认值';
        }
    }
}); 