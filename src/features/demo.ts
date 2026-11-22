/** Browser preview only: a browser cannot block apps, so these stand in for installed ones. */
import { Platform } from 'react-native';

export const IS_WEB_PREVIEW = Platform.OS === 'web';

export const DEMO_APPS = [
  { packageName: 'com.instagram.android', label: 'Instagram' },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok' },
  { packageName: 'com.whatsapp', label: 'WhatsApp' },
  { packageName: 'com.google.android.youtube', label: 'YouTube' },
  { packageName: 'com.facebook.katana', label: 'Facebook' },
  { packageName: 'com.twitter.android', label: 'X' },
];
