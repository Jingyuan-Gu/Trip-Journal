Phase 2 已实现 image.ts，提供 createThumbnail(file) 与 createThumbnailWithDimensions(file, sourceUrl?, signal?)。返回的缩略图 URL 由调用方持有并负责释放。后续按阶段添加日期、Canvas 手账绘制、文本和下载工具，当前不实现这些功能。
