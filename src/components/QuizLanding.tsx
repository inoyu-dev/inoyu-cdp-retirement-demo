"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuizStepAnalytics } from "@/hooks/useQuizStepAnalytics";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import QuizStepCoach from "@/components/QuizStepCoach";
import QuizStepHelpChat from "@/components/QuizStepHelpChat";
import QuizCompletionCelebration from "@/components/QuizCompletionCelebration";
import QuizStepReward from "@/components/QuizStepReward";
import QuizProgress from "@/components/QuizProgress";
import QuizLiveSimulation from "@/components/charts/QuizLiveSimulation";
import QuizCardAmbient from "@/components/svg/QuizCardAmbient";
import { useQuizLocale } from "@/components/QuizLocaleProvider";
import ScoreReveal from "@/components/ScoreReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { channelRequiresPhone } from "@/lib/contact-channels";
import { format, getLocalizedChannelGroups } from "@/lib/i18n";
import type { QuizStepId } from "@/lib/quiz-flow";
import {
  countryDisplayName,
  defaultChannelForRegion,
  isChannelAllowedForRegion,
} from "@/lib/region";
import { CONTROL_VARIANT } from "@/lib/quiz-variants";
import type { QuizSimulationInput } from "@/lib/quiz-simulation";
import type {
  AiSummary,
  ContactChannel,
  ContextResponse,
  QuizVariantConfig,
  PrimaryConcern,
  QuizAnswers,
  QuizPartialAnswers,
  VisitorRegion,
} from "@/lib/types";

const SESSION_KEY = "itstoday_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}


