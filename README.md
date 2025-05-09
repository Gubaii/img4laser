# 激光雕刻图像预处理器 (img4laser)

这是一个用于优化激光雕刻图像的Web应用工具。该工具可以自动分析图像特征，并根据不同类型的图像（普通照片、卡通/线稿、人像）应用最佳的处理策略，特别优化了对卡通图像的识别和处理。

## 主要功能

- 智能图像类型检测
  - 自动识别普通照片、卡通/线稿、人像
  - 多重特征分析（平滑度、黑白对比、边缘特征等）
  - 针对性优化处理策略

- 自适应参数优化
  - 基于图像特征的锚点灰度值优化
  - 材质相关的参数自动调整
  - 智能抖动算法选择

- 实时预览和分析
  - 实时处理结果预览
  - 直方图实时显示
  - 详细的图像分析报告
  - 参数调整实时反馈

## 技术特点

- 纯前端实现
  - 使用原生JavaScript
  - 无需后端服务器
  - 本地实时处理

- 模块化设计
  - 图像处理核心模块
  - 材料参数管理模块
  - UI交互模块
  - 算法模块

- 高级图像分析
  - 多维度特征提取
  - 智能阈值自适应
  - 边缘检测优化
  - 人脸检测支持

## 最新优化

- 卡通图像检测增强
  - 改进黑白占比判断逻辑
  - 优化平滑度阈值计算
  - 新增高黑白对比判断
  - 提高检测准确率

- 处理效果优化
  - 优化金属材质处理
  - 改进深色材质效果
  - 增强边缘清晰度
  - 提升细节保留

## 使用方法

1. 上传图像
   - 支持常见图像格式（PNG, JPG, WEBP等）
   - 自动进行图像分析

2. 选择材质和颜色
   - 支持多种材质预设
   - 深色/浅色变体选择
   - 激光器类型选择

3. 查看处理结果
   - 实时预览效果
   - 查看分析报告
   - 对比处理前后效果

4. 参数调整（可选）
   - 手动微调参数
   - 实时查看调整效果
   - 自动优化建议

5. 导出处理后的图像
   - 下载优化后的图像
   - 保存处理参数

## 在线演示

访问 [img4laser.vercel.app](https://img4laser.vercel.app) 体验在线版本

## 开发计划

- [ ] 批量处理功能
- [ ] 更多材质预设
- [ ] 自定义预设保存
- [ ] 移动端优化
- [ ] 离线使用支持

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

MIT License 