import { CONTACT_CHANNEL_LABELS } from "./contact-channels";
import { isOpenAiConfigured, openAiChatCompletionJson } from "./openai-config";
import type { AiSummary, ContactChannel, PrimaryConcern, VisitorProfile } from "./types";
import { pointerComfortLabel, technicalComfortLabel } from "./quiz-engagement";
import { CONCERN_LABELS, SAVINGS_LABELS } from "./quiz";

const EMPATHY_SYSTEM_PROMPT = `You are a FinPub retirement guide assistant. Your voice is warm, personal, and empathetic — like a patient counselor, not a salesperson.

Rules for all visitor-facing copy:
- Use their first name when available
- Validate their worry before offering help ("It's completely normal to feel…")
- Never shame a low score — frame it as room to improve, not failure
- Plain language for adults in their 50s–60s; no jargon
- Soft invitation to engage (reply, read, call) — never pressure or urgency tricks
- Goal: keep them talking and move toward a helpful next step (guide, call, or reply)`;

function buildEmpatheticResponse(profile: VisitorProfile): string {
  const quiz = profile.quiz;
  const firstName = quiz?.firstName ?? "there";
  const score = quiz?.score;
  const retireYears = quiz?.retireYears;
  const concern = quiz?.primaryConcern;

  let validation =
    "Wondering if you're on track for retirement is something almost everyone your age thinks about — and you're smart to look into it now.";

  switch (concern) {
    case "social_security":
      validation = `Wondering whether Social Security will be enough is one of the most common concerns we hear — and it makes sense, ${firstName}.`;
      break;
    case "401k_rollover":
      validation = `Trying to figure out what to do with an old 401(k) can feel overwhelming, ${firstName} — you're not alone in that.`;
      break;
    case "healthcare_costs":
      validation = `Healthcare costs keep many people up at night before retirement, ${firstName} — that's a very real worry.`;
      break;
    case "timeline_uncertainty":
      validation = `Not being sure you can retire on time is stressful, ${firstName} — and it's worth taking seriously while you still have options.`;
      break;
    default:
      break;
  }

  let scoreNote = "";
  if (score !== null && score !== undefined) {
    scoreNote =
      score < 65
        ? ` Your score of ${score}/100 doesn't mean you're out of options — it usually means a few focused changes could make a real difference.`
        : ` Your score of ${score}/100 shows you're in a solid place — and there may still be simple ways to keep more of what you've saved.`;
  }

  const timelineNote =
    retireYears !== null && retireYears !== undefined
      ? ` With about ${retireYears} years until you want to retire, you still have time to act — one step at a time.`
      : "";

  return `${validation}${scoreNote}${timelineNote} We're here to help you understand your choices — no pressure, just clarity.`;
}

function buildSuggestedOpener(profile: VisitorProfile): string {
  const quiz = profile.quiz;
  const firstName = quiz?.firstName ?? "there";
  const score = quiz?.score;
  const retireYears = quiz?.retireYears;
  const concern = quiz?.primaryConcern
    ? CONCERN_LABELS[quiz.primaryConcern].toLowerCase()
    : "retirement readiness";

  if (score !== null && score !== undefined && retireYears !== undefined) {
    return `Hi ${firstName} — thanks for trusting us with your retirement score. Retiring in about ${retireYears} years is a big milestone, and a score of ${score}/100 often means there's room to feel more confident — not that you're behind. Was ${concern} the part on your mind most? I'm happy to help.`;
  }

  return `Hi ${firstName} — thanks for taking the time today. I know ${concern} can weigh on you. Would it help if I sent a short, plain-language summary — or would you rather chat through it here?`;
}

