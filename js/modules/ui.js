/**
 * UI模块
 * 处理用户界面交互和更新
 */

import Materials from './materials.js';

const UI = (() => {
    // 创建材料选择器
    const createMaterialSelector = (containerId, onChangeCallback) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const materials = Materials.getAllMaterials();
        
        // 创建材料下拉菜单
        const materialSelect = document.createElement('select');
        materialSelect.id = 'materialSelect';
        materialSelect.className = 'material-select';
        
        // 添加材料选项
        for (const [materialId, material] of Object.entries(materials)) {
            const option = document.createElement('option');
            option.value = materialId;
            option.textContent = material.name;
            option.title = material.description || '';
            materialSelect.appendChild(option);
        }
        
        // 创建材料颜色选择下拉菜单
        const colorSelect = document.createElement('select');
        colorSelect.id = 'colorVariantSelect';
        colorSelect.className = 'color-variant-select';
        
        const colors = [
            { id: 'dark', name: '深色' },
            { id: 'neutral', name: '浅色' }
        ];
        
        colors.forEach(color => {
            const option = document.createElement('option');
            option.value = color.id;
            option.textContent = color.name;
            option.selected = color.id === 'neutral';
            colorSelect.appendChild(option);
        });
        
        // 创建参数显示切换按钮
        const toggleParamsButton = document.createElement('button');
        toggleParamsButton.id = 'toggleParamsButton';
        toggleParamsButton.textContent = '显示参数设置';
        toggleParamsButton.className = 'secondary';
        
        // 创建参数面板（作为弹窗）
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'paramsModalOverlay';
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const paramsPanel = document.createElement('div');
        paramsPanel.id = 'paramsPanel';
        paramsPanel.className = 'params-panel';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.title = '关闭';
        
        modalContent.appendChild(closeButton);
        modalContent.appendChild(paramsPanel);
        modalOverlay.appendChild(modalContent);
        
        // 将弹窗添加到body
        document.body.appendChild(modalOverlay);
        
        // 初始添加参数控件
        updateParamsPanel(paramsPanel, materialSelect.value, 'neutral');
        
        // 添加事件监听器
        materialSelect.addEventListener('change', () => {
            const materialId = materialSelect.value;
            const colorVariant = colorSelect.value;
            updateParamsPanel(paramsPanel, materialId, colorVariant);
            if (onChangeCallback) onChangeCallback();
        });
        
        colorSelect.addEventListener('change', () => {
            const materialId = materialSelect.value;
            const colorVariant = colorSelect.value;
            updateParamsPanel(paramsPanel, materialId, colorVariant);
            if (onChangeCallback) onChangeCallback();
        });
        
        toggleParamsButton.addEventListener('click', () => {
            modalOverlay.style.display = 'flex';
        });
        
        closeButton.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
        
        // 点击遮罩层关闭弹窗
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
        
        // 添加到容器
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'select-wrapper';
        selectWrapper.appendChild(document.createTextNode('材料:'));
        selectWrapper.appendChild(materialSelect);
        
        const colorWrapper = document.createElement('div');
        colorWrapper.className = 'select-wrapper';
        colorWrapper.appendChild(document.createTextNode('颜色:'));
        colorWrapper.appendChild(colorSelect);
        
        container.appendChild(selectWrapper);
        container.appendChild(colorWrapper);
        container.appendChild(toggleParamsButton);
        
        return {
            getSelectedMaterial: () => materialSelect.value,
            getSelectedVariant: () => colorSelect.value,
            getCurrentParams: () => getParametersFromUI(paramsPanel)
        };
    };
    
    // 创建激光器类型选择器
    const createLaserTypeSelector = (containerId, onChangeCallback, initialLaserType = 'CO2') => {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const laserSelect = document.createElement('select');
        laserSelect.id = 'laserTypeSelect';
        laserSelect.className = 'laser-type-select'; // 可以添加特定样式

        const laserTypes = [
            { id: 'CO2', name: 'CO2' },
            { id: 'Diode', name: '半导体 (Diode)' },
            { id: 'Fiber', name: '光纤 (Fiber)' },
            { id: 'Infrared', name: '红外 (Infrared)' }
        ];

        laserTypes.forEach(laser => {
            const option = document.createElement('option');
            option.value = laser.id;
            option.textContent = laser.name;
            option.selected = laser.id === initialLaserType;
            laserSelect.appendChild(option);
        });

        // Add event listener if callback is provided
        if (onChangeCallback) {
            laserSelect.addEventListener('change', onChangeCallback);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'select-wrapper'; // 复用现有样式
        wrapper.appendChild(document.createTextNode('激光器:'));
        wrapper.appendChild(laserSelect);

        // 插入到材料和颜色选择器之后，参数按钮之前
        const toggleButton = document.getElementById('toggleParamsButton');
        if (toggleButton) {
            container.insertBefore(wrapper, toggleButton);
        } else {
            container.appendChild(wrapper);
        }

        return {
            getSelectedLaserType: () => laserSelect.value,
            // 移除这里的注释，因为现在有了回调机制
            // addChangeListener: (callback) => laserSelect.addEventListener('change', callback)
        };
    };
    
    // 更新参数面板
    const updateParamsPanel = (panel, materialId, variant) => {
        if (!panel) return;
        
        // 获取材料参数
        const params = Materials.getMaterialParams(materialId, variant);
        
        // 始终确保抖动功能关闭
        params.ditherEnabled = false;
        
        // 清空面板
        panel.innerHTML = '';
        
        // 添加标题
        const materialName = Materials.getAllMaterials()[materialId]?.name || materialId;
        const variantName = variant === 'dark' ? '深色' : (variant === 'light' ? '浅色' : '中性');
        
        const heading = document.createElement('h4');
        heading.textContent = `${materialName} (${variantName}) 参数设置`;
        panel.appendChild(heading);
        
        // 创建参数组
        const createParamGroup = (title) => {
            const group = document.createElement('div');
            group.className = 'param-group';
            
            const groupTitle = document.createElement('h5');
            groupTitle.textContent = title;
            groupTitle.style.marginBottom = '8px';
            group.appendChild(groupTitle);
            
            return group;
        };
        
        // 创建亮度和对比度组
        const basicGroup = createParamGroup('基本参数');
        
        // 亮度控制
        createSliderControl(
            basicGroup, 
            'brightness', 
            '亮度', 
            params.brightness, 
            -100, 
            100, 
            1,
            '调整图像的整体亮度 (-100 到 100)'
        );
        
        // 对比度控制
        createSliderControl(
            basicGroup, 
            'contrast', 
            '对比度', 
            params.contrast * 100, // 显示为百分比
            10, 
            300, 
            5,
            '调整图像的对比度 (10% 到 300%)',
            (value) => value / 100 // 转换回实际值
        );
        
        // 锐化控制
        createSliderControl(
            basicGroup, 
            'sharpness', 
            '锐化', 
            params.sharpness, 
            0, 
            100, 
            5,
            '增强图像边缘的清晰度 (0 到 100)'
        );
        
        panel.appendChild(basicGroup);
        
        // 创建色阶组
        const levelsGroup = createParamGroup('色阶调整');
        
        // 输入黑场
        createSliderControl(
            levelsGroup, 
            'levelInLow', 
            '输入黑场', 
            params.levelInLow, 
            0, 
            254, 
            1,
            '设置将映射为黑色的输入级别 (0 到 254)'
        );
        
        // 输入白场
        createSliderControl(
            levelsGroup, 
            'levelInHigh', 
            '输入白场', 
            params.levelInHigh, 
            1, 
            255, 
            1,
            '设置将映射为白色的输入级别 (1 到 255)'
        );
        
        panel.appendChild(levelsGroup);
    };
    
    // 创建滑块控件
    const createSliderControl = (container, id, label, value, min, max, step, tooltip, valueConverter) => {
        const row = document.createElement('div');
        row.className = 'param-row';
        
        const nameLabel = document.createElement('label');
        nameLabel.className = 'param-name';
        nameLabel.textContent = label;
        nameLabel.htmlFor = id;
        
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = id;
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'param-value';
        valueDisplay.textContent = value;
        
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
        });
        
        sliderContainer.appendChild(slider);
        
        row.appendChild(nameLabel);
        row.appendChild(sliderContainer);
        row.appendChild(valueDisplay);
        
        // 添加提示信息
        if (tooltip) {
            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = '?';
            
            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltiptext';
            tooltipText.textContent = tooltip;
            
            tooltipElement.appendChild(tooltipText);
            row.appendChild(tooltipElement);
        }
        
        container.appendChild(row);
        
        // 为滑块添加converter属性
        if (valueConverter) {
            slider.dataset.converter = true;
            slider.converter = valueConverter;
        }
        
        return row;
    };
    
    // 从UI获取当前参数
    const getParametersFromUI = (panel) => {
        if (!panel) return null;
        
        const params = {};
        
        // 获取基本参数
        params.brightness = parseInt(document.getElementById('brightness')?.value || 0);
        params.contrast = parseFloat(document.getElementById('contrast')?.value || 100) / 100;
        params.sharpness = parseInt(document.getElementById('sharpness')?.value || 0);
        
        // 获取色阶参数 (仅输入)
        params.levelInLow = parseInt(document.getElementById('levelInLow')?.value || 0);
        params.levelInHigh = parseInt(document.getElementById('levelInHigh')?.value || 255);
        // 输出色阶固定为 0-255
        params.levelOutLow = 0;
        params.levelOutHigh = 255;
        
        // 应用任何自定义转换
        Object.keys(params).forEach(key => {
            const element = document.getElementById(key);
            if (element && element.dataset.converter && element.converter) {
                params[key] = element.converter(params[key]);
            }
        });
        
        return params;
    };
    
    // 显示处理信息
    const showProcessingInfo = (containerId, info) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.textContent = info;
        }
    };
    
    // 创建抖动算法按钮
    const createDitherAlgorithmButtons = (containerId, onSelectCallback) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // 清空现有按钮
        
        const algorithms = [
            { id: 'none', name: '不抖动' },
            { id: 'floydSteinberg', name: 'Floyd-Steinberg' },
            { id: 'atkinson', name: 'Atkinson' },
            { id: 'jarvis', name: 'Jarvis' },
            { id: 'ordered', name: 'Ordered' },
            { id: 'bayer', name: 'Bayer' }
        ];
        
        algorithms.forEach(algo => {
            const button = document.createElement('button');
            button.textContent = algo.name;
            button.className = 'algorithm-button';
            button.dataset.algorithmId = algo.id; // 添加 data-* 属性
            button.title = `应用 ${algo.name} 抖动算法`;
            button.addEventListener('click', () => {
                if (onSelectCallback) onSelectCallback(algo.id);
            });
            container.appendChild(button);
        });
    };

    // 更新抖动算法按钮的选中状态
    const updateDitherButtonSelection = (algorithmId) => {
        const buttons = document.querySelectorAll('#algorithmButtons .algorithm-button');
        buttons.forEach(button => {
            if (button.dataset.algorithmId === algorithmId) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    };
    
    return {
        createMaterialSelector,
        createLaserTypeSelector,
        showProcessingInfo,
        createDitherAlgorithmButtons,
        updateDitherButtonSelection,
        getParametersFromUI
    };
})();

export default UI; 