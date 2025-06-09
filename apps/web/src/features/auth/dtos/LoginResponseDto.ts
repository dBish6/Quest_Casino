import { UserCredentials } from "@qc/typescript/typings/UserCredentials";

export interface LoginResponseDto {
  user: UserCredentials;
}

export interface LoginGoogleResponseDto extends LoginResponseDto {
  google_new?: string;
}
