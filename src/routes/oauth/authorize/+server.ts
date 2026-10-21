import type { RequestHandler } from '@sveltejs/kit';
import admin from 'firebase-admin';
import { initialize } from '$lib/server/db/firebase/firebase';
import { createSignedOAuthCode, isAllowedEmail } from '$lib/server/mcp/bitrix/auth';

const FIREBASE_API_KEY = process.env.PUBLIC_FIREBASE_APIKEY || 'AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M';
const FIREBASE_AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'eisg-fleet.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || 'eisg-fleet';

initialize();

export const GET: RequestHandler = async ({ url }) => {
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const codeChallenge = url.searchParams.get('code_challenge') || '';
    const codeChallengeMethod = url.searchParams.get('code_challenge_method') || '';

    if (!redirectUri) {
        return new Response('Missing required redirect_uri parameter', { status: 400 });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EISG Bitrix MCP — Secure Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Montserrat', sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 420px; padding: 36px 32px; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge { display: inline-block; background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
        h2 { font-size: 22px; margin-bottom: 8px; }
        p.subtitle { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .badge-domains { background: rgba(14, 165, 233, 0.12); color: #38bdf8; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
        .btn-google { width: 100%; background: #ffffff; color: #0f172a; border: none; padding: 12px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .btn-google svg { width: 18px; height: 18px; }
        .divider { display: flex; align-items: center; margin: 20px 0; color: #64748b; font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #334155; }
        .divider span { padding: 0 12px; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        input { width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; }
        .btn-submit { width: 100%; background: #0284c7; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .error-box { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
        .loading-spinner { display: none; text-align: center; color: #38bdf8; font-size: 13px; margin-top: 12px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <span class="logo-badge">EISG BITRIX MCP</span>
            <h2>Sign in to continue</h2>
            <p class="subtitle">Access restricted to verified accounts from <span class="badge-domains">@eisg.pl</span> and <span class="badge-domains">@finnergroup.com</span></p>
        </div>
        <div id="error-box" class="error-box"></div>
        <button id="btn-google" class="btn-google">
            <svg viewBox="0 0 48 48">
                <path fill="#ea4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C36.91 2.7 31.11 0 24 0 14.62 0 6.51 5.38 2.42 13.12l7.33 5.7C12.42 13.16 17.18 9.5 24 9.5z"/>
                <path fill="#4285f4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.13h12.94c-.58 2.96-2.27 5.48-4.78 7.18l7.34 5.7c4.29-3.97 7.15-9.83 7.15-16.72z"/>
                <path fill="#fbbc05" d="M10.53 28.59c-.48-1.45-.76-3-0-4.59l-7.33-5.7C.89 20.46 0 24.65 0 29.5c0 4.84 2.65 9.09 6.56 11.31l7.33-5.7c-2.09-2.04-3.47-4.93-3.47-8.31z"/>
                <path fill="#34a853" d="M24 48c13.07 0 24.02-4.33 32.08-11.79l-7.34-5.7c-2.58 2.19-5.88 3.49-9.74 3.49-7.82 0-14.58-5.19-16.99-12.34l-7.33 5.7c4.98 9.39 15.04 16.02 26.32 16.02z"/>
            </svg>
            Sign in with Google
        </button>
        <div class="divider"><span>or with password</span></div>
        <form id="login-form">
            <div class="form-group">
                <label for="email">Corporate Email</label>
                <input type="email" id="email" required placeholder="name@eisg.pl">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn-submit">Sign In</button>
        </form>
        <div id="loading-spinner" class="loading-spinner">Verifying credentials with Firebase...</div>
        <form id="oauth-post-form" method="POST" action="/oauth/authorize" style="display:none;">
            <input type="hidden" name="id_token" id="form-id-token">
            <input type="hidden" name="redirect_uri" value="${redirectUri}">
            <input type="hidden" name="state" value="${state}">
            <input type="hidden" name="code_challenge" value="${codeChallenge}">
            <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
        </form>
    </div>
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
        const firebaseConfig = { apiKey: "${FIREBASE_API_KEY}", authDomain: "${FIREBASE_AUTH_DOMAIN}", projectId: "${FIREBASE_PROJECT_ID}" };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        const errorBox = document.getElementById('error-box');
        const spinner = document.getElementById('loading-spinner');
        const postForm = document.getElementById('oauth-post-form');
        const idTokenInput = document.getElementById('form-id-token');

        function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; spinner.style.display = 'none'; }
        async function submitFirebaseToken(userCredential) {
            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const idToken = await userCredential.user.getIdToken();
                idTokenInput.value = idToken;
                postForm.submit();
            } catch (err) { showError(err.message || 'Failed to acquire Firebase ID token'); }
        }
        document.getElementById('btn-google').addEventListener('click', async () => {
            try {
                spinner.style.display = 'block'; errorBox.style.display = 'none';
                const result = await signInWithPopup(auth, googleProvider);
                await submitFirebaseToken(result);
            } catch (err) { showError(err.message || 'Google sign-in failed'); }
        });
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            try {
                spinner.style.display = 'block'; errorBox.style.display = 'none';
                const result = await signInWithEmailAndPassword(auth, email, password);
                await submitFirebaseToken(result);
            } catch (err) { showError(err.message || 'Invalid email or password'); }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
};

export const POST: RequestHandler = async ({ request }) => {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const idToken = params.get('id_token') || '';
    const redirectUri = params.get('redirect_uri') || '';
    const state = params.get('state') || '';
    const codeChallenge = params.get('code_challenge') || undefined;
    const codeChallengeMethod = params.get('code_challenge_method') || undefined;

    if (!redirectUri) {
        return new Response('Missing redirect_uri', { status: 400 });
    }

    if (!idToken) {
        return new Response('Missing Firebase ID token', { status: 400 });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(idToken, true);
        const email = (decoded.email || '').toLowerCase().trim();

        if (!isAllowedEmail(email)) {
            return new Response(`<h3>Access Denied</h3><p>Email ${email} is not authorized.</p>`, {
                status: 403,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const authCode = createSignedOAuthCode({
            uid: decoded.uid,
            email,
            redirectUri,
            codeChallenge,
            codeChallengeMethod
        });

        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', authCode);
        if (state) redirectUrl.searchParams.set('state', state);

        return Response.redirect(redirectUrl.toString(), 302);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        return new Response(`<h3>Authentication Failed</h3><p>${message}</p>`, {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
};
