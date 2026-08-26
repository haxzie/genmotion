/**
 * The desktop app ships no analytics pipeline. Same surface as the web module
 * so the components importing it need no changes.
 */
export const POSTHOG_KEY = undefined;
export const POSTHOG_HOST = undefined;
export const analyticsEnabled = false;
export const GA_ID = undefined;
export const gaEnabled = false;

export function track(_event: string, _properties?: Record<string, unknown>): void {}
export function identify(_id: string, _properties?: Record<string, unknown>): void {}
export function resetAnalytics(): void {}
