import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/http';
import { performerRatingsRepository } from '@collabverse/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  void _request;
  try {
    const ratings = await performerRatingsRepository.listByPerformer(params.userId);
    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const count = ratings.length;
    const average = count > 0 ? Number((total / count).toFixed(2)) : null;

    return jsonOk({
      summary: {
        count,
        average
      }
    });
  } catch (error) {
    console.error('[Performer Rating Summary API] Error fetching:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
