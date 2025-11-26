import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';

export default async function OrgFinanceRedirectPage() {
    const user = await getCurrentUser();

    if (!user?.id) {
        redirect('/login?toast=auth-required');
    }

    // Получаем список организаций пользователя
    const organizations = await organizationsRepository.listForUser(user.id);

    if (organizations.length === 0) {
        // Если нет организаций, перенаправляем на дашборд с сообщением
        redirect('/app/dashboard?toast=no-organizations');
    }

    // Перенаправляем на страницу финансов первой организации
    const firstOrg = organizations[0];
    if (!firstOrg) {
        redirect('/app/dashboard?toast=no-organizations');
    }
    redirect(`/org/${firstOrg.id}/finance`);
}
