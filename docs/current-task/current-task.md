# 作用域：apps/web, apps/api

# 目标：在 practice 页面，用豆包端到端实时语音大模型 Realtime API方案，实现实时语音对话

# 限制：不要看其他的docs，不要动apps/admin

# 架构：

Next.js 前端
↓ WebSocket
NestJS 后端
↓ WebSocket
豆包端到端实时语音大模型

# 输出：

1.给一份精简的技术设计方案文档，到docs/current-task目录。包含实现这个方案.env 只需要什么参数配置

# 验证：

1.在 practice 页面，能实时语音对话，并且能实时看到字幕
