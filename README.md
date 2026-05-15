# KURBR - AI-Powered Junk Removal Marketplace

On-demand junk removal platform connecting customers with independent haulers across Utah.

## Overview

KURBR is a two-sided marketplace that:
- Allows customers to book junk removal by uploading photos
- Uses AI (Claude Sonnet 4) to analyze photos and generate instant pricing
- Dispatches jobs to vetted haulers in the service area
- Handles payment processing and job tracking

## Market Opportunity

- **Market Size:** $10-15 billion annually (US junk removal)
- **Fragmentation:** 55% held by independent operators
- **Growth Rate:** 5-8% CAGR
- **Target:** Salt Lake City metro as beachhead market

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Anthropic Claude API (photo analysis + pricing)
- **Payments:** Stripe (to be implemented)
- **SMS:** Twilio (to be implemented)
- **Hosting:** Replit

## Current Status

**Phase:** PMF Validation (May 2026)
**Goal:** 30 jobs in 30 days to prove product-market fit
**Budget:** $5,000 validation budget

## Key Features

✅ Customer booking flow with photo upload
✅ AI-powered pricing engine
✅ Hauler onboarding and management
✅ Admin dashboard for dispatch
✅ Job tracking and status updates
✅ Mobile-responsive design

## Business Model

- **Platform Fee:** 20% of job value
- **Average Job:** $150-200
- **Hauler Payout:** 80% ($120-160)
- **Platform Revenue:** 20% ($30-40)

## Quick Start

See [SETUP.md](./SETUP.md) for deployment instructions.

## Documentation

- [Setup & Deployment](./docs/SETUP.md)
- [Customer Flow](./docs/CUSTOMER_FLOW.md)
- [Hauler Management](./docs/HAULER_MANAGEMENT.md)
- [Admin Operations](./docs/ADMIN_OPERATIONS.md)
- [PMF Validation Plan](./docs/PMF_VALIDATION.md)
- [Go-to-Market Strategy](./docs/GTM_STRATEGY.md)
