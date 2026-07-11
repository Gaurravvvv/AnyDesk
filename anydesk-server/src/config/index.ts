import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) 
      : '*',
  },

  room: {
    codeLength: parseInt(process.env.ROOM_CODE_LENGTH || '6', 10),
    codeTtlSeconds: parseInt(process.env.ROOM_CODE_TTL_SECONDS || '300', 10),
  },
};
