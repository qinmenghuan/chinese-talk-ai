import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function disableBrokenLocalProxyEnv() {
  const logger = new Logger("Bootstrap");
  const proxyEnvKeys = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ] as const;

  for (const key of proxyEnvKeys) {
    const value = process.env[key];

    if (!value) {
      continue;
    }

    if (value.includes("127.0.0.1:9") || value.includes("localhost:9")) {
      logger.warn(`Ignoring broken proxy env ${key}=${value}`);
      delete process.env[key];
    }
  }
}

async function bootstrap() {
  disableBrokenLocalProxyEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );
  const port = Number(process.env.API_PORT ?? 3003);
  await app.listen(port);
}

void bootstrap();
