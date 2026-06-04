import { LoginExperience } from "../../features/auth/LoginExperience";

interface LoginPageProps {
  searchParams?: Promise<{
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};

  return <LoginExperience nextPath={params.next} />;
}
