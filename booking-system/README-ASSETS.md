# 🖼️ Asset Replacement Guide

This document explains how to replace the image placeholders in the College Hall Booking System with your own branding assets.

## 1. Required Assets

You need to provide two images:
1. **`logo.png`** - The primary logo for the application headers.
2. **`login-bg.jpg`** - The full-size background image for the login screen.

---

## 2. Where to Place the Images

Next.js serves static files directly from the `/public` directory. **Create an `images` folder inside `public` if it doesn't already exist:**

* Place your logo at: `[project_root]/public/images/logo.png`
* Place your background at: `[project_root]/public/images/login-bg.jpg`

---

## 3. Recommended Dimensions

* **Logo** (`logo.png`):
  * **Aspect Ratio:** Flexible (Horizontal preferred)
  * **Size:** ~ 200px width x 50px height
  * **Format:** PNG with a transparent background.
  * *Note: The header component constrains the logo height, so wide logos look best.*

* **Login Background** (`login-bg.jpg`):
  * **Aspect Ratio:** 16:9
  * **Size:** 1920x1080px (Standard 1080p) or higher.
  * **Format:** JPG or highly optimized WebP.

---

## 4. How to Update the Code

Once the files are in your `/public/images` folder, update the React components to use them.

### A. Updating the Global Header Logo
Open `src/components/app-header.tsx`. Locate the `LOGO PLACEHOLDER` comment (around line 15) and replace the placeholder `<div>` with an HTML `<img>` tag:

```tsx
{/* Replace this placeholder: */}
{/* 
<div className="flex h-11 w-32 items-center justify-center rounded bg-slate-100 border... ">
  ...
</div> 
*/}

{/* With your real image: */}
<img 
  src="/images/logo.png" 
  alt="College Logo" 
  className="h-10 w-auto object-contain" 
/>
```
*(Also apply this to the mobile logo placeholder in `src/app/login/page.tsx` if desired)*.

### B. Updating the Login Background
Open `src/app/login/page.tsx`. Locate the `IMAGE PLACEHOLDER` comment (around line 18) and replace it with an `<img>` tag that covers the container:

```tsx
{/* Replace the placeholder div with an image: */}
<img 
  src="/images/login-bg.jpg" 
  alt="Campus Background" 
  className="absolute inset-0 w-full h-full object-cover" 
/>
```
*Tip: You can optionally keep or remove the `<div className="text-center... bg-white/70">` overlay box that sits on top of the background depending on how your photo looks!*
