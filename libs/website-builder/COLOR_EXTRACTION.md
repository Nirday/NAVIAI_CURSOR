# Color Extraction Feature

## Overview

SMBs can customize their website's color theme by:
1. **Uploading an image** and saying "I like these colors"
2. **Providing a URL** to an image or website and saying "I like this color scheme"
3. The system extracts dominant colors and generates a cohesive, accessible palette

## API Endpoints

### 1. Extract Colors

**POST** `/api/website/extract-colors`

Extract color palette from an image URL, uploaded image, or website URL.

#### Request Body (JSON)

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "preferLight": true
}
```

OR

```json
{
  "websiteUrl": "https://example.com",
  "preferDark": false
}
```

OR

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "preferLight": true
}
```

#### Request Body (FormData)

```
imageUrl: https://example.com/image.jpg
preferLight: true
```

OR upload file directly:

```
image: [File]
preferDark: false
```

#### Parameters

- `imageUrl` (optional): URL of an image to extract colors from
- `websiteUrl` (optional): URL of a website to extract theme colors from
- `image` (optional): Base64 encoded image data or file upload
- `preferDark` (optional): Generate a dark theme palette
- `preferLight` (optional): Generate a light theme palette

#### Response

```json
{
  "success": true,
  "extractedColors": [
    {
      "hex": "#2563EB",
      "rgb": { "r": 37, "g": 99, "b": 235 },
      "name": "Deep Blue",
      "usage": "primary"
    },
    {
      "hex": "#3B82F6",
      "rgb": { "r": 59, "g": 130, "b": 246 },
      "name": "Light Blue",
      "usage": "accent"
    }
  ],
  "colorPalette": {
    "primary": "#2563EB",
    "secondary": "#1E40AF",
    "accent": "#3B82F6",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#1F2937",
    "extractedColors": [...]
  },
  "message": "Extracted 5 colors and generated a cohesive palette"
}
```

### 2. Apply Colors

**POST** `/api/website/apply-colors`

Apply an extracted color palette to the user's website.

#### Request Body

```json
{
  "colorPalette": {
    "primary": "#2563EB",
    "secondary": "#1E40AF",
    "accent": "#3B82F6",
    "background": "#FFFFFF",
    "surface": "#F8FAFC",
    "text": "#1F2937"
  },
  "preserveFonts": true
}
```

#### Parameters

- `colorPalette` (required): ColorPalette object with all 6 colors
- `preserveFonts` (optional): Keep existing fonts (default: true)

#### Response

```json
{
  "success": true,
  "message": "Color palette applied successfully",
  "website": {
    "id": "website-id",
    "theme": {
      "colorPalette": { ... },
      "font": { ... }
    }
  }
}
```

## How It Works

### 1. Color Extraction Methods

#### GPT-4 Vision (Primary)
- Analyzes the image contextually
- Identifies brand colors, accents, and backgrounds
- Provides color names and usage suggestions
- Most accurate for understanding color intent

#### Sharp Pixel Analysis (Fallback)
- Pixel-based color frequency analysis
- Extracts top 5 most common colors
- Quantizes colors to reduce noise
- Fast and reliable fallback

### 2. Palette Generation

The system generates a cohesive 6-color palette:

- **Primary**: Main brand color (from extracted colors)
- **Secondary**: Supporting color (darker shade of primary or second extracted color)
- **Accent**: Highlight color (third extracted color or complementary)
- **Background**: Page background (white or dark based on preference)
- **Surface**: Card/section background (light gray or dark gray)
- **Text**: Primary text color (dark or light based on background)

### 3. Accessibility Validation

All generated palettes ensure:
- ✅ **WCAG AA Contrast**: Text has minimum 4.5:1 contrast ratio
- ✅ **Color Adjustments**: Automatically adjusts colors that don't meet contrast requirements
- ✅ **Readability**: Ensures all text is readable on backgrounds

### 4. Website URL Extraction

For website URLs, the system:
1. Fetches the HTML
2. Extracts `theme-color` meta tag (if present)
3. Parses CSS for color values
4. Identifies most common colors
5. Generates palette from extracted colors

## Usage Examples

### Example 1: Extract from Image URL

```typescript
const response = await fetch('/api/website/extract-colors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId
  },
  body: JSON.stringify({
    imageUrl: 'https://example.com/brand-logo.jpg',
    preferLight: true
  })
})

const { colorPalette } = await response.json()
```

### Example 2: Upload Image File

```typescript
const formData = new FormData()
formData.append('image', imageFile)
formData.append('preferDark', 'false')

const response = await fetch('/api/website/extract-colors', {
  method: 'POST',
  headers: {
    'x-user-id': userId
  },
  body: formData
})

const { colorPalette } = await response.json()
```

### Example 3: Extract from Website

```typescript
const response = await fetch('/api/website/extract-colors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId
  },
  body: JSON.stringify({
    websiteUrl: 'https://competitor.com',
    preferLight: true
  })
})

const { colorPalette } = await response.json()
```

### Example 4: Apply Colors to Website

```typescript
const response = await fetch('/api/website/apply-colors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId
  },
  body: JSON.stringify({
    colorPalette: extractedPalette.colorPalette,
    preserveFonts: true
  })
})
```

## Dependencies

### Required
- `openai`: For GPT-4 Vision API

### Optional (for enhanced features)
- `sharp`: For pixel-based color extraction (fallback)
- `axios`: For downloading images and websites

Install optional dependencies:
```bash
npm install sharp axios
```

## Error Handling

The system gracefully handles:
- Missing dependencies (falls back to Vision API only)
- Invalid image formats
- Network errors when fetching URLs
- Images that don't contain extractable colors
- Accessibility issues (automatically adjusts colors)

## Best Practices

1. **Use High-Quality Images**: Better images = better color extraction
2. **Provide Context**: Upload images with clear brand colors
3. **Test Contrast**: Always preview the generated palette
4. **Preserve Branding**: Use `preserveFonts: true` to keep existing fonts
5. **Iterate**: Try different images if the first extraction isn't perfect

## Future Enhancements

- [ ] Support for color palette presets
- [ ] Color palette history/undo
- [ ] A/B testing different palettes
- [ ] Industry-specific color recommendations
- [ ] Color palette export/import
- [ ] Real-time preview while extracting

