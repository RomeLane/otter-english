# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Otter English is a static HTML website for an English language school platform. The site provides information about English lessons, contact forms, and booking functionality through external services.

## Architecture

This is a simple static website with the following structure:
- **public/**: Contains all HTML files and assets
  - `index.html`: Main landing page with contact form and booking link
  - `about.html`: About page describing the service
  - `lessons.html`: Lessons page with navigation to different course types
  - `404.html`: Error page
  - Additional course-specific pages referenced but not present: `IELTS.html`, `TOEFL.html`, `EIKEN.html`, `BusinessEnglish.html`, `Conversation.html`

## Development Commands

### Local Development Server
```bash
# Start local development server on port 8080
python3 -m http.server 8080 --directory public

# Or use any other static file server
# The site expects to be served from http://localhost:8080/public/index.html
```

### VS Code Integration
- Launch configuration exists in `.vscode/launch.json` for Chrome debugging
- Configured to open `http://localhost:8080/public/index.html` in Chrome with debugging enabled

## Key Features

- **Contact Form**: Uses Formspree (https://formspree.io/f/xgvadyon) for form submissions
- **Booking System**: Integrates with Calendly (https://calendly.com/rmlnduenas) for lesson booking
- **Responsive Design**: Uses CSS with mobile viewport meta tags
- **Background Images**: References GitHub-hosted images for backgrounds

## Styling Approach

- Inline CSS within HTML files (no separate CSS files)
- Custom styling for navigation, forms, and buttons
- Consistent color scheme using blues (#206da4, #007bff) and whites
- Font: Primarily Courier New for main content, Arial for secondary pages

## External Dependencies

- Font Awesome icons (CDN): `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css`
- Formspree for contact form handling
- Calendly for appointment booking
- GitHub for image hosting

## Navigation Structure

- Home (`index.html`)
- About (`about.html`) 
- Lessons (`lessons.html`) - links to course-specific pages
- FAQ / Articles (`faq.html`) - referenced but not present

## Development Notes

- No build process or package management - pure static HTML/CSS/JS
- Images are hosted on GitHub and referenced via raw URLs
- Contact form submissions go to external service
- Site designed for simple deployment to static hosting services