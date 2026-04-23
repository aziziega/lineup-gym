import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Ajadikan nilai 1.0 agar 100% dari transaksi terkirim (hanya untuk dev, bisa diubah di prod)
  tracesSampleRate: 1.0,

  // Setting ini akan merekam detail error dari user yang spesifik
  debug: false,
});
