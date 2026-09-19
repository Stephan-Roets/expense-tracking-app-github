# Vehicle Manufacturer Logos

This folder contains SVG logos for vehicle manufacturers.

## Naming Convention

All logo files must be named in lowercase:
- `toyota.svg`
- `volkswagen.svg`
- `bmw.svg`
- `mercedes-benz.svg`
- `ford.svg`

## Logo Guidelines

- **Format**: SVG (vector format for scalability)
- **Recommended size**: 32x32px (will be scaled as needed)
- **Style**: Monochrome or works well in both light/dark modes
- **Optimization**: Keep file sizes small for fast loading

## Usage

Logos are automatically matched to vehicle makes using case-insensitive matching. For example:
- User types "Toyota" → displays `toyota.svg`
- User types "toyota" → displays `toyota.svg`
- User types "TOYOTA" → displays `toyota.svg`

## API Fallback

If no local logo is found for a make, the application can optionally fetch logos from the WorldVectorLogo API:
- Local logos are checked first (fastest)
- If not found locally and API fallback is enabled, the API is queried
- API results are cached in localStorage for 7 days
- Falls back to generic car icon if API also fails

To enable API fallback, add your WorldVectorLogo API key to `.env.local`:
```
NEXT_PUBLIC_WORLD_VECTOR_LOGO_API_KEY=your_api_key_here
```

Get your free API key (500 requests/day) from: https://worldvectorlogo.com/account/api-keys

Without an API key, anonymous access is limited to 10 requests/day per IP.
