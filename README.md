# TripJournal

TripJournal（旅页）是一个把旅行照片整理成可编辑电子手账的 Web App。当前主流程为：上传照片 → 日期整理 → 今日行程 → 选择风格 → 编辑与导出。

项目保留用户的原始照片文件用于浏览器内高清导出；行程分析与配文功能使用压缩后的分析图片及必要拍摄信息。

## 当前完整流程

1. **01 上传照片**：导入一次旅行的多张照片。
2. **02 日期整理**：读取拍摄日期并按天分组。
3. **03 今日行程**：按时间、位置与图像特征整理 TripStop，确认地点、照片和配文。
4. **04 选择风格**：从三种旅行手账视觉中实时预览并选择。
5. **05 编辑与导出**：在 1080 × 1440 设计画布中编辑文字与照片，下载 PNG。

`/select` 仍保留为内部备用选片页面，不属于当前主流程。

## 当前已实现功能

- 本地批量上传浏览器可解码图片，生成缩略图并保留原始 `File`。
- 使用 `exifr` 读取 `DateTimeOriginal`、`CreateDate`、`ModifyDate` 和 GPS；日期缺失时按文件修改时间降级。
- 按拍摄日期分组，并在当前会话中保存照片和编辑状态。
- `DayItinerary`、`TripStop`、相似照片分组和代表照片 `representativePhotoIds`。
- 根据照片时间、GPS 距离与本地图像特征进行行程初步分段；地点、时间、站点与代表照片可人工修正。
- 每站最多选择 4 张手账照片，支持缩略图选择、移除和新增站点。
- 旅行配文支持手动输入，以及通过服务端边界调用 Agnes 视觉接口生成或换一句。
- 清新旅行手账、复古城市手账、手绘行程手账三种模板。
- 统一的 `JournalScene` 与 1080 × 1440 坐标系统，供模板预览、编辑器和 Canvas 导出复用。
- 照片可在编辑器中拖动、缩放和调整裁切位置；模板配置与编辑状态共同决定旋转角度。
- 标题、日期、城市、开场、时间、地点、配文和结尾支持画布内联编辑，支持字号与对齐覆盖。
- Canvas 使用已选原始照片渲染 1080 × 1440 PNG，包含 cover/contain、裁切、旋转、相框、底纸、路线和主要装饰。

## 技术栈

- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS 4（Vite 插件）
- React Router 7
- dnd-kit
- exifr
- Node.js 与 Vite server plugin
- Agnes API（站点旅行配文）

## 本地运行

要求 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

前端和本地 API 都由 Vite 提供：

<http://127.0.0.1:5173/>

生产构建：

```bash
npm run build
```

## 环境变量

在项目根目录创建 `.env`。不要把真实密钥提交到版本库。

```dotenv
AGNES_API_KEY=
AGNES_MODEL=agnes-2.5-flash
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
```

## 当前项目结构

```text
api/                    # 部署环境使用的 API 入口
public/
  journal-paper/        # 三种手账底纸资源
server/                 # Vite 本地 API、Agnes 配文与 AI provider 边界
src/
  components/           # 行程卡片、画布、步骤导航等组件
  context/              # TripContext 会话状态
  pages/                # 上传、日期、行程、模板、编辑页面
  services/             # EXIF、聚类、AI、场景构建与 Canvas 渲染
  templates/            # 手账模板配置
  types/                # Photo、DayItinerary、TripStop、JournalScene 等类型
  utils/                # 日期、图片、文字换行与下载工具
  config.ts             # 产品信息与 01～05 步骤
  itinerary.css         # 今日行程页面样式
  story.css             # 手账预览与编辑器样式
vite.config.ts          # React、Tailwind 与本地 API 插件
```

## 当前状态

项目已进入较完整的 MVP 阶段。照片上传、EXIF 日期/GPS、日期分组、今日行程、代表照片、Agnes 配文、模板预览、画布内编辑和 1080 × 1440 PNG 导出已贯通。

当前状态数据主要保存在浏览器运行中的 React 会话内，刷新页面后已上传的本地照片可能丢失。AI 配文需要正确配置 Agnes 环境变量和网络连接；不可用时会向用户显示重试提示，不会把密钥暴露给浏览器代码。