function buildVisitorNextSteps(profile: VisitorProfile): string[] {
  const quiz = profile.quiz;
  const steps: string[] = [];
  const concern = quiz?.primaryConcern;
  const score = quiz?.score;
  const channel = quiz?.contactChannel;

  switch (concern) {
    case "social_security":
      steps.push("Look up your estimated monthly benefit at ages 62, 67, and 70.");
      steps.push("Write down your expected monthly expenses in retirement.");
      break;
    case "401k_rollover":
      steps.push("Gather statements from any old employer 401(k) accounts.");
      steps.push("Compare the annual fees on each account — small differences add up.");
      break;
    case "healthcare_costs":
      steps.push("Estimate what you might pay for health coverage before Medicare at 65.");
      steps.push("Check whether an HSA or supplemental plan fits your situation.");
      break;
    case "timeline_uncertainty":
      steps.push("Pick a realistic target retirement age and work backward from there.");
      steps.push("List one expense you could trim to boost savings this year.");
      break;
    default:
      steps.push("Review your savings rate and adjust if you can afford an extra contribution.");
      break;
  }

  if (score !== null && score !== undefined && score < 65) {
    steps.push("Focus on one improvement this month — even a small change can shift your timeline.");
  } else if (score !== null && score !== undefined) {
    steps.push("Fine-tune Social Security timing or investment fees to keep more of what you have.");
  }

  switch (channel) {
    case "email":
      steps.push("Watch for your personalized summary by email and save it for reference.");
      break;
    case "sms":
    case "whatsapp":
    case "line":
      steps.push("Reply anytime if something isn't clear — we're here to help, not to rush you.");
      break;
    case "phone_call":
      steps.push("Keep your phone handy for the callback window you chose.");
      break;
    case "browser_push":
      steps.push("Allow notifications if you want a reminder when your full summary is ready.");
      break;
    case "on_page":
      steps.push("Save or screenshot your score while it is on this page.");
      break;
    default:
      break;
  }

  return steps.slice(0, 4);
}

function buildMarketerNextSteps(profile: VisitorProfile): string[] {
  const quiz = profile.quiz;
  const steps: string[] = [];
  const channel = quiz?.contactChannel;
  const channelLabel =
    channel && channel in CONTACT_CHANNEL_LABELS
      ? CONTACT_CHANNEL_LABELS[channel as ContactChannel]
      : null;

  if (profile.converted) {
    steps.push("Priority lead — warm handoff within one business day; they raised their hand.");
    if (profile.conversionType === "call_scheduled") {
      steps.push("Confirm callback time and send a calendar reminder.");
    }
    if (profile.conversionType === "content_request") {
      steps.push("Deliver the personalized breakdown they requested while intent is hot.");
    }
  } else if (quiz?.completedAt) {
    steps.push("First touch within 24h — lead with empathy and their concern, not the product pitch.");
  } else {
    steps.push("Visitor has not finished the quiz — retarget with the readiness score hook.");
  }

  if (channelLabel) {
    steps.push(`Route through ${channelLabel} — honor their channel-of-choice opt-in.`);
  }

  if (profile.contentEngagement.socialSecurityViews >= 2) {
    steps.push("Lead with Social Security claiming content — they read it twice before converting.");
  }
  if (profile.contentEngagement.rolloverViews >= 2) {
    steps.push("Mention 401(k) fee comparison — strong rollover research signal.");
  }

  if (quiz?.score !== null && quiz?.score !== undefined && quiz.score < 65) {
    steps.push("Validate before advising — low score visitors convert when they feel understood, not judged.");
  }

  if (profile.leadScore >= 75) {
    steps.push("High lead score — consider same-day human review if volume allows.");
  }

  if (profile.quizEngagement?.overallTechnicalComfort === "low") {
    steps.push("Prefer phone or guided UI follow-up — typing pace suggests lower digital comfort.");
  }
  if (profile.quizEngagement?.overallTechnicalComfort === "high") {
    steps.push("Comfortable with digital channels — email or in-app chat likely fine.");
  }
  if (profile.quizEngagement?.overallPointerComfort === "low") {
    steps.push("Use larger tap targets and offer phone callback — pointer metrics suggest mouse/trackpad difficulty.");
  }

  return steps.slice(0, 5);
}

