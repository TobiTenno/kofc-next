import devServerConfig from '../../config/dev-server.json';

export const DEV_SERVER_PORT = devServerConfig.port;

export const getDevServerOrigin = (host = 'localhost'): string =>
  `http://${host}:${DEV_SERVER_PORT}`;
