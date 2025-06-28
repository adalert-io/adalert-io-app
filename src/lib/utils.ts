import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FIREBASE_FN_DOMAINS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirebaseFnPath(subPath: string) {
  const domain =
    process.env.NODE_ENV === "development"
      ? FIREBASE_FN_DOMAINS.DEV
      : FIREBASE_FN_DOMAINS.PROD;

  const path =
    process.env.NODE_ENV === "development"
      ? `http://${domain}/${subPath}`
      : `https://${domain}/${subPath}`;

  return path;
}

export function formatAccountNumber(accountNumber: string): string {
  if (!/^[0-9]{10}$/.test(accountNumber)) return accountNumber;
  return `${accountNumber.slice(0,3)}-${accountNumber.slice(3,6)}-${accountNumber.slice(6)}`;
}
