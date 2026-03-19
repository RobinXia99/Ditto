import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PipelineService } from './pipeline/pipeline.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Ditto');

  // Map config LOG_LEVEL values to NestJS LogLevel names
  const levelMap: Record<string, string[]> = {
    error:   ['error'],
    warn:    ['error', 'warn'],
    info:    ['error', 'warn', 'log'],
    debug:   ['error', 'warn', 'log', 'debug'],
    verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
  };
  const enabledLevels = (levelMap[process.env.LOG_LEVEL || 'debug'] ?? levelMap.debug) as any[];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: enabledLevels,
  });

  // Handle shutdown gracefully
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal} — shutting down...`);
      await app.close();
      process.exit(0);
    });
  }

  const pipeline = app.get(PipelineService);
  await pipeline.start();
}

bootstrap().catch((err) => {
  console.error('Failed to start Ditto:', err);
  process.exit(1);
});
