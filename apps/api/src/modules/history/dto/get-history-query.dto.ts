import { IsOptional, IsString } from "class-validator";

export class GetHistoryQueryDto {
  @IsOptional()
  @IsString()
  visitorToken?: string;
}
