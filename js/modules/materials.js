/**
 * 材料参数定义模块
 * 定义不同材料和不同颜色深浅的处理参数
 */

const Materials = (() => {
    // 定义默认参数结构
    const defaultParams = {
        brightness: 0,         // 亮度调整值 (-100 到 100)
        contrast: 1.0,         // 对比度调整值 (0.1 到 3.0)
        anchorGray: 128,       // 新增：对比度锚点灰度值 (0 到 255)
        levelInLow: 0,         // 输入色阶黑场 (0 到 254)
        levelInHigh: 255,      // 输入色阶白场 (1 到 255)
        levelOutLow: 0,        // 输出色阶黑场 (0 到 254)
        levelOutHigh: 255,     // 输出色阶白场 (1 到 255)
        sharpness: 0,          // 锐化程度 (0 到 100)
        ditherEnabled: false,  // 是否启用抖动
        ditherThreshold: 128,  // 抖动阈值 (0 到 255)
        ditherType: 'floydSteinberg' // 抖动算法类型
    };

    // 材料定义和基本参数
    // 每种材料包含深色、中性、浅色三种变体
    // 变体命名统一：深色(暗)、中性、浅色(亮)
    const materials = {
        stainless_steel: {
            name: "不锈钢",
            description: "光滑、反光的金属表面",
            variants: {
                dark: {
                    name: "深色",
                    params: {
                        ...defaultParams,
                        brightness: -10,   // Increase from -20
                        contrast: 1.3,     // Decrease from 1.4
                        levelInLow: 5,     // Decrease significantly from 15
                        levelInHigh: 240,  // Increase from 235
                        sharpness: 35,     // Decrease from 40
                        ditherEnabled: false
                    }
                },
                neutral: {
                    name: "中性",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.3,      // 降低对比度，避免过度处理
                        levelInLow: 10,
                        levelInHigh: 240,
                        sharpness: 40,
                        ditherEnabled: false
                    }
                },
                light: {
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,    // 保持轻微压暗
                        contrast: 2.0,     // 显著提高对比度 (之前 1.6)
                        levelInLow: 10,     // 提高黑场 (之前 5)
                        levelInHigh: 250,  
                        sharpness: 15,     // 进一步降低锐化 (之前 20)
                        ditherEnabled: false
                    }
                }
            }
        },

        walnut: {
            name: "木材",
            description: "通用木材设置",
            variants: {
                dark: {
                    name: "深色",
                    params: {
                        ...defaultParams,
                        brightness: -15,   // Increase from -25
                        contrast: 1.4,     // Decrease from 1.5
                        levelInLow: 10,    // Decrease significantly from 20
                        levelInHigh: 230,  // Increase from 220
                        sharpness: 40,     // Decrease from 50
                        ditherEnabled: false
                    }
                },
                neutral: {
                    name: "中性",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.4,
                        levelInLow: 15,
                        levelInHigh: 235,   // 扩大输入范围，保留更多细节
                        sharpness: 45,
                        ditherEnabled: false
                    }
                },
                light: {
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,    // 保持轻微压暗
                        contrast: 2.2,      // 显著提高对比度 (之前 1.7)
                        levelInLow: 15,      // 提高黑场 (之前 5)
                        levelInHigh: 250,
                        sharpness: 15,      // 进一步降低锐化 (之前 25)
                        ditherEnabled: false
                    }
                }
            }
        },

        metal_card: {
            name: "金属卡片",
            description: "表面涂有涂层的金属卡",
            variants: {
                dark: {
                    name: "深色",
                    params: {
                        ...defaultParams,
                        brightness: -15,   // Increase from -25
                        contrast: 1.5,     // Decrease from 1.7
                        levelInLow: 5,     // Decrease from 10
                        levelInHigh: 220,  // Increase from 210
                        sharpness: 50,     // Decrease from 60
                        ditherEnabled: false
                    }
                },
                neutral: {
                    name: "中性",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.5,      // 降低对比度(从2.0降至1.5)
                        levelInLow: 10,
                        levelInHigh: 230,   // 扩大输入范围
                        sharpness: 50,
                        ditherEnabled: false
                    }
                },
                light: {
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,    // 保持轻微压暗
                        contrast: 2.5,      // 显著提高对比度 (之前 1.8)
                        levelInLow: 10,      // 提高黑场 (之前 0)
                        levelInHigh: 245,   
                        sharpness: 20,      // 进一步降低锐化 (之前 30)
                        ditherEnabled: false
                    }
                }
            }
        },
        
        acrylic: {
            name: "亚克力",
            description: "透明或半透明的塑料材料",
            variants: {
                dark: {
                    name: "深色",
                    params: {
                        ...defaultParams,
                        brightness: -15,   // Increase from -15
                        contrast: 1.4,     // Decrease from 1.6
                        levelInLow: 10,    // Decrease from 15
                        levelInHigh: 245,   // Increase from 240
                        sharpness: 40,     // Decrease from 45
                        ditherEnabled: false
                    }
                },
                neutral: {
                    name: "中性",
                    params: {
                        ...defaultParams,
                        brightness: 0,
                        contrast: 1.3,
                        levelInLow: 20,
                        levelInHigh: 245,
                        sharpness: 40,
                        ditherEnabled: false
                    }
                },
                light: {
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: 0,      
                        contrast: 2.0,      // 显著提高对比度 (之前 1.6)
                        levelInLow: 15,     // 提高黑场 (之前 10)
                        levelInHigh: 255,   
                        sharpness: 10,      // 进一步降低锐化 (之前 20)
                        ditherEnabled: false
                    }
                }
            }
        },

        leather: {
            name: "皮革",
            description: "天然或人造皮革",
            variants: {
                dark: {
                    name: "深色",
                    params: {
                        ...defaultParams,
                        brightness: -10,   // Increase from -20
                        contrast: 1.5,     // Decrease from 1.6
                        levelInLow: 10,    // Decrease from 15
                        levelInHigh: 230,  // Increase from 220
                        sharpness: 40,     // Decrease from 50
                        ditherEnabled: false
                    }
                },
                neutral: {
                    name: "中性",
                    params: {
                        ...defaultParams,
                        brightness: 0,      // 由+20改为0，保持中性
                        contrast: 1.4,
                        levelInLow: 20,
                        levelInHigh: 235,
                        sharpness: 40,
                        ditherEnabled: false
                    }
                },
                light: {
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: 0,      
                        contrast: 2.2,      // 显著提高对比度 (之前 1.7)
                        levelInLow: 15,     // 提高黑场 (之前 10)
                        levelInHigh: 250,   
                        sharpness: 15,      // 进一步降低锐化 (之前 20)
                        ditherEnabled: false
                    }
                }
            }
        }
    };

    // 获取所有材料
    const getAllMaterials = () => {
        return materials;
    };

    // 获取指定材料的参数
    const getMaterialParams = (materialId, variant = 'neutral') => {
        if (!materials[materialId]) {
            console.warn(`材料 ${materialId} 不存在，使用默认参数`);
            return { ...defaultParams };
        }
        
        if (!materials[materialId].variants[variant]) {
            console.warn(`材料 ${materialId} 的变体 ${variant} 不存在，使用中性变体`);
            variant = 'neutral';
        }
        
        return { ...materials[materialId].variants[variant].params };
    };

    // 根据图像特性和激光器类型调整材料参数
    const adjustParamsForImageStats = (params, imageStats, laserType = 'CO2') => {
        const { mean, stdDev, histogram, peaks, valleys } = imageStats;
        let adjustedParams = { ...params };
        
        // 确保 anchorGray 存在于 adjustedParams 中 (如果 base params 没有，从 defaultParams 继承)
        if (adjustedParams.anchorGray === undefined) {
            adjustedParams.anchorGray = defaultParams.anchorGray;
        }

        let info = '';
        let analysis = {
            imageSummary: '',
            adjustmentReasons: [],
            technicalDetails: {}
        };
        const initialParams = { ...params };
        let hasAdjustments = false;

        // --- 新策略：温和对比度增强，保留细节 --- 

        // 1. 亮度调整: 仅在极亮或极暗时温和调整
        let brightnessAdjustment = 0;
        if (mean < 60) { // 非常暗
            brightnessAdjustment = 10; // 温和提亮
            info += "图像极暗，温和提高亮度；";
            analysis.adjustmentReasons.push(`图像极暗(${mean.toFixed(1)})，提高亮度(+${brightnessAdjustment})以拉回暗部`);
            hasAdjustments = true;
        } else if (mean > 190) { // 非常亮 (阈值提高)
            brightnessAdjustment = -10; // 温和压暗
            info += "图像极亮，温和降低亮度；";
            analysis.adjustmentReasons.push(`图像极亮(${mean.toFixed(1)})，降低亮度(${brightnessAdjustment})以保护高光`);
            hasAdjustments = true;
        } else {
             analysis.adjustmentReasons.push("图像整体亮度适中，未调整亮度");
        }
        adjustedParams.brightness += brightnessAdjustment;

        // 2. 对比度与输入色阶调整: 主要通过拉伸色阶，levelInLow保持低位
        let contrastAdjustmentFactor = 1.0; 
        let levelInLowSet = 5; // 保持较低的黑场
        let levelInHighSet = 250; // 默认略微降低白场以拉伸

        if (stdDev < 30) { // 对比度非常低
            contrastAdjustmentFactor = (laserType === 'Diode' || laserType === 'Infrared') ? 1.2 : 1.15; // 温和提升
            levelInHighSet = 245; // 对比度非常低时，白场降低更多
            info += `对比度极低(${stdDev.toFixed(1)})，温和提升对比度(x${contrastAdjustmentFactor.toFixed(2)})并拉伸色阶(黑${levelInLowSet},白${levelInHighSet})；`;
            analysis.adjustmentReasons.push(`对比度极低，温和提升对比度(${initialParams.contrast.toFixed(2)}→${(initialParams.contrast * contrastAdjustmentFactor).toFixed(2)})`);
            analysis.adjustmentReasons.push(`调整输入色阶至 ${levelInLowSet}-${levelInHighSet} 以拉伸对比`);
            if (laserType === 'Diode' || laserType === 'Infrared') analysis.adjustmentReasons.push(`[${laserType} 优化：略增强低对比度处理]`);
            hasAdjustments = true;
        } else if (stdDev < 50) { // 对比度较低
            contrastAdjustmentFactor = (laserType === 'Diode' || laserType === 'Infrared') ? 1.1 : 1.05; // 非常温和提升
            levelInHighSet = 250; // 保持默认白场降低
            info += `对比度较低(${stdDev.toFixed(1)})，略微提升对比度(x${contrastAdjustmentFactor.toFixed(2)})并拉伸色阶(黑${levelInLowSet},白${levelInHighSet})；`;
            analysis.adjustmentReasons.push(`对比度较低，略微提升对比度(${initialParams.contrast.toFixed(2)}→${(initialParams.contrast * contrastAdjustmentFactor).toFixed(2)})`);
            analysis.adjustmentReasons.push(`调整输入色阶至 ${levelInLowSet}-${levelInHighSet} 以拉伸对比`);
             if (laserType === 'Diode' || laserType === 'Infrared') analysis.adjustmentReasons.push(`[${laserType} 优化：略增强低对比度处理]`);
            hasAdjustments = true;
        } else if (stdDev > 65) { // 对比度较高或非常高
            contrastAdjustmentFactor = (laserType === 'Fiber') ? 1.0 : 0.99; // 几乎不降低
            levelInHighSet = 255; // 对比度高时，不降低白场，保留高光
            info += `对比度高(${stdDev.toFixed(1)})，几乎不调整对比度(x${contrastAdjustmentFactor.toFixed(2)})，保留色阶(黑${levelInLowSet},白${levelInHighSet})；`;
            analysis.adjustmentReasons.push(`对比度已足够高，几乎不调整对比度(${initialParams.contrast.toFixed(2)}→${(initialParams.contrast * contrastAdjustmentFactor).toFixed(2)})`);
            analysis.adjustmentReasons.push(`保持输入色阶为 ${levelInLowSet}-${levelInHighSet} 以保留动态范围`);
            if (laserType === 'Fiber') analysis.adjustmentReasons.push("[Fiber 优化：不调整高对比度]");
            hasAdjustments = true; 
        } else { // 中等对比度 (50-65)
             levelInHighSet = 250; // 保持默认白场降低
             analysis.adjustmentReasons.push(`对比度适中(${stdDev.toFixed(1)})，保持输入色阶为 ${levelInLowSet}-${levelInHighSet}`);
             hasAdjustments = true; // 即使只设置色阶也算调整
        }
        // 应用计算出的值
        adjustedParams.contrast *= contrastAdjustmentFactor;
        // adjustedParams.levelInLow = levelInLowSet; // 注释掉：不再覆盖，使用材料预设值
        // adjustedParams.levelInHigh = levelInHighSet; // 注释掉：不再覆盖，使用材料预设值
        
        // 3. 峰谷值调整 (保持不变，现在可能更不需要了)
        // if (peaks.length === 1) { ... } else if (peaks.length >= 2) { ... } if (valleys.length > 0) { ... }
        // 暂时注释掉峰谷调整，观察核心策略效果
        /*
        if (peaks.length === 1) { ... } 
        else if (peaks.length >= 2) { ... }
        if (valleys.length > 0) { ... }
        */

        // 4. 锐化调整: 低对比轻微增强，高对比不处理或极轻微减弱
        if (laserType !== 'Fiber') { 
            let sharpnessAdjustment = 0;
            if (stdDev < 40) { // 低对比度图像: 轻微增强
                sharpnessAdjustment = 5; 
                info += `低对比度(${stdDev.toFixed(1)})，轻微增强锐化(+${sharpnessAdjustment})；`;
                analysis.adjustmentReasons.push(`锐化轻微提升(+${sharpnessAdjustment})以增加清晰度`);
                 hasAdjustments = true; // 标记调整
            } else if (stdDev > 70) { // 高对比度图像: 极轻微减弱或不处理
                 sharpnessAdjustment = -3;
                 info += `高对比度(${stdDev.toFixed(1)})，轻微降低锐化(${sharpnessAdjustment})；`;
                 analysis.adjustmentReasons.push(`锐化轻微降低(${sharpnessAdjustment})以避免边缘生硬`);
                  hasAdjustments = true; // 标记调整
            } else {
                 analysis.adjustmentReasons.push("锐化保持不变");
            }
            
            const oldSharpness = adjustedParams.sharpness;
            // 检查 sharpnessAdjustment 是否为 0 避免不必要的计算和消息
            if (sharpnessAdjustment !== 0) {
                adjustedParams.sharpness = Math.max(0, Math.min(100, adjustedParams.sharpness + sharpnessAdjustment));
                if (adjustedParams.sharpness !== oldSharpness) {
                     const reasonIndex = analysis.adjustmentReasons.length - 1;
                     // 更新最后一条锐化相关的理由
                     if(analysis.adjustmentReasons[reasonIndex]?.includes("锐化")){
                        analysis.adjustmentReasons[reasonIndex] += ` (${oldSharpness}→${adjustedParams.sharpness})`;
                     } else {
                         // 如果最后一条不是锐化理由（例如锐化保持不变时），则添加一条新理由
                         analysis.adjustmentReasons.push(`锐化调整 (${oldSharpness}→${adjustedParams.sharpness})`);
                     }
                }
            }
        } else {
            analysis.adjustmentReasons.push("[Fiber 优化：未进行自动锐化调整]");
        }
        
        // 6. 最终参数整理与返回
        if (mean < 60) {
            analysis.imageSummary = "图像整体较暗";
        } else if (mean < 100) {
            analysis.imageSummary = "图像偏暗，中低调";
        } else if (mean > 200) {
            analysis.imageSummary = "图像非常明亮";
        } else if (mean > 150) {
            analysis.imageSummary = "图像偏亮，高调";
        } else {
            analysis.imageSummary = "图像中性调，明暗均衡";
        }
        
        if (stdDev < 30) {
            analysis.imageSummary += "，对比度非常低，细节平淡";
        } else if (stdDev < 50) {
            analysis.imageSummary += "，对比度较低";
        } else if (stdDev > 80) {
            analysis.imageSummary += "，对比度非常高，明暗分离明显";
        } else if (stdDev > 65) {
            analysis.imageSummary += "，对比度较高";
        } else {
            analysis.imageSummary += "，对比度适中";
        }
        
        if (peaks.length === 1) {
            const peakPosition = peaks[0];
            if (peakPosition < 85) {
                analysis.imageSummary += "，主要信息集中在暗部";
            } else if (peakPosition > 170) {
                analysis.imageSummary += "，主要信息集中在亮部";
            } else {
                analysis.imageSummary += "，主要信息集中在中间调";
            }
        } else if (peaks.length > 1) {
            analysis.imageSummary += "，存在多个亮度集中区域";
        }

        analysis.technicalDetails = {
            meanBrightness: mean.toFixed(2),
            standardDeviation: stdDev.toFixed(2),
            peaks: peaks.map(p => p.toFixed(0)).join(', '),
            valleys: valleys.map(v => v.toFixed(0)).join(', ')
        };

        if (!hasAdjustments) {
            info = "图像特性接近理想，仅应用基础调整。";
            analysis.adjustmentReasons.push("图像特性接近理想，仅应用基础调整");
        } else {
            if (!analysis.adjustmentReasons.some(r => r.includes("亮度") || r.includes("对比度") || r.includes("色阶") || r.includes("锐化")) && 
                analysis.adjustmentReasons.some(r => r.includes("通用压暗"))) {
                 info = "应用通用压暗倾向。";
            }
        }

        adjustedParams.brightness = Math.max(-100, Math.min(100, adjustedParams.brightness));
        adjustedParams.contrast = Math.max(0.1, Math.min(3.0, adjustedParams.contrast));
        adjustedParams.levelInLow = Math.max(0, Math.min(254, adjustedParams.levelInLow));
        adjustedParams.levelInHigh = Math.max(adjustedParams.levelInLow + 1, Math.min(255, adjustedParams.levelInHigh));
        adjustedParams.sharpness = Math.max(0, Math.min(100, adjustedParams.sharpness));

        const materialName = materials[Object.keys(materials).find(k => params === materials[k]?.variants[Object.keys(materials[k].variants).find(v => params === materials[k].variants[v].params)]?.params)]?.name || '未知';
        const materialAnalysis = `此参数设置针对所选材料(${materialName})和${laserType}激光器特性进行了优化 (基础调整)。`;
        const materialReasonIndex = analysis.adjustmentReasons.findIndex(reason => reason.includes("针对所选材料特性进行了优化"));
        if (materialReasonIndex !== -1) analysis.adjustmentReasons[materialReasonIndex] = materialAnalysis;
        else analysis.adjustmentReasons.push(materialAnalysis);

        return { params: adjustedParams, info, analysis };
    };

    // 导出公共方法
    return {
        getAllMaterials,
        getMaterialParams,
        adjustParamsForImageStats,
        defaultParams
    };
})();

export default Materials; 