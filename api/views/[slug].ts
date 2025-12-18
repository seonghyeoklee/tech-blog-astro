import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Upstash Redis 클라이언트 생성
const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug required' });
  }

  try {
    if (req.method === 'GET') {
      // 조회수 가져오기
      const views = await redis.get<number>(`views:${slug}`) || 0;
      return res.status(200).json({ views });
    }

    if (req.method === 'POST') {
      // 조회수 증가
      const views = await redis.incr(`views:${slug}`);
      return res.status(200).json({ views });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Redis error:', error);
    return res.status(200).json({ views: 0, error: 'Failed to process request' });
  }
}
