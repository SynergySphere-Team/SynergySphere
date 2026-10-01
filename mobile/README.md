# SynergySphere mobile

The Expo mobile client for SynergySphere. It uses the shared Express API and never connects directly to PostgreSQL.

## Run with Expo Go

From the repository root, configure `mobile/.env` with your computer’s current LAN address:

```env
EXPO_PUBLIC_API_URL=http://<COMPUTER-LAN-IP>:4000/api
```

Start the API and Expo together:

```bash
npm run dev:mobile
```

Keep your phone and computer on the same network, then scan the QR code in Expo Go. After changing `mobile/.env`, restart Expo with:

```bash
npm run start:clean --workspace=mobile
```

For database setup and troubleshooting, see the repository’s [mobile setup guide](../MOBILE_SETUP.md).
