import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { getUserSubscription, getOwnedOrganizationsCount } from '@/lib/api/user-subscription';

export async function GET() {
    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    
    if (!userId) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const subscription = await getUserSubscription(userId);
        const ownedOrganizations = await getOwnedOrganizationsCount(userId, 'business');
        
        return jsonOk({ 
            subscription,
            usage: {
                ownedOrganizations,
            }
        });
    } catch (error) {
        console.error('[Me/Subscription] Error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}
