import { create } from 'zustand';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface AlertSettings {
  id: string;
  'Level Account': boolean;
  'Level Ads': boolean;
  'Level Keyword': boolean;
  'Send Email Alerts': boolean;
  'Send SMS Alerts': boolean;
  'Send Weekly Summaries': boolean;
  'Severity Critical': boolean;
  'Severity Low': boolean;
  'Severity Medium': boolean;
  'Type Ad Performance': boolean;
  'Type Brand Checker': boolean;
  'Type Budget': boolean;
  'Type KPI Trends': boolean;
  'Type Keyword Performance': boolean;
  'Type Landing Page': boolean;
  'Type Optimization Score': boolean;
  'Type Policy': boolean;
  'Type Serving Ads': boolean;
}

interface AlertSettingsState {
  alertSettings: AlertSettings | null;
  loading: boolean;
  error: string | null;
  loadedUserId: string | null;
  fetchAlertSettings: (userId: string) => Promise<void>;
  updateAlertSettings: (userId: string, updates: Partial<AlertSettings>) => Promise<void>;
}

export const useAlertSettingsStore = create<AlertSettingsState>((set, get) => ({
  alertSettings: null,
  loading: false,
  error: null,
  loadedUserId: null,
  fetchAlertSettings: async (userId: string) => {
    if (get().loadedUserId === userId && get().alertSettings) return;
    set({ loading: true, error: null });
    try {
      const alertSettingsRef = collection(db, 'alertSettings');
      const userRef = doc(db, 'users', userId);
      const q = query(alertSettingsRef, where('User', '==', userRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        set({ alertSettings: { id: docSnap.id, ...docSnap.data() } as AlertSettings, loading: false, loadedUserId: userId });
      } else {
        set({ alertSettings: null, loading: false, loadedUserId: userId });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  updateAlertSettings: async (userId: string, updates: Partial<AlertSettings>) => {
    set({ loading: true, error: null });
    try {
      const alertSettingsRef = collection(db, 'alertSettings');
      const userRef = doc(db, 'users', userId);
      const q = query(alertSettingsRef, where('User', '==', userRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        await updateDoc(docSnap.ref, updates);
        // Re-fetch after update
        await get().fetchAlertSettings(userId);
        set({ loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
})); 