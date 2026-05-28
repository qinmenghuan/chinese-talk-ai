# Practice 页豆包 Realtime WebSocket 方案

## 目标

在 `apps/web` 的 `practice` 页面实现实时语音对话：

- 浏览器采集麦克风音频
- 通过 WebSocket 发给 `apps/api`
- `apps/api` 再通过 WebSocket 转发给豆包 Realtime API
- 页面实时显示字幕，并播放 AI 返回的音频
- 会话结束后沿用现有报告链路，把 transcript 落库并生成 report

## 实现范围

- 修改 `apps/web`
- 修改 `apps/api`
- 不改 `apps/admin`
- 不依赖 RTC 房间，不再走现有 RTC AI 互动链路

## 最终架构

```text
Browser practice page
  -> WebSocket /api/realtime/ws
NestJS bridge
  -> WebSocket Doubao Realtime API
Doubao Realtime
  -> transcript events + audio events
NestJS bridge
  -> WebSocket push to browser
Browser UI
  -> live subtitles + audio playback
```

## 前端实现

`apps/web/features/conversation/PracticeExperience.tsx`

- 保留 `POST /api/realtime/session` 用来创建会话、建档、拿场景信息
- 点击开始后，连接 `ws://.../api/realtime/ws?conversationId=...&visitorToken=...`
- 用 `getUserMedia` + `AudioContext` + `ScriptProcessorNode` 采集麦克风
- 前端把音频统一转成 `pcm16 / 16k / mono`
- 二进制音频分片直接通过浏览器 WebSocket 发给后端
- 用静音检测做分段：
  - 检测到说话时持续发送音频
  - 静音超过阈值后发送 `input_audio_buffer.commit`
  - `openspeech` 侧由后端把 commit 映射成二进制 `EndASR`
- 收到后端推送的字幕事件后更新 transcript
- 收到后端推送的 `audio.delta` 后把 base64 PCM16 解码并播放
- 保留浏览器本地语音识别作为“用户正在说”的临时字幕体验，最终用户字幕仍以后端返回的最终结果为准

## 后端实现

### 1. 会话创建

`apps/api/src/modules/realtime/realtime.service.ts`

- 继续负责创建匿名会话和 conversation 记录
- 初始 transcript 仍写入 Redis
- 返回前端需要的 realtime 元数据：
  - `websocketPath`
  - `model`
  - `voiceId`
  - 输入/输出采样率
  - 静音分段阈值

### 2. WebSocket bridge

`apps/api/src/modules/realtime/realtime-ws.bridge.ts`

- 挂载到 NestJS HTTP server 的 upgrade 事件
- 监听路径：`/api/realtime/ws`
- 校验 `conversationId` 和 `visitorToken`
- 为每个浏览器连接创建一个上游 Doubao WebSocket 连接
- 做双向转发：

浏览器 -> NestJS

- 二进制音频 -> 发 `TaskRequest` 二进制事件
- JSON 控制消息：
  - `input_audio_buffer.commit`
  - `response.cancel`
  - `session.close`

Doubao -> NestJS -> 浏览器

- `ASRResponse`
  - 映射成用户实时/最终字幕
- `ChatResponse` / `TTSSubtitle`
  - 映射成 AI 临时/最终字幕
- `TTSResponse`
  - 映射成可播放的 PCM16 音频块
- `TTSEnded` / `ChatEnded`
  - 标记一轮回复结束
- `error`
  - 转成页面错误提示

### 3. Doubao 适配层

`apps/api/src/common/volcengine/doubao-realtime.service.ts`

- 负责连接豆包 Realtime WebSocket
- 连接成功后按二进制协议发送 `StartConnection`、`StartSession`
- 把场景 prompt、角色、voice、输入输出音频格式打进 `StartSession` 配置
- 当前实现用 `.env` 驱动真实地址、模型和 voice，不把密钥暴露到前端

## transcript 与报告

- 页面上展示的 transcript 以实时事件流为准
- 用户点击结束时，前端把最终 transcript 继续提交给现有 `POST /conversations/:id/close`
- 现有 PostgreSQL 落库和 report 生成逻辑不需要重写

## .env 最小新增配置

这次方案新增且必须配置的参数：

```env
DOUBAO_REALTIME_WS_URL=wss://openspeech.bytedance.com/api/v3/realtime/dialogue
DOUBAO_REALTIME_APP_ID=your_realtime_app_id
DOUBAO_REALTIME_APP_KEY=your_realtime_app_key
DOUBAO_REALTIME_ACCESS_KEY=your_realtime_access_key
DOUBAO_REALTIME_VOICE=zh_female_vv_jupiter_bigtts
```

可选调优参数，未配置时代码内已有默认值：

```env
DOUBAO_REALTIME_INPUT_SAMPLE_RATE=16000
DOUBAO_REALTIME_OUTPUT_SAMPLE_RATE=24000
DOUBAO_REALTIME_VAD_SILENCE_MS=900
```

说明：

- `DOUBAO_REALTIME_WS_URL` 保持可配置，避免把供应商具体接入地址写死在业务逻辑里
- `DOUBAO_REALTIME_APP_ID`、`DOUBAO_REALTIME_APP_KEY`、`DOUBAO_REALTIME_ACCESS_KEY` 都只在后端使用
- `DOUBAO_REALTIME_MODEL` 是可选覆盖项；不配置时由豆包语音服务端使用默认模型
- `DOUBAO_REALTIME_VOICE` 保持可切换，方便后续切换正式开通的音色

## 验证方式

1. 启动 `web` 和 `api`
2. 打开 `/practice`
3. 点击开始后允许浏览器麦克风权限
4. 对着麦克风说中文
5. 检查页面是否出现：
   - 用户实时/最终字幕
   - AI 实时/最终字幕
   - AI 返回音频播放
6. 点击结束后，确认能跳转到 report 页面

## 当前实现边界

- 这版已经把架构切到“前端 WebSocket -> NestJS WebSocket -> Doubao Realtime WebSocket”
- 豆包的具体模型名、voice 名和最终线上接入地址全部通过 `.env` 控制
- `openspeech` 这条链路不是 OpenAI 风格 JSON Realtime 协议，必须按官方二进制事件协议接入
- 事件映射主要收敛在 `realtime-ws.bridge.ts`，前端不需要理解上游二进制协议
