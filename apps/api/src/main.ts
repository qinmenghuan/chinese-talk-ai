import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";
import { RealtimeWsBridge } from "./modules/realtime/realtime-ws.bridge";

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

  const hasWorkingProxy =
    Boolean(process.env.HTTPS_PROXY || process.env.https_proxy) ||
    Boolean(process.env.HTTP_PROXY || process.env.http_proxy) ||
    Boolean(process.env.ALL_PROXY || process.env.all_proxy);

  if (hasWorkingProxy) {
    process.env.NODE_USE_ENV_PROXY = "1";
    logger.log("Enabled NODE_USE_ENV_PROXY for outbound requests.");
  }
}

async function bootstrap() {
  disableBrokenLocalProxyEnv();
  const { AppModule } = await import("./app.module");
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      process.env.WEB_BASE_URL ?? "http://localhost:3000",
      process.env.ADMIN_BASE_URL ?? "http://localhost:5173",
    ],
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );
  // The global exception filter should be registered after all other app setup, to ensure it can catch exceptions from any part of the app.
  app.useGlobalFilters(new ApiExceptionFilter());
  const port = Number(process.env.API_PORT ?? 3003);
  await app.listen(port);
  app.get(RealtimeWsBridge).attachServer(app.getHttpServer());
}

void bootstrap();
