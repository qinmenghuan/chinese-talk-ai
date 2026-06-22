import { PracticeExperience } from "./components/PracticeExperience";

interface PracticePageProps {
  searchParams?: Promise<{
    scenarioId?: string;
    roleId?: string;
    mode?: string;
    returnTo?: string;
  }>;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const params = (await searchParams) ?? {};

  return (
    <PracticeExperience
      initialScenarioId={params.scenarioId}
      initialRoleId={params.roleId}
      initialMode={params.mode}
      initialReturnTo={params.returnTo}
    />
  );
}
