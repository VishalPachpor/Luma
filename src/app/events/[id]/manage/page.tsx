
import { redirect } from 'next/navigation';

interface ManagePageProps {
    params: Promise<{ id: string }>;
}

export default async function EventManagePage({ params }: ManagePageProps) {
    const { id } = await params;
    redirect(`/events/${id}/manage/overview`);
}
