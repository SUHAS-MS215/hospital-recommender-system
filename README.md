# Next.js + shadcn/ui + TypeScript Project

This is a modern web application built with [Next.js 16](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com), and [TypeScript](https://www.typescriptlang.org/).

## 🚀 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS v4** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Icon library

## 📦 What's Included

- ✅ Next.js with App Router and Server Components
- ✅ TypeScript configuration
- ✅ Tailwind CSS v4 with custom configuration
- ✅ shadcn/ui components (Button, Card)
- ✅ Path aliases configured (`@/*`)
- ✅ ESLint for code quality
- ✅ Example landing page with shadcn/ui components

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

The project is already set up! Just run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Project Structure

```
poc/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Home page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   └── ui/           # shadcn/ui components
│   │       ├── button.tsx
│   │       └── card.tsx
│   └── lib/
│       └── utils.ts      # Utility functions
├── public/               # Static assets
├── components.json       # shadcn/ui configuration
└── tsconfig.json         # TypeScript configuration
```

## 🎨 Adding More Components

To add more shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

For example:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add input
```

Browse all available components at [ui.shadcn.com](https://ui.shadcn.com/docs/components).

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### TypeScript

TypeScript is configured with strict mode enabled. See `tsconfig.json` for details.

### Tailwind CSS

Tailwind CSS v4 is configured with shadcn/ui's design system. Custom styles can be added to `src/app/globals.css`.

### Path Aliases

The following path aliases are configured:

- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ui` → `src/components/ui`

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)

## 🚢 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
