// Minimal HTML sanitizer for EmbedSection htmlContent
// Strips <script>, <style>, event handler attributes, and javascript/data URLs

export function sanitizeHtml(input: string): string {
  if (!input) return ''

  // Remove script and style tags entirely
  let out = input.replace(/<\/(?:script|style)>/gi, '')
  out = out.replace(/<(?:script|style)[\s\S]*?>[\s\S]*?<(?:\/)(?:script|style)>/gi, '')

  // Remove on* event handler attributes (e.g., onclick="...")
  out = out.replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '')

  // Disallow javascript:, data: URLs in href/src
  out = out.replace(/\s(href|src)\s*=\s*(["'])(javascript:|data:)/gi, ' $1=$2#')

  return out
}
