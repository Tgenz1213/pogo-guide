import { computed } from "vue";

/**
 * Composable for setting consistent SEO meta tags across all pages.
 * Generates canonical URLs from the current route, with optional OG image override.
 *
 * @param title - Page title (used in <title>, og:title, twitter:title)
 * @param description - Page description (used in meta description, og, twitter)
 * @param image - Optional absolute URL to OG image; falls back to /images/social-fallback.png
 */
export const useSeo = (title: string, description: string, image?: string) => {
  const route = useRoute();
  const config = useRuntimeConfig();

  const siteUrl = (config.public.siteUrl as string) || "https://pogo.guide";

  // Canonical URL strips query parameters to prevent duplicate indexing
  const canonicalUrl = computed(() => `${siteUrl}${route.path}`);

  const ogImage = computed(
    () => image || `${siteUrl}/images/social-fallback.png`,
  );

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: ogImage.value,
    ogType: "website",
    ogUrl: canonicalUrl.value,
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage.value,
    twitterCard: "summary_large_image",
  });

  useHead({
    link: [
      {
        rel: "canonical",
        href: canonicalUrl.value,
      },
    ],
  });
};
