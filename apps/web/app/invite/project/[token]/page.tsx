import { ProjectInviteLandingClient } from '@/components/invites/ProjectInviteLandingClient';

export default function ProjectInvitePage({ params }: { params: { token: string } }) {
  return <ProjectInviteLandingClient token={params.token} />;
}