function buildTemplateSummary(profile: VisitorProfile): AiSummary {
  const quiz = profile.quiz;
  const firstName = quiz?.firstName ?? "This visitor";
  const age = quiz?.age ?? null;
  const retireYears = quiz?.retireYears ?? null;
  const score = quiz?.score ?? null;
  const concern = quiz?.primaryConcern
    ? CONCERN_LABELS[quiz.primaryConcern]
    : "retirement readiness";
  const savings = quiz?.currentSavings ? SAVINGS_LABELS[quiz.currentSavings] : null;
  const ssViews = profile.contentEngagement.socialSecurityViews;
  const rolloverViews = profile.contentEngagement.rolloverViews;
  const contactChannel = quiz?.contactChannel;
  const channelLabel =
    contactChannel !== undefined
      ? CONTACT_CHANNEL_LABELS[contactChannel as ContactChannel]
      : quiz?.smsConsent
        ? CONTACT_CHANNEL_LABELS.sms
        : null;

  const signals: string[] = [];
  if (profile.trafficSource === "meta") signals.push("Meta retargeting traffic");
  if (score !== null && score < 65) signals.push(`Readiness score ${score}/100 — gap likely fixable`);
  if (ssViews >= 2) signals.push("Re-read Social Security content");
  if (rolloverViews >= 2) signals.push("Deep interest in 401(k) rollover");
  if (profile.segments.includes("pre_retiree_near_term")) {
    signals.push("Near-term retirement window (≤7 years)");
  }
  if (profile.quizEngagement) {
    const qe = profile.quizEngagement;
    signals.push(
      `${technicalComfortLabel(qe.overallTechnicalComfort)} (${qe.totalDurationSeconds}s on quiz, engagement ${qe.avgEngagementScore}/100)`,
    );
    const slowest = [...qe.stepSummaries].sort((a, b) => b.durationSeconds - a.durationSeconds)[0];
    if (slowest) {
      signals.push(`Longest on step ${slowest.step} (${slowest.durationSeconds}s, ${slowest.activeSeconds}s active)`);
    }
    if (qe.overallPointerComfort && qe.overallPointerComfort !== "unknown") {
      signals.push(pointerComfortLabel(qe.overallPointerComfort));
    }
    const missClicks = qe.stepSummaries.reduce((sum, s) => sum + s.impreciseClicks, 0);
    const corrections = qe.stepSummaries.reduce((sum, s) => sum + s.correctiveMovements, 0);
    if (missClicks > 0) signals.push(`${missClicks} miss-clicks on non-target areas`);
    if (corrections > 8) signals.push(`${corrections} mouse path corrections (trackpad/mouse hesitation)`);
  }

  const retireAge = age !== null && retireYears !== null ? age + retireYears : null;

  const narrativeParts = [
    `${firstName}${age ? `, age ${age}` : ""}, arrived from ${profile.trafficSource} traffic.`,
  ];

  if (score !== null && retireAge !== null) {
    narrativeParts.push(
      `Completed the retirement quiz with a score of ${score}/100 for a target retirement around age ${retireAge}.`,
    );
  }

  if (ssViews >= 2 || quiz?.primaryConcern === "social_security") {
    narrativeParts.push(
      "Spent meaningful time on Social Security content — income security appears to be the emotional driver.",
    );
  }

  if (rolloverViews >= 2 || quiz?.primaryConcern === "401k_rollover") {
    narrativeParts.push(
      "Showed repeated interest in 401(k) rollover material — likely comparing fees or consolidation options.",
    );
  }

  if (savings) narrativeParts.push(`Self-reported savings band: ${savings}.`);
  if (channelLabel) {
    narrativeParts.push(
      `Opted in for follow-up via ${channelLabel.toLowerCase()} (channel-of-choice).`,
    );
  }
  narrativeParts.push(
    "Responds best to validation-first messaging — wants clarity before committing.",
  );

  const empatheticResponse = buildEmpatheticResponse(profile);
  const visitorNextSteps = buildVisitorNextSteps(profile);
  const marketerNextSteps = buildMarketerNextSteps(profile);

  return {
    headline: `${firstName}: high-intent pre-retiree focused on ${concern.toLowerCase()}`,
    narrative: narrativeParts.join(" "),
    primaryMotivation: concern,
    recommendedApproach:
      score !== null && score < 65
        ? "Mirror their worry first, then offer one concrete next step. Ask a question to keep the thread open — don't pitch a call until they've felt heard."
        : "Affirm what they've done right, then offer one optimization (Social Security timing or fees). Invite a reply rather than pushing a meeting.",
    suggestedOpener: buildSuggestedOpener(profile),
    empatheticResponse,
    visitorNextSteps,
    marketerNextSteps,
    confidence: quiz?.completedAt ? "high" : "medium",
    signals,
  };
}

