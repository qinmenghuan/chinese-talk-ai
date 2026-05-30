import type { PracticeScenario } from "@learn-chinese-ai/shared-types";

export const scenarios: PracticeScenario[] = [
  {
    id: "daily-cafe",
    type: "daily",
    title: "咖啡店点单",
    subtitle: "练习在咖啡店点单、确认甜度和进行礼貌交流。",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    goal: "练习自然开口、点单表达和礼貌收尾。",
    mode: "scenario",
    roles: [
      {
        id: "daily-cafe-customer",
        code: "customer",
        name: "顾客",
        description: "你扮演顾客，向店员点咖啡并提出简单需求。",
        isAiRole: false,
      },
      {
        id: "daily-cafe-barista",
        code: "barista",
        name: "店员",
        description: "AI 扮演店员，负责接待、确认订单和追问细节。",
        isAiRole: true,
      },
    ],
    defaultRoleId: "daily-cafe-customer",
    openingLine: "欢迎光临，请问你今天想喝点什么？",
    openingLinesByRoleId: {
      "daily-cafe-customer": "欢迎光临，请问你今天想喝点什么？",
      "daily-cafe-barista": "你好，我想点一杯拿铁，可以做成燕麦奶吗？",
    },
    promptHint: "优先使用中文短句，适合初学者先开口。",
  },
  {
    id: "interview-intro",
    type: "interview",
    title: "面试自我介绍",
    subtitle: "练习中文自我介绍、学习动机和未来计划表达。",
    difficulty: "intermediate",
    cover:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    goal: "练习结构化表达、过渡句和面试语气。",
    mode: "scenario",
    roles: [
      {
        id: "interview-intro-candidate",
        code: "candidate",
        name: "候选人",
        description: "你扮演候选人，用中文介绍自己并回答问题。",
        isAiRole: false,
      },
      {
        id: "interview-intro-interviewer",
        code: "interviewer",
        name: "面试官",
        description: "AI 扮演中文面试官，提出追问并引导回答。",
        isAiRole: true,
      },
    ],
    defaultRoleId: "interview-intro-candidate",
    openingLine: "你好，请先用中文做一个简短的自我介绍。",
    openingLinesByRoleId: {
      "interview-intro-candidate": "你好，请先用中文做一个简短的自我介绍。",
      "interview-intro-interviewer":
        "您好，我叫 Anna，来自加拿大。今天很高兴来参加这次面试。",
    },
    promptHint: "鼓励使用完整句子和自然过渡，不要只给关键词。",
  },
  {
    id: "travel-hotel",
    type: "travel",
    title: "酒店入住",
    subtitle: "练习入住登记、确认日期、房型和服务需求。",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
    goal: "练习旅行中文、日期表达和礼貌提问。",
    mode: "scenario",
    roles: [
      {
        id: "travel-hotel-guest",
        code: "guest",
        name: "住客",
        description: "你扮演住客，办理入住并确认房间信息。",
        isAiRole: false,
      },
      {
        id: "travel-hotel-frontdesk",
        code: "frontdesk",
        name: "前台",
        description: "AI 扮演酒店前台，确认预订、日期和需求。",
        isAiRole: true,
      },
    ],
    defaultRoleId: "travel-hotel-guest",
    openingLine: "您好，欢迎来到酒店。请问您有预订吗？",
    openingLinesByRoleId: {
      "travel-hotel-guest": "您好，欢迎来到酒店。请问您有预订吗？",
      "travel-hotel-frontdesk": "你好，我预订了今晚入住的房间，想先办理一下入住。",
    },
    promptHint: "优先围绕入住、日期、房型、早餐等话题展开。",
  },
  {
    id: "business-meeting",
    type: "business",
    title: "商务会议开场",
    subtitle: "练习会议开场、议题说明和礼貌确认。",
    difficulty: "advanced",
    cover:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    goal: "练习商务语气、结构化表达和礼貌确认。",
    mode: "scenario",
    roles: [
      {
        id: "business-meeting-host",
        code: "host",
        name: "主持人",
        description: "你扮演会议主持人，介绍议题并推动讨论。",
        isAiRole: false,
      },
      {
        id: "business-meeting-participant",
        code: "participant",
        name: "参会者",
        description: "AI 扮演参会者，回应、提问并推动对话。",
        isAiRole: true,
      },
    ],
    defaultRoleId: "business-meeting-host",
    openingLine: "早上好，我们先做一个简短开场。请你介绍一下今天想讨论的主题。",
    openingLinesByRoleId: {
      "business-meeting-host":
        "早上好，我们先做一个简短开场。请你介绍一下今天想讨论的主题。",
      "business-meeting-participant":
        "早上好，我想先同步一下本周项目进展，再讨论接下来的排期安排。",
    },
    promptHint: "优先使用正式中文和完整句式。",
  },
];
