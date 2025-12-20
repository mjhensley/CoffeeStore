# GitHub Copilot Instructions for Coffee-Website

## Project Overview

This is a Coffee Store e-commerce website featuring:
- Static HTML/CSS/JavaScript frontend
- Netlify hosting with edge functions and serverless functions
- Payment integration with Stripe
- Shopping cart and checkout functionality
- Product catalog with detailed product pages
- Responsive design with performance optimizations

## Repository Structure

```
Coffee-Website/
├── stumptown_static/          # Main website files (production)
│   ├── *.html                 # Page templates
│   ├── *.css                  # Stylesheets
│   ├── *.js                   # Client-side JavaScript
│   ├── shipping-config.js     # Centralized shipping configuration
│   ├── products-data.js       # Product catalog data
│   └── images/                # Static assets
├── netlify/
│   ├── functions/             # Serverless functions (Node.js)
│   └── edge-functions/        # Edge functions (Deno)
├── business_data/             # Business configuration and data
├── *.py                       # Python utilities for development
├── package.json               # Node.js dependencies
├── requirements.txt           # Python dependencies
└── netlify.toml               # Netlify configuration
```

## Development Setup

### Prerequisites
- Node.js >= 18.x
- Python 3.x
- npm for JavaScript dependencies

### Installation
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (if needed)
pip install -r requirements.txt
```

### Running Locally
```bash
# Start local development server
npm run dev
# (This runs: python serve.py)
```

## Code Style and Conventions

### JavaScript
- Use modern ES6+ syntax
- Keep functions focused and modular
- Use descriptive variable names
- Add comments for complex logic
- Handle errors gracefully with user-friendly fallbacks

### HTML
- Use semantic HTML5 elements
- Maintain accessibility standards (ARIA labels, alt text)
- Keep markup clean and well-indented
- Use consistent class naming conventions

### CSS
- Follow existing design system patterns
- Use CSS custom properties for theming
- Maintain responsive design principles
- Optimize for performance (minimize reflows, use transforms)

### Python
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Keep utility scripts well-documented

## Key Configuration Files

### Centralized Configurations
- **`stumptown_static/shipping-config.js`** - Single source of truth for all shipping rates and carriers
- **`stumptown_static/products-data.js`** - Product catalog and pricing
- **`stumptown_static/discount-config.js`** - Discount and promotion rules
- **`stumptown_static/config.example.js`** - Template for API keys (copy to `config.js`)

### Important Notes
- Always update `shipping-config.js` for any shipping-related changes
- Ensure prices are synchronized across checkout, cart, and policy pages
- Never commit API keys - use `config.js` (which is gitignored)

## Security Best Practices

### Content Security Policy
- The site has strict CSP headers configured in `netlify.toml`
- Only add trusted external domains to CSP
- Test any third-party integrations carefully

### Sensitive Data
- Never commit API keys, secrets, or credentials
- Use environment variables for sensitive configuration
- The `.env` and `config.js` files are gitignored
- Check `.gitignore` before committing changes

### Payment Processing
- Stripe integration handles payment securely
- All payment processing happens server-side via Netlify functions
- Never expose Stripe secret keys in client-side code

## Testing Approach

### Manual Testing
- Test checkout flow end-to-end
- Verify shipping calculations are correct
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test responsive design on mobile devices
- Verify all forms validate properly

### What to Test After Changes
- **Shipping changes**: Verify prices match everywhere (checkout, cart, policies)
- **Product changes**: Check product pages, cart, and checkout
- **UI changes**: Test across different screen sizes
- **JavaScript changes**: Check browser console for errors

## Performance Considerations

### Caching Strategy
- Aggressive caching configured in `netlify.toml`
- Images: 1-year cache (immutable)
- CSS/JS: 1-year cache with versioning
- HTML: 1-hour cache with 24-hour stale-while-revalidate

### Optimization Practices
- Minimize JavaScript bundle sizes
- Optimize images before adding to repository
- Use lazy loading for images
- Leverage critical CSS for above-the-fold content
- Use `instant-load.js` for page preloading

### Asset Management
- Large media files (videos, large images) are gitignored
- Keep repository size manageable
- Use external CDNs for very large assets when possible

## Deployment

### Netlify Deployment
- Automatic deployments from main branch
- Preview deployments for pull requests
- Build command: Netlify auto-detects static site
- Publish directory: `stumptown_static`

### Edge Functions
- Bot protection on all routes (`/*`)
- Security checks on function routes (`/.netlify/functions/*`)
- Edge functions are in `netlify/edge-functions/`

### Serverless Functions
- Payment processing and server-side logic
- Node.js runtime with esbuild bundler
- Functions are in `netlify/functions/`

## Common Tasks

### Adding a New Product
1. Update `stumptown_static/products-data.js`
2. Create product page HTML in `stumptown_static/`
3. Add product images to `stumptown_static/images/`
4. Test add-to-cart and checkout functionality

### Updating Shipping Rates
1. Edit `stumptown_static/shipping-config.js` (single source of truth)
2. Rates automatically propagate to checkout, cart, and policies
3. Test checkout flow to verify new rates

### Adding New Pages
1. Create HTML file in `stumptown_static/`
2. Follow existing page structure and styling
3. Update navigation if needed
4. Add to `sitemap.xml` if appropriate
5. Consider accessibility and SEO metadata

### Modifying Styles
1. Check if changes belong in `design-system.css` (design tokens)
2. Use existing CSS custom properties when possible
3. Test responsive breakpoints
4. Verify changes don't break other pages

## Troubleshooting

### Build Issues
- Check Node.js version (must be >= 18.x)
- Verify all dependencies are installed (`npm install`)
- Check for JavaScript syntax errors
- Review Netlify build logs for specific errors

### Checkout Not Working
- Verify `shipping-config.js` is properly configured
- Check browser console for JavaScript errors
- Ensure cart state is being managed correctly in `cart.js`
- Test with different shipping methods and cart totals

### API Integration Issues
- Verify API keys are in `config.js` (not committed)
- Check network requests in browser DevTools
- Review CSP headers if third-party APIs are blocked
- Ensure CORS is properly configured for external services

## Important Constraints

### What NOT to Change
- Don't modify working Netlify edge functions without testing
- Don't remove existing security headers from `netlify.toml`
- Don't commit large media files (check `.gitignore`)
- Don't hardcode API keys in source files

### Backward Compatibility
- Maintain existing URL structure for SEO
- Keep existing API contracts for functions
- Preserve cart data structure for user sessions
- Don't break existing product SKUs or IDs

## Additional Resources

- **Implementation Summaries**: Check `IMPLEMENTATION_SUMMARY.md` and `PAYMENT_IMPLEMENTATION_SUMMARY.md` for detailed implementation history
- **Quick Start**: See `QUICK_START_GUIDE.md` (if exists in stumptown_static)
- **Netlify Docs**: https://docs.netlify.com/
- **Stripe Docs**: https://stripe.com/docs

## Working with Copilot

### Good Tasks for Copilot
- Bug fixes in JavaScript, HTML, or CSS
- Adding new products or pages following existing patterns
- Updating shipping rates or tax calculations
- Improving accessibility or performance
- Writing utility functions or helpers
- Documentation updates

### Tasks Requiring Human Review
- Major architectural changes
- Payment processing modifications
- Security-related changes
- Breaking changes to existing APIs
- Changes affecting SEO or analytics
- Production configuration changes

### When Making Changes
1. Always test changes locally before committing
2. Check for console errors in browser DevTools
3. Verify changes work across different browsers
4. Test responsive design on mobile
5. Review git diff to ensure only intended files are changed
6. Use meaningful commit messages describing the change
