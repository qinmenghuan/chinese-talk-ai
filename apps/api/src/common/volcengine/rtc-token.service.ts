import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import crypto from "node:crypto";
import { volcengineConfig } from "./volcengine.config";

enum Privilege {
  PublishStream = 0,
  PublishAudioStream = 1,
  PublishVideoStream = 2,
  PublishDataStream = 3,
  SubscribeStream = 4,
}

class ByteBuffer {
  private readonly chunks: Buffer[] = [];

  putInt16(value: number) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value, 0);
    this.chunks.push(buffer);
  }

  putInt32(value: number) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value, 0);
    this.chunks.push(buffer);
  }

  putString(value: string) {
    const buffer = Buffer.from(value, "utf8");
    this.putInt16(buffer.length);
    this.chunks.push(buffer);
  }

  putBytes(value: Buffer) {
    this.putInt16(value.length);
    this.chunks.push(value);
  }

  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

@Injectable()
export class RtcTokenService {
  private readonly tokenExpireSeconds: number;

  constructor(
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>
  ) {
    this.tokenExpireSeconds = config.tokenExpireSeconds;
  }

  createJoinToken(input: { roomId: string; userId: string }) {
    this.assertRtcConfig();

    const issueTs = Math.floor(Date.now() / 1000);
    const expireAt = issueTs + this.tokenExpireSeconds;
    const message = new ByteBuffer();

    message.putInt32(this.randomNonce());
    message.putInt32(issueTs);
    message.putInt32(expireAt);
    message.putString(input.roomId);
    message.putString(input.userId);

    const privileges = [
      [Privilege.PublishStream, expireAt],
      [Privilege.PublishAudioStream, expireAt],
      [Privilege.PublishVideoStream, expireAt],
      [Privilege.PublishDataStream, expireAt],
      [Privilege.SubscribeStream, expireAt],
    ] as const;

    message.putInt16(privileges.length);
    for (const [privilege, privilegeExpireAt] of privileges) {
      message.putInt16(privilege);
      message.putInt32(privilegeExpireAt);
    }

    const messageBuffer = message.toBuffer();
    const signature = crypto
      .createHmac("sha256", this.config.rtcAppKey)
      .update(messageBuffer)
      .digest();
    const packed = new ByteBuffer();

    packed.putBytes(messageBuffer);
    packed.putBytes(signature);

    return `001${this.config.rtcAppId}${packed.toBuffer().toString("base64")}`;
  }

  getExpiresInSeconds() {
    return this.tokenExpireSeconds;
  }

  private randomNonce() {
    return crypto.randomInt(1, 0x7fffffff);
  }

  private assertRtcConfig() {
    if (this.config.rtcAppId.length !== 24) {
      throw new Error("VOLCENGINE_RTC_APP_ID must be a 24-character RTC App ID.");
    }

    if (!this.config.rtcAppKey) {
      throw new Error("VOLCENGINE_RTC_APP_KEY is required to sign RTC join tokens.");
    }
  }
}
