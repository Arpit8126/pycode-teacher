'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash
        const params = new URLSearchParams(hash.substring(1))
        
        const idToken = params.get('id_token')
        const errorParam = params.get('error')

        if (errorParam) {
          setError(params.get('error_description') || 'Google authentication failed.')
          return
        }

        if (!idToken) {
          setError('Authentication token not found in URL callback hash.')
          return
        }

        // Retrieve the stored nonce
        let savedNonce: string | undefined = undefined;
        try {
          const stored = localStorage.getItem("google_oauth_nonce");
          if (stored) {
            savedNonce = stored;
            localStorage.removeItem("google_oauth_nonce");
          }
        } catch {}

        // Decode Google ID Token to extract email
        let oauthEmail: string | undefined = undefined;
        try {
          const base64Url = idToken.split('.')[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            oauthEmail = decoded.email;
          }
        } catch (jwtDecodeErr) {
          console.error("JWT decoding failed:", jwtDecodeErr);
        }

        // Retrieve stored username if they were in registration flow
        let pendingUsername: string | null = null;
        try {
          pendingUsername = localStorage.getItem('pycode_signup_username');
        } catch {}

        // If no pending username (Logging in): Check if email exists in database
        if (!pendingUsername && oauthEmail) {
          try {
            const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(oauthEmail)}`);
            const verifyData = await res.json();

            if (verifyData.exists === false) {
              router.push(`/signup?error=${encodeURIComponent('This Google account is not registered yet. Please enter a username and click Continue with Google to sign up.')}`);
              return;
            }
          } catch (checkEmailErr) {
            console.error("Email registration check failed:", checkEmailErr);
          }
        }

        // Exchange Google ID Token with Supabase session
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          nonce: savedNonce,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        if (data?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_onboarded, is_teacher')
            .eq('id', data.user.id)
            .single()

          // Auto-upgrade user to teacher status on Google login/signup callback
          if (profile && !profile.is_teacher) {
            await supabase
              .from('profiles')
              .update({ is_teacher: true })
              .eq('id', data.user.id)
          }

          // If they selected a username during registration, save it
          if (pendingUsername) {
            try {
              let updatedClientSide = false
              const { error: updateErr } = await supabase
                .from('profiles')
                .update({ 
                  username: pendingUsername.toLowerCase().trim(),
                  is_onboarded: true,
                  is_teacher: true
                })
                .eq('id', data.user.id)
              
              if (!updateErr) {
                console.log("Google Callback client-side username updated successfully!")
                localStorage.removeItem('pycode_signup_username')
                updatedClientSide = true
              } else {
                console.warn("Google Callback client-side username update failed, trying API fallback:", updateErr)
              }

              // Fallback to server-side API endpoint if client-side update failed
              if (!updatedClientSide) {
                console.log("Attempting server-side profile update fallback...")
                const res = await fetch('/api/auth/update-profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.session?.access_token}`,
                  },
                  body: JSON.stringify({ username: pendingUsername })
                })
                const result = await res.json()
                if (result.success) {
                  localStorage.removeItem('pycode_signup_username')
                } else {
                  console.error("Google Callback server-side profile update failed:", result.error)
                }
              }
            } catch (err) {
              console.error("Error setting username in callback:", err)
            }
          }

          // Redirect directly to dashboard
          router.push('/dashboard')
        }
      } catch (err: any) {
        console.error("Authentication error during callback processing:", err)
        setError(err.message || 'Authentication processing failed.')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#15171e]/80 border border-[#232630] text-center shadow-xl animate-fade-in">
        {error ? (
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 rounded-full bg-white text-black font-medium hover:opacity-90 transition-all text-sm cursor-pointer"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto"></div>
            <h2 className="text-lg font-medium text-gray-300">Completing Sign In...</h2>
            <p className="text-gray-500 text-sm mt-1">Authenticating session with secure databases...</p>
          </div>
        )}
      </div>
    </div>
  )
}
