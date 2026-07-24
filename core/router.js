const INTENT_RULES = [
  {
    intent: "project_creation",
    atlasId: "project-atlas",
    keywords: [
      "项目",
      "比赛",
      "竞赛",
      "创业",
      "产品",
      "idea",
      "project",
      "startup",
      "hackathon"
    ]
  }
];

export function detectIntent(message = "") {
  const normalized = String(message).trim().toLowerCase();

  if (!normalized) {
    return {
      name: "empty_input",
      confidence: 1,
      reason: "The user input is empty."
    };
  }

  for (const rule of INTENT_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      normalized.includes(keyword.toLowerCase())
    );

    if (matchedKeyword) {
      return {
        name: rule.intent,
        confidence: 0.8,
        reason: `Matched project-related signal: ${matchedKeyword}`
      };
    }
  }

  return {
    name: "unknown",
    confidence: 0.3,
    reason: "No Atlas routing rule matched the current input."
  };
}

export function selectAtlas(intentName) {
  const rule = INTENT_RULES.find((item) => item.intent === intentName);
  return rule?.atlasId ?? null;
}

export function listAvailableAtlases() {
  return [
    {
      id: "project-atlas",
      name: "Project Atlas",
      status: "active",
      capabilities: [
        "idea_understanding",
        "problem_definition",
        "project_planning",
        "risk_review",
        "execution_guidance"
      ]
    },
    {
      id: "evidence-atlas",
      name: "Evidence Atlas",
      status: "planned",
      capabilities: [
        "claim_evidence_mapping",
        "source_traceability",
        "evidence_gap_detection"
      ]
    }
  ];
}