function normalizeSummary(raw: Partial<AiSummary>, fallback: AiSummary): AiSummary {
  const pickSteps = (value: unknown, fb: string[]): string[] => {
    if (!Array.isArray(value)) return fb;
    const cleaned = value.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    return cleaned.length > 0 ? cleaned.slice(0, 5) : fb;
  };

  return {
    headline: typeof raw.headline === "string" ? raw.headline : fallback.headline,
    narrative: typeof raw.narrative === "string" ? raw.narrative : fallback.narrative,
    primaryMotivation:
      typeof raw.primaryMotivation === "string" ? raw.primaryMotivation : fallback.primaryMotivation,
    recommendedApproach:
      typeof raw.recommendedApproach === "string"
        ? raw.recommendedApproach
        : fallback.recommendedApproach,
    suggestedOpener:
      typeof raw.suggestedOpener === "string" ? raw.suggestedOpener : fallback.suggestedOpener,
    empatheticResponse:
      typeof raw.empatheticResponse === "string" && raw.empatheticResponse.trim().length > 0
        ? raw.empatheticResponse.trim()
        : fallback.empatheticResponse,
    visitorNextSteps: pickSteps(raw.visitorNextSteps, fallback.visitorNextSteps),
    marketerNextSteps: pickSteps(raw.marketerNextSteps, fallback.marketerNextSteps),
    confidence: raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : fallback.confidence,
    signals: Array.isArray(raw.signals)
      ? raw.signals.filter((s): s is string => typeof s === "string")
      : fallback.signals,
  };
}

const LOCALE_AI_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Simplified Chinese",
  fr: "French",
  ja: "Japanese",
};

export async function generateAiSummary(profile: VisitorProfile): Promise<AiSummary> {
  const fallback = buildTemplateSummary(profile);
  if (!isOpenAiConfigured()) return fallback;

  const lang = profile.preferredLanguage ?? "en";
  const langName = LOCALE_AI_NAMES[lang] ?? "English";
  const prompt = `Analyze this visitor profile. Return JSON only.

Write empatheticResponse, suggestedOpener, and visitorNextSteps in ${langName}.

Required fields:
- headline (string, for the media buyer)
- narrative (string, 2-3 sentences for the media buyer — include conversion signals)
- primaryMotivation (string)
- recommendedApproach (string, how the agent should tone the conversation to increase engagement)
- empatheticResponse (string, 2-4 sentences TO THE VISITOR in second person: validate their worry, personalize with name/score/timeline/concern, reassure without overpromising, end with gentle invitation to stay engaged)
- suggestedOpener (string, under 320 chars, first SMS/chat message — warm, uses their name, references their quiz, asks ONE easy question to invite a reply)
- visitorNextSteps (array of 3-4 strings): encouraging action items in "you" language
- marketerNextSteps (array of 3-5 strings): empathy-first tactics to improve conversion
- confidence ("high" | "medium")
- signals (array of short strings)

Profile JSON:
${JSON.stringify(profile, null, 2)}`;

  const parsed = await openAiChatCompletionJson<Partial<AiSummary>>({
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EMPATHY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.55,
  }, { feature: "ai-summary" });
  if (!parsed) return fallback;
  return normalizeSummary(parsed, fallback);
}
