# SC-CBBA Web Admin

Frontend administrativo React para Seguridad Ciudadana Cochabamba.

## Stack

- React + Vite
- React Router
- Axios
- TanStack Query
- Leaflet + OpenStreetMap
- Socket.IO Client
- Recharts
- Lottie React
- Lucide Icons

## Inicio

```bash
cp .env.example .env
npm install
npm run dev
```

Variables:

```text
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors
```

## Branding

Coloca:

```text
public/branding/logo_alcaldia_cbba.png
public/branding/logo_dsc.png
```

## Animaciones

Coloca los JSON Lottie indicados en `public/animations/README.md`.

## Producción

```bash
npm run build
npm run preview
```
