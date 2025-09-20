'use client';

import { Suspense } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/lib/store/auth-store';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

function RedirectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Destructure auth store functions
  const authStore = useAuthStore();
  const { setUser, setUserDoc, setGoogleOAuthRedirect, fetchUserDocument, checkSubscriptionStatus } = authStore;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // console.log("firebaseUser", firebaseUser);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Don't handle navigation here - let the redirect page handle it
        // This prevents the login screen from showing
      } else {
        // console.log("No authenticated user found.");
        // Only redirect to auth if we're not in the middle of processing
        if (!isProcessing) {
          router.push('/auth');
        }
      }
    });

    return () => unsubscribe();
  }, [router, setUser, isProcessing]);

  useEffect(() => {
    // Parse query params
    if (!searchParams) return;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const page = searchParams.get('page'); // e.g., add-ads-account

    if (errorParam) {
      setError(errorParam);
      toast.error(errorParam);
      return;
    }

    if (code) {
      (async () => {
        try {
          setIsProcessing(true);
          authStore.setGoogleOAuthRedirect(true); 
          const redirect_uri = !page
            ? `${window.location.origin}/redirect`
            : `${window.location.origin}/redirect?page=${page}`;

          const response = await fetch('/api/google-oauth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirect_uri,
            }),
          });

          const tokenData = await response.json();

          if (!response.ok) {
            setError(tokenData.error || 'Failed to get Google token');
            setIsProcessing(false);
            return;
          }

          const decoded: any = jwtDecode(tokenData.id_token);

          // Get authenticated user id (assume from Zustand store)
          // console.log("useAuthStore.getState(): ");
          // console.log(useAuthStore.getState());
          const { user } = useAuthStore.getState();
          // console.log("user: ", user);
          if (!user) {
            // console.log("No authenticated user found.");
            setError('No authenticated user found.');
            setIsProcessing(false);
            return;
          }
          const userId = user.uid;
          const userRef = doc(db, 'users', userId);
          // console.log("userId: ", userId);

          // Optimized: Combine all database operations into a single batch
          const batch = writeBatch(db);
          const now = Timestamp.now();

          // Step 1: Get all userTokens for this user
          const userTokensRef = collection(db, 'userTokens');
          const allTokensQuery = query(
            userTokensRef,
            where('User', '==', userRef),
          );
          const allTokensSnap = await getDocs(allTokensQuery);

          // Step 2: Get userTokens where Google Email matches decoded.email
          const tokensWithEmailQuery = query(
            userTokensRef,
            where('User', '==', userRef),
            where('Google Email', '==', decoded.email),
          );
          const tokensWithEmailSnap = await getDocs(tokensWithEmailQuery);

          // Step 3: Update all existing tokens to set 'Is Current Token To Fetch Ads Account' to false
          allTokensSnap.docs.forEach((d) => {
            batch.update(d.ref, {
              'Is Current Token To Fetch Ads Account': false,
            });
          });

          // Step 4: Update or create userToken
          if (!tokensWithEmailSnap.empty) {
            // Update the first matching token
            const tokenDoc = tokensWithEmailSnap.docs[0];
            batch.update(tokenDoc.ref, {
              'Access Token': tokenData.access_token,
              'Refresh Token': tokenData.refresh_token,
              'Access Token Creation Date': now,
              'Access Token Expires In Second': tokenData.expires_in,
              'Is Current Token To Fetch Ads Account': true,
              'Google Email': decoded.email,
              'modified_at': new Date(),
            });
          } else {
            // Create a new userToken document
            const newTokenRef = doc(collection(db, 'userTokens'));
            batch.set(newTokenRef, {
              'User': userRef,
              'Access Token': tokenData.access_token,
              'Refresh Token': tokenData.refresh_token,
              'Access Token Creation Date': now,
              'Access Token Expires In Second': tokenData.expires_in,
              'Is Current Token To Fetch Ads Account': true,
              'Google Email': decoded.email,
              'Created Date': new Date(),
              'modified_at': new Date(),
            });
          }

          // Step 5: Set 'Is Ads Account Authenticating' to true in authenticationPageTrackers
          const trackersRef = collection(db, 'authenticationPageTrackers');
          const trackerQuery = query(trackersRef, where('User', '==', userRef));
          const trackerSnap = await getDocs(trackerQuery);

          if (!trackerSnap.empty) {
            const trackerDoc = trackerSnap.docs[0];
            batch.update(trackerDoc.ref, {
              'Is Ads Account Authenticating': true,
            });
          }

          // Execute all operations in a single batch
          await batch.commit();

          // Step 5: Handle navigation directly without waiting for auth state change
          const { checkSubscriptionStatus, handlePostAuthNavigation, setUser, setGoogleOAuthRedirect } = authStore;
          
          try {
            // Ensure user is set in store before proceeding
            const currentUser = useAuthStore.getState().user;
            if (!currentUser) {
              // Get current user from Firebase auth
              const { getAuth } = await import('firebase/auth');
              const { auth } = await import('@/lib/firebase/config');
              const firebaseUser = auth.currentUser;
              if (firebaseUser) {
                setUser(firebaseUser);
              }
            }
            
            // Check subscription status and handle navigation
            await checkSubscriptionStatus(userId);
            
            // Get the target path before navigation
            const { userDoc, isFullAccess } = authStore;
            let targetPath = '/dashboard';
            
            // Check if user came from add-ads-account page - if so, redirect back there
            if (page === 'add-ads-account' || page === 'add-ads-account-from-settings') {
              targetPath = '/add-ads-account';
            } else if (userDoc) {
              // Build Firestore query for Ads Account collection
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase/config');
              const { COLLECTIONS } = await import('@/lib/constants');
              
              const adsAccountRef = collection(db, COLLECTIONS.ADS_ACCOUNTS);
              const companyAdminRef = userDoc['Company Admin'];
              const userRef = doc(db, COLLECTIONS.USERS, userDoc.uid);

              const adsAccountQuery = query(
                adsAccountRef,
                where('User', '==', companyAdminRef),
                where('Is Connected', '==', true),
                where('Selected Users', 'array-contains', userRef),
              );

              const adsAccountSnap = await getDocs(adsAccountQuery);
              const adsAccountCount = adsAccountSnap.size;

              // Navigation logic
              if (!isFullAccess) {
                targetPath = '/settings/account/billing';
              } else if (adsAccountCount === 0) {
                const inviter = userDoc['Inviter'];
                targetPath = inviter ? '/dashboard' : '/add-ads-account';
              } else if (adsAccountCount === 1) {
                targetPath = '/dashboard';
              } else if (adsAccountCount > 1) {
                targetPath = '/summary';
              }
            }
            
            // Navigate directly to the target path
            router.replace(targetPath);
            
            // Reset the Google OAuth redirect flag after navigation
            setGoogleOAuthRedirect(false);
            setIsProcessing(false);
          } catch (error) {
            console.error('Error in post-auth navigation:', error);
            // Reset the flag even on error
            setGoogleOAuthRedirect(false);
            // Fallback navigation
            const path = page ? `/${page}` : '/dashboard';
            router.replace(path);
          }
        } catch (err) {
          setError('An error occurred during Google authentication.');
          setIsProcessing(false);
          authStore.setGoogleOAuthRedirect(false); // Reset flag on error
        }
      })();
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <h1 className='text-2xl font-bold text-red-600 mb-4'>
          Google OAuth Error
        </h1>
        <p className='text-gray-700'>{error}</p>
        <button
          className='mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition'
          onClick={() => {
            const page = searchParams?.get('page');
            if (page) {
              router.replace(`/${page}`);
            } else {
              router.replace('/dashboard');
            }
          }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#fafbfe]'>
      <div className='bg-white rounded-2xl shadow-lg px-12 py-10 flex flex-col items-center w-full max-w-md'>
        <div className='flex items-center mb-8'>
          <Image
            src='/images/adalert-logo.avif'
            alt='adAlert.io logo'
            width={48}
            height={48}
            className='mr-3'
            priority
          />
          <span className='text-2xl font-semibold text-[#1a2e49] tracking-tight'>
            adAlert.io
          </span>
        </div>
        <Loader2 className='animate-spin w-10 h-10 text-blue-600 mb-6' />
        <p className='text-lg text-gray-500 text-center'>
          {isProcessing ? 'Processing Google authentication...' : "You're being redirected to adAlert.io"}
        </p>
        {isProcessing && (
          <div className='mt-4 text-sm text-gray-400 text-center'>
            Please wait while we set up your account
          </div>
        )}
        {!isProcessing && (
          <div className='mt-4 text-sm text-gray-400 text-center'>
            Redirecting to your dashboard...
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-[#fafbfe]'>
      <div className='bg-white rounded-2xl shadow-lg px-12 py-10 flex flex-col items-center w-full max-w-md'>
        <div className='flex items-center mb-8'>
          <Image
            src='/images/adalert-logo.avif'
            alt='adAlert.io logo'
            width={48}
            height={48}
            className='mr-3'
            priority
          />
          <span className='text-2xl font-semibold text-[#1a2e49] tracking-tight'>
            adAlert.io
          </span>
        </div>
        <Loader2 className='animate-spin w-10 h-10 text-blue-600 mb-6' />
        <p className='text-lg text-gray-500 text-center'>Loading...</p>
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RedirectPageContent />
    </Suspense>
  );
}
