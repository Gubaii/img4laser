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
        
        // 添加事件监听器
        materialSelect.addEventListener('change', () => {
            const materialId = materialSelect.value;
            const colorVariant = colorSelect.value;
            if (onChangeCallback) onChangeCallback();
        });
        
        colorSelect.addEventListener('change', () => {
            const materialId = materialSelect.value;
            const colorVariant = colorSelect.value;
            if (onChangeCallback) onChangeCallback();
        });
        
        return {
            getSelectedMaterial: () => materialSelect.value,
            getSelectedVariant: () => colorSelect.value,
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
    };
})();

export default UI; 