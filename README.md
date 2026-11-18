# shortener-frontend

react + vite ui for the link shortener.

## run locally

1. make sure the backend is running on port 3002
2. `npm install`
3. `npm run dev`

open http://localhost:5174. the vite dev server proxies /api and /s/ to the backend.

## on the server

1. `npm install && npm run build`
2. copy `dist/` to /var/www/shortener-frontend
3. nginx config is in `deploy/nginx.conf` (port 4001)
