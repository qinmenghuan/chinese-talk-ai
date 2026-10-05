// 显式使用 Jest API，避免依赖全局注入，便于 CJS 测试文件独立运行。
const { describe, expect, it } = require("@jest/globals");
// fs/path 只用于读取源文件，验证本地 mock 回退实现仍被保留。
const fs = require("node:fs");
const path = require("node:path");

// Test compiled CommonJS output so the suite validates the same artifacts that
// are produced by the API build, rather than a separate TypeScript transform.
const {
  DoubaoPromptBuilder,
} = require("../dist/common/volcengine/doubao-prompt.builder.js");
const {
  resolveScenarioOpeningLine,
} = require("../dist/common/scenario/resolve-scenario-opening-line.js");
const { RtcTokenService } = require("../dist/common/volcengine/rtc-token.service.js");
const {
  buildConversationSummary,
  buildHistoryListResponse,
} = require("../dist/modules/history/history-summary.js");
const { ScenarioService } = require("../dist/modules/scenario/scenario.service.js");
const {
  DoubaoRealtimeService,
} = require("../dist/common/volcengine/doubao-realtime.service.js");
const { RealtimeWsBridge } = require("../dist/modules/realtime/realtime-ws.bridge.js");

/** Supplies safe defaults while allowing a test to express the one field it needs. */
function createRealtimeConfig(overrides = {}) {
  // 默认值是完整但不含认证信息的配置，适合验证“未配置”状态。
  return {
    realtimeWsUrl: "wss://openspeech.bytedance.com/api/v3/realtime/dialogue",
    realtimeApiKey: "",
    realtimeAccessKey: "",
    realtimeAppId: "",
    realtimeResourceId: "volc.speech.dialog",
    realtimeModel: "",
    realtimeVoice: "",
    realtimeInputSampleRate: 16000,
    realtimeOutputSampleRate: 24000,
    realtimeVadSilenceMs: 900,
    // 调用者最后覆盖必要字段，避免每个用例重复书写整份配置。
    ...overrides,
  };
}

