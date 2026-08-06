# barcode_system

## Run

1. Install root dependencies:
   - `npm install`
2. Install client dependencies:
   - `cd client && npm install`
3. Start everything:
   - `npm start`

## Notes

- Update scanner ports in `server/serialServer.js` (`scannerPorts.A` and `scannerPorts.B`).
- Server broadcasts scanner-tagged payloads over `ws://localhost:8080`.
