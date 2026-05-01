# BoostPlatform White-Label Template

This is the neutral, white-label boosting platform template intended for CodeCraft customer deployments.

## Branding

- Default public name: `BoostPlatform`
- Default support email: `support@example.com`
- Customers should configure their own site name, logo, colors, support links, payment keys and custom domain from the admin panel after deployment.
- Do not add customer-specific branding, reviews, vouches or third-party links to this template.

## CodeCraft Deployment

CodeCraft's deployment worker should point to this template repository with:

- `BOOSTING_GITHUB_REPO`
- `BOOSTING_MIGRATIONS_PATH`

The brand-specific production site is intentionally separate and should not be used as the customer deployment template.
