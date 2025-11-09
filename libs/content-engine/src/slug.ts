/**
 * Slug generation utility for blog posts
 * Creates URL-friendly slugs from blog post titles
 */

/**
 * Generates a URL-friendly slug from a blog post title
 * 
 * @param title - The blog post title
 * @returns A URL-friendly slug (e.g., "how-to-fix-your-water-heater")
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD') // Normalize unicode characters
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    || 'blog-post'
}

