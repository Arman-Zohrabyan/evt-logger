import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ensureDatabaseExists } from './database/ensure-database';

async function bootstrap() {
  await ensureDatabaseExists(process.env.MONGO_URI || 'mongodb://localhost:27017/evt-logger');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: '50mb' }));

  // Allow Private Network Access (requests from public sites to localhost)
  app.use((req, res, next) => {
    if (req.headers['access-control-request-private-network']) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Event Logger API')
    .setDescription('API for logging and querying events')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors();
  app.useStaticAssets(join(__dirname, '..', 'public', 'static'));

  const port = process.env.PORT ?? 3000;
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger docs on http://localhost:${port}/api`);
  await app.listen(port);
}
bootstrap();
