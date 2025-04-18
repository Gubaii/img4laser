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
            name: "无涂层金属",
            description: "光滑、反光的金属表面",
            isMetal: true,
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
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.3,      // 降低对比度，避免过度处理
                        levelInLow: 10,
                        levelInHigh: 240,
                        sharpness: 40,
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
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.4,
                        levelInLow: 15,
                        levelInHigh: 235,   // 扩大输入范围，保留更多细节
                        sharpness: 45,
                        ditherEnabled: false
                    }
                }
            }
        },

        metal_card: {
            name: "有涂层金属",
            description: "表面涂有涂层的金属卡",
            isMetal: true,
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
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: -5,
                        contrast: 1.5,      // 降低对比度(从2.0降至1.5)
                        levelInLow: 10,
                        levelInHigh: 230,   // 扩大输入范围
                        sharpness: 50,
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
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: 0,
                        contrast: 1.3,
                        levelInLow: 20,
                        levelInHigh: 245,
                        sharpness: 40,
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
                    name: "浅色",
                    params: {
                        ...defaultParams,
                        brightness: 0,      // 由+20改为0，保持中性
                        contrast: 1.4,
                        levelInLow: 20,
                        levelInHigh: 235,
                        sharpness: 40,
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

    // 新增：获取指定材料的基础信息（名称、描述、是否金属等）
    const getMaterialInfo = (materialId) => {
        if (!materials[materialId]) {
            console.warn(`材料 ${materialId} 不存在`);
            return null;
        }
        // 返回材料对象，但不包括variants
        const { variants, ...info } = materials[materialId];
        return info;
    };

    // 根据图像特性和激光器类型调整材料参数
    const adjustParamsForImageStats = (params, imageStats, laserType = 'CO2') => {
        const { mean, stdDev, histogram, peaks, valleys } = imageStats;
        let adjustedParams = { ...params };
        
        // 确保 anchorGray 存在于 adjustedParams 中
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

        // --- 基于激光器类型的参数调整策略 ---

        // 1. 亮度调整: 根据激光器类型和图像亮度进行差异化调整
        let brightnessAdjustment = 0;
        if (mean < 60) { // 非常暗
            if (laserType === 'Diode' || laserType === 'Infrared') {
                brightnessAdjustment = 15; // 二极管/红外激光器需要更明显的提亮
            } else if (laserType === 'Fiber') {
                brightnessAdjustment = 8; // 光纤激光器温和提亮
            } else { // CO2
                brightnessAdjustment = 12; // CO2激光器中等提亮
            }
            info += "图像极暗，根据激光器类型调整亮度；";
            analysis.adjustmentReasons.push(`图像极暗(${mean.toFixed(1)})，${laserType}激光器提高亮度(+${brightnessAdjustment})`);
            hasAdjustments = true;
        } else if (mean > 190) { // 非常亮
            if (laserType === 'Diode' || laserType === 'Infrared') {
                brightnessAdjustment = -15; // 二极管/红外激光器需要更明显的压暗
            } else if (laserType === 'Fiber') {
                brightnessAdjustment = -8; // 光纤激光器温和压暗
            } else { // CO2
                brightnessAdjustment = -12; // CO2激光器中等压暗
            }
            info += "图像极亮，根据激光器类型调整亮度；";
            analysis.adjustmentReasons.push(`图像极亮(${mean.toFixed(1)})，${laserType}激光器降低亮度(${brightnessAdjustment})`);
            hasAdjustments = true;
        }
        adjustedParams.brightness += brightnessAdjustment;

        // 2. 对比度与输入色阶调整: 根据激光器类型差异化处理
        let contrastAdjustmentFactor = 1.0;
        let levelInLowSet = 5;
        let levelInHighSet = 250;

        if (stdDev < 30) { // 对比度非常低
            if (laserType === 'Diode' || laserType === 'Infrared') {
                contrastAdjustmentFactor = 1.3; // 二极管/红外激光器需要更强的对比度提升
                levelInHighSet = 240; // 更激进的色阶调整
            } else if (laserType === 'Fiber') {
                contrastAdjustmentFactor = 1.15; // 光纤激光器温和提升
                levelInHighSet = 245; // 温和的色阶调整
            } else { // CO2
                contrastAdjustmentFactor = 1.25; // CO2激光器中等提升
                levelInHighSet = 242; // 中等的色阶调整
            }
            info += `对比度极低，根据激光器类型调整对比度；`;
            analysis.adjustmentReasons.push(`对比度极低，${laserType}激光器提升对比度(x${contrastAdjustmentFactor.toFixed(2)})`);
            hasAdjustments = true;
        } else if (stdDev < 50) { // 对比度较低
            if (laserType === 'Diode' || laserType === 'Infrared') {
                contrastAdjustmentFactor = 1.2;
                levelInHighSet = 245;
            } else if (laserType === 'Fiber') {
                contrastAdjustmentFactor = 1.1;
                levelInHighSet = 248;
            } else { // CO2
                contrastAdjustmentFactor = 1.15;
                levelInHighSet = 246;
            }
            info += `对比度较低，根据激光器类型调整对比度；`;
            analysis.adjustmentReasons.push(`对比度较低，${laserType}激光器提升对比度(x${contrastAdjustmentFactor.toFixed(2)})`);
            hasAdjustments = true;
        } else if (stdDev > 65) { // 对比度较高
            if (laserType === 'Diode' || laserType === 'Infrared') {
                contrastAdjustmentFactor = 0.95; // 二极管/红外激光器需要更明显的对比度降低
                levelInHighSet = 255;
            } else if (laserType === 'Fiber') {
                contrastAdjustmentFactor = 0.98; // 光纤激光器几乎不降低
                levelInHighSet = 253;
            } else { // CO2
                contrastAdjustmentFactor = 0.97; // CO2激光器中等降低
                levelInHighSet = 254;
            }
            info += `对比度高，根据激光器类型调整对比度；`;
            analysis.adjustmentReasons.push(`对比度高，${laserType}激光器降低对比度(x${contrastAdjustmentFactor.toFixed(2)})`);
            hasAdjustments = true;
        }

        adjustedParams.contrast *= contrastAdjustmentFactor;
        adjustedParams.levelInHigh = levelInHighSet;

        // 3. 锐化调整: 根据激光器类型差异化处理
        if (laserType !== 'Fiber') { 
            let sharpnessAdjustment = 0;
            if (stdDev < 40) { // 低对比度图像
                if (laserType === 'Diode' || laserType === 'Infrared') {
                    sharpnessAdjustment = 10; // 二极管/红外激光器需要更强的锐化
                } else { // CO2
                    sharpnessAdjustment = 7; // CO2激光器中等锐化
                }
                info += `低对比度，根据激光器类型调整锐化；`;
                analysis.adjustmentReasons.push(`低对比度，${laserType}激光器增强锐化(+${sharpnessAdjustment})`);
                hasAdjustments = true;
            } else if (stdDev > 70) { // 高对比度图像
                if (laserType === 'Diode' || laserType === 'Infrared') {
                    sharpnessAdjustment = -5; // 二极管/红外激光器需要更明显的锐化降低
                } else { // CO2
                    sharpnessAdjustment = -3; // CO2激光器中等降低
                }
                info += `高对比度，根据激光器类型调整锐化；`;
                analysis.adjustmentReasons.push(`高对比度，${laserType}激光器降低锐化(${sharpnessAdjustment})`);
                hasAdjustments = true;
            }
            
            adjustedParams.sharpness = Math.max(0, Math.min(100, adjustedParams.sharpness + sharpnessAdjustment));
        } else {
            analysis.adjustmentReasons.push("[Fiber 激光器：不进行自动锐化调整]");
        }

        // 4. 图像分析总结
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

        analysis.technicalDetails = {
            meanBrightness: mean.toFixed(2),
            standardDeviation: stdDev.toFixed(2),
            peaks: peaks.map(p => p.toFixed(0)).join(', '),
            valleys: valleys.map(v => v.toFixed(0)).join(', ')
        };

        if (!hasAdjustments) {
            info = "图像特性接近理想，仅应用基础调整。";
            analysis.adjustmentReasons.push("图像特性接近理想，仅应用基础调整");
        }

        // 参数范围限制
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
        getMaterialInfo,
        adjustParamsForImageStats,
        defaultParams
    };
})();

export default Materials; 