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
    
    // 添加反色按钮事件监听
    invertButton.addEventListener('click', () => {
        if (!baseProcessedImageData) return;
        
        if (isCurrentlyInverted) {
            processedImageData = new ImageData(
                new Uint8ClampedArray(baseProcessedImageData.data),
                baseProcessedImageData.width,
                baseProcessedImageData.height
            );
            isCurrentlyInverted = false;
            invertButton.classList.remove('active');
        } else {
            processedImageData = ImageAlgorithms.invertColors(baseProcessedImageData);
            isCurrentlyInverted = true;
            invertButton.classList.add('active');
        }
        
        const processedCtx = processedCanvas.getContext('2d');
        processedCtx.putImageData(processedImageData, 0, 0);
        
        const processedHistogram = ImageProcessor.calculateHistogram(processedImageData);
        ImageProcessor.drawHistogram(processedHistogramCanvas, processedHistogram, '处理后灰度直方图');
    });

    // 添加自动优化按钮事件监听
    optimizeAnchorButton.addEventListener('click', () => {
        if (!originalImageData) {
            alert("请先上传图片");
            return;
        }
        
        // 计算最佳锚点灰度值
        const grayImage = ImageProcessor.convertToGrayscale(originalImageData);
        const imageStats = ImageProcessor.calculateImageStats(grayImage);
        const optimalAnchorGray = ImageProcessor.calculateOptimalAnchorGray(imageStats);
        
        // 设置滑块值
        anchorGraySlider.value = optimalAnchorGray;
        anchorGrayValue.textContent = optimalAnchorGray;
        
        // 提示用户
        processingInfoDiv.textContent = `已优化锚点灰度为 ${optimalAnchorGray}`;
        
        // 如果已经有处理过的图像，立即应用新设置
        if (lastProcessingResult) {
            processImage();
        }
    });

    // 修改：锚点灰度滑块变化时，也调用 processImage
    anchorGraySlider.addEventListener('input', () => {
        anchorGrayValue.textContent = anchorGraySlider.value; // 更新显示值
        if (originalImageData) {
            // 使用 debounce 或 throttle 避免过于频繁的调用 (可选优化)
            // 注意：现在滑块调整也会走完整的 processImage 流程
            processImage(); 
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
        setTimeout(() => {
            try {
                let result;
                // 获取上次处理的基础参数 (可能包含了正确的 anchorGray)
                const baseParams = { ...lastProcessingResult.params }; 
                
                if (algorithmId === 'none') {
                    baseParams.ditherEnabled = false;
                } else {
                    baseParams.ditherEnabled = true;
                    baseParams.ditherType = algorithmId;
                }
                
                // 重新应用抖动/无抖动
                result = ImageProcessor.processImageWithCustomParams(originalImageData, baseParams);
                
                // 手动反色（如果需要），因为 processImageWithCustomParams 不处理
                const currentVariant = materialSelector.getSelectedVariant();
                if (currentVariant === 'dark') {
                    result.processedImage = ImageAlgorithms.invertColors(result.processedImage);
                    console.log("Applied inversion for dark variant after algorithm select.");
                }
                
                // 构建 analysis (因为 processImageWithCustomParams 不返回)
                const analysis = {
                    imageSummary: `重新应用抖动设置 (算法: ${algorithmId === 'none' ? '无抖动' : algorithmId}, 锚点灰度: ${baseParams.anchorGray})`,
                    adjustmentReasons: [
                        `[抖动调整] 算法更改为 ${algorithmId === 'none' ? '无抖动' : algorithmId}`,
                        `[用户设置] 锚点灰度保持为 ${baseParams.anchorGray}`,
                        currentVariant === 'dark' ? '[颜色处理] 已为深色材料应用反色' : '[颜色处理] 未应用反色'
                    ],
                    technicalDetails: { // 从 imageStats 获取
                        meanBrightness: result.imageStats?.mean.toFixed(2) || 'N/A',
                        standardDeviation: result.imageStats?.stdDev.toFixed(2) || 'N/A',
                        peaks: result.imageStats?.peaks?.map(p => p.toFixed(0)).join(', ') || 'N/A',
                        valleys: result.imageStats?.valleys?.map(v => v.toFixed(0)).join(', ') || 'N/A'
                    }
                };
                result.analysis = analysis;
                
                lastProcessingResult = result;
                // 更新基础处理结果，并重置反色状态
                baseProcessedImageData = new ImageData(
                    new Uint8ClampedArray(result.processedImage.data),
                    result.processedImage.width,
                    result.processedImage.height
                );
                processedImageData = baseProcessedImageData; // 初始显示未经反色的
                isCurrentlyInverted = false;
                invertButton.classList.remove('active');
                
                updateResults(result);
                
            } catch (error) {
                console.error("处理错误:", error);
                alert("处理图片时发生错误: " + error.message);
            } finally {
                loadingDiv.style.display = 'none';
            }
        }, 50);
    }
    
    // 处理图片加载
    function handleImage(e) {
        // 检查是否有文件被选择
        if (!e.target.files || e.target.files.length === 0) {
            // 用户没有选择文件或取消了选择
            console.log("文件选择已取消");
            // 不做任何处理，保持当前状态
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImage.onload = () => {
                originalWidth = originalImage.naturalWidth;
                originalHeight = originalImage.naturalHeight;
                
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
                    
                    // 新增：计算最佳锚点灰度值并自动设置
                    const grayImage = ImageProcessor.convertToGrayscale(originalImageData);
                    const imageStats = ImageProcessor.calculateImageStats(grayImage);
                    const optimalAnchorGray = ImageProcessor.calculateOptimalAnchorGray(imageStats);
                    
                    // 设置滑块值
                    anchorGraySlider.value = optimalAnchorGray;
                    anchorGrayValue.textContent = optimalAnchorGray;
                    
                    // 可选：显示直方图（帮助用户理解图像特性）
                    const originalHistogram = imageStats.histogram;
                    ImageProcessor.drawHistogram(originalHistogramCanvas, originalHistogram, '原始灰度直方图');
                    originalHistContainer.style.display = 'block';
                    
                    // 可选：添加提示信息
                    processingInfoDiv.textContent = `已根据图像特性自动设置锚点灰度为 ${optimalAnchorGray}`;
                    
                } catch (err) {
                    console.error("获取图像数据错误:", err);
                    alert("无法处理此图片，可能是跨域问题或格式不支持。");
                    resetUI();
                }
            };
            
            originalImage.onerror = () => {
                alert("无法加载图片。");
                resetUI();
            };
            
            originalImage.src = event.target.result;
        };
        
        reader.readAsDataURL(e.target.files[0]);
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
    
    // 处理图像 (修改为使用自定义参数流程以包含 anchorGray)
    function processImage() {
        if (!originalImageData) {
            // 如果是滑块触发但无图，不提示
            if (event && event.target === anchorGraySlider) return;
            alert("请先上传图片");
            return;
        }
        
        loadingDiv.style.display = 'block';
        processButton.disabled = true;
        downloadButton.disabled = true;
        processingInfoDiv.textContent = '';
        
        // 使用setTimeout允许UI更新，再进行处理
        setTimeout(() => {
            try {
                const materialId = materialSelector.getSelectedMaterial();
                const variant = materialSelector.getSelectedVariant();
                const laserType = laserTypeSelector.getSelectedLaserType();
                
                // 获取当前的 anchorGray 值
                const currentAnchorGray = parseInt(anchorGraySlider.value, 10);
                
                // 调用新的 processImage 接口，传递覆盖参数
                const result = ImageProcessor.processImage(
                    originalImageData, 
                    materialId, 
                    variant, 
                    laserType, 
                    { anchorGray: currentAnchorGray } // 传递覆盖对象
                );

                // 不再需要手动反色和构建 analysis，processImage 会处理
                // if (variant === 'dark') { ... }
                // const analysis = { ... }; result.analysis = analysis;

                lastProcessingResult = result;
                // 更新基础处理结果，并重置反色状态
                baseProcessedImageData = new ImageData(
                    new Uint8ClampedArray(result.processedImage.data),
                    result.processedImage.width,
                    result.processedImage.height
                );
                processedImageData = baseProcessedImageData; // 初始显示未经反色的
                isCurrentlyInverted = false;
                invertButton.classList.remove('active');
                
                updateResults(result);
                
            } catch (error) {
                console.error("处理错误:", error);
                alert("处理图片时发生错误: " + error.message);
                resetUI(); // 发生错误时重置UI
            } finally {
                loadingDiv.style.display = 'none';
                processButton.disabled = false;
            }
        }, 50);
    }
    
    // 更新处理结果显示
    function updateResults(result) {
        // 存储基础处理结果
        baseProcessedImageData = new ImageData(
            new Uint8ClampedArray(result.processedImage.data),
            result.processedImage.width,
            result.processedImage.height
        );
        processedImageData = baseProcessedImageData; // 初始显示基础结果
        isCurrentlyInverted = false; // 重置反色状态
        invertButton.classList.remove('active');
        
        // 显示处理后图像 (显示基础结果)
        processedCanvas.width = originalWidth;
        processedCanvas.height = originalHeight;
        const processedCtx = processedCanvas.getContext('2d');
        processedCtx.putImageData(result.processedImage, 0, 0);
        
        // 计算直方图
        const grayHistogram = ImageProcessor.calculateHistogram(result.grayImage);
        const processedHistogram = ImageProcessor.calculateHistogram(baseProcessedImageData); // 基于基础结果计算
        
        // 绘制直方图
        originalHistogramCanvas.width = 300;
        originalHistogramCanvas.height = 150;
        processedHistogramCanvas.width = 300;
        processedHistogramCanvas.height = 150;
        
        ImageProcessor.drawHistogram(originalHistogramCanvas, grayHistogram, '原始灰度直方图');
        ImageProcessor.drawHistogram(processedHistogramCanvas, processedHistogram, '处理后灰度直方图');
        
        // 显示处理信息
        UI.showProcessingInfo('processingInfo', result.info);
        
        // 更新抖动按钮选中状态
        const selectedAlgorithm = result.params.ditherEnabled ? result.params.ditherType : 'none';
        UI.updateDitherButtonSelection(selectedAlgorithm);
        
        // 显示结果容器
        originalHistContainer.style.display = 'block';
        processedContainer.style.display = 'block';
        processedHistContainer.style.display = 'block';
        downloadButton.disabled = false;
        
        // 创建并显示分析报告
        if (result.analysis) {
            displayAnalysisReport(result.analysis, result.imageStats, result.params);
        }
    }
    
    // 显示分析报告
    function displayAnalysisReport(analysis, imageStats, params) {
        // 检查是否已存在分析面板，如果存在则移除
        const existingPanel = document.getElementById('analysisPanel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // 创建分析面板
        const analysisPanel = document.createElement('div');
        analysisPanel.id = 'analysisPanel';
        analysisPanel.className = 'analysis-panel';
        
        // 创建标题
        const panelTitle = document.createElement('h3');
        panelTitle.textContent = '图像分析报告';
        analysisPanel.appendChild(panelTitle);
        
        // 添加图像特性总结
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
        
        // 添加调整原因
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
        
        // 添加技术详情（可折叠）
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
            
            // 添加统计数据
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
            
            // 添加当前使用的参数
            const paramsTitle = document.createElement('h5');
            paramsTitle.textContent = '应用参数';
            techContent.appendChild(paramsTitle);
            
            const paramsList = document.createElement('ul');
            paramsList.className = 'params-list';
            
            Object.entries(params).forEach(([key, value]) => {
                // 跳过已废弃的输出色阶参数
                if (key === 'levelOutLow' || key === 'levelOutHigh') {
                    return; 
                }
                
                // 如果抖动未启用，则跳过抖动阈值和抖动类型参数
                if (!params.ditherEnabled && (key === 'ditherThreshold' || key === 'ditherType')) {
                    return;
                }

                const item = document.createElement('li');
                let displayValue = value;
                
                // 格式化特定值
                if (key === 'contrast') {
                    displayValue = (value * 100).toFixed(0) + '%';
                } else if (key === 'ditherEnabled') {
                    displayValue = value ? '是' : '否';
                } else if (key === 'ditherType' && value) {
                    // 将抖动类型的驼峰命名转为更易读的名称 (可选)
                    const typeNames = { 'floydSteinberg': 'Floyd-Steinberg', 'atkinson': 'Atkinson', 'jarvis': 'Jarvis', 'ordered': 'Ordered', 'bayer': 'Bayer' };
                    displayValue = typeNames[value] || value;
                } else if (typeof value === 'number' && !Number.isInteger(value)) {
                    // 对非整数数字保留一定小数位 (例如对比度调整后的结果可能不是整数)
                    displayValue = value.toFixed(2);
                }
                
                item.textContent = `${getParamDisplayName(key)}: ${displayValue}`;
                paramsList.appendChild(item);
            });
            
            techContent.appendChild(paramsList);
            techSection.appendChild(techContent);
            
            // 添加点击事件切换显示/隐藏
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
        
        // 修改：添加到新的专属容器中
        const reportContainer = document.getElementById('analysisReportContainer');
        if (reportContainer) {
            // 清空旧报告（如果存在）
            reportContainer.innerHTML = '';
            reportContainer.appendChild(analysisPanel);
        } else {
            console.error("Analysis report container not found!");
            // 可以考虑降级：仍然添加到 results 容器
            // const resultsContainer = document.querySelector('.results');
            // resultsContainer.appendChild(analysisPanel);
        }
    }
    
    // 获取参数的显示名称
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
    
    // 下载处理后图像
    function downloadImage() {
        if (!processedImageData) {
            alert("没有处理后的图像可供下载。");
            return;
        }
        
        // 绘制最终处理数据到可见画布
        const finalCanvas = document.getElementById('processedCanvas');
        finalCanvas.width = processedImageData.width;
        finalCanvas.height = processedImageData.height;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.putImageData(processedImageData, 0, 0);
        
        // 创建下载链接
        const link = document.createElement('a');
        const materialId = materialSelector.getSelectedMaterial();
        const variant = materialSelector.getSelectedVariant();
        const filename = `laser_processed_${materialId}_${variant}_${new Date().getTime()}.png`;
        link.download = filename;
        
        // 使用PNG格式无损输出
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
    }

    // 重置参数 (只重置 anchorGray)
    function resetParams() {
        const defaultAnchorGray = Materials.defaultParams.anchorGray || 128; // 从Materials获取默认值
        anchorGraySlider.value = defaultAnchorGray;
        anchorGrayValue.textContent = defaultAnchorGray; // 确保显示值也重置
        
        // 清除用户提示
        if (processingInfoDiv) {
            processingInfoDiv.textContent = '已重置锚点灰度为默认值';
        }
    }
}); 