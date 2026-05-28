import { randomUUID } from "node:crypto";

const HEADER_BYTES = 4;
const CARRY_EVENT_ID_FLAG = 0b0100;

export const enum DoubaoRealtimeMessageType {
  FullClientRequest = 0b0001,
  AudioOnlyRequest = 0b0010,
  FullServerResponse = 0b1001,
  AudioOnlyResponse = 0b1011,
  ErrorInformation = 0b1111,
}

export const enum DoubaoRealtimeSerializationMethod {
  Raw = 0b0000,
  Json = 0b0001,
}

export const enum DoubaoRealtimeEventSend {
  StartConnection = 1,
  FinishConnection = 2,
  StartSession = 100,
  CancelSession = 101,
  FinishSession = 102,
  TaskRequest = 200,
  UpdateConfig = 201,
  SayHello = 300,
  EndAsr = 400,
  ChatTtsText = 500,
  ChatTextQuery = 501,
  ChatRagText = 502,
  ConversationCreate = 510,
  ConversationUpdate = 511,
  ConversationRetrieve = 512,
  ConversationTruncate = 513,
  ConversationDelete = 514,
  ClientInterrupt = 515,
}

export const enum DoubaoRealtimeEventReceive {
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,
  SessionStarted = 150,
  SessionCanceled = 151,
  SessionFinished = 152,
  SessionFailed = 153,
  Usage = 154,
  ConfigUpdated = 251,
  TtsSentenceStart = 350,
  TtsSentenceEnd = 351,
  TtsResponse = 352,
  TtsSubtitle = 364,
  TtsEnded = 359,
  AsrInfo = 450,
  AsrResponse = 451,
  AsrEnded = 459,
  ChatResponse = 550,
  ChatTextQueryConfirmed = 553,
  ChatEnded = 559,
  DialogCommonError = 599,
}

export interface DoubaoRealtimeSessionConfig {
  dialog: {
    bot_name: string;
    system_role: string;
    dialog_context?: Array<{
      role: "user" | "assistant";
      text: string;
      timestamp: number;
    }>;
    extra: {
      input_mod: "push_to_talk" | "keep_alive";
      model?: string;
    };
  };
  tts: {
    speaker: string;
    audio_config: {
      channel: 1;
      format: "pcm_s16le";
      sample_rate: number;
    };
  };
  asr: {
    audio_info: {
      format: "pcm" | "speech_opus";
      sample_rate: number;
      channel: 1;
    };
    extra?: {
      end_smooth_window_ms?: number;
      enable_custom_vad?: boolean;
      enable_asr_twopass?: boolean;
    };
  };
}

export type ParsedDoubaoRealtimeFrame =
  | {
      kind: "json";
      event?: number;
      sessionId?: string;
      payload: Record<string, unknown> | null;
      rawText: string;
    }
  | {
      kind: "audio";
      event?: number;
      sessionId?: string;
      audio: Buffer;
    }
  | {
      kind: "error";
      code: number;
      payload: Record<string, unknown> | null;
      rawText: string;
    }
  | {
      kind: "unknown";
      event?: number;
      sessionId?: string;
      payload: Buffer;
    };

export function createRealtimeSessionId() {
  return `rt_${randomUUID()}`;
}

export function buildStartConnectionPayload() {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.StartConnection, {});
}

export function buildFinishConnectionPayload() {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.FinishConnection, {});
}

export function buildStartSessionPayload(
  sessionId: string,
  config: DoubaoRealtimeSessionConfig
) {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.StartSession, config, sessionId);
}

export function buildFinishSessionPayload(sessionId: string) {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.FinishSession, {}, sessionId);
}

export function buildEndAsrPayload(sessionId: string) {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.EndAsr, {}, sessionId);
}

export function buildClientInterruptPayload(sessionId: string) {
  return buildJsonRequestPayload(DoubaoRealtimeEventSend.ClientInterrupt, {}, sessionId);
}

export function buildTaskRequestPayload(sessionId: string, audio: Buffer) {
  const sessionIdBytes = Buffer.from(sessionId, "utf8");
  return Buffer.concat([
    buildHeader(
      DoubaoRealtimeMessageType.AudioOnlyRequest,
      DoubaoRealtimeSerializationMethod.Raw
    ),
    writeUInt32(DoubaoRealtimeEventSend.TaskRequest),
    writeUInt32(sessionIdBytes.byteLength),
    sessionIdBytes,
    writeUInt32(audio.byteLength),
    audio,
  ]);
}

