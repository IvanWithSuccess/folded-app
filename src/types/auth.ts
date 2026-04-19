export interface AccountInfo {
  id: string;
  username: string;
  first_name: string;
  phone: string;
}

export type AppState = 'STARTUP' | 'AUTH' | 'SYNCING' | 'ONBOARDING' | 'READY';
