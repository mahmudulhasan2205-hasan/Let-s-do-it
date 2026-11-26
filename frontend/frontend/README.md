# Lets-do-it frontend

React + Vite client for the supplied Express/MongoDB backend.

## Run locally
1. From this folder run `npm install`.
2. Copy `.env.example` to `.env` and confirm `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
3. Run `npm run dev` and open the Vite URL (usually http://localhost:5173).

## Backend configuration
In the backend `.env`, set `CORS_ORIGIN=http://localhost:5173` (the backend uses credentialed CORS). Ensure the API is running on port 8000.

The frontend uses endpoints present in the uploaded backend:
- `/users/login`, `/users/register`
- `/videos`, `/videos/:videoId`
- `/comments/:videoId`
- `/likes/videos`, `/likes/videos/:videoId`
- `/subscriptions/channel/:channelId`
- `/users/history`

Registration requires an avatar image. Video publishing requires a video file and thumbnail. Uploads use the backend's Cloudinary configuration.

## Notes
- The client stores the returned access token in local storage to attach Bearer authorization headers. Use HTTPS and consider a safer token-storage strategy for production.
- Some backend auth endpoints and cookie/token expiry settings may need corrections; frontend API integration is based on the source code provided.
- This is a starter client, not a production security review.
