Phase 2 已实现 photoService.ts：格式校验、总数上限、顺序解码、缩略图、进度、错误统计和取消清理。processFiles 返回 ProcessResult，包含 photos、unsupportedCount、failedCount、limitExceeded。调用方在成功提交前拥有这些照片的 URL，提交后由 TripContext 管理。

后续 Phase 3 添加 exifService.ts；Phase 4 实现均匀选片；Phase 5 添加 templateService.ts；Phase 7 添加 renderService.ts。未实现服务不提供虚假返回值。
