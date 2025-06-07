export interface UserToken {
  id: string;
  User: any; // Firestore reference
  "Access Token": string;
  "Refresh Token": string;
  "Access Token Creation Date": any; // Firestore timestamp
  "Access Token Expires In Second": number;
  "Is Current Token To Fetch Ads Account": boolean;
  "Google Email": string;
  "Created Date": Date;
  modified_at: Date;
  [key: string]: any;
}

export interface AuthTracker {
  id: string;
  User: any; // Firestore reference
  "Is Ads Account Authenticating": boolean;
  [key: string]: any;
}

export interface Subscription {
  id: string;
  User: any; // Firestore reference
  [key: string]: any;
}

export interface AdsAccount {
  id: string;
  name: string;
  [key: string]: any;
}
