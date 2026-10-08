import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://newcastle-paintings-compute-prayer.trycloudflare.com/login',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
