import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://newcastle-paintings-compute-prayer.trycloudflare.com/sitemap.xml',
  };
}
