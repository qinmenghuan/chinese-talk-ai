# 实时对话核心功能实现逻辑

本文档说明 `PracticeExperience.tsx` 相关实时对话链路，覆盖前端页面、后端接口/WebSocket 桥和外部实时语音服务的协作方式。

## 1. 总体链路

实时对话不是前端直接连接外部语音服务，而是：

```text
Web Practice 页面
  -> NestJS REST API 创建业务会话
  -> NestJS REST API 签发短期 WebSocket ticket
  -> Web 浏览器连接 NestJS WebSocket bridge
  -> NestJS bridge 连接外部实时语音 provider
  -> Web 发送麦克风 PCM 音频
  -> Provider 返回字幕和 AI 音频
  -> Web 展示字幕并播放 AI 音频
  -> Web 结束时调用后端保存会话并可生成报告
```

## 2. 前端核心职责

前端入口是 `PracticeExperience.tsx`。

主要职责：

- 处理登录态：未登录时调用 `requireAuth(getCurrentPath("/practice"))`。
- 创建练习会话：调用 `POST /realtime/session`。
- 启动实时链路：调用 `POST /realtime/ticket` 后建立 WebSocket。
- 采集麦克风：使用 `navigator.mediaDevices.getUserMedia()` 和 `AudioContext`。
- 音频格式转换：把浏览器 `Float32` PCM 转成指定采样率的 `Int16` PCM。
- 发送用户音频：通过 WebSocket 发送二进制 PCM 音频帧。
- 展示字幕：处理服务端推送的 `transcript` 事件。
- 播放 AI 语音：处理服务端推送的 `audio.delta` 事件。
- 保存历史和生成报告：调用 `POST /conversations/:conversationId/close`。

## 3. 前端状态模型

`SessionState` 描述页面实时状态：

| 状态        | 含义                                        |
| ----------- | ------------------------------------------- |
| `loading`   | 正在创建会话或等待实时链路 ready            |
| `ready`     | 业务 session 已准备好，但还没有开始实时录音 |
| `recording` | 麦克风和 WebSocket 正在工作                 |
| `paused`    | 实时 transport 已暂停或关闭，可重新开始     |
| `stopped`   | 当前会话已停止并保存历史                    |
| `ending`    | 正在结束会话或保存历史                      |
| `ended`     | 会话结束并准备跳转报告页                    |
| `error`     | 实时链路或接口失败                          |

父组件保留所有业务状态，三个 UI 子组件只负责展示和触发回调：

- `LiveSession.tsx`：实时对话主区域、字幕和控制按钮。
- `SessionFocus.tsx`：角色、难度、模型、音色和会话目标。
- `ReportView.tsx`：结束会话并生成报告入口。

## 4. 创建业务会话

页面认证成功后，会调用：

```text
POST /realtime/session
```

请求参数来自当前场景、角色、难度和模式：

```json
{
  "scenarioId": "daily-cafe",
  "roleId": "daily-cafe-customer",
  "difficulty": "beginner",
  "mode": "scenario"
}
```

后端返回 `RealtimeSessionResponse`，前端保存以下关键信息：

- `conversationId`：业务会话 ID，用于后续 WebSocket、保存历史和报告查询。
- `providerSession.websocketPath`：浏览器要连接的 WebSocket 路径。
- `providerSession.inputSampleRate`：前端上传音频需要使用的采样率。
- `providerSession.outputSampleRate`：AI 返回音频播放采样率。
- `providerSession.vadSilenceMs`：静音多久后提交当前轮次。
- `initialTranscript`：初始化字幕。

## 5. 启动实时 WebSocket

用户点击开始后，前端执行 `startRealtimeConversation()`。

核心步骤：

1. 确认已有可用 `RealtimeSessionResponse`。
2. 如果当前状态是 `stopped`，先重新调用 `prepareSession()` 创建新会话。
3. 调用 `POST /realtime/ticket` 获取短期 ticket。
4. 使用 `getApiWebSocketUrl()` 拼出 WebSocket URL。
5. 浏览器连接 NestJS WebSocket bridge。
6. 等待服务端推送 `session.ready`。
7. 收到 `session.ready` 后启动麦克风采集。

ticket 的作用是给 WebSocket 建立短期访问凭证，避免把长期 access token 直接放在 WebSocket URL 中。

## 6. 麦克风采集和音频上传

前端通过 `startMicrophoneCapture()` 启动麦克风。

关键实现：

- `getUserMedia()` 获取浏览器麦克风流。
- `AudioContext.createMediaStreamSource()` 接入 Web Audio。
- `ScriptProcessorNode` 持续读取 PCM 音频块。
- `calculateRms()` 粗略判断用户是否正在说话。
- `downsampleToPcm16()` 把 Float32 PCM 转成 provider 要求的 Int16 PCM。
- WebSocket 发送二进制 PCM buffer。

前端不会把浏览器 SpeechRecognition 的文本直接发给后端。SpeechRecognition 只用于本地显示用户临时字幕草稿。

## 7. 轮次提交逻辑

前端使用 RMS 和 `vadSilenceMs` 做一层轻量轮次判断：

1. 当 RMS 超过 `SILENCE_THRESHOLD`，标记当前轮次已有用户说话。
2. 当用户说过话且静音时间超过 `vadSilenceMs`，调用 `commitCurrentTurn()`。
3. `commitCurrentTurn()` 通过 WebSocket 发送：

