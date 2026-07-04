import { Suspense } from "react";
import QuizLanding from "@/components/QuizLanding";

export default function Home() {
  return (
    <Suspense fallback={<div className="page-loading">Loading quiz…</div>}>
      <QuizLanding />
    </Suspense>
  );
}
