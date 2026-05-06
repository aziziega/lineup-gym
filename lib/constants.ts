export const GYM_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Default Line Up Gym ID

export const GYM_INFO = {
  NAME: process.env.NEXT_PUBLIC_GYM_NAME || 'Line Up Gym',
  PHONE: process.env.NEXT_PUBLIC_GYM_PHONE || '0857-0767-8485',
  ADDRESS: process.env.NEXT_PUBLIC_GYM_ADDRESS || 'Banjarsari, Kb. Dalem Kidul, Kec. Prambanan, Klaten, Jawa Tengah 57454',
  INSTAGRAM: process.env.NEXT_PUBLIC_GYM_INSTAGRAM || 'lineup.gym',
  CLOSE_TIME: process.env.NEXT_PUBLIC_GYM_CLOSE_TIME || '21:00',
  RATING: '4.9',
  TAGLINE: 'BE STRONG BE HEALTHY',
};

export const COLORS = {
  MAIN_BG: '#0A0A0A',
  CARD_BG: '#1A1A1A',
  SIDEBAR_BG: '#111111',
  BORDER: '#2A2A2A',
  ACCENT_NEON: '#FF2A2A',
  WARNING_ORANGE: '#FF6B35',
  DANGER_RED: '#FF3B3B',
  TEXT_MAIN: '#F0F0F0',
  TEXT_MUTED: '#888888',
};
