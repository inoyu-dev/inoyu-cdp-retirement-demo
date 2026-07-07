import Image from "next/image";
import { cn } from "@/lib/utils";

const FULL_LOGO_ASPECT = 155 / 54;

type InoyuLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  /** Target height in px. Width follows logo aspect ratio. */
  height?: number;
  /** Cap rendered width (useful for the wide full logo in tight rows). */
  maxWidth?: number;
  priority?: boolean;
};

function resolveLogoBox({
  variant,
  height,
  maxWidth,
}: {
  variant: "full" | "mark";
  height: number;
  maxWidth?: number;
}) {
  const aspect = variant === "mark" ? 1 : FULL_LOGO_ASPECT;
  const naturalWidth = Math.round(height * aspect);

  if (!maxWidth || naturalWidth <= maxWidth) {
    return { width: naturalWidth, height };
  }

  return {
    width: maxWidth,
    height: Math.round(maxWidth / aspect),
  };
}

export default function InoyuLogo({
  variant = "full",
  className,
  height = 28,
  maxWidth,
  priority = false,
}: InoyuLogoProps) {
  const src = variant === "mark" ? "/inoyu-mark.svg" : "/inoyu-logo.svg";
  const box = resolveLogoBox({ variant, height, maxWidth });

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width: box.width, height: box.height, maxWidth: "100%" }}
    >
      <Image
        src={src}
        alt="Inoyu"
        width={box.width}
        height={box.height}
        priority={priority}
        className="block size-full max-h-full max-w-full object-contain object-center"
      />
    </span>
  );
}
