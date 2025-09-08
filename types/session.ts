export interface UserMetadata {
  userName?: string;
  userColor?: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: UserMetadata;
}

export interface Session {
  user?: User;
  access_token?: string;
  refresh_token?: string;
}