export default function QuizLanding() {
  const { locale, copy } = useQuizLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utmSource = searchParams.get("utm_source") ?? undefined;
  const utmCampaign = searchParams.get("utm_campaign") ?? undefined;

  const [profileId, setProfileId] = useState<string | null>(null);
  const [step, setStep] = useState<QuizStepId>(1);
  const [quizVariant, setQuizVariant] = useState<QuizVariantConfig>(CONTROL_VARIANT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedQuiz, setCompletedQuiz] = useState<
    (Partial<QuizAnswers> & { score?: number }) | null
  >(null);
  const [visitorNextSteps, setVisitorNextSteps] = useState<string[]>([]);
  const [loadingNextSteps, setLoadingNextSteps] = useState(false);
  const [empatheticResponse, setEmpatheticResponse] = useState<string | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<VisitorRegion>("other");
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [contactRegion, setContactRegion] = useState<VisitorRegion>("other");

  const [stepReward, setStepReward] = useState<{ step: QuizStepId; visible: boolean }>({
    step: 1,
    visible: false,
  });
  const [showFinalCelebration, setShowFinalCelebration] = useState(false);

  const rewardMessageForStep = (completed: QuizStepId): string => {
    switch (completed) {
      case 1:
        return copy.rewards.step1;
      case 2:
        return copy.rewards.step2;
      case 3:
        return copy.rewards.step3;
      default:
        return copy.rewards.finalSubtitle;
    }
  };

  const triggerStepReward = (completed: QuizStepId) => {
    setStepReward({ step: completed, visible: true });
    window.setTimeout(() => {
      setStepReward((current) => ({ ...current, visible: false }));
    }, 1600);
  };

  const [form, setForm] = useState({
    firstName: "",
    age: 58,
    retireYears: 6,
    currentSavings: "100k_500k" as QuizAnswers["currentSavings"],
    primaryConcern: "social_security" as PrimaryConcern,
    email: "",
    phone: "",
    contactChannel: "email" as ContactChannel,
  });

  const savingsOptions = useMemo(
    () => Object.entries(copy.savings) as [QuizAnswers["currentSavings"], string][],
    [copy],
  );

  const partialAnswers = useMemo((): QuizPartialAnswers => ({
    firstName: form.firstName || undefined,
    age: form.age,
    retireYears: form.retireYears,
    currentSavings: form.currentSavings,
    primaryConcern: form.primaryConcern,
    email: form.email || undefined,
  }), [form]);

  const simulationInput = useMemo((): QuizSimulationInput => ({
    age: form.age,
    retireYears: form.retireYears,
    currentSavings: form.currentSavings,
    primaryConcern: form.primaryConcern,
    contactChannel: form.contactChannel,
    contactRegion,
    locale,
  }), [form.age, form.retireYears, form.currentSavings, form.primaryConcern, form.contactChannel, contactRegion, locale]);

  const activeModule = useMemo(
    (): QuizStepId => quizVariant.stepOrder[step - 1] ?? step,
    [quizVariant.stepOrder, step],
  );

  const orderedProgressSteps = useMemo(
    () =>
      quizVariant.stepOrder.map((moduleId) => {
        const label = copy.steps[moduleId - 1];
        return { moduleId, title: label.title, hint: label.hint };
      }),
    [quizVariant.stepOrder, copy.steps],
  );

  const { containerRef, endStep, willingness } = useQuizStepAnalytics(profileId, activeModule);

  const concernOptions = useMemo(
    () => Object.entries(copy.concerns) as [PrimaryConcern, string][],
    [copy],
  );

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    void (async () => {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          preferredLanguage: locale,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as ContextResponse;
      setProfileId(data.profileId);
      setDetectedRegion(data.detectedRegion);
      setCountryCode(data.countryCode);
      setContactRegion(data.detectedRegion);
      if (data.quizVariant) setQuizVariant(data.quizVariant);
    })();
  }, [utmSource, utmCampaign, locale]);

  const channelGroups = useMemo(
    () => getLocalizedChannelGroups(contactRegion, locale),
    [contactRegion, locale],
  );

  const handleContactRegionChange = (value: VisitorRegion) => {
    setContactRegion(value);
    setForm((prev) => {
      if (isChannelAllowedForRegion(prev.contactChannel, value)) return prev;
      return { ...prev, contactChannel: defaultChannelForRegion(value) };
    });
  };

  const trackEngagement = useCallback(
    async (topic: "social_security" | "401k_rollover") => {
      if (!profileId) return;
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track",
          profileId,
          eventType: "contentEngagement",
          properties: { topic, dwellSeconds: 45 },
        }),
      });
    },
    [profileId],
  );

  const validateLeavingModule = (module: QuizStepId): string | null => {
    switch (module) {
      case 1:
        if (!form.firstName.trim()) return copy.errors.firstName;
        if (form.age < 45 || form.age > 75) return copy.errors.age;
        if (form.retireYears < 1 || form.retireYears > 25) return copy.errors.retireYears;
        return null;
      case 2:
        return null;
      case 3:
        if (!form.email.trim()) return copy.errors.email;
        if (!isChannelAllowedForRegion(form.contactChannel, contactRegion)) {
          return copy.errors.channelRegion;
        }
        if (channelRequiresPhone(form.contactChannel) && !form.phone.trim()) {
          return copy.errors.phone;
        }
        return null;
      case 4:
        return null;
      default: {
        const _exhaustive: never = module;
        return _exhaustive;
      }
    }
  };

  const goNext = () => {
    const validationError = validateLeavingModule(activeModule);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const completed = activeModule;
    void endStep("forward").finally(() => {
      triggerStepReward(completed);
      setStep((s) => Math.min(4, s + 1) as QuizStepId);
    });
  };

  const goBack = () => {
    setError(null);
    void endStep("back").finally(() => {
      setStep((s) => Math.max(1, s - 1) as QuizStepId);
    });
  };

  const submitQuiz = async () => {
    const validationError = validateLeavingModule(3);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!profileId) {
      setError(copy.buttons.wait);
      return;
    }

    setSubmitting(true);
    setError(null);

    await endStep("submit");

    const answers: QuizAnswers = {
      firstName: form.firstName.trim(),
      age: Number(form.age),
      retireYears: Number(form.retireYears),
      currentSavings: form.currentSavings,
      primaryConcern: form.primaryConcern,
      email: form.email.trim(),
      contactChannel: form.contactChannel,
      contactRegion,
      ...(channelRequiresPhone(form.contactChannel) && form.phone.trim()
        ? { phone: form.phone.trim() }
        : {}),
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quiz", profileId, answers }),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(copy.errors.submit);
      return;
    }

    const data = (await res.json()) as {
      profile: { quiz?: Partial<QuizAnswers> & { score?: number } };
    };
    setCompletedQuiz(data.profile.quiz ?? { ...answers, score: undefined });
    setStep(4);
    setShowFinalCelebration(true);
    window.setTimeout(() => setShowFinalCelebration(false), 2800);
    setLoadingNextSteps(true);
    setEmpatheticResponse(null);
    setVisitorNextSteps([]);
    void (async () => {
      const sumRes = await fetch(`/api/summary?profileId=${encodeURIComponent(profileId)}`, {
        cache: "no-store",
      });
      if (!sumRes.ok) {
        setLoadingNextSteps(false);
        return;
      }
      const sumData = (await sumRes.json()) as { summary: AiSummary };
      setVisitorNextSteps(sumData.summary.visitorNextSteps ?? []);
      setEmpatheticResponse(sumData.summary.empatheticResponse ?? null);
      setLoadingNextSteps(false);
    })();
  };

  const continueToFollowUp = () => {
    if (!profileId) return;
    if (form.contactChannel === "on_page") return;
    void endStep("forward").finally(() => {
      router.push(`/follow-up?profileId=${encodeURIComponent(profileId)}`);
    });
  };

