"use client";

import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuizLocale } from "@/components/QuizLocaleProvider";
import { APP_LOCALES, LOCALE_NATIVE_NAMES, type AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  variant?: "default" | "header";
};

export default function LanguageSelector({ id = "site-language", variant = "default" }: Props) {
  const { locale, setLocale } = useQuizLocale();

  const select = (
    <Select
      value={locale}
      items={LOCALE_NATIVE_NAMES}
      onValueChange={(value) => setLocale(value as AppLocale)}
    >
      <SelectTrigger
        id={id}
        aria-label="Language"
        className={cn(
          variant === "header"
            ? "h-9 w-[7.25rem] gap-1.5 border-border/50 bg-background/50 px-2.5 text-sm shadow-none hover:bg-muted/50 sm:w-[7.75rem]"
            : "h-11 w-full text-base",
        )}
      >
        {variant === "header" ? (
          <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {APP_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_NATIVE_NAMES[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (variant === "header") return select;
  return <div className="space-y-2">{select}</div>;
}
