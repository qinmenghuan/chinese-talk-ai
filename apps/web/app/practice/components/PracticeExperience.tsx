"use client";

import type {
  ConversationCloseResponse,
  MessageItem,
  PracticeDifficulty,
  PracticeMode,
  RealtimeSessionResponse,
  ScenarioId,
} from "@learn-chinese-ai/shared-types";
import { PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageBackLink } from "@/components/PageBackLink";
import { getCurrentPath } from "@/lib/auth-guard";
import { apiRequest, getApiBaseUrl, getApiWebSocketUrl } from "@/lib/api";
import { LiveSession } from "./LiveSession";
import { ReportView } from "./ReportView";
import { SessionFocus } from "./SessionFocus";

export type SessionState =
  | "loading"
  | "ready"
  | "recording"
  | "paused"
  | "stopped"
  | "ending"
  | "ended"
  | "error";

interface PracticeExperienceProps {
  initialScenarioId?: string;
  initialRoleId?: string;
  initialMode?: string;
  initialReturnTo?: string;
}

interface SubtitleDraft {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentType: "partial" | "final";
  createdAt: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

/* eslint-disable no-unused-vars */
interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | ((...args: [unknown]) => void);
  onresult: null | ((...args: [BrowserSpeechRecognitionEvent]) => void);
  start: () => void;
  stop: () => void;
  abort: () => void;
}
/* eslint-enable no-unused-vars */

type RealtimeServerEvent =
  | { type: "session.ready" }
  | {
      type: "session.closed";
      code?: number;
      reason?: string;
    }
  | { type: "turn.done" }
  | {
      type: "transcript";
      role: "user" | "assistant";
      messageId: string;
      content: string;
      contentType: "partial" | "final";
    }
  | {
      type: "audio.delta";
      chunk: string;
      sampleRate: number;
    }
  | {
      type: "error";
      message: string;
    };

const DEBUG_PREFIX = "[practice-realtime]";
const LOCAL_RECOGNITION_DRAFT_ID = "local-recognition-draft";
// 中文注释：本地用 RMS 粗略判断用户是否正在说话，达到阈值后才会在静音窗口结束时提交一轮给服务端。
const SILENCE_THRESHOLD = 0.008;

function isScenarioId(value?: string): value is ScenarioId {
  // 中文注释：URL query 里的 scenarioId 是字符串，进入业务逻辑前先收窄成受支持的场景枚举。
  return (
    value === "daily-cafe" ||
    value === "interview-intro" ||
    value === "travel-hotel" ||
    value === "business-meeting" ||
    value === "free-chat"
  );
}

function isPracticeMode(value?: string): value is PracticeMode {
  // 中文注释：练习模式只允许 scenario/free，其他值按后面的默认规则兜底。
  return value === "scenario" || value === "free";
}

function upsertTranscriptMessage(messages: MessageItem[], next: SubtitleDraft) {
  // 中文注释：服务端会持续推送同一 messageId 的 partial/final 字幕，这里用 upsert 保持字幕列表稳定更新。
  const index = messages.findIndex((message) => message.id === next.id);

  if (index === -1) {
    return [...messages, next];
  }

  const updated = [...messages];
  updated[index] = next;
  return updated;
}

function removeLocalRecognitionDraft(messages: MessageItem[]) {
  // 中文注释：本地 SpeechRecognition 产生的 partial 草稿不来自后端，收到正式用户字幕后要先移除。
  return messages.filter((message) => message.id !== LOCAL_RECOGNITION_DRAFT_ID);
}

function getFinalTranscript(messages: MessageItem[]) {
  // 中文注释：只有 final 字幕才会被持久化到会话历史，partial 只是实时 UI 草稿。
  return messages.filter((message) => message.contentType === "final");
}

function hasCompletedUserConversation(messages: MessageItem[]) {
  // 中文注释：判断这次练习是否真的有用户完成发言，用于决定是否生成历史记录。
  return messages.some(
    (message) => message.role === "user" && message.contentType === "final"
  );
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  // 中文注释：不同浏览器的语音识别构造器名字不同，这里统一做兼容探测。
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (
      window as Window & {
        SpeechRecognition?: new () => BrowserSpeechRecognition;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }
    ).SpeechRecognition ??
    (
      window as Window & {
        SpeechRecognition?: new () => BrowserSpeechRecognition;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }
    ).webkitSpeechRecognition ??
    null
  );
}

