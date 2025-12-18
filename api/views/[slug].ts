import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Upstash Redis 클라이언트 생성
const redis = Redis.fromEnv();

// Rate Limiter 설정: IP당 분당 10회
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

// IP 주소 추출 함수
function getIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket?.remoteAddress || 'unknown';
  return ip;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug required' });
  }

  const ip = getIP(req);

  try {
    if (req.method === 'GET') {
      // Rate Limiting 체크 (GET은 느슨하게)
      const { success } = await ratelimit.limit(`get_${ip}`);
      if (!success) {
        return res.status(429).json({
          error: 'Too many requests',
          views: await redis.get<number>(`views:${slug}`) || 0
        });
      }

      // 조회수 가져오기
      const views = await redis.get<number>(`views:${slug}`) || 0;
      return res.status(200).json({ views });
    }

    if (req.method === 'POST') {
      // Rate Limiting 체크 (POST는 엄격하게)
      const { success } = await ratelimit.limit(`post_${ip}`);
      if (!success) {
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          views: await redis.get<number>(`views:${slug}`) || 0
        });
      }

      // IP + Slug 조합으로 1시간 내 중복 체크
      const ipKey = `ip:${ip}:${slug}`;
      const alreadyViewed = await redis.get(ipKey);

      if (alreadyViewed) {
        // 이미 조회한 경우 - 조회수 증가 없이 현재 값 반환
        const views = await redis.get<number>(`views:${slug}`) || 0;
        return res.status(200).json({ views, cached: true });
      }

      // 조회수 증가
      const views = await redis.incr(`views:${slug}`);

      // IP 기록 (1시간 TTL)
      await redis.set(ipKey, '1', { ex: 3600 });

      return res.status(200).json({ views, cached: false });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Redis error:', error);
    return res.status(200).json({ views: 0, error: 'Failed to process request' });
  }
}
