import { env } from '$env/dynamic/private';

export const isDev = env.NODE_ENV === 'development';