return (
    <div className="mesh-hero">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 lg:py-6">
<div className="grid gap-8 lg:grid-cols-[1fr_460px] lg:items-start lg:gap-10">
          <section className="flex flex-col gap-4 lg:gap-5">
            <div className="space-y-4 lg:space-y-3">
            <div className="space-y-2">
              <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs font-medium sm:text-sm sm:py-1">
                <Sparkles className="mr-1.5 size-3.5" aria-hidden />
                {copy.hero.badge}
              </Badge>
              <h1 className="max-w-xl text-3xl font-semibold leading-[1.12] text-foreground sm:text-4xl lg:text-[2.75rem]">
                {copy.hero.title}
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                {copy.hero.subtitle}
              </p>
              <QuizStepCoach
                profileId={profileId}
                step={activeModule}
                partialAnswers={partialAnswers}
                willingness={willingness}
                className="bg-card/60 shadow-sm"
              />
            </div>

            </div>
            <div className="w-full max-w-lg">
              <QuizLiveSimulation moduleId={activeModule} input={simulationInput} variant="hero" />
            </div>
          </section>

        <section className="lg:pt-0">
          <Card ref={containerRef} className="glass-card relative sticky top-24 overflow-hidden border-0">
            <QuizCardAmbient moduleId={activeModule} />
            <QuizStepReward
              step={stepReward.step}
              title={format(copy.rewards.stepTitle, { step: String(stepReward.step) })}
              message={rewardMessageForStep(stepReward.step)}
              visible={stepReward.visible}
            />
            <QuizCompletionCelebration
              visible={showFinalCelebration}
              title={copy.rewards.finalTitle}
              subtitle={copy.rewards.finalSubtitle}
            />
            <div className="h-1.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
            <CardHeader>
              <CardTitle className="text-2xl">
                {step === 4 ? copy.card.titleResults : copy.card.titleQuiz}
              </CardTitle>
              <CardDescription className="text-base">
                {step === 4 ? copy.card.descResults : copy.card.descQuiz}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizVariant.id !== "control" ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  Quiz variant: {quizVariant.name}
                </p>
              ) : null}
              <QuizProgress wizardStep={step} orderedSteps={orderedProgressSteps} />

              {activeModule === 1 && (
                <div key="step-1" className="quiz-step-enter space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-base">
                        {copy.step1.firstName}
                      </Label>
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        required
                        className="quiz-field h-12 text-base"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder={copy.step1.firstNamePlaceholder}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-base">
                        {copy.step1.age}
                      </Label>
                      <Input
                        id="age"
                        type="number"
                        inputMode="numeric"
                        min={45}
                        max={75}
                        required
                        className="quiz-field h-12 text-base"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retireYears" className="text-base">
                      {copy.step1.retireYears}
                    </Label>
                    <Input
                      id="retireYears"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={25}
                      required
                      className="quiz-field h-12 text-base"
                      value={form.retireYears}
                      onChange={(e) => setForm({ ...form, retireYears: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentSavings" className="text-base">
                      {copy.step1.savings}
                    </Label>
                    <Select
                      value={form.currentSavings}
                      items={copy.savings}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          currentSavings: value as QuizAnswers["currentSavings"],
                        })
                      }
                    >
                      <SelectTrigger id="currentSavings" className="quiz-field h-12 w-full text-base">
                        <SelectValue placeholder={copy.step1.chooseOne} />
                      </SelectTrigger>
                      <SelectContent>
                        {savingsOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-base">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeModule === 2 && (
                <div key="step-2" className="quiz-step-enter space-y-5">
                  {quizVariant.tweaks?.inlineConcernEducation ? (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="space-y-2 pt-6 text-sm leading-relaxed text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {form.primaryConcern === "social_security"
                            ? copy.step2.ssTitle
                            : copy.step2.k401Title}
                        </p>
                        <p>
                          {form.primaryConcern === "social_security"
                            ? copy.step2.ssBody
                            : copy.step2.k401Body}
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                  <fieldset className="space-y-3">
                    <legend className="text-base font-medium">{copy.step2.concernLegend}</legend>
                    <RadioGroup
                      value={form.primaryConcern}
                      onValueChange={(value) =>
                        setForm({ ...form, primaryConcern: value as PrimaryConcern })
                      }
                      className="gap-3"
                    >
                      {concernOptions.map(([value, label]) => (
                        <label
                          key={value}
                          htmlFor={value}
                          className="quiz-choice flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                        >
                          <RadioGroupItem value={value} id={value} />
                          <span className="text-base leading-snug">{label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                  <Card className="border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{copy.step2.optionalReading}</CardTitle>
                      <CardDescription>
                        {copy.step2.optionalReadingDesc}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Accordion
                        className="w-full"
                        onValueChange={(value) => {
                          if (value.includes("ss")) void trackEngagement("social_security");
                          if (value.includes("401k")) void trackEngagement("401k_rollover");
                        }}
                      >
                        <AccordionItem value="ss">
                          <AccordionTrigger className="text-base hover:no-underline">
                            {copy.step2.ssTitle}
                          </AccordionTrigger>
                          <AccordionContent className="leading-relaxed text-muted-foreground">
                            {copy.step2.ssBody}
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="401k">
                          <AccordionTrigger className="text-base hover:no-underline">
                            {copy.step2.k401Title}
                          </AccordionTrigger>
                          <AccordionContent className="leading-relaxed text-muted-foreground">
                            {copy.step2.k401Body}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeModule === 3 && (
                <div key="step-3" className="quiz-step-enter space-y-5">
                  {quizVariant.tweaks?.showScoreTeaserOnContact ? (
                    <Card className="border-chart-2/30 bg-chart-2/10">
                      <CardContent className="pt-6 text-sm leading-relaxed">
                        <p className="font-semibold text-foreground">{copy.rewards.finalTitle}</p>
                        <p className="text-muted-foreground">{copy.rewards.finalSubtitle}</p>
                      </CardContent>
                    </Card>
                  ) : null}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="space-y-3 pt-6">
                      <p className="text-sm leading-relaxed text-foreground">
                        {countryCode
                          ? format(copy.step3.regionDetected, {
                              country: countryDisplayName(countryCode),
                            })
                          : copy.step3.regionUndetected}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="contact-region" className="text-sm font-medium">
                          {copy.step3.yourRegion}
                        </Label>
                        <Select
                          value={contactRegion}
                          items={copy.regions}
                          onValueChange={(value) => handleContactRegionChange(value as VisitorRegion)}
                        >
                          <SelectTrigger id="contact-region" className="h-11 w-full text-base">
                            <SelectValue placeholder={copy.step3.selectRegion} />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(copy.regions) as [VisitorRegion, string][]).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                  {value === detectedRegion ? copy.step3.regionDetectedTag : ""}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        {contactRegion !== detectedRegion ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
{format(copy.step3.regionOverride, { region: copy.regions[contactRegion].toLowerCase() })}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">
                      {copy.step3.email}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="quiz-field h-12 text-base"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={copy.step3.emailPlaceholder}
                    />
                  </div>
                  <fieldset className="space-y-5">
                    <legend className="text-base font-medium">{copy.step3.followUpLegend}</legend>
                    <RadioGroup
                      value={form.contactChannel}
                      onValueChange={(value) =>
                        setForm({ ...form, contactChannel: value as ContactChannel })
                      }
                      className="gap-5"
                    >
                      {channelGroups.map((group) => (
                        <div key={group.title} className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{group.title}</p>
                            {group.subtitle ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {group.subtitle}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-3">
                            {group.channels.map((channelValue) => {
                              const option = copy.channels[channelValue];
                              return (
                                <label
                                  key={channelValue}
                                  htmlFor={`channel-${channelValue}`}
                                  className="quiz-choice flex min-h-12 cursor-pointer flex-col gap-1 rounded-xl border border-border bg-muted/30 px-4 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                >
                                  <span className="flex items-start gap-3">
                                    <RadioGroupItem
                                      value={channelValue}
                                      id={`channel-${channelValue}`}
                                      className="mt-1"
                                    />
                                    <span className="flex flex-1 flex-col gap-0.5">
                                      <span className="flex flex-wrap items-center gap-2 text-base font-medium leading-snug">
                                        {option.label}
                                        {option.badge ? (
                                          <Badge variant="secondary" className="text-xs font-normal">
                                            {option.badge}
                                          </Badge>
                                        ) : null}
                                        {option.regionHint ? (
                                          <Badge variant="outline" className="text-xs font-normal">
                                            {option.regionHint}
                                          </Badge>
                                        ) : null}
                                      </span>
                                      <span className="text-sm leading-relaxed text-muted-foreground">
                                        {option.description}
                                      </span>
                                    </span>
                                  </span>
                                  <span className="pl-7 text-xs leading-relaxed text-muted-foreground">
                                    {option.consentNote}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>
                  {channelRequiresPhone(form.contactChannel) && (
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base">
                        {copy.step3.mobile}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        className="quiz-field h-12 text-base"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder={copy.step3.phonePlaceholder}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 4 && completedQuiz && (
                <div className="space-y-6">
                  <ScoreReveal copy={copy} quiz={completedQuiz} firstName={form.firstName} visitorNextSteps={visitorNextSteps} loadingNextSteps={loadingNextSteps} empatheticResponse={empatheticResponse ?? undefined} loadingEmpathetic={loadingNextSteps && !empatheticResponse} />
                  {!loadingNextSteps && form.contactChannel !== "on_page" && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
{format(copy.followUpVia, { channel: copy.channels[form.contactChannel].label.toLowerCase() })}
                    </p>
                  )}
                </div>
              )}


              <QuizStepHelpChat
                profileId={profileId}
                step={activeModule}
                partialAnswers={partialAnswers}
              />

              {error && (
                <p
                  className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {step > 1 && step < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 flex-1 text-base"
                    onClick={goBack}
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    {copy.buttons.back}
                  </Button>
                )}

                {activeModule === 1 && (
                  <Button type="button" size="lg" className="h-12 flex-1 text-base transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={goNext}>
                    {copy.buttons.continue}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}

                {activeModule === 2 && (
                  <Button type="button" size="lg" className="h-12 flex-1 text-base transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={goNext}>
                    {copy.buttons.continue}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}

                {activeModule === 3 && (
                  <Button
                    type="button"
                    size="lg"
                    disabled={submitting}
                    className="h-12 flex-1 text-base font-semibold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => void submitQuiz()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-5 animate-spin" aria-hidden />
                        {copy.buttons.calculating}
                      </>
                    ) : (
                      copy.buttons.calculate
                    )}
                  </Button>
                )}

                {step === 4 && (
                  <>
                    {form.contactChannel !== "on_page" && (
                      <Button
                        type="button"
                        size="lg"
                        className="h-12 flex-1 text-base font-semibold"
                        onClick={continueToFollowUp}
                      >
                        {copy.followUp[form.contactChannel]}
                        <ArrowRight className="size-4" aria-hidden />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
        </div>
      </div>
    </div>
  );
}
