import {
	PUBLIC_FIREBASE_APIKEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_MEASUREMENT
} from '$env/static/public';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_APIKEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID,
	measurementId: PUBLIC_FIREBASE_MEASUREMENT,
};

// Firebase client SDK only runs in the browser — skip during SSR
const app = !import.meta.env.SSR ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;

export { auth, app };