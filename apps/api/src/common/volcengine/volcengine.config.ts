import { registerAs } from "@nestjs/config";

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveOpenApiSecretKey() {
  const openApiSecretKey = process.env.VOLCENGINE_OPENAPI_SK ?? "";
  const genericSecretKey = process.env.VOLCENGINE_SECRET_KEY ?? "";

  if (
    openApiSecretKey &&
    genericSecretKey &&
    openApiSecretKey !== genericSecretKey &&
    genericSecretKey.startsWith(openApiSecretKey)
  ) {
    return genericSecretKey;
  }

  return openApiSecretKey || genericSecretKey;
}

function resolveRealtimeAccessKey() {
  const explicitRealtimeAccessKey = process.env.DOUBAO_REALTIME_ACCESS_KEY ?? "";
  const speechAccessToken =
    process.env.VOLCENGINE_SPEECH_ASR_ACCESS_TOKEN ??
    process.env.VOLCENGINE_SPEECH_TTS_ACCESS_TOKEN ??
    "";

  if (explicitRealtimeAccessKey) {
    return explicitRealtimeAccessKey;
  }

  return speechAccessToken;
}

export const volcengineConfig = registerAs("volcengine", () => ({
  realtimeWsUrl:
    process.env.DOUBAO_REALTIME_WS_URL ??
    "wss://openspeech.bytedance.com/api/v3/realtime/dialogue",
  realtimeAppId:
    process.env.DOUBAO_REALTIME_APP_ID ??
    process.env.VOLCENGINE_SPEECH_ASR_APP_ID ??
    process.env.VOLCENGINE_SPEECH_TTS_APP_ID ??
    "",
  realtimeApiKey: process.env.DOUBAO_REALTIME_API_KEY ?? process.env.DOUBAO_API_KEY ?? "",
  realtimeAccessKey: resolveRealtimeAccessKey(),
  realtimeResourceId: process.env.DOUBAO_REALTIME_RESOURCE_ID ?? "volc.speech.dialog",
  realtimeModel: process.env.DOUBAO_REALTIME_MODEL?.trim() ?? "",
  realtimeVoice:
    process.env.DOUBAO_REALTIME_VOICE ??
    process.env.VOLCENGINE_TTS_VOICE_TYPE ??
    "zh_female_xiaohe_uranus_bigtts",
  realtimeInputSampleRate: asNumber(process.env.DOUBAO_REALTIME_INPUT_SAMPLE_RATE, 16000),
  realtimeOutputSampleRate: asNumber(
    process.env.DOUBAO_REALTIME_OUTPUT_SAMPLE_RATE,
    24000
  ),
  realtimeVadSilenceMs: asNumber(process.env.DOUBAO_REALTIME_VAD_SILENCE_MS, 900),
  rtcAppId: process.env.VOLCENGINE_RTC_APP_ID ?? "",
  rtcAppKey: process.env.VOLCENGINE_RTC_APP_KEY ?? "",
  openApiAccessKey:
    process.env.VOLCENGINE_OPENAPI_AK ?? process.env.VOLCENGINE_ACCESS_KEY ?? "",
  openApiSecretKey: resolveOpenApiSecretKey(),
  openApiHost: process.env.VOLCENGINE_OPENAPI_HOST ?? "rtc.volcengineapi.com",
  openApiVersion: process.env.VOLCENGINE_RTC_AI_OPENAPI_VERSION ?? "2024-12-01",
  speechAsrAppId:
    process.env.VOLCENGINE_SPEECH_ASR_APP_ID ??
    process.env.VOLCENGINE_SPEECH_TTS_APP_ID ??
    "",
  speechAsrAccessToken:
    process.env.VOLCENGINE_SPEECH_ASR_ACCESS_TOKEN ?? process.env.DOUBAO_API_KEY ?? "",
  speechAsrCluster:
    process.env.VOLCENGINE_SPEECH_ASR_CLUSTER ??
    process.env.VOLCENGINE_ASR_CLUSTER ??
    "volcengine_streaming_common",
  speechAsrApiResourceId: process.env.VOLCENGINE_SPEECH_ASR_API_RESOURCE_ID ?? "",
  speechAsrStreamMode: asNumber(process.env.VOLCENGINE_SPEECH_ASR_STREAM_MODE, 0),
  speechTtsAppId:
    process.env.VOLCENGINE_SPEECH_TTS_APP_ID ??
    process.env.VOLCENGINE_SPEECH_ASR_APP_ID ??
    "",
  speechTtsAccessToken:
    process.env.VOLCENGINE_SPEECH_TTS_ACCESS_TOKEN ?? process.env.DOUBAO_API_KEY ?? "",
  speechTtsCluster:
    process.env.VOLCENGINE_SPEECH_TTS_CLUSTER ??
    process.env.VOLCENGINE_TTS_CLUSTER ??
    "volcano_tts",
  speechTtsResourceId: process.env.VOLCENGINE_SPEECH_TTS_RESOURCE_ID ?? "",
  ttsVoiceType: process.env.VOLCENGINE_TTS_VOICE_TYPE ?? "zh_female_xiaohe_uranus_bigtts",
  arkEndpointId: process.env.VOLCENGINE_ARK_ENDPOINT_ID ?? "",
  roomPrefix: process.env.RTC_DEFAULT_ROOM_PREFIX ?? "practice",
  tokenExpireSeconds: asNumber(process.env.RTC_DEFAULT_TOKEN_EXPIRE_SECONDS, 3600),
  userIdPrefix: process.env.RTC_AI_DEFAULT_USER_ID_PREFIX ?? "visitor",
  botName: process.env.RTC_AI_BOT_NAME ?? "ChineseTeacher",
  systemPrompt:
    process.env.RTC_AI_SYSTEM_PROMPT ??
    "You are a patient Chinese speaking tutor. Keep the user talking in Mandarin.",
}));
