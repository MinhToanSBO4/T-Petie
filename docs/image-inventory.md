# Images and media

This guide covers the application's media storage, upload rules and rendering. See the [project README](../README.md) for setup and [the deployment guide](deploy-vercel.md) for production credentials.

All site imagery is hosted on Cloudinary and served from `res.cloudinary.com`. The repository has no `public/` directory. The only image files tracked in Git are the app icons in `src/app` (`favicon.ico`, `icon.png` and `apple-icon.png`), which Next.js serves through its metadata file conventions. The only other image source is the Google profile picture of customers who sign in with Google, loaded from `lh3.googleusercontent.com`.

## What is stored where

| Content | Cloudinary folder | Where the URL is stored | Managed from |
| --- | --- | --- | --- |
| Media library: collection banners and lookbooks, product photos, homepage, sale, about and category page images, the logo, customer feedback screenshots | `tpetie/site` | `media_assets` (one row per image), plus the record that uses it: `collections`, `product_images`, `site_content` or `customer_testimonials` | Image fields in the Products, Collections, Website content and Feedback sections (`/admin/...` or `/staff/...`) |
| Customer review photos | `tpetie/reviews` | `product_reviews.imageUrls` | Uploaded by customers with their review |
| Order export workbooks (`.xlsx`) | `tpetie/exports`, stored as raw files | `export_jobs.fileUrl` | `/admin/exports`; deleted by the daily cron after 7 days |

## Uploading

- Back-office uploads go through `POST /api/admin/media`, one image per request. The server accepts JPEG, PNG, WebP and AVIF files of up to 4 MB.
- The browser resizes and re-encodes images before uploading them (`src/client/image-compress.ts`) to stay under Vercel's 4.5 MB request limit; back-office images that are already small enough are uploaded unchanged. Re-encoding also removes EXIF metadata such as GPS location.
- Review photos are always re-encoded and are sent together with the review: up to 5 photos, 4 MB in total.
- A library image cannot be deleted while a product, collection, site content block or feedback entry still uses it; deleting an unused image also removes it from Cloudinary.

## Rendering

`next/image` uses a custom loader (`src/lib/media/next-image-loader.ts`) that rewrites Cloudinary URLs to request the rendered width with automatic format and quality (`f_auto`, `q_auto`). Vercel Image Optimization is not used, and URLs that are not on Cloudinary are left unchanged. Plain `<img>` elements use `cloudinaryImage()` and `cloudinarySrcSet()` from `src/lib/media/cloudinary-url.ts`.

To load images from another host, add it to both `images.remotePatterns` and the `img-src` directive of the Content Security Policy in `next.config.mjs`.

## Moving to another Cloudinary account

1. Update `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
2. Run `npm run media:migrate`.

The script re-uploads every image referenced by collections, product images and `site_content` that is not already on the configured account, records it in `media_assets` and rewrites the stored URLs. The source images must still be reachable. Feedback screenshots and review photos are not migrated. Running the script again is safe: images already on the configured account are skipped.

## History

The static images that used to live in `public/images` were removed after the move to Cloudinary. Use the Git history of that path if you need them for reference.
