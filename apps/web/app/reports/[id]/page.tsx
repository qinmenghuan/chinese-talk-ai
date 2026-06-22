import { ReportExperience } from "../../../features/report/ReportExperience";

interface ReportPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  return <ReportExperience conversationId={id} />;
}
