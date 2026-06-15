const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function testPracticeRouteUsesCurrentExperience() {
  const source = read("app/practice/page.tsx");

  assert.match(
    source,
    /import \{ PracticeExperience \} from "\.\/components\/PracticeExperience"/
  );
}

function testStartShowsLoadingBeforeTicketRequest() {
  const source = read("app/practice/components/PracticeExperience.tsx");
  const startIndex = source.indexOf("async function startRealtimeConversation");
  const loadingIndex = source.indexOf('setSessionState("loading");', startIndex);
  const ticketIndex = source.indexOf('"/realtime/ticket"', startIndex);

  assert.notEqual(startIndex, -1);
  assert.notEqual(loadingIndex, -1);
  assert.notEqual(ticketIndex, -1);
  assert.ok(
    loadingIndex < ticketIndex,
    "Practice start should enter loading before requesting a realtime ticket."
  );
}

function testStartDoesNotReturnWhenSessionStateIsStale() {
  const source = read("app/practice/components/PracticeExperience.tsx");
  const startIndex = source.indexOf("async function startRealtimeConversation");
  const functionBody = source.slice(
    startIndex,
    source.indexOf("async function stopRealtimeConversation")
  );

  assert.match(functionBody, /sessionRef\.current/);
  assert.match(functionBody, /!nextSession[\s\S]*prepareSession/);
  assert.doesNotMatch(
    functionBody,
    /if \(!nextSession\) \{\s*return;\s*\}/,
    "Practice start must prepare a session instead of silently returning."
  );
}

function testInitialSessionRequestIsGuarded() {
  const source = read("app/practice/components/PracticeExperience.tsx");

  assert.match(source, /initialSessionKeyRef/);
  assert.match(source, /initialSessionKeyRef\.current === initialSessionKey/);
  assert.match(source, /initialSessionKeyRef\.current = initialSessionKey/);
}

function testInitialSessionEffectDoesNotDependOnRequestAuth() {
  const source = read("app/practice/components/PracticeExperience.tsx");
  const authenticatedEffectStart = source.indexOf("登录状态就绪后自动创建一次练习会话");
  const authenticatedEffectEnd = source.indexOf(
    "页面卸载时确保会话历史被持久化",
    authenticatedEffectStart
  );
  const authenticatedEffect = source.slice(
    authenticatedEffectStart,
    authenticatedEffectEnd
  );

  assert.doesNotMatch(
    authenticatedEffect,
    /\[[^\]]*requestAuth[^\]]*\]/,
    "Initial realtime session effect must not depend on requestAuth."
  );
}

function testMicrophoneStartsAfterRealtimeReady() {
  const source = read("app/practice/components/PracticeExperience.tsx");
  const readyIndex = source.indexOf('payload.type === "session.ready"');
  const captureIndex = source.indexOf(
    "startMicrophoneCapture(activeSession)",
    readyIndex
  );

  assert.notEqual(readyIndex, -1);
  assert.notEqual(captureIndex, -1);
  assert.ok(
    readyIndex < captureIndex,
    "Microphone capture should start only after the realtime bridge is ready."
  );
}

function testAudioUploadPausesWhileWaitingForAssistant() {
  const source = read("app/practice/components/PracticeExperience.tsx");

  assert.match(source, /waitingForAssistantRef/);
  assert.match(source, /waitingForAssistantRef\.current = true/);
  assert.match(
    source,
    /assistantSpeakingRef\.current \|\|\s*waitingForAssistantRef\.current \|\|/,
    "Microphone audio should not keep uploading after a turn is committed."
  );
  assert.match(source, /waitingForAssistantRef\.current = false/);
}

try {
  testPracticeRouteUsesCurrentExperience();
  console.log("PASS practice route uses current experience");

  testStartShowsLoadingBeforeTicketRequest();
  console.log("PASS practice start shows loading before ticket request");

  testStartDoesNotReturnWhenSessionStateIsStale();
  console.log("PASS practice start prepares missing session");

  testInitialSessionRequestIsGuarded();
  console.log("PASS practice initial session request is guarded");

  testInitialSessionEffectDoesNotDependOnRequestAuth();
  console.log("PASS practice initial session effect has stable dependencies");

  testMicrophoneStartsAfterRealtimeReady();
  console.log("PASS practice microphone waits for realtime ready");

  testAudioUploadPausesWhileWaitingForAssistant();
  console.log("PASS practice pauses audio upload while waiting for assistant");
} catch (error) {
  console.error("FAIL practice realtime start tests");
  console.error(error);
  process.exit(1);
}
