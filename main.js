const techContent = document.getElementById('tech-details-content');
techContent.innerHTML = ''; // 清空旧内容

// (!!! 修改 !!!) 增加检查，确保 analysis 对象和 adjustmentReasons 存在
if (analysis && analysis.adjustmentReasons && analysis.adjustmentReasons.length > 0) {
    const reasonsList = document.createElement('ul');
    reasonsList.style.listStyleType = 'none';
    reasonsList.style.paddingLeft = '0';
    analysis.adjustmentReasons.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsList.appendChild(li);
    });
    techContent.appendChild(reasonsList);
} else if (analysis) { // 如果有 analysis 对象但没有调整原因
     const p = document.createElement('p');
     p.textContent = '处理过程中未应用自动参数调整。';
     techContent.appendChild(p);
} else {
    // 如果 analysis 对象不存在 (例如手动应用抖动时)，可以不显示任何内容，或显示提示
    // 这里选择不显示内容，因为技术详情主要是针对初始自动处理的
}

// (!!! 修改 !!!) 增加检查，确保 analysis 对象和 otherInfo 存在
if (analysis && analysis.otherInfo) {
    const infoTitle = document.createElement('h6');
    infoTitle.textContent = '其他信息:';
    infoTitle.style.marginTop = '10px';
    techContent.appendChild(infoTitle);
    const infoList = document.createElement('ul');
    infoList.style.listStyleType = 'none';
    infoList.style.paddingLeft = '0';
    // 使用 Object.entries 前确保 analysis.otherInfo 是有效对象
    if (typeof analysis.otherInfo === 'object' && analysis.otherInfo !== null) {
         Object.entries(analysis.otherInfo).forEach(([key, value]) => {
            const li = document.createElement('li');
            li.textContent = `${key}: ${value}`;
            infoList.appendChild(li);
        });
    }
    techContent.appendChild(infoList);
}

// 更新参数显示（如果需要）
// ... (如果需要，这里可以添加显示最终参数的代码)
// ... existing code ... 