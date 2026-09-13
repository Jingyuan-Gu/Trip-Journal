# TripJournal 旅页

TripJournal（旅页）是一款将旅行照片自动整理为可编辑电子手账的 Web App。

> 让我们用照片串起旅行回忆。

## 核心功能

### 📷 旅行照片整理

- 批量导入旅行照片
- 自动读取 EXIF 拍摄日期与位置信息
- 按日期整理照片
- 保留原始照片用于高清导出

### 🗺️ 今日行程

- 根据拍摄时间、位置与照片信息整理旅行站点
- 支持修改时间和地点
- 支持选择代表照片
- 支持新增、删除和调整站点

### ✨ AI 旅行配文

- 根据当前站点代表照片生成旅行手账文字
- 支持手动修改和重新生成
- 当前使用 Agnes Vision API

### 🎨 多种旅行手账风格

目前提供：

- 手绘行程手账
- 清新旅行手账
- 复古城市手账

### 🖼️ 可编辑手账画布

支持：

- 拖动照片
- 调整照片大小
- 调整裁切区域
- 使用模板预设的照片旋转效果
- 模板专属本地贴纸素材
- 贴纸拖动、缩放、旋转与删除
- 照片和贴纸的图层顺序调整
- 直接修改标题、地点、时间和旅行配文

系统先自动生成美观版式，再允许用户轻量微调，无需从空白画布开始设计。

### 📥 高清导出

- 1080 × 1440 手账画布
- PNG 导出
- 使用原始照片进行高清渲染

## 技术栈

**Frontend**

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- dnd-kit

**Photo Processing**

- exifr
- Canvas API
- Browser File / Blob API

**AI**

- Agnes Vision API
- agnes-2.5-flash

**Rendering**

- HTML / CSS / SVG
- Canvas
- 自定义手账场景渲染系统

## 本地运行

```bash
npm install
npm run dev
```

访问：[http://127.0.0.1:5173/](http://127.0.0.1:5173/)

AI 功能需要在项目根目录创建 `.env`：

```dotenv
AGNES_API_KEY=your_api_key
AGNES_MODEL=agnes-2.5-flash
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
```

## 项目状态

TripJournal 目前处于 MVP 阶段，照片整理、旅行行程、AI 配文、手账模板、可视化编辑和 PNG 导出等核心流程已经贯通。
