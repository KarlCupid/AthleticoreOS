export const APP_SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@athleticore.app';

export const APP_SUPPORT_MAILTO = `mailto:${APP_SUPPORT_EMAIL}?subject=${encodeURIComponent('AthletiCore Support')}`;

function getOptionalPublicUrl(name: 'EXPO_PUBLIC_SUPPORT_URL' | 'EXPO_PUBLIC_PRIVACY_POLICY_URL' | 'EXPO_PUBLIC_MARKETING_URL') {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export const APP_SUPPORT_URL = getOptionalPublicUrl('EXPO_PUBLIC_SUPPORT_URL');
export const APP_PRIVACY_POLICY_URL = getOptionalPublicUrl('EXPO_PUBLIC_PRIVACY_POLICY_URL');
export const APP_MARKETING_URL = getOptionalPublicUrl('EXPO_PUBLIC_MARKETING_URL');

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'What the app stores',
    body:
      'AthletiCore stores the account details, training logs, readiness check-ins, nutrition entries, weight data, and planning inputs you add so the app can personalize guidance and keep your history available across sessions.',
  },
  {
    title: 'How the data is used',
    body:
      'Your data is used to power planning, workout, nutrition, hydration, and weight-cut features inside the app. It is not presented as a medical diagnosis or emergency service.',
  },
  {
    title: 'Your controls',
    body:
      'You can review and update profile inputs in the app, sign out at any time, and permanently delete your account from the Account section.',
  },
  {
    title: 'Support contact',
    body: `Questions about privacy or account issues can be sent to ${APP_SUPPORT_EMAIL}.`,
  },
  {
    title: 'Public policy access',
    body: APP_PRIVACY_POLICY_URL
      ? 'A public privacy policy link is configured for review and user access.'
      : 'Publish the full privacy policy at a public URL before App Store submission.',
  },
] as const;