```json
{ "type": "input_audio_buffer.commit" }
```

随后发送：

```json
{ "type": "response.create" }
```

这表示前端请求后端/外部 provider 处理当前用户输入并生成 AI 回复。

## 8. 服务端推送事件

前端当前处理这些 WebSocket 事件：

| 事件             | 前端行为                         |
| ---------------- | -------------------------------- |
| `session.ready`  | 标记 provider 已就绪，启动麦克风 |
| `transcript`     | 更新用户或 AI 字幕               |
| `audio.delta`    | 播放 AI 音频 chunk               |
| `turn.done`      | 标记 AI 当前轮生成结束           |
| `session.closed` | 根据 code 判断暂停或错误         |
| `error`          | 显示错误并进入 `error` 状态      |

字幕处理使用 `upsertTranscriptMessage()`，同一个 `messageId` 的 partial/final 会更新同一条字幕，避免 UI 重复刷屏。

## 9. AI 音频播放和本地识别防串音

AI 音频通过 `audio.delta` 以 base64 PCM16 chunk 形式到达。

前端播放流程：

1. `decodeBase64Pcm16()` 还原 PCM16。
2. 转成 Float32。
3. 创建 `AudioBuffer`。
4. 创建 `AudioBufferSourceNode` 播放。
5. 使用 `playbackHeadRef` 串接多个 chunk，减少断裂或重叠。

为了避免 AI 扬声器声音被浏览器本地识别成“用户字幕”，前端在 AI 播放期间会：

- 停止 `SpeechRecognition`。
- 清理本地用户草稿字幕。
- 等 `turn.done` 且本地播放队列清空后，再恢复本地识别。
- 额外设置一个短暂 block 窗口，降低回声误识别概率。

## 10. 暂停、停止、重启、结束

### 暂停

暂停不是简单静音，而是关闭当前实时 transport：

- 停止本地识别。
- 发送 `session.close`。
- 关闭浏览器 WebSocket。
- 关闭麦克风轨道和 AudioContext。
- 清理 AI 播放队列。

恢复时重新建立一条有效实时链路。

### 停止

停止会关闭实时链路，并调用：

```text
POST /conversations/:conversationId/close
```

此时 `generateReport` 为 `false`，只保存历史，不跳转报告页。

### 重启

重启会：

1. 关闭旧实时链路。
2. 创建新的业务 session。
3. 立即重新启动实时 WebSocket 和麦克风。

### 结束并生成报告

结束会：

1. 关闭实时链路。
2. 调用 `POST /conversations/:conversationId/close`。
3. `generateReport` 为 `true`。
4. 保存成功后跳转 `/reports/:conversationId`。

## 11. 页面退出保护

页面关闭或跳转时，普通异步请求可能来不及完成。

因此前端在 `pagehide` 和组件卸载时调用 `persistConversationHistoryOnPageExit()`，用 `fetch(..., { keepalive: true })` 尽力保存已经完成的 final 字幕。

保存条件：

- 当前存在 `conversationId`。
- 历史尚未保存过。
- 至少有一条用户 final 字幕。

这样可以避免用户只是进入页面但没有说话时生成空历史。

## 12. 后端职责

从前端视角看，后端承担三类职责：

### 12.1 REST API

- `POST /realtime/session`
  - 创建业务 conversation。
  - 选择场景、角色、难度和语音配置。
  - 返回 provider 会话配置和初始字幕。

- `POST /realtime/ticket`
  - 为指定 `conversationId` 签发短期 WebSocket ticket。
  - 保护 WebSocket 连接不直接暴露长期 token。

- `POST /conversations/:conversationId/close`
  - 保存 final transcript。
  - 根据 `generateReport` 决定是否生成报告。

### 12.2 WebSocket Bridge

浏览器 WebSocket 连接到 NestJS bridge，而不是直接连外部 provider。

Bridge 负责：

- 校验 ticket。
- 按 `conversationId` 找到实时上下文。
- 连接外部实时语音服务。
- 转发浏览器 PCM 音频。
- 接收外部 provider 的字幕和音频事件。
- 转成前端统一事件格式后推送给浏览器。

## 13. 外部实时语音服务职责

外部 provider 负责真正的实时语音 AI 能力：

- 接收用户 PCM 音频。
- 做语音识别和对话理解。
- 根据场景 prompt 生成 AI 回复。
- 返回用户/AI 字幕。
- 返回 AI 语音音频 chunk。
- 返回轮次完成或 session 关闭事件。

前端不直接感知 provider 协议细节，只处理后端 bridge 转换后的统一事件。

## 14. 关键设计取舍

- 前端保存状态，子组件只展示：降低拆分 UI 后影响实时链路的风险。
- 浏览器不直连外部 provider：统一鉴权、隐藏 provider 凭证和协议细节。
- ticket 独立于 access token：降低 WebSocket URL 泄露风险。
- final 字幕才持久化：避免 partial 草稿污染历史和报告。
- 暂停时销毁 transport：避免半开 WebSocket 或上游失效导致“页面看似还在录音但后端不处理”。
- AI 播放时暂停本地识别：减少扬声器回声造成的用户字幕误识别。
