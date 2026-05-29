import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class TranscriptItemDto {
  @IsString()
  id!: string;

  @IsString()
  role!: "user" | "assistant" | "system";

  @IsString()
  content!: string;

  @IsString()
  contentType!: "partial" | "final";

  @IsString()
  createdAt!: string;
}

export class EndConversationDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptItemDto)
  transcript?: TranscriptItemDto[];
  // Flag to indicate whether to generate a report
  @IsOptional()
  @IsBoolean()
  generateReport?: boolean;
}
