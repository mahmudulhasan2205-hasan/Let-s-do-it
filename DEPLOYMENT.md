# Deploying to Vercel

Deploy this repository as two Vercel projects so the frontend and API can use
their own build settings:

1. **Backend API** — repository root (`.`), using the Express framework.
2. **Frontend** — root directory `frontend/frontend`, using the Vite framework.

Both projects can use the same GitHub repository and production branch (`main`).

## 1. Deploy the backend

In Vercel, add a project and import `mahincloudgen/Let-s-do-it`.

- Set **Root Directory** to `.`.
- Select the **Express** framework preset if it is not detected automatically.
- Add the backend environment variables below for Production (and Preview if
  preview deployments should use the API).
- Deploy and copy the resulting backend URL, for example
  `https://your-api.vercel.app`.

Set these variables in the backend project's Vercel settings:

| Variable | Value |
| --- | --- |
| `MONGODB_URL` | Your MongoDB connection string |
| `CORS_ORIGIN` | Exact frontend origin, e.g. `https://your-frontend.vercel.app` |
| `ACCESS_TOKEN_SECRET` | A strong, unique secret |
| `ACCESS_TOKEN_EXPIRY` | e.g. `1d` |
| `REFRESH_TOKEN_SECRET` | A different strong, unique secret |
| `REFRESH_TOKEN_EXPIRY` | e.g. `7d` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

Do not commit real credentials or paste them into chat. `PORT` is provided by
Vercel and does not need to be configured there.

If MongoDB Atlas blocks the connection, allow connections from your deployment
environment in Atlas Network Access. Vercel deployments may not have a fixed
outbound IP unless you configure an appropriate Vercel networking option.

## Upload size limitation

The app currently sends video and image uploads through the API. Although the
backend accepts videos up to 500 MB, Vercel Functions impose their own request
body limits, so larger uploads may be rejected before reaching the backend.
For reliable large video uploads, change the flow to upload directly from the
browser to Cloudinary using a server-generated signature, or host the upload API
on a service that supports larger request bodies.

## 2. Deploy the frontend

Add another Vercel project from the same repository:

- Set **Root Directory** to `frontend/frontend`.
- Select **Vite** (or allow Vercel to detect it).
- Add this environment variable for Production and Preview:
  - `VITE_API_BASE_URL=https://your-api.vercel.app/api/v1`
- Deploy and copy the frontend's production URL.

Then update the backend project's `CORS_ORIGIN` to the exact frontend production
origin, with no trailing slash, and redeploy the backend. If the frontend URL
changes, update this value. Preview frontend URLs also need to be explicitly
allowed by the backend before browser requests from those previews will work.

## 3. Verify

- Open the frontend deployment and confirm the Explore page loads.
- Open `https://your-api.vercel.app/api/v1/videos`; it should return JSON.
- Test sign-in and uploads after confirming MongoDB and Cloudinary environment
  variables are set.

The backend exports its Express app for Vercel and connects to MongoDB on API
requests. Locally, `npm run dev` continues to start the backend on port 8000.
