import type { PracticeScenario } from "@learn-chinese-ai/shared-types";

export const practiceScenarios: PracticeScenario[] = [
  {
    id: "daily-cafe",
    type: "daily",
    title: "Cafe Ordering",
    subtitle: "Practice ordering at a cafe, confirming sweetness, and speaking politely.",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    goal: "Practice speaking naturally, ordering clearly, and closing politely.",
    mode: "scenario",
    roles: [
      {
        id: "daily-cafe-customer",
        code: "customer",
        name: "Customer",
        description: "You play the customer and order coffee with a few simple requests.",
        isAiRole: false,
      },
      {
        id: "daily-cafe-barista",
        code: "barista",
        name: "Barista",
        description:
          "The AI plays the barista and handles the greeting, order confirmation, and follow-up questions.",
        isAiRole: true,
      },
    ],
    defaultRoleId: "daily-cafe-customer",
    openingLine: "欢迎光临，请问你今天想喝点什么？",
    openingLinesByRoleId: {
      "daily-cafe-customer": "欢迎光临，请问你今天想喝点什么？",
      "daily-cafe-barista": "你好，我想点一杯拿铁，可以做成燕麦奶吗？",
    },
    promptHint: "Prefer short Chinese sentences so beginners can start speaking quickly.",
  },
  {
    id: "interview-intro",
    type: "interview",
    title: "Interview Introduction",
    subtitle:
      "Practice introducing yourself in Chinese, explaining motivation, and outlining future plans.",
    difficulty: "intermediate",
    cover:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    goal: "Practice structured speaking, smooth transitions, and an interview-ready tone.",
    mode: "scenario",
    roles: [
      {
        id: "interview-intro-candidate",
        code: "candidate",
        name: "Candidate",
        description:
          "You play the candidate, introduce yourself in Chinese, and answer questions.",
        isAiRole: false,
      },
      {
        id: "interview-intro-interviewer",
        code: "interviewer",
        name: "Interviewer",
        description:
          "The AI plays the interviewer, asks follow-up questions, and guides the response.",
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
    promptHint:
      "Use complete sentences and natural transitions instead of replying with keywords only.",
  },
  {
    id: "travel-hotel",
    type: "travel",
    title: "Hotel Check-in",
    subtitle:
      "Practice the check-in flow, including dates, room type, and service requests.",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
    goal: "Practice travel Chinese, date expressions, and polite questions.",
    mode: "scenario",
    roles: [
      {
        id: "travel-hotel-guest",
        code: "guest",
        name: "Guest",
        description:
          "You play the guest, complete the check-in, and confirm room details.",
        isAiRole: false,
      },
      {
        id: "travel-hotel-frontdesk",
        code: "frontdesk",
        name: "Front Desk",
        description:
          "The AI plays the hotel front desk and confirms your booking, dates, and requests.",
        isAiRole: true,
      },
    ],
    defaultRoleId: "travel-hotel-guest",
    openingLine: "您好，欢迎来到酒店。请问您有预订吗？",
    openingLinesByRoleId: {
      "travel-hotel-guest": "您好，欢迎来到酒店。请问您有预订吗？",
      "travel-hotel-frontdesk": "你好，我预订了今晚入住的房间，想先办理一下入住。",
    },
    promptHint:
      "Stay focused on check-in, dates, room types, breakfast, and other hotel details.",
  },
  {
    id: "business-meeting",
    type: "business",
    title: "Business Meeting Opening",
    subtitle:
      "Practice opening a meeting, introducing the agenda, and confirming details politely.",
    difficulty: "advanced",
    cover:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    goal: "Practice a business tone, structured speaking, and polite confirmation.",
    mode: "scenario",
    roles: [
      {
        id: "business-meeting-host",
        code: "host",
        name: "Host",
        description:
          "You play the meeting host, introduce the agenda, and move the discussion forward.",
        isAiRole: false,
      },
      {
        id: "business-meeting-participant",
        code: "participant",
        name: "Participant",
        description:
          "The AI plays a participant who responds, asks questions, and keeps the exchange moving.",
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
    promptHint: "Prefer formal Chinese and complete sentence structures.",
  },
  {
    id: "free-chat",
    type: "daily",
    title: "Free Chat",
    subtitle: "Practice spoken Chinese with the AI in an open-ended conversation.",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    goal: "Practice open-ended Chinese expression and build speaking flow.",
    mode: "free",
    roles: [
      {
        id: "free-chat-learner",
        code: "learner",
        name: "Learner",
        description: "You play a Chinese learner and chat freely with the AI.",
        isAiRole: false,
      },
      {
        id: "free-chat-tutor",
        code: "tutor",
        name: "Chinese Tutor",
        description:
          "The AI plays a Chinese speaking partner and encourages you to keep talking.",
        isAiRole: true,
      },
    ],
    defaultRoleId: "free-chat-learner",
    openingLine: "你好，我们可以自由聊天。你今天想聊什么？",
    openingLinesByRoleId: {
      "free-chat-learner": "你好，我们可以自由聊天。你今天想聊什么？",
      "free-chat-tutor": "你好，我今天想练习一下中文口语，想和你随便聊聊。",
    },
    promptHint: "Keep the exchange natural and avoid long explanations.",
  },
];
