import { buildServer } from './server';

const start = async (): Promise<void> => {
  const server = await buildServer();

  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    const address = server.server.address();
    server.log.info(`Server listening on ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

