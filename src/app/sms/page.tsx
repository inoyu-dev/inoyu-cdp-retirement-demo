import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ profileId?: string }>;
};

export default async function SmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const profileId = params.profileId?.trim();

  if (!profileId) {
    return (
      <div className="empty-state">
        <p>Missing profileId. Complete the quiz first.</p>
        <Link href="/">← Back to quiz</Link>
      </div>
    );
  }

  redirect(`/follow-up?profileId=${encodeURIComponent(profileId)}`);
}
