import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PipelineService } from './pipeline/pipeline.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Ditto');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
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