export function parseDoubaoRealtimeFrame(buffer: Buffer): ParsedDoubaoRealtimeFrame {
  if (buffer.byteLength < HEADER_BYTES) {
    return {
      kind: "unknown",
      payload: buffer,
    };
  }

  const headerSizeWords = buffer.readUInt8(0) & 0x0f;
  const headerSizeBytes = headerSizeWords * 4;

  if (buffer.byteLength < headerSizeBytes) {
    return {
      kind: "unknown",
      payload: buffer,
    };
  }

  const messageType = (buffer.readUInt8(1) >> 4) & 0x0f;
  const messageFlags = buffer.readUInt8(1) & 0x0f;
  const serialization = (buffer.readUInt8(2) >> 4) & 0x0f;
  let offset = headerSizeBytes;
  let event: number | undefined;

  if (messageType === DoubaoRealtimeMessageType.ErrorInformation) {
    if (offset + 8 > buffer.byteLength) {
      return {
        kind: "unknown",
        payload: buffer,
      };
    }

    const code = buffer.readUInt32BE(offset);
    offset += 4;
    const payloadLength = buffer.readUInt32BE(offset);
    offset += 4;
    const payloadBuffer = buffer.subarray(offset, offset + payloadLength);
    const rawText = payloadBuffer.toString("utf8").trim();

    return {
      kind: "error",
      code,
      payload:
        serialization === DoubaoRealtimeSerializationMethod.Json
          ? safeParseJson(rawText)
          : null,
      rawText,
    };
  }

  if ((messageFlags & CARRY_EVENT_ID_FLAG) === CARRY_EVENT_ID_FLAG) {
    if (offset + 4 > buffer.byteLength) {
      return {
        kind: "unknown",
        payload: buffer,
      };
    }

    event = buffer.readUInt32BE(offset);
    offset += 4;
  }

  const shouldReadSessionId =
    event !== DoubaoRealtimeEventReceive.ConnectionStarted &&
    event !== DoubaoRealtimeEventReceive.ConnectionFailed &&
    event !== DoubaoRealtimeEventReceive.ConnectionFinished;

  let sessionId: string | undefined;

  if (shouldReadSessionId) {
    const parsedSession = readSessionId(buffer, offset);

    if (parsedSession) {
      sessionId = parsedSession.sessionId;
      offset = parsedSession.nextOffset;
    }
  }

  if (offset + 4 > buffer.byteLength) {
    return {
      kind: "unknown",
      event,
      sessionId,
      payload: buffer.subarray(offset),
    };
  }

  const payloadLength = buffer.readUInt32BE(offset);
  offset += 4;
  const payload = buffer.subarray(
    offset,
    Math.min(buffer.byteLength, offset + payloadLength)
  );

  if (messageType === DoubaoRealtimeMessageType.AudioOnlyResponse) {
    return {
      kind: "audio",
      event,
      sessionId,
      audio: payload,
    };
  }

  if (messageType !== DoubaoRealtimeMessageType.FullServerResponse) {
    return {
      kind: "unknown",
      event,
      sessionId,
      payload,
    };
  }

  const rawText = payload.toString("utf8").trim();

  return {
    kind: "json",
    event,
    sessionId,
    payload:
      serialization === DoubaoRealtimeSerializationMethod.Json
        ? safeParseJson(rawText)
        : null,
    rawText,
  };
}

function buildJsonRequestPayload(
  event: DoubaoRealtimeEventSend,
  payload: object,
  sessionId?: string
) {
  const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
  const parts = [
    buildHeader(
      DoubaoRealtimeMessageType.FullClientRequest,
      DoubaoRealtimeSerializationMethod.Json
    ),
    writeUInt32(event),
  ];

  if (sessionId) {
    const sessionIdBytes = Buffer.from(sessionId, "utf8");
    parts.push(writeUInt32(sessionIdBytes.byteLength), sessionIdBytes);
  }

  parts.push(writeUInt32(payloadBuffer.byteLength), payloadBuffer);
  return Buffer.concat(parts);
}

function buildHeader(
  messageType: DoubaoRealtimeMessageType,
  serialization: DoubaoRealtimeSerializationMethod
) {
  return Buffer.from([
    0b00010001,
    (messageType << 4) | CARRY_EVENT_ID_FLAG,
    serialization << 4,
    0x00,
  ]);
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function safeParseJson(rawText: string) {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readSessionId(buffer: Buffer, offset: number) {
  if (offset + 4 > buffer.byteLength) {
    return null;
  }

  const sessionIdLength = buffer.readUInt32BE(offset);
  const sessionIdEnd = offset + 4 + sessionIdLength;

  if (sessionIdEnd + 4 > buffer.byteLength) {
    return null;
  }

  return {
    sessionId: buffer.subarray(offset + 4, sessionIdEnd).toString("utf8"),
    nextOffset: sessionIdEnd,
  };
}
