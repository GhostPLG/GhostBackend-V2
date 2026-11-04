import "dotenv/config";

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Variável de ambiente ausente: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 3551),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  publicHost: process.env.PUBLIC_HOST ?? "127.0.0.1",
  publicPort: Number(process.env.PUBLIC_PORT ?? 3551),
  gameServerIp: process.env.GAME_SERVER_IP ?? "127.0.0.1",
  gameServerPort: Number(process.env.GAME_SERVER_PORT ?? 7777),
} as const;