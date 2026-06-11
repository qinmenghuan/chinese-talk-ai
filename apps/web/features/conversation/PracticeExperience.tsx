"use client";

import type {
  ConversationCloseResponse,
  MessageItem,
  PracticeDifficulty,
  PracticeMode,
  RealtimeSessionResponse,
  ScenarioId,
} from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { Mic2, Pause, RotateCcw, Sparkles, Square, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { PageBackLink } from "../../components/PageBackLink";
import { getCurrentPath } from "../../lib/auth-guard";
import { apiRequest, getApiBaseUrl, getApiWebSocketUrl } from "../../lib/api";

type SessionState =
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
const SILENCE_THRESHOLD = 0.008;

function isScenarioId(value?: string): value is ScenarioId {
  return (
    value === "daily-cafe" ||
    value === "interview-intro" ||
    value === "travel-hotel" ||
    value === "business-meeting" ||
    value === "free-chat"
  );
}

function isPracticeMode(value?: string): value is PracticeMode {
  return value === "scenario" || value === "free";
}

function upsertTranscriptMessage(messages: MessageItem[], next: SubtitleDraft) {
  const index = messages.findIndex((message) => message.id === next.id);

  if (index === -1) {
    return [...messages, next];
  }

  const updated = [...messages];
  updated[index] = next;
  return updated;
}

function removeLocalRecognitionDraft(messages: MessageItem[]) {
  return messages.filter((message) => message.id !== LOCAL_RECOGNITION_DRAFT_ID);
}

function getFinalTranscript(messages: MessageItem[]) {
  return messages.filter((message) => message.contentType === "final");
}

function hasCompletedUserConversation(messages: MessageItem[]) {
  return messages.some(
    (message) => message.role === "user" && message.contentType === "final"
  );
}

function getScenarioDifficultyLabel(difficulty?: PracticeDifficulty) {
  if (difficulty === "beginner") {
    return "Beginner";
  }

  if (difficulty === "intermediate") {
    return "Intermediate";
  }

  if (difficulty === "advanced") {
    return "Advanced";
  }

  return "Preparing";
}

const PRACTICE_DIFFICULTY_OPTIONS: Array<{
  value: PracticeDifficulty;
  label: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
  },
  {
    value: "intermediate",
    label: "Intermediate",
  },
  {
    value: "advanced",
    label: "Advanced",
  },
];

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
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
  // 中文注释：transcriptViewportRef 用来引用字幕显示区域的 DOM 元素，方便进行滚动操作。
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  // 中文注释：transcriptBottomAnchorRef 用来引用字幕显示区域的底部锚点，用于自动滚动到最新内容。
  const transcriptBottomAnchorRef = useRef<HTMLDivElement | null>(null);
  // 中文注释：assistantTurnFinishedRef 用来标记服务端是否已经确认这一轮对话结束，只有它为 true 且本地播放队列也清空后，才真正恢复用户识别。
  const assistantTurnFinishedRef = useRef(false);
  // 中文注释：assistantRecognitionBlockUntilRef 用来标记一个时间点，在这个时间点之前都不恢复用户识别，主要是为了防止一些短暂的回声或残留音频导致的误识别。
  const assistantRecognitionBlockUntilRef = useRef(0);
  const providerReadyRef = useRef(false);
  const hasSpeechInTurnRef = useRef(false);
  const turnCommittedRef = useRef(false);
  const lastSpeechTimestampRef = useRef(0);
  const assistantSpeakingRef = useRef(false);
  const sessionStateRef = useRef<SessionState>("loading");
  const sessionRef = useRef<RealtimeSessionResponse | null>(null);
  const transcriptRef = useRef<MessageItem[]>([]);
  const historyPersistedRef = useRef(false);

  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [session, setSession] = useState<RealtimeSessionResponse | null>(null);
  const [transcript, setTranscript] = useState<MessageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId ?? "");
  const [selectedDifficulty, setSelectedDifficulty] = useState<PracticeDifficulty | "">(
    ""
  );

  const scenarioId = isScenarioId(initialScenarioId) ? initialScenarioId : undefined;
  const mode = isPracticeMode(initialMode)
    ? initialMode
    : scenarioId
      ? "scenario"
      : "free";
  const canSwitchRole =
    sessionState === "ready" ||
    sessionState === "stopped" ||
    sessionState === "ended" ||
    sessionState === "error";
  const canSwitchDifficulty = canSwitchRole;
  // 中文注释：定义一个事件处理函数，用于启动练习流程
  const requestAuth = useEffectEvent(() => {
    //  中文注释：在用户进入练习页面时，首先检查认证状态。如果用户未认证，则调用 requireAuth 强制用户登录，并传入当前路径以便登录后重定向回来。
    requireAuth(getCurrentPath("/practice"));
  });

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
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
  }

  // 中文注释：AI 播放结束后恢复本地识别，让用户开始下一轮说话。
  function resumeLocalRecognitionAfterAssistantSpeaking() {
    assistantSpeakingRef.current = false;

    if (sessionStateRef.current !== "recording" || !microphoneStreamRef.current) {
      return;
    }

    startBrowserSpeechRecognition();
  }

  async function playAssistantChunk(base64Chunk: string, sampleRate: number) {
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
    speechRecognitionShouldRunRef.current = false;

    try {
      speechRecognitionRef.current?.stop();
    } catch (error) {
      logRealtime("local-recognition-stop-error", error);
    }

    speechRecognitionRef.current = null;
  }

  function startBrowserSpeechRecognition() {
    const RecognitionCtor = getSpeechRecognitionCtor();

    if (!RecognitionCtor || speechRecognitionRef.current) {
      return;
    }

    const recognition = new RecognitionCtor();
    speechRecognitionShouldRunRef.current = true;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.onend = () => {
      speechRecognitionRef.current = null;

      if (speechRecognitionShouldRunRef.current) {
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
    const currentRoleId = selectedRoleId || undefined;
    const currentDifficulty = selectedDifficulty || undefined;
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
    stopBrowserSpeechRecognition();

    try {
      websocketRef.current?.send(JSON.stringify({ type: "session.close" }));
    } catch (error) {
      logRealtime("socket-close-message-error", error);
    }

    websocketRef.current?.close();
    websocketRef.current = null;

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

    clearPlaybackQueue();

    if (playbackAudioContextRef.current) {
      await playbackAudioContextRef.current.close();
      playbackAudioContextRef.current = null;
    }

    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = false;
    lastSpeechTimestampRef.current = 0;
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
      return true;
    }

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
    hasSpeechInTurnRef.current = false;
    turnCommittedRef.current = true;
    logRealtime("turn-committed", {
      silenceElapsedMs: Date.now() - lastSpeechTimestampRef.current,
      websocketState: websocket.readyState,
    });
  }

  async function startMicrophoneCapture(currentSession: RealtimeSessionResponse) {
    if (typeof window === "undefined" || microphoneStreamRef.current) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
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
    muteGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const websocket = websocketRef.current;
      const now = Date.now();

      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      // 中文注释：AI 说话时不上传用户麦克风音频，也不做用户发言判定。
      if (
        assistantSpeakingRef.current ||
        now < assistantRecognitionBlockUntilRef.current
      ) {
        return;
      }

      const channelData = event.inputBuffer.getChannelData(0);
      const rms = calculateRms(channelData);

      if (rms >= SILENCE_THRESHOLD) {
        if (!hasSpeechInTurnRef.current) {
          logRealtime("speech-detected", { rms });
        }

        hasSpeechInTurnRef.current = true;
        turnCommittedRef.current = false;
        lastSpeechTimestampRef.current = now;
      } else if (
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
        websocket.send(pcm.buffer.slice(0));
      }
    };

    source.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    microphoneStreamRef.current = stream;
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
    if (status === "anonymous") {
      requestAuth();
    }
  }, [requestAuth, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextSession = await requestSession();

        if (cancelled) {
          return;
        }

        historyPersistedRef.current = false;
        setSession(nextSession);
        setSelectedRoleId(nextSession.selectedRole.id);
        setSelectedDifficulty(nextSession.scenario.difficulty);
        setTranscript(nextSession.initialTranscript);
        setSessionState("ready");
        setErrorMessage("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSelectedDifficulty("");
        setSessionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to prepare session."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, requestAuth, scenarioId, status]);

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
    currentSession: RealtimeSessionResponse | null = session
  ) {
    let nextSession = currentSession;

    // 中文注释：
    // “停止”会把当前会话正式结束掉，因此再次点击开始时必须先申请一个新的会话，
    // 不能复用已经 close 的 conversationId，否则会出现前端按钮能点、后端会话却已失效的状态。
    if (sessionStateRef.current === "stopped") {
      nextSession = await prepareSession({
        roleId: selectedRoleId || undefined,
        difficulty: selectedDifficulty || undefined,
      });
    }

    if (!nextSession) {
      return;
    }

    if (
      sessionState === "paused" &&
      providerReadyRef.current &&
      websocketRef.current?.readyState === WebSocket.OPEN
    ) {
      try {
        await startMicrophoneCapture(nextSession);
        setSessionState("recording");
        return;
      } catch (error) {
        setSessionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to resume the microphone."
        );
        return;
      }
    }

    try {
      setErrorMessage("");
      providerReadyRef.current = false;

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const websocket = new WebSocket(
        getApiWebSocketUrl(nextSession.providerSession.websocketPath, {
          conversationId: nextSession.conversationId,
          ticket: (
            await apiRequest<{ ticket: string; expiresInSeconds: number }>(
              "/realtime/ticket",
              {
                method: "POST",
                body: JSON.stringify({
                  conversationId: nextSession.conversationId,
                }),
              }
            )
          ).ticket,
        })
      );

      websocketRef.current = websocket;

      websocket.onopen = () => {
        logRealtime("socket-open");
        setSessionState("loading");
      };

      websocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as RealtimeServerEvent;

          if (payload.type === "session.ready") {
            if (providerReadyRef.current) {
              return;
            }

            logRealtime("socket-session-ready");
            providerReadyRef.current = true;
            logRealtime("provider-session-config", {
              conversationId: nextSession.conversationId,
              inputSampleRate: nextSession.providerSession.inputSampleRate,
              outputSampleRate: nextSession.providerSession.outputSampleRate,
              vadSilenceMs: nextSession.providerSession.vadSilenceMs,
            });
            void startMicrophoneCapture(nextSession).then(
              () => {
                setSessionState("recording");
              },
              (error) => {
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
            logRealtime("socket-session-closed", payload);
            if (payload.code && payload.code !== 1000) {
              setErrorMessage(
                `Realtime provider closed the session (${payload.code}${payload.reason ? `: ${payload.reason}` : ""}).`
              );
              setSessionState("error");
              resumeLocalRecognitionAfterAssistantSpeaking();
              return;
            }

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
            logRealtime("provider-audio-delta", {
              sampleRate: payload.sampleRate,
              chunkBase64Length: payload.chunk.length,
            });
            void playAssistantChunk(payload.chunk, payload.sampleRate);
            return;
          }

          if (payload.type === "transcript") {
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
            setErrorMessage(payload.message);
            setSessionState("error");
          }
        } catch (error) {
          logRealtime("socket-message-parse-error", error);
        }
      };

      websocket.onerror = () => {
        logRealtime("socket-error");
        setSessionState("error");
        setErrorMessage("Realtime WebSocket connection failed.");
      };

      websocket.onclose = (event) => {
        logRealtime("socket-close", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        providerReadyRef.current = false;
        websocketRef.current = null;
        stopBrowserSpeechRecognition();

        if (sessionStateRef.current !== "ending") {
          setSessionState((current) => (current === "error" ? current : "paused"));
        }
      };
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start realtime conversation."
      );
    }
  }

  async function stopRealtimeConversation() {
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

  const currentStatusLabel =
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
          <PageBackLink href={initialReturnTo} label="Back to discovery" />
        ) : null}
        <SectionHeading
          eyebrow="Practice"
          title="Realtime Mandarin Practice"
          description="This route uses a browser to NestJS to Doubao Realtime WebSocket bridge. Speak naturally and follow the live subtitles as they stream in."
        />
        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <Card className="flex h-[calc(100vh-13rem)] min-h-[34rem] max-h-[52rem] flex-col overflow-hidden border-0 shadow-[var(--shadow-float)]">
            <div className="border-b border-[var(--color-hairline-soft)] bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Live session
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
                    {session?.scenario.title ?? "Preparing scenario"}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-3 py-2">
                    <Waves className="h-4 w-4" strokeWidth={1.8} />
                    Realtime WebSocket
                  </span>
                  <span>{currentStatusLabel}</span>
                </div>
              </div>
            </div>

            <div
              ref={transcriptViewportRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-soft)] p-6"
            >
              <div className="space-y-4">
                {transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`max-w-[85%] rounded-[var(--radius-card)] px-5 py-4 text-sm leading-7 ${
                      item.role === "assistant"
                        ? "bg-white text-[var(--color-ink)]"
                        : "ml-auto bg-[var(--color-primary)] text-white"
                    } ${item.contentType === "partial" ? "opacity-70" : ""}`}
                  >
                    {item.content}
                  </div>
                ))}
                {errorMessage ? (
                  <div className="rounded-[var(--radius-card)] bg-[#fff1f2] px-4 py-3 text-sm text-[#9f1239]">
                    {errorMessage}
                  </div>
                ) : null}
                <div ref={transcriptBottomAnchorRef} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-auto border-t border-[var(--color-hairline-soft)] bg-white px-6 py-5">
              <div className="flex flex-wrap items-center justify-center gap-4 rounded-full border border-[var(--color-hairline-soft)] bg-white p-2 shadow-[var(--shadow-float)]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="Start realtime conversation"
                    onClick={() => void startRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mic2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Pause microphone capture"
                    onClick={() => void pauseRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pause className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Stop realtime conversation"
                    onClick={() => void stopRealtimeConversation()}
                    disabled={sessionState !== "recording" && sessionState !== "paused"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Restart the realtime session"
                    onClick={() => void restartRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 shadow-[var(--shadow-float)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Session focus
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
                {session?.scenario.goal ?? "Preparing goal"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-body)]">
                {session?.scenario.promptHint ??
                  "The side rail stays light. It should support the conversation."}
              </p>
              <div className="mt-5 space-y-3 text-sm text-[var(--color-body)]">
                <label className="block rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Role
                  </span>
                  <select
                    value={selectedRoleId}
                    onChange={(event) => {
                      const nextRoleId = event.target.value;
                      setSelectedRoleId(nextRoleId);

                      if (canSwitchRole) {
                        void (async () => {
                          try {
                            await closeRealtimeIO();
                            await prepareSession({
                              roleId: nextRoleId,
                              difficulty: selectedDifficulty || undefined,
                            });
                          } catch (error) {
                            setSessionState("error");
                            setErrorMessage(
                              error instanceof Error
                                ? error.message
                                : "Failed to switch practice role."
                            );
                          }
                        })();
                      }
                    }}
                    disabled={!canSwitchRole}
                    className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {session?.scenario.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Difficulty
                  </span>
                  <select
                    value={selectedDifficulty}
                    onChange={(event) => {
                      const nextDifficulty = event.target.value as PracticeDifficulty;
                      setSelectedDifficulty(nextDifficulty);

                      if (canSwitchDifficulty) {
                        void (async () => {
                          try {
                            await closeRealtimeIO();
                            await prepareSession({
                              roleId: selectedRoleId || undefined,
                              difficulty: nextDifficulty,
                            });
                          } catch (error) {
                            setSessionState("error");
                            setErrorMessage(
                              error instanceof Error
                                ? error.message
                                : "Failed to switch practice difficulty."
                            );
                          }
                        })();
                      }
                    }}
                    disabled={!canSwitchDifficulty}
                    className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      Preparing
                    </option>
                    {PRACTICE_DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Model: {session?.providerSession.model ?? "Preparing"}
                </div>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Voice: {session?.providerSession.voiceId ?? "Preparing"}
                </div>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Current difficulty:{" "}
                  {getScenarioDifficultyLabel(session?.scenario.difficulty)}
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="text-sm font-medium">Report preview</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
                Once the session ends, the transcript is persisted to PostgreSQL and a
                structured report is generated from the saved dialogue.
              </p>
              <Button
                className="mt-6 w-full"
                onClick={() => void endSession()}
                disabled={
                  sessionState === "loading" ||
                  sessionState === "ending" ||
                  sessionState === "stopped"
                }
              >
                End session and generate report
              </Button>
            </Card>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
