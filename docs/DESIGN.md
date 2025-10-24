# Design Guidelines

## Overview

This document outlines the design principles, patterns, and guidelines for building a modern, beautiful, and user-friendly interface for the Tools project.

## Design Principles

### 1. **Simplicity First**
- Keep interfaces clean and uncluttered
- Focus on core functionality
- Remove unnecessary elements
- Use whitespace effectively

### 2. **Mobile-First Responsive Design**
- Design for mobile screens first, then scale up
- Test on various device sizes (320px to 2560px+)
- Use Tailwind's responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Ensure touch targets are at least 44x44px

### 3. **Accessibility**
- Follow WCAG 2.1 Level AA standards
- Ensure sufficient color contrast (4.5:1 for normal text)
- Support keyboard navigation
- Include ARIA labels where needed
- Test with screen readers

### 4. **Performance**
- Optimize images and assets
- Lazy load non-critical content
- Minimize JavaScript bundle size
- Use Next.js built-in optimizations

## Visual Design

### Color Palette

**Light Mode:**
- Primary: Blue (#2563eb)
- Success: Green (#10b981)
- Warning: Orange (#f59e0b)
- Error: Red (#ef4444)
- Background: Gray-50 (#f9fafb)
- Surface: White (#ffffff)
- Text Primary: Gray-900 (#111827)
- Text Secondary: Gray-600 (#4b5563)

**Dark Mode:**
- Primary: Blue-400 (#60a5fa)
- Success: Green-400 (#34d399)
- Warning: Orange-400 (#fbbf24)
- Error: Red-400 (#f87171)
- Background: Gray-900 (#111827)
- Surface: Gray-800 (#1f2937)
- Text Primary: White (#ffffff)
- Text Secondary: Gray-300 (#d1d5db)

### Typography

- **Headings**: Bold, larger sizes for hierarchy
  - H1: `text-4xl font-bold`
  - H2: `text-3xl font-bold`
  - H3: `text-2xl font-semibold`
  - H4: `text-xl font-semibold`

- **Body Text**: 
  - Regular: `text-base`
  - Small: `text-sm`
  - Tiny: `text-xs`

- **Line Height**: Comfortable reading (1.5-1.75)

### Spacing

Use Tailwind's spacing scale consistently:
- Extra small: `p-2` (8px)
- Small: `p-4` (16px)
- Medium: `p-6` (24px)
- Large: `p-8` (32px)
- Extra large: `p-12` (48px)

### Borders & Shadows

- **Border Radius**: 
  - Small: `rounded-lg` (8px)
  - Medium: `rounded-xl` (12px)
  - Full: `rounded-full`

- **Shadows**:
  - Subtle: `shadow-sm`
  - Standard: `shadow-lg`
  - Hover: `shadow-xl`

## Component Guidelines

### Buttons

```tsx
// Primary Button
<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
  Action
</button>

// Secondary Button
<button className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
  Cancel
</button>

// Disabled Button
<button disabled className="bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed">
  Disabled
</button>
```

### Form Inputs

```tsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
  placeholder="Enter text..."
/>
```

### Cards

```tsx
<div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
  {/* Card content */}
</div>
```

### Alerts

```tsx
// Success
<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
  <p className="text-green-800 dark:text-green-300">Success message</p>
</div>

// Error
<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
  <p className="text-red-800 dark:text-red-300">Error message</p>
</div>
```

## Layout Patterns

### Page Structure

```tsx
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
  <header>{/* Header content */}</header>
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    {/* Main content */}
  </main>
  <footer>{/* Footer content */}</footer>
</div>
```

### Grid Layouts

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>
```

## Animation & Transitions

### Hover Effects

- Add `transition-all duration-200` or `transition-colors duration-200`
- Use `hover:` utilities for interactive elements
- Scale slightly on hover for cards: `hover:scale-105`

### Loading States

- Show loading indicators for async operations
- Disable buttons during loading
- Use skeleton screens for content loading

### Micro-interactions

- Button press effects
- Form validation feedback
- Success animations
- Smooth page transitions

## Dark Mode

- Support both light and dark modes
- Use Tailwind's `dark:` prefix for dark mode styles
- Respect system preferences
- Provide manual toggle (future enhancement)

## Icons

- Use SVG icons for scalability
- Heroicons recommended (already compatible with Tailwind)
- Keep icon sizes consistent (w-5 h-5 for inline, w-6 h-6 for standalone)
- Ensure proper stroke width (strokeWidth={2})

## Emphasis: Beautiful & Fast

- The Tools project prioritizes a beautiful, modern aesthetic while maintaining fast, responsive interactions.
- Visual polish (typography, spacing, subtle shadows, and high-quality icons) is required across components.
- Performance budgets should be respected: lazy-load heavy visuals, minimize JavaScript payloads, and prefer SVGs or canvas-based charts over heavyweight libraries when possible.


## Responsive Design Breakpoints

```
sm: 640px   // Mobile landscape, small tablets
md: 768px   // Tablets
lg: 1024px  // Small laptops
xl: 1280px  // Desktops
2xl: 1536px // Large screens
```

## Best Practices

### Do's
✅ Use semantic HTML elements
✅ Implement proper heading hierarchy
✅ Provide loading states
✅ Show clear error messages
✅ Use consistent spacing
✅ Test on real devices
✅ Optimize for performance
✅ Consider accessibility

### Don'ts
❌ Don't use fixed pixel widths
❌ Don't ignore mobile devices
❌ Don't rely on color alone for meaning
❌ Don't use tiny touch targets
❌ Don't forget loading states
❌ Don't sacrifice accessibility for aesthetics
❌ Don't use too many animations

## Tool-Specific Guidelines

### Fat Loss Calculator
- Clear input labels
- Real-time validation feedback
- Visual result presentation
- Helpful explanations

### N26 Analyzer
- Easy file upload interface
- Clear data presentation in tables
- Color-coded positive/negative values
- Category summaries
- Responsive table design

## Testing Guidelines

1. **Visual Testing**
   - Test in Chrome, Firefox, Safari
   - Test on iOS and Android devices
   - Verify dark mode appearance
   - Check responsive breakpoints

2. **Accessibility Testing**
   - Use keyboard navigation
   - Test with screen readers
   - Verify color contrast
   - Check ARIA labels

3. **Performance Testing**
   - Lighthouse score > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3.5s

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Heroicons](https://heroicons.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
