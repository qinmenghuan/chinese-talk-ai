import { LoginCallbackExperience } from "../../../features/auth/LoginCallbackExperience";

interface LoginCallbackPageProps {
  searchParams?: Promise<{
    next?: string;
  }>;
}

export default async function LoginCallbackPage({
  searchParams,
}: LoginCallbackPageProps) {
  const params = (await searchParams) ?? {};

  return <LoginCallbackExperience nextPath={params.next} />;
}