function calculateRms(input: Float32Array) {
  // 中文注释：RMS 用于检测麦克风输入音量，配合后端 VAD 静音时长决定何时提交当前轮次。
  let sum = 0;

  for (let index = 0; index < input.length; index += 1) {
    const sample = input[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / Math.max(input.length, 1));
}

function downsampleToPcm16(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
) {
  // 中文注释：浏览器采集到的是 Float32 PCM，豆包实时链路需要指定采样率的 Int16 PCM。
  // 因此前端在发送 WebSocket 二进制帧前先做降采样和格式转换。
  if (input.length === 0) {
    return new Int16Array();
  }

  if (inputSampleRate === outputSampleRate) {
    const output = new Int16Array(input.length);

    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
      output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return output;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(outputLength);
  let offset = 0;

  for (let index = 0; index < outputLength; index += 1) {
    const nextOffset = Math.min(input.length, Math.round((index + 1) * ratio));
    let accumulated = 0;
    let count = 0;

    while (offset < nextOffset) {
      accumulated += input[offset] ?? 0;
      count += 1;
      offset += 1;
    }

    const averaged = count > 0 ? accumulated / count : 0;
    const sample = Math.max(-1, Math.min(1, averaged));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function decodeBase64Pcm16(base64: string) {
  // 中文注释：后端转发的 AI 音频增量是 base64 编码的 PCM16，这里还原成 Int16Array 供 Web Audio 播放。
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Int16Array(bytes.buffer);
}

export function PracticeExperience({
  initialScenarioId,
  initialRoleId,
  initialMode,
  initialReturnTo,
}: PracticeExperienceProps) {
  const router = useRouter();
  const { status, requireAuth } = useAuth();
  // 中文注释：以下 ref 对应实时通道的外部资源，必须显式保存引用，后续暂停/停止/卸载时才能完整释放。
  const websocketRef = useRef<WebSocket | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechRecognitionShouldRunRef = useRef(false);
  const captureAudioContextRef = useRef<AudioContext | null>(null);
  const captureProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureMuteGainRef = useRef<GainNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackHeadRef = useRef(0);
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // 中文注释：以下 ref 保存“实时链路的运行状态”，避免异步回调读到过期 state。
  // WebSocket、音频回调、SpeechRecognition 回调都可能晚于 React render 执行。
  // 中文注释：transcriptViewportRef 用来引用字幕显示区域的 DOM 元素，方便进行滚动操作。
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  // 中文注释：transcriptBottomAnchorRef 用来引用字幕显示区域的底部锚点，用于自动滚动到最新内容。
  const transcriptBottomAnchorRef = useRef<HTMLDivElement | null>(null);
  // 中文注释：assistantTurnFinishedRef 用来标记服务端是否已经确认这一轮对话结束，只有它为 true 且本地播放队列也清空后，才真正恢复用户识别。
  const assistantTurnFinishedRef = useRef(false);
  // 中文注释：assistantRecognitionBlockUntilRef 用来标记一个时间点，在这个时间点之前都不恢复用户识别，主要是为了防止一些短暂的回声或残留音频导致的误识别。
  const assistantRecognitionBlockUntilRef = useRef(0);
  // 中文注释：providerReadyRef 表示后端已经和外部实时语音服务完成握手，只有 ready 后才允许启动麦克风上传。
  const providerReadyRef = useRef(false);
  // 中文注释：hasSpeechInTurnRef 记录当前轮次是否检测到用户声音，用来避免空音频触发 AI 回复。
  const hasSpeechInTurnRef = useRef(false);
  // 中文注释：turnCommittedRef 防止同一段静音窗口重复发送 commit/response.create。
  const turnCommittedRef = useRef(false);
  const waitingForAssistantRef = useRef(false);
  // 中文注释：lastSpeechTimestampRef 保存最近一次检测到用户说话的时间，用来计算静音时长。
  const lastSpeechTimestampRef = useRef(0);
  // 中文注释：assistantSpeakingRef 表示本地正在播放 AI 音频，期间要暂停用户识别和麦克风上传。
  const assistantSpeakingRef = useRef(false);
  // 中文注释：下面三个 ref 是 React state 的同步镜像，异步回调里读它们能拿到最新值。
  const sessionStateRef = useRef<SessionState>("loading");
  const sessionRef = useRef<RealtimeSessionResponse | null>(null);
  const transcriptRef = useRef<MessageItem[]>([]);
  const realtimeStartRequestedRef = useRef(false);
  const initialSessionKeyRef = useRef("");
  const realtimeStartingRef = useRef(false);
  // 中文注释：historyPersistedRef 防止停止、结束、页面退出多个路径重复调用 close 接口。
  const historyPersistedRef = useRef(false);

  // 中文注释：这些 state 驱动页面渲染；真正的媒体/WebSocket 生命周期仍由上面的 ref 管理。
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [session, setSession] = useState<RealtimeSessionResponse | null>(null);
  const [transcript, setTranscript] = useState<MessageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId ?? "");
  const [selectedDifficulty, setSelectedDifficulty] = useState<PracticeDifficulty | "">(
    ""
  );

  // 中文注释：根据首页/发现页带来的 query 参数决定当前练习场景；无效参数会退回自由练习。
  const scenarioId = isScenarioId(initialScenarioId) ? initialScenarioId : undefined;
  const mode = isPracticeMode(initialMode)
    ? initialMode
    : scenarioId
      ? "scenario"
      : "free";
  // 中文注释：角色和难度只允许在未录音或已结束状态切换，避免实时链路中途换配置造成前后端状态不一致。
  const canSwitchRole =
    sessionState === "ready" ||
    sessionState === "stopped" ||
    sessionState === "ended" ||
    sessionState === "error";
  // const canSwitchDifficulty = canSwitchRole;
  // 中文注释：定义一个事件处理函数，用于启动练习流程
  const requestAuth = useEffectEvent(() => {
    //  中文注释：在用户进入练习页面时，首先检查认证状态。如果用户未认证，则调用 requireAuth 强制用户登录，并传入当前路径以便登录后重定向回来。
    requireAuth(getCurrentPath("/practice"));
  });

  useEffect(() => {
    // 中文注释：同步最新 sessionState 到 ref，供 WebSocket close/onmessage 等异步回调判断当前流程。
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    // 中文注释：同步最新 session，页面退出和保存历史时即使不重新渲染也能拿到当前 conversationId。
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    // 中文注释：同步最新字幕，结束/退出页面时用它过滤 final 字幕并提交给后端。
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    // 中文注释：每次字幕列表更新后，都把滚动区域自动拉到最底部，优先展示最新一条对话内容。
    // 这里使用底部锚点而不是直接计算 scrollHeight，能减少布局抖动，逻辑也更稳定。
    transcriptBottomAnchorRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [transcript, errorMessage]);

  /* eslint-disable no-console */
  function logRealtime(event: string, payload?: unknown) {
    // 中文注释：实时链路问题通常发生在浏览器、NestJS、外部 provider 三段之间，统一日志前缀方便排查。
    if (payload === undefined) {
      console.info(`${DEBUG_PREFIX} ${event}`);
      return;
    }

    console.info(`${DEBUG_PREFIX} ${event}`, payload);
  }
  /* eslint-enable no-console */

  // 中文注释：清理播放队列，停止所有正在播放的音频，并重置相关状态。
  function clearPlaybackQueue() {
    for (const source of playbackSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Ignore sources that have already ended.
      }
    }

    playbackSourcesRef.current.clear();
    playbackHeadRef.current = 0;
    assistantSpeakingRef.current = false;
    waitingForAssistantRef.current = false;
    // 中文注释：清理播放队列时也重置这两个标记，确保不会因为残留状态而影响下一轮对话。
    assistantTurnFinishedRef.current = false;
    // 中文注释：将 assistantRecognitionBlockUntilRef 重置为 0，确保在下一轮对话开始时不会被误判为仍在播放阶段。
    assistantRecognitionBlockUntilRef.current = 0;
  }

  // 中文注释：AI 播放期间暂停浏览器本地识别，避免扬声器声音被误写成“用户字幕”。
  function pauseLocalRecognitionWhileAssistantSpeaking() {
    if (assistantSpeakingRef.current) {
      return;
    }

    assistantSpeakingRef.current = true;
    assistantTurnFinishedRef.current = false;

    speechRecognitionShouldRunRef.current = false;

    try {
      speechRecognitionRef.current?.stop();
    } catch (error) {
      logRealtime("local-recognition-pause-error", error);
    }

    // 中文注释：清理本地用户草稿字幕，避免它和 AI 字幕混在一起。
    setTranscript((current) => removeLocalRecognitionDraft(current));
    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = false;
    waitingForAssistantRef.current = true;
  }

  // 中文注释：AI 播放结束后恢复本地识别，让用户开始下一轮说话。
  function resumeLocalRecognitionAfterAssistantSpeaking() {
    assistantSpeakingRef.current = false;
    waitingForAssistantRef.current = false;

    if (sessionStateRef.current !== "recording" || !microphoneStreamRef.current) {
      return;
    }

    startBrowserSpeechRecognition();
  }

  async function playAssistantChunk(base64Chunk: string, sampleRate: number) {
    // 中文注释：AI 语音是按 chunk 流式返回的。这里把每个 chunk 接到同一个播放时间轴上，
    // 避免多个 AudioBufferSource 同时 start 造成重叠或断裂。
    if (typeof window === "undefined") {
      return;
    }

    if (!playbackAudioContextRef.current) {
      playbackAudioContextRef.current = new AudioContext();
    }

    const audioContext = playbackAudioContextRef.current;
    await audioContext.resume();

    const pcm = decodeBase64Pcm16(base64Chunk);
    const float32 = new Float32Array(pcm.length);

    for (let index = 0; index < pcm.length; index += 1) {
      float32[index] = (pcm[index] ?? 0) / 0x8000;
    }

    const buffer = audioContext.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      playbackSourcesRef.current.delete(source);

      // 中文注释：只有服务端确认这一轮结束，且本地所有音频都已真正播完，才恢复用户识别。
      if (playbackSourcesRef.current.size === 0 && assistantTurnFinishedRef.current) {
        assistantRecognitionBlockUntilRef.current = Date.now() + 600;
        resumeLocalRecognitionAfterAssistantSpeaking();
      }
    };

    // 中文注释：一旦进入 AI 播放阶段，先暂停本地识别，防止 AI 声音被识别成用户说话。
    pauseLocalRecognitionWhileAssistantSpeaking();
    const startAt = Math.max(audioContext.currentTime + 0.01, playbackHeadRef.current);
    source.start(startAt);
    playbackHeadRef.current = startAt + buffer.duration;
    playbackSourcesRef.current.add(source);
  }

  function stopBrowserSpeechRecognition() {
    // 中文注释：停止本地浏览器识别，只影响页面字幕草稿，不会关闭后端实时 WebSocket。
    speechRecognitionShouldRunRef.current = false;

    try {
      speechRecognitionRef.current?.stop();
    } catch (error) {
      logRealtime("local-recognition-stop-error", error);
    }

    speechRecognitionRef.current = null;
  }

  function startBrowserSpeechRecognition() {
    // 中文注释：浏览器 SpeechRecognition 只用来增强“用户正在说什么”的本地字幕体验。
    // 真正发送给后端的是麦克风 PCM 音频，不依赖这里的文本结果。
    const RecognitionCtor = getSpeechRecognitionCtor();

    if (!RecognitionCtor || speechRecognitionRef.current) {
      return;
    }

    const recognition = new RecognitionCtor();
    speechRecognitionShouldRunRef.current = true;
    // 中文注释：continuous/interimResults 让浏览器持续返回非最终识别结果，用来即时展示用户正在说的话。
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.onend = () => {
      speechRecognitionRef.current = null;

      if (speechRecognitionShouldRunRef.current) {
        // 中文注释：某些浏览器会自动结束 recognition，这里延迟重启，保持练习过程中的本地字幕连续。
        window.setTimeout(() => {
          startBrowserSpeechRecognition();
        }, 150);
      }
    };
    recognition.onerror = (event) => {
      logRealtime("local-recognition-error", event);
    };
    recognition.onresult = (event) => {
      // 中文注释：AI 正在说话，或刚播完的短暂回声窗口内，都忽略本地识别结果。
      if (
        assistantSpeakingRef.current ||
        Date.now() < assistantRecognitionBlockUntilRef.current
      ) {
        return;
      }

      let interimTranscript = "";

      // 中文注释：只收集非 final 的识别片段，因为 final 用户字幕最终以服务端 transcript 为准。
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (!result) {
          continue;
        }

        const segment = result?.[0]?.transcript?.trim();

        if (!segment || result.isFinal) {
          continue;
        }

        interimTranscript = `${interimTranscript} ${segment}`.trim();
      }

      if (!interimTranscript) {
        return;
      }

      logRealtime("local-recognition-interim", {
        transcript: interimTranscript,
        assistantSpeaking: assistantSpeakingRef.current,
        blockUntilMs: Math.max(0, assistantRecognitionBlockUntilRef.current - Date.now()),
      });

      setTranscript((current) => [
        ...removeLocalRecognitionDraft(current),
        {
          // 中文注释：草稿使用固定 ID，下一次 partial 会覆盖旧草稿，而不是不断追加。
          id: LOCAL_RECOGNITION_DRAFT_ID,
          role: "user",
          content: interimTranscript,
          contentType: "partial",
          createdAt: new Date().toISOString(),
        },
      ]);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }

  async function requestSession(options?: {
    roleId?: string;
    difficulty?: PracticeDifficulty;
  }) {
    // 中文注释：创建业务层 realtime session。
    // 后端会返回 conversationId、provider websocket 配置、采样率、VAD 参数和初始字幕。
    const currentRoleId = selectedRoleId || undefined;
    const currentDifficulty = selectedDifficulty || undefined;
    // 中文注释：切换角色/难度时 options 优先；普通创建会话时使用当前页面选择。
    const effectiveRoleId = options?.roleId ?? currentRoleId;
    const effectiveDifficulty = options?.difficulty ?? currentDifficulty;

    logRealtime("request-session", {
      scenarioId,
      roleId: effectiveRoleId,
      difficulty: effectiveDifficulty,
      mode,
    });

    return apiRequest<RealtimeSessionResponse>("/realtime/session", {
      method: "POST",
      body: JSON.stringify({
        scenarioId,
        roleId: effectiveRoleId,
        difficulty: effectiveDifficulty,
        mode,
      }),
    });
  }

  async function closeRealtimeIO() {
    // 中文注释：统一关闭当前实时输入/输出资源。
    // 所有暂停、停止、重启、页面卸载都会走这里，避免麦克风、AudioContext、WebSocket 泄露。
    stopBrowserSpeechRecognition();

    try {
      websocketRef.current?.send(JSON.stringify({ type: "session.close" }));
    } catch (error) {
      logRealtime("socket-close-message-error", error);
    }

    websocketRef.current?.close();
    websocketRef.current = null;

    // 中文注释：断开 Web Audio 采集图，并停止浏览器媒体轨道，释放麦克风占用。
    captureProcessorRef.current?.disconnect();
    captureSourceRef.current?.disconnect();
    captureMuteGainRef.current?.disconnect();
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    captureProcessorRef.current = null;
    captureSourceRef.current = null;
    captureMuteGainRef.current = null;

    if (captureAudioContextRef.current) {
      // 中文注释：AudioContext 不关闭会持续占用系统音频资源，尤其影响后续重新开始录音。
      await captureAudioContextRef.current.close();
      captureAudioContextRef.current = null;
    }

    clearPlaybackQueue();

    if (playbackAudioContextRef.current) {
      // 中文注释：播放用 AudioContext 与采集用 AudioContext 分开关闭，避免互相干扰。
      await playbackAudioContextRef.current.close();
      playbackAudioContextRef.current = null;
    }

    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = false;
    lastSpeechTimestampRef.current = 0;
    waitingForAssistantRef.current = false;
  }

  // 中文注释：这个函数会在用户点击“结束练习”时调用，确保会话历史被正确保存，并且如果用户选择了生成报告，也会触发后端的评分逻辑。
  async function persistConversationHistory(options?: { generateReport?: boolean }) {
    const currentSession = sessionRef.current;
    const finalizedTranscript = getFinalTranscript(transcriptRef.current);

    // 中文注释：
    // 只有出现过至少一条“用户最终发言”，才允许把这次练习落成历史记录。
    // 这样可以避免用户只是进入页面、还没真正开口，就在 history 里留下空会话。
    if (!currentSession || !hasCompletedUserConversation(finalizedTranscript)) {
      return false;
    }

    if (historyPersistedRef.current) {
      // 中文注释：如果其他路径已经保存过历史，直接视为成功，避免重复生成报告或重复写历史。
      return true;
    }

    // 中文注释：先置 true 再请求后端，防止用户快速重复点击造成并发 close 请求。
    historyPersistedRef.current = true;

    try {
      await apiRequest<ConversationCloseResponse>(
        `/conversations/${currentSession.conversationId}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            transcript: finalizedTranscript,
            generateReport: options?.generateReport ?? true,
          }),
        }
      );

      return true;
    } catch (error) {
      // 中文注释：失败时回滚标记，允许用户再次点击结束/停止重试保存。
      historyPersistedRef.current = false;
      throw error;
    }
  }

  function persistConversationHistoryOnPageExit() {
    const currentSession = sessionRef.current;
    const finalizedTranscript = getFinalTranscript(transcriptRef.current);

    // 中文注释：
    // 页面退出时不能依赖普通异步请求，因为浏览器可能会立刻销毁页面上下文。
    // 这里使用 keepalive fetch，把“结束会话并写入历史”的请求交给浏览器继续发送。
    if (
      !currentSession ||
      historyPersistedRef.current ||
      !hasCompletedUserConversation(finalizedTranscript)
    ) {
      return;
    }

    historyPersistedRef.current = true;

    const requestUrl = `${getApiBaseUrl()}/conversations/${currentSession.conversationId}/close`;
    const requestBody = JSON.stringify({
      transcript: finalizedTranscript,
      generateReport: true,
    });

    // 中文注释：keepalive 请求不等待页面存活；失败时只能回滚本地标记，不能再弹 UI。
    void fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
      keepalive: true,
    }).catch(() => {
      historyPersistedRef.current = false;
    });
  }

  // 中文注释：
  // “暂停”不是单纯把麦克风静音，而是要把本轮实时传输链路整体收干净。
  // 原因是豆包实时会话和浏览器 WebSocket 之间可能出现“连接看起来还在，但上游轮次已经失效”的半开状态。
  // 这时浏览器本地识别还能继续出字幕，但后端不会再把这段语音当成有效对话处理，页面就会表现成“卡住”。
  // 因此这里显式关闭当前 transport，恢复时再走一次完整握手，确保用户说的话一定能进入新的有效轮次。
  async function pauseRealtimeTransport() {
    stopBrowserSpeechRecognition();

    try {
      websocketRef.current?.send(JSON.stringify({ type: "session.close" }));
    } catch (error) {
      logRealtime("pause-session-close-error", error);
    }

    websocketRef.current?.close();
    websocketRef.current = null;
    providerReadyRef.current = false;

    // 中文注释：暂停时也释放麦克风，恢复时重新授权/重新采集，保证数据进入新的有效 WebSocket。
    captureProcessorRef.current?.disconnect();
    captureSourceRef.current?.disconnect();
    captureMuteGainRef.current?.disconnect();
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    captureProcessorRef.current = null;
    captureSourceRef.current = null;
    captureMuteGainRef.current = null;

    if (captureAudioContextRef.current) {
      await captureAudioContextRef.current.close();
      captureAudioContextRef.current = null;
    }

    // 中文注释：
    // 暂停时把当前轮次判定状态全部清零，避免恢复后沿用旧轮次的静音计时和提交标记。
    // 否则会出现“用户字幕有了，但这轮始终不 commit”的假活跃状态。
    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = false;
    lastSpeechTimestampRef.current = 0;
    waitingForAssistantRef.current = false;

    // 中文注释：
    // 暂停期间如果 AI 还在播音，也要立即清空播放队列并解除识别阻塞。
    // 恢复时会建立一条新的实时通道，由新的会话继续后续对话。
    clearPlaybackQueue();

    if (playbackAudioContextRef.current) {
      await playbackAudioContextRef.current.close();
      playbackAudioContextRef.current = null;
    }
  }

  function commitCurrentTurn() {
    // 中文注释：前端检测到“用户说过话并静音超过 VAD 阈值”后，通知后端提交当前输入缓冲并让 AI 生成回复。
    const websocket = websocketRef.current;

    if (
      !websocket ||
      websocket.readyState !== WebSocket.OPEN ||
      !hasSpeechInTurnRef.current
    ) {
      logRealtime("turn-commit-skipped", {
        hasSpeechInTurn: hasSpeechInTurnRef.current,
        websocketState: websocket?.readyState ?? null,
      });
      return;
    }

    websocket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    websocket.send(JSON.stringify({ type: "response.create" }));
    waitingForAssistantRef.current = true;
    // 中文注释：commit 后立即清空本轮说话标记，等待下一次 RMS 再开启新轮次。
    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = true;
    logRealtime("turn-committed", {
      silenceElapsedMs: Date.now() - lastSpeechTimestampRef.current,
      websocketState: websocket.readyState,
    });
  }

  async function startMicrophoneCapture(currentSession: RealtimeSessionResponse) {
    // 中文注释：开始采集浏览器麦克风，把 Float32 音频降采样为 provider 要求的 PCM16，
    // 再通过浏览器到 NestJS 的 WebSocket 直接发送二进制音频帧。
    if (typeof window === "undefined" || microphoneStreamRef.current) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // 中文注释：只采单声道，并启用浏览器侧回声消除/降噪/自动增益，降低实时语音误触发。
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const audioContext = new AudioContext();
    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const muteGain = audioContext.createGain();
    // 中文注释：ScriptProcessor 需要接入音频图才会工作，但输出不应回放到扬声器，所以接到 0 增益节点。
    muteGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      // 中文注释：这是麦克风音频的热路径，尽量只做必要判断、VAD、格式转换和发送。
      const websocket = websocketRef.current;
      const now = Date.now();

      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      // 中文注释：AI 说话时不上传用户麦克风音频，也不做用户发言判定。
      if (
        assistantSpeakingRef.current ||
        waitingForAssistantRef.current ||
        now < assistantRecognitionBlockUntilRef.current
      ) {
        return;
      }

      const channelData = event.inputBuffer.getChannelData(0);
      const rms = calculateRms(channelData);

      // 中文注释：超过音量阈值就认为用户仍在当前轮次说话，并刷新最近说话时间。
      if (rms >= SILENCE_THRESHOLD) {
        if (!hasSpeechInTurnRef.current) {
          logRealtime("speech-detected", { rms });
        }

        hasSpeechInTurnRef.current = true;
        turnCommittedRef.current = false;
        lastSpeechTimestampRef.current = now;
      } else if (
        // 中文注释：已经检测到用户说过话，并且静音超过后端配置的 VAD 时长，才提交当前轮。
        hasSpeechInTurnRef.current &&
        !turnCommittedRef.current &&
        now - lastSpeechTimestampRef.current >=
          currentSession.providerSession.vadSilenceMs
      ) {
        commitCurrentTurn();
      }

      const pcm = downsampleToPcm16(
        channelData,
        audioContext.sampleRate,
        currentSession.providerSession.inputSampleRate
      );

      if (pcm.byteLength > 0) {
        // 中文注释：二进制帧直接承载 PCM 音频，控制类事件则使用 JSON 文本帧。
        websocket.send(pcm.buffer.slice(0));
      }
    };

    source.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    microphoneStreamRef.current = stream;
    // 中文注释：保存采集链路节点引用，后续暂停/停止时按同一套引用完整断开。
    captureAudioContextRef.current = audioContext;
    captureSourceRef.current = source;
    captureProcessorRef.current = processor;
    captureMuteGainRef.current = muteGain;
    startBrowserSpeechRecognition();
    logRealtime("microphone-capture-started");
  }

  async function prepareSession(options?: {
    roleId?: string;
    difficulty?: PracticeDifficulty;
  }) {
    // 中文注释：准备一条新的练习会话，只创建业务会话和初始状态，不立即打开实时音频通道。
    setSessionState("loading");
    setErrorMessage("");

    const nextSession = await requestSession(options);
    // 中文注释：拿到新会话后，先把历史持久化标记重置，确保新的会话历史能正常保存。
    historyPersistedRef.current = false;
    setSession(nextSession);
    setSelectedRoleId(nextSession.selectedRole.id);
    setSelectedDifficulty(nextSession.scenario.difficulty);
    setTranscript(nextSession.initialTranscript);
    setSessionState("ready");
    logRealtime("session-ready", {
      conversationId: nextSession.conversationId,
      model: nextSession.providerSession.model,
      voiceId: nextSession.providerSession.voiceId,
    });

    return nextSession;
  }

  useEffect(() => {
    // 中文注释：用户未登录时不允许直接进入实时练习，先打开登录流程，并保留当前 practice 路径作为登录后回跳目标。
    if (status === "anonymous") {
      requestAuth();
    }
  }, [status]);

  useEffect(() => {
    // 中文注释：登录状态就绪后自动创建一次练习会话，让页面进入 ready 状态。
    // 真正开始麦克风和 WebSocket 要等用户点击开始按钮。
    if (status !== "authenticated") {
      initialSessionKeyRef.current = "";
      return;
    }

    const initialSessionKey = `${mode}:${scenarioId ?? "free"}:${initialRoleId ?? ""}`;

    if (initialSessionKeyRef.current === initialSessionKey && sessionRef.current) {
      return;
    }

    initialSessionKeyRef.current = initialSessionKey;
    let cancelled = false;

    void (async () => {
      try {
        // 中文注释：初次进入页面只创建业务 session，不自动打开麦克风，避免用户未明确操作就触发录音授权。
        const nextSession = await requestSession();

        if (cancelled) {
          // 中文注释：如果组件已经卸载或依赖已变化，丢弃这次异步结果，避免写入旧页面状态。
          return;
        }

        historyPersistedRef.current = false;
        setSession(nextSession);
        setSelectedRoleId(nextSession.selectedRole.id);
        setSelectedDifficulty(nextSession.scenario.difficulty);
        setTranscript(nextSession.initialTranscript);
        if (!realtimeStartRequestedRef.current) {
          setSessionState("ready");
        }
        setErrorMessage("");
      } catch (error) {
        if (cancelled) {
          // 中文注释：同样避免已取消的初始化流程把页面改成 error。
          return;
        }

        initialSessionKeyRef.current = "";
        setSelectedDifficulty("");
        setSessionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to prepare session."
        );
      }
    })();

    return () => {
      // 中文注释：依赖变化或组件卸载时标记取消，让上面的异步请求结果不再落到当前状态。
      cancelled = true;
    };
  }, [initialRoleId, mode, scenarioId, status]);

  useEffect(() => {
    // 中文注释：页面卸载时确保会话历史被持久化，并且关闭所有实时连接和媒体流，避免资源泄露。
    function handlePageExit() {
      persistConversationHistoryOnPageExit();
    }

    window.addEventListener("pagehide", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      persistConversationHistoryOnPageExit();
      void closeRealtimeIO();
    };
  }, []);

  async function startRealtimeConversation(
    currentSession?: RealtimeSessionResponse | null
  ) {
    // 中文注释：这是实时对话启动入口。
    // 它会按顺序完成：确保 session 可用 -> 获取一次性 ticket -> 建立浏览器 WebSocket -> 等待后端 session.ready -> 启动麦克风采集。
    if (realtimeStartingRef.current) {
      return;
    }

    if (websocketRef.current?.readyState === WebSocket.CONNECTING) {
      setSessionState("loading");
      return;
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN && providerReadyRef.current) {
      setSessionState("recording");
      return;
    }

    realtimeStartingRef.current = true;
    realtimeStartRequestedRef.current = true;
    setErrorMessage("");
    setSessionState("loading");

    let nextSession = currentSession ?? sessionRef.current;

    try {
      // 中文注释：
      // “停止”会把当前会话正式结束掉，因此再次点击开始时必须先申请一个新的会话，
      // 不能复用已经 close 的 conversationId，否则会出现前端按钮能点、后端会话却已失效的状态。
      // 如果用户点击开始时初始化 session 还没落到 React state，也在这里现场补建一条会话。
      if (sessionStateRef.current === "stopped" || !nextSession) {
        nextSession = await prepareSession({
          roleId: selectedRoleId || undefined,
          difficulty: selectedDifficulty || undefined,
        });
        setSessionState("loading");
      }

      if (!nextSession) {
        throw new Error("Failed to prepare realtime session.");
      }

      const activeSession = nextSession;

      if (
        sessionStateRef.current === "paused" &&
        providerReadyRef.current &&
        websocketRef.current?.readyState === WebSocket.OPEN
      ) {
        await startMicrophoneCapture(activeSession);
        setSessionState("recording");
        return;
      }

      providerReadyRef.current = false;

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        setSessionState(providerReadyRef.current ? "recording" : "loading");
        realtimeStartingRef.current = false;
        return;
      }

      // 中文注释：ticket 是连接实时 WebSocket 的短期凭证，避免把长期 access token 暴露在 WebSocket URL 中。
      // 浏览器连接的是本项目 NestJS WebSocket 桥，由后端再转发到外部实时语音服务。
      const websocket = new WebSocket(
        getApiWebSocketUrl(activeSession.providerSession.websocketPath, {
          conversationId: activeSession.conversationId,
          ticket: (
            await apiRequest<{ ticket: string; expiresInSeconds: number }>(
              "/realtime/ticket",
              {
                method: "POST",
                body: JSON.stringify({
                  conversationId: activeSession.conversationId,
                }),
              }
            )
          ).ticket,
        })
      );

      websocketRef.current = websocket;

      websocket.onopen = () => {
        // 中文注释：浏览器 WebSocket 已连上后端桥，但外部 provider session 还没确认 ready。
        logRealtime("socket-open");
        setSessionState("loading");
      };

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as RealtimeServerEvent;

          if (payload.type === "session.ready") {
            // 中文注释：后端已完成外部实时语音服务握手，此时才启动本地麦克风，避免用户音频发到未就绪的上游。
            if (providerReadyRef.current) {
              return;
            }

            logRealtime("socket-session-ready");
            providerReadyRef.current = true;
            logRealtime("provider-session-config", {
              conversationId: activeSession.conversationId,
              inputSampleRate: activeSession.providerSession.inputSampleRate,
              outputSampleRate: activeSession.providerSession.outputSampleRate,
              vadSilenceMs: activeSession.providerSession.vadSilenceMs,
            });
            void startMicrophoneCapture(activeSession).then(
              () => {
                realtimeStartingRef.current = false;
                setSessionState("recording");
              },
              (error) => {
                realtimeStartingRef.current = false;
                waitingForAssistantRef.current = false;
                setSessionState("error");
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to start the microphone."
                );
              }
            );
            return;
          }

          if (payload.type === "session.closed") {
            // 中文注释：外部 provider 主动关闭时区分正常关闭和异常关闭，异常关闭需要进入错误态提醒用户。
            logRealtime("socket-session-closed", payload);
            if (payload.code && payload.code !== 1000) {
              setErrorMessage(
                `Realtime provider closed the session (${payload.code}${payload.reason ? `: ${payload.reason}` : ""}).`
              );
              setSessionState("error");
              resumeLocalRecognitionAfterAssistantSpeaking();
              return;
            }

            // 中文注释：正常关闭多发生在暂停/结束流程，页面保持可恢复的 paused 状态。
            setSessionState((current) => (current === "ending" ? current : "paused"));
            resumeLocalRecognitionAfterAssistantSpeaking();
            return;
          }

          if (payload.type === "turn.done") {
            logRealtime("provider-turn-done");
            // 中文注释：turn.done 只代表服务端结束生成，不代表本地扬声器已经播完。
            // 只有本地播放队列也清空后，才真正恢复用户识别。
            assistantTurnFinishedRef.current = true;

            if (playbackSourcesRef.current.size === 0) {
              assistantRecognitionBlockUntilRef.current = Date.now() + 600;
              resumeLocalRecognitionAfterAssistantSpeaking();
            }

            return;
          }

          if (payload.type === "audio.delta") {
            // 中文注释：AI 回复音频流式到达，前端边收边播。
            logRealtime("provider-audio-delta", {
              sampleRate: payload.sampleRate,
              chunkBase64Length: payload.chunk.length,
            });
            void playAssistantChunk(payload.chunk, payload.sampleRate);
            return;
          }

          if (payload.type === "transcript") {
            // 中文注释：服务端同时推送用户/AI 两侧字幕，partial 用于实时显示，final 用于最后持久化。
            logRealtime("provider-transcript", {
              role: payload.role,
              contentType: payload.contentType,
              preview: payload.content.slice(0, 40),
            });
            setTranscript((current) => {
              const baseMessages =
                payload.role === "user" && payload.contentType === "final"
                  ? removeLocalRecognitionDraft(current)
                  : current;
              const existing = baseMessages.find(
                (message) => message.id === payload.messageId
              );

              return upsertTranscriptMessage(baseMessages, {
                id: payload.messageId,
                role: payload.role,
                content: payload.content,
                contentType: payload.contentType,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
              }).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
            });
            return;
          }

          if (payload.type === "error") {
            // 中文注释：后端桥或 provider 返回业务错误时直接展示错误，并停止当前录音态。
            waitingForAssistantRef.current = false;
            setErrorMessage(payload.message);
            setSessionState("error");
          }
        } catch (error) {
          logRealtime("socket-message-parse-error", error);
        }
      };

      websocket.onerror = () => {
        // 中文注释：WebSocket 底层错误通常拿不到具体 provider 信息，这里给用户一个通用连接失败提示。
        realtimeStartingRef.current = false;
        waitingForAssistantRef.current = false;
        logRealtime("socket-error");
        setSessionState("error");
        setErrorMessage("Realtime WebSocket connection failed.");
      };

      websocket.onclose = (event) => {
        // 中文注释：无论 close 来自用户操作、网络断开还是 provider 断开，都要清理前端连接状态。
        realtimeStartingRef.current = false;
        waitingForAssistantRef.current = false;
        logRealtime("socket-close", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        providerReadyRef.current = false;
        websocketRef.current = null;
        stopBrowserSpeechRecognition();

        if (sessionStateRef.current !== "ending") {
          // 中文注释：如果不是主动结束报告流程，连接关闭后回到 paused，用户可以再次点击开始恢复。
          setSessionState((current) => (current === "error" ? current : "paused"));
        }
      };
    } catch (error) {
      // 中文注释：ticket 获取、WebSocket 构造、启动麦克风等任一步失败，统一进入错误态。
      realtimeStartRequestedRef.current = false;
      realtimeStartingRef.current = false;
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start realtime conversation."
      );
    }
  }

  async function stopRealtimeConversation() {
    // 中文注释：停止只结束当前练习传输，并保存历史；不跳转报告页，也不强制生成报告。
    const currentSession = sessionRef.current;

    if (!currentSession) {
      return;
    }

    try {
      setSessionState("ending");
      await closeRealtimeIO();
      await persistConversationHistory({ generateReport: false });
      setSessionState("stopped");
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to stop the conversation."
      );
    }
  }

  // 中文注释：这里的“暂停”是指暂停实时对话的传输链路，区别于单纯的麦克风静音。暂停后用户说的话不会被送到后端，也不会被识别成字幕，直到恢复时重新建立一条新的实时链路。
  async function pauseRealtimeConversation() {
    try {
      // 中文注释：
      // 暂停时不再保留当前实时链路，直接销毁 transport。
      // 这样恢复录音时一定会创建一条新的有效会话，避免复用半失效连接。
      await pauseRealtimeTransport();
      setSessionState("paused");
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to pause the microphone."
      );
    }
  }

  async function restartRealtimeConversation() {
    // 中文注释：重启会完整关闭旧链路、重新创建业务 session，再立即启动新的实时连接。
    try {
      await closeRealtimeIO();
      const refreshedSession = await prepareSession({
        roleId: selectedRoleId || undefined,
        difficulty: selectedDifficulty || undefined,
      });
      await startRealtimeConversation(refreshedSession);
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to restart realtime conversation."
      );
    }
  }

  async function endSession() {
    // 中文注释：结束并生成报告。成功持久化后跳转到报告页，由报告页读取后端生成结果。
    if (!session) {
      return;
    }

    if (sessionStateRef.current === "stopped") {
      return;
    }

    try {
      setSessionState("ending");
      await closeRealtimeIO();
      const persisted = await persistConversationHistory({ generateReport: true });

      if (!persisted) {
        setSessionState("ready");
        return;
      }

      setSessionState("ended");
      router.push(`/reports/${session.conversationId}`);
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to finish the conversation."
      );
    }
  }

  function handleRoleChange(nextRoleId: string) {
    // 中文注释：先更新选择值，让 UI 立即反馈；如果当前允许切换，再重建会话应用新角色。
    setSelectedRoleId(nextRoleId);

    if (canSwitchRole) {
      void (async () => {
        try {
          // 中文注释：角色会影响系统提示词/场景配置，必须关闭旧实时资源后重新 prepare session。
          await closeRealtimeIO();
          await prepareSession({
            roleId: nextRoleId,
            difficulty: selectedDifficulty || undefined,
          });
        } catch (error) {
          setSessionState("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to switch practice role."
          );
        }
      })();
    }
  }

  // function handleDifficultyChange(nextDifficulty: PracticeDifficulty) {
  //   // 中文注释：难度同样会影响当前场景配置；录音中禁止切换，非录音态则即时重建会话。
  //   setSelectedDifficulty(nextDifficulty);

  //   if (canSwitchDifficulty) {
  //     void (async () => {
  //       try {
  //         // 中文注释：保留当前角色，只替换难度，重新向后端申请对应的 scenario 配置。
  //         await closeRealtimeIO();
  //         await prepareSession({
  //           roleId: selectedRoleId || undefined,
  //           difficulty: nextDifficulty,
  //         });
  //       } catch (error) {
  //         setSessionState("error");
  //         setErrorMessage(
  //           error instanceof Error
  //             ? error.message
  //             : "Failed to switch practice difficulty."
  //         );
  //       }
  //     })();
  //   }
  // }

  const currentStatusLabel =
    // 中文注释：把内部状态映射成 LiveSession 展示用文案，避免子组件理解完整状态机。
    sessionState === "loading"
      ? "Preparing session"
      : sessionState === "ready"
        ? "Ready to join"
        : sessionState === "recording"
          ? "Live"
          : sessionState === "paused"
            ? "Paused"
            : sessionState === "stopped"
              ? "Session ended"
              : sessionState === "ending"
                ? "Ending session"
                : sessionState === "ended"
                  ? "Report ready"
                  : "Error";

  return (
    <main>
      <PageShell className="space-y-10">
        {initialReturnTo ? (
          // 中文注释：从 discovery 带 returnTo 进入时显示返回入口；直接访问 practice 时不展示。
          <PageBackLink href={initialReturnTo} label="Back to discovery" />
        ) : null}
        <SectionHeading eyebrow="" title="Realtime Mandarin Practice" />
        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          {/* 中文注释：LiveSession 只负责主实时对话 UI，启动/暂停/停止等动作仍回调到父组件处理。 */}
          <LiveSession
            session={session}
            sessionState={sessionState}
            currentStatusLabel={currentStatusLabel}
            transcript={transcript}
            errorMessage={errorMessage}
            transcriptViewportRef={transcriptViewportRef}
            transcriptBottomAnchorRef={transcriptBottomAnchorRef}
            onStart={() => void startRealtimeConversation()}
            onPause={() => void pauseRealtimeConversation()}
            onStop={() => void stopRealtimeConversation()}
            onRestart={() => void restartRealtimeConversation()}
          />

          <div className="space-y-6">
            {/* 中文注释：SessionFocus 展示并切换练习信息，实际重建 session 的副作用留在父组件。 */}
            <SessionFocus
              session={session}
              selectedRoleId={selectedRoleId}
              selectedDifficulty={selectedDifficulty}
              canSwitchRole={canSwitchRole}
              // canSwitchDifficulty={canSwitchDifficulty}
              onRoleChange={handleRoleChange}
              // onDifficultyChange={handleDifficultyChange}
            />

            {/* 中文注释：ReportView 只负责结束练习入口，父组件负责保存历史并跳转报告页。 */}
            <ReportView
              sessionState={sessionState}
              onEndSession={() => void endSession()}
            />
          </div>
        </section>
      </PageShell>
    </main>
  );
}
