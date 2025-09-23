# Relese - Modern Release Notes

A beautiful release notes application built with Astro featuring Apple Control Center-inspired design and glassmorphic aesthetics.

## Features

- **Apple Control Center Design**: Floating card layout inspired by iOS Control Center
- **Glassmorphic UI**: Frosted glass effects with backdrop blur
- **Astro Performance**: Static generation with minimal JavaScript
- **Internationalization**: English and Finnish support
- **Responsive Design**: Mobile-first approach

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

Visit `http://localhost:4321` to view the application.

## Tech Stack

- **Astro** - Static site generator
- **React** - Interactive components (Islands)
- **TypeScript** - Type safety
- **CSS** - Modern glassmorphic design system

## Project Structure

```
src/
├── components/     # Astro components
├── islands/        # Interactive React components
├── layouts/        # Page layouts
├── styles/         # Global CSS and design system
├── i18n/          # Internationalization
├── data/          # Release data and utilities
└── types/         # TypeScript definitions
```

## Adding Releases

Edit `src/data/releases.json`:

```json
{
  "version": "2.2.0",
  "date": "2024-12-20T10:00:00Z",
  "type": "minor",
  "content": {
    "highlights": ["Major feature highlight"],
    "features": ["New feature 1", "New feature 2"],
    "improvements": ["Performance improvement"],
    "bugfixes": ["Critical bug fix"]
  }
}
```

## License

MIT