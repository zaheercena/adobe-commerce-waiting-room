import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'rediss://prod-redis-higgs-boson-XXXXXXXXXXXXXXXX.amazonaws.com:6379';
const MAX_USERS = parseInt(process.env.MAX_USERS || '10000');
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '1800');

let redisClient = null;

function getRedisClient() {
  try {
  if (!redisClient) {
    console.log('Connecting to Redis at', REDIS_URL);
    redisClient = new Redis(REDIS_URL, {
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }
    } catch (error) {
    console.error('Redis connection error:', error);
  }
  return redisClient;
}


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const path = event.rawPath || event.path || '';
  const queryParams = event.queryStringParameters || {};
  console.log('Query Params:', queryParams);
  
  try {
    const redis = getRedisClient();

    if (path.includes('/health')) {
      await redis.ping();
      return createResponse(200, {
        status: 'healthy',
        redis: 'connected',
        timestamp: new Date().toISOString()
      });
    }

    if (path.includes('/status')) {
      await cleanupStaleSessions(redis);
      const currentUsers = await redis.scard('active_sessions') || 0;
      const allSessions = await redis.smembers('active_sessions');
      
      return createResponse(200, {
        current_users: currentUsers,
        max_users: MAX_USERS,
        available_slots: MAX_USERS - currentUsers,
        capacity_percentage: ((currentUsers / MAX_USERS) * 100).toFixed(2),
        session_timeout: SESSION_TIMEOUT,
        active_sessions: allSessions.length,
        timestamp: new Date().toISOString()
      });
    }

    const sessionId = queryParams.session_id;
    
    if (!sessionId) {
      return createResponse(400, {
        error: 'session_id is required',
        message: 'Please provide a session_id parameter'
      });
    }

    if (path.includes('/check')) {
      await cleanupStaleSessions(redis);
      const exists = await redis.sismember('active_sessions', sessionId);
      const currentUsers = await redis.scard('active_sessions') || 0;
      
      if (exists) {
        await redis.setex(`session:${sessionId}`, SESSION_TIMEOUT, Date.now().toString());
        
        return createResponse(200, {
          allowed: true,
          session_id: sessionId,
          current_users: currentUsers,
          max_users: MAX_USERS,
          message: 'Access granted - existing session',
          action: 'allow'
        });
      }
      
      const canEnter = currentUsers < MAX_USERS;
      
      return createResponse(200, {
        allowed: canEnter,
        session_id: sessionId,
        current_users: currentUsers,
        max_users: MAX_USERS,
        available_slots: MAX_USERS - currentUsers,
        message: canEnter ? 'Access granted' : 'Capacity full',
        action: canEnter ? 'allow' : 'wait',
        retry_after: canEnter ? 0 : 30
      });
    }

    if (path.includes('/enter')) {
      const exists = await redis.sismember('active_sessions', sessionId);
      
      if (exists) {
        const currentUsers = await redis.scard('active_sessions') || 0;
        await redis.setex(`session:${sessionId}`, SESSION_TIMEOUT, Date.now().toString());
        
        return createResponse(200, {
          success: true,
          session_id: sessionId,
          current_users: currentUsers,
          max_users: MAX_USERS,
          message: 'Session already exists - TTL refreshed'
        });
      }
      
      const currentUsers = await redis.scard('active_sessions') || 0;
      
      if (currentUsers >= MAX_USERS) {
        return createResponse(200, {
          success: false,
          session_id: sessionId,
          current_users: currentUsers,
          max_users: MAX_USERS,
          message: 'Capacity full',
          retry_after: 30
        });
      }
      
      await redis.sadd('active_sessions', sessionId);
      await redis.setex(`session:${sessionId}`, SESSION_TIMEOUT, Date.now().toString());
      
      const newCount = await redis.scard('active_sessions');
      
      return createResponse(200, {
        success: true,
        session_id: sessionId,
        current_users: newCount,
        max_users: MAX_USERS,
        available_slots: MAX_USERS - newCount,
        message: 'Session created',
        expires_in: SESSION_TIMEOUT
      });
    }

    if (path.includes('/exit')) {
      await redis.srem('active_sessions', sessionId);
      await redis.del(`session:${sessionId}`);
      
      const currentUsers = await redis.scard('active_sessions') || 0;
      
      return createResponse(200, {
        success: true,
        session_id: sessionId,
        current_users: currentUsers,
        message: 'Session removed'
      });
    }

    return createResponse(404, {
      error: 'Not found',
      message: 'Invalid endpoint',
      available_endpoints: ['/health', '/status', '/check', '/enter', '/exit']
    });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Add this function after getRedisClient()
  async function cleanupStaleSessions(redis) {
    try {
      const sessions = await redis.smembers('active_sessions');
      if (sessions.length === 0) return 0;
      
      const pipeline = redis.pipeline();
      sessions.forEach(sessionId => {
        pipeline.exists(`session:${sessionId}`);
      });
      
      const results = await pipeline.exec();
      const staleIds = sessions.filter((sessionId, idx) => {
        return results[idx][1] === 0; // Session key doesn't exist
      });
      
      if (staleIds.length > 0) {
        await redis.srem('active_sessions', ...staleIds);
        console.log(`Cleaned up ${staleIds.length} stale sessions`);
      }
      
      return staleIds.length;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
};