describe("realtime voice support", () => {
  it("finds a scenario and its selected learner role", () => {
    // 场景服务目前使用种子/内存数据，无需数据库。
    const service = new ScenarioService();
    const scenario = service.getScenarioById("daily-cafe", "scenario");
    const role = service.getScenarioRole(scenario, "daily-cafe-customer");

    // 确认按 id 找到正确场景，以及从该场景中选中正确角色。
    expect(role.id).toBe("daily-cafe-customer");
  });

  it("creates an RTC join token with the configured lifetime", () => {
    // 使用测试 appId/appKey，绝不使用本地环境中的真实 RTC 凭据。
    const service = new RtcTokenService({
      rtcAppId: "123456789012345678901234",
      rtcAppKey: "secret-key",
      tokenExpireSeconds: 3600,
    });
    const token = service.createJoinToken({
      roomId: "practice_room",
      userId: "visitor_123",
    });

    // token 内容不应固定；只检查类型、最小长度和配置中的有效期。
    expect(token.length).toBeGreaterThan(20);
    expect(service.getExpiresInSeconds()).toBe(3600);
  });

  it("includes scenario, role, difficulty, and opening-line context in the prompt", () => {
    const service = new ScenarioService();
    const scenario = service.getScenarioById("interview-intro", "scenario");
    const role = service.getScenarioRole(scenario, "interview-intro-candidate");
    const prompt = new DoubaoPromptBuilder().build({ scenario, selectedRole: role });

    // 这些字段是模型维持指定练习场景与角色设定所必需的上下文。
    expect(prompt).toMatch(/Difficulty:/);
    expect(prompt).toMatch(/Learner role:/);
    expect(prompt).toContain(scenario.title);
    expect(prompt).toContain(resolveScenarioOpeningLine(scenario, role.id));
  });

  it("uses a different opening line for each role in one scenario", () => {
    const service = new ScenarioService();
    const scenario = service.getScenarioById("daily-cafe", "scenario");
    const customer = resolveScenarioOpeningLine(scenario, "daily-cafe-customer");
    const barista = resolveScenarioOpeningLine(scenario, "daily-cafe-barista");

    // 同一咖啡厅场景中，顾客和店员的第一句应符合各自身份。
    expect(barista).toBe("你好，我想点一杯拿铁，可以做成燕麦奶吗？");
    expect(customer).not.toBe(barista);
  });

  it("adapts prompt guidance to beginner and advanced difficulty", () => {
    const service = new ScenarioService();
    const builder = new DoubaoPromptBuilder();
    const beginner = service.getScenarioById("travel-hotel", "scenario");
    const advanced = service.getScenarioById("business-meeting", "scenario");
    // 分别选择初级酒店场景与高级商务会议场景。
    const beginnerPrompt = builder.build({
      scenario: beginner,
      selectedRole: service.getScenarioRole(beginner, "travel-hotel-guest"),
    });
    const advancedPrompt = builder.build({
      scenario: advanced,
      selectedRole: service.getScenarioRole(advanced, "business-meeting-host"),
    });

    // Beginner prompts should provide constrained language and supportive examples.
    expect(beginnerPrompt).toMatch(/Difficulty: beginner/);
    expect(beginnerPrompt).toMatch(/very common Mandarin words and short sentences/);
    expect(beginnerPrompt).toMatch(/Ask only one concrete question at a time/);
    expect(beginnerPrompt).toMatch(/Do not use native-speaker style pressure phrases/);
    expect(beginnerPrompt).toMatch(/我帮您再看一下/);
    expect(beginnerPrompt).toMatch(/请问是哪一天/);
    // Advanced prompts retain scenario-specific professional vocabulary.
    expect(advancedPrompt).toMatch(/Difficulty: advanced/);
    expect(advancedPrompt).toMatch(/professional or scenario-specific wording/);
    expect(advancedPrompt).toMatch(/do not oversimplify the language/);
  });

  it("presents scored, pending, and unscored history records consistently", () => {
    // 固定时间使 ISO 字符串断言不受当前时间影响。
    const service = new ScenarioService();
    const scenario = service.getScenarioById("daily-cafe", "scenario");
    const role = service.getScenarioRole(scenario, "daily-cafe-barista");
    const startedAt = new Date("2026-05-30T08:30:45.000Z");
    const endedAt = new Date("2026-05-30T08:42:10.000Z");
    // 已出报告的会话应计算六项维度的平均分。
    const scored = buildConversationSummary({
      id: "conv_scored",
      scenario,
      startedAt,
      endedAt,
      status: "report_ready",
      selectedRole: role,
      selectedDifficulty: "advanced",
      report: {
        grammarScore: 80,
        vocabularyScore: 82,
        fluencyScore: 84,
        pronunciationScore: 86,
        toneScore: 88,
        naturalnessScore: 90,
      },
    });
    // 已结束但没有报告的会话不能虚构分数。
    const noReport = buildConversationSummary({
      id: "conv_no_report",
      scenario,
      startedAt,
      status: "ended",
      selectedRole: role,
    });
    // 报告生成中的会话也不能提前展示分数。
    const pending = buildConversationSummary({
      id: "conv_pending",
      scenario,
      startedAt,
      status: "report_pending",
      selectedRole: role,
    });

    // 验证展示 DTO 的角色、难度、状态、均分和 ISO 时间字段。
    expect(scored).toMatchObject({
      roleName: role.name,
      difficulty: "advanced",
      reportState: "score",
      score: 85,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    });
    expect(noReport).toMatchObject({
      reportState: "no_report",
      score: 0,
      difficulty: scenario.difficulty,
    });
    expect(pending).toMatchObject({ reportState: "pending", score: 0 });
    // 第 1 页总数为 5、每页 2 条时，客户端仍可继续翻页。
    expect(
      buildHistoryListResponse({
        items: [scored, noReport],
        page: 1,
        pageSize: 2,
        total: 5,
      })
    ).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 5,
      hasMore: true,
    });
    // 第 3 页已覆盖最后一条记录，hasMore 必须为 false。
    expect(
      buildHistoryListResponse({ items: [pending], page: 3, pageSize: 2, total: 5 })
        .hasMore
    ).toBe(false);
  });

  it("reports an unconfigured realtime service when credentials are absent", () => {
    // 默认配置故意不提供 API key/access key/app id。
    const service = new DoubaoRealtimeService(
      createRealtimeConfig(),
      new DoubaoPromptBuilder()
    );
    expect(service.isRealtimeConfigured()).toBe(false);
  });

  it("resolves voice aliases while preserving explicit provider voice identifiers", () => {
    // 有 key 的配置让服务进入可解析语音别名的正常路径。
    const service = new DoubaoRealtimeService(
      createRealtimeConfig({
        realtimeApiKey: "test-key",
        realtimeVoice: "friendly-female",
      }),
      new DoubaoPromptBuilder()
    );

    // 易读别名映射为火山引擎实际使用的 voice id。
    expect(service.resolveRealtimeVoice("friendly-female")).toBe(
      "zh_female_vv_jupiter_bigtts"
    );
    expect(service.resolveRealtimeVoice("warm-male")).toBe(
      "zh_male_beijingxiaoye_moon_bigtts"
    );
    // 已是供应商 voice id 时不得二次映射或破坏原值。
    expect(service.resolveRealtimeVoice("zh_female_xiaohe_uranus_bigtts")).toBe(
      "zh_female_xiaohe_uranus_bigtts"
    );
  });

  it("keeps a source-level local mock fallback for development without credentials", () => {
    // 此处刻意读取源码：这是防止开发回退分支被误删的结构性回归测试。
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/modules/realtime/realtime-ws.bridge.ts"),
      "utf8"
    );

    // 回退分支必须检查真实服务是否配置、调用 mock handler 并发出 ready 事件。
    expect(source).toMatch(/isRealtimeConfigured\(\)/);
    expect(source).toMatch(/handleMockRealtimeConnection/);
    expect(source).toMatch(/type: "session\.ready"/);
    expect(source).toMatch(/我正在练习中文。/);
  });

  it("normalizes common ASR payload variants to final or interim transcript results", () => {
    // bridge 依赖在该纯解析方法中不会被使用，因此传入空替身。
    const bridge = new RealtimeWsBridge({}, {});

    // 供应商可能将文字置于顶层 text，服务需要去掉多余空白。
    expect(bridge.readAsrResults({ text: " 你好 " })).toEqual([
      { text: "你好", isInterim: false },
    ]);
    // 另一种供应商负载将转写嵌套在 result.transcript。
    expect(bridge.readAsrResults({ result: { transcript: "我要一杯咖啡" } })).toEqual([
      { text: "我要一杯咖啡", isInterim: false },
    ]);
    // utterances 数组需保留供应商明确标记的 interim 状态。
    expect(
      bridge.readAsrResults({
        utterances: [{ content: "请问有拿铁吗", is_interim: true }],
      })
    ).toEqual([{ text: "请问有拿铁吗", isInterim: true }]);
    // A final event overrides an interim flag from providers that send both.
    expect(bridge.readAsrResults({ text: "最终字幕", is_interim: true }, true)).toEqual([
      { text: "最终字幕", isInterim: false },
    ]);
  });
});
