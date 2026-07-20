// websocket-server.js
// Run: node websocket-server.js

const WebSocket = require('ws');

// Use Render's PORT or fallback to 3002 for local development
const PORT = process.env.PORT || 3002;

// ✅ Create WebSocket Server
const wss = new WebSocket.Server({ port: PORT });
console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);

// -------------------------
// Store connected clients, drivers, and rides
// -------------------------
const drivers = new Map();
const clients = new Map();
const rides = new Map();
const activeRides = new Map();
const recentCompletedRides = new Map(); // Optional if you want to track recent rides

// -------------------------
// Utility functions
// -------------------------
function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendToClient(clientId, msg) {
  if (clients.has(clientId)) {
    send(clients.get(clientId).ws, msg);
  }
}

function sendToDriver(driverId, msg) {
  if (drivers.has(driverId)) {
    send(drivers.get(driverId).ws, msg);
  }
}

// -------------------------
// Connection Handler
// -------------------------
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  console.log(`✅ New ${type} connected:`, id);

  if (type === 'driver') {
    drivers.set(id, { ws, id, data: { coords: null, status: 'available' } });
  } else if (type === 'client') {
    clients.set(id, { ws, id });
  }

  // Send initial connection confirmation
  send(ws, { type: 'connected', message: `Connected as ${type}`, id });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📩 Received from ${type} ${id}:`, message);

      switch (message.type) {
        case 'auth':
          console.log(`${type} ${id} authenticated`);
          break;

        case 'request_driver': {
          const rideRequest = {
            type: 'ride_request',
            rideId: message.rideId,
            pickupAddress: message.pickupAddress,
            destinationAddress: message.destinationAddress,
            estimatedFare: message.estimatedFare,
            pickup: message.pickup,
            clientId: message.clientId || id,
          };

          rides.set(message.rideId, {
            clientId: message.clientId || id,
            driverId: null,
          });

          let driversSent = 0;
          drivers.forEach((driver) => {
            if (driver.ws.readyState === WebSocket.OPEN && driver.data.status === 'available') {
              driver.ws.send(JSON.stringify(rideRequest));
              driversSent++;
            }
          });
          console.log(`Ride request sent to ${driversSent} drivers`);
          break;
        }

        case 'ride_response': {
          if (message.accepted) {
            if (drivers.has(id)) drivers.get(id).data.status = 'busy';

            if (rides.has(message.rideId)) rides.get(message.rideId).driverId = id;

            activeRides.set(message.rideId, {
              clientId: rides.get(message.rideId).clientId,
              driverId: id,
              status: 'ongoing',
            });

            const rideInfo = rides.get(message.rideId);
            if (rideInfo && clients.has(rideInfo.clientId)) {
              sendToClient(rideInfo.clientId, {
                type: 'driver_response',
                accepted: true,
                driverId: id,
                rideId: message.rideId,
              });
            }

            // Cancel request for other drivers
            const cancelMsg = { type: 'ride_canceled', rideId: message.rideId };
            drivers.forEach((driver, driverId) => {
              if (driverId !== id && driver.ws.readyState === WebSocket.OPEN) {
                driver.ws.send(JSON.stringify(cancelMsg));
              }
            });
          }
          break;
        }

        case 'status_update':
          if (type === 'driver' && drivers.has(id)) {
            drivers.get(id).data.status = message.status;
          }
          break;

        case 'location_update':
          if (type === 'driver' && drivers.has(id)) {
            const driver = drivers.get(id);
            driver.data.coords = message.coords;

            activeRides.forEach((ride, rideId) => {
              if (ride.driverId === id) {
                sendToClient(ride.clientId, {
                  type: 'driver_location_update',
                  rideId,
                  coords: message.coords,
                });
              }
            });
          }
          break;

        case 'ride_completed': {
          if (drivers.has(id)) drivers.get(id).data.status = 'available';

          const rideInfoComp = rides.get(message.rideId);
          if (rideInfoComp && clients.has(rideInfoComp.clientId)) {
            sendToClient(rideInfoComp.clientId, {
              type: 'ride_completed',
              rideId: message.rideId,
              driverId: id,
              fare: message.fare,
              completedAt: message.completedAt,
            });
          }

          rides.delete(message.rideId);
          activeRides.delete(message.rideId);
          break;
        }

        case 'cancel_ride': {
          const { rideId, reason, canceledBy } = message;
          const rideInfo = activeRides.get(rideId) || rides.get(rideId);
          
          if (rideInfo) {
            // Notify the other party
            if (canceledBy === 'client' && rideInfo.driverId) {
              sendToDriver(rideInfo.driverId, {
                type: 'ride_canceled',
                rideId,
                reason,
                canceledBy
              });
              // Reset driver status
              if (drivers.has(rideInfo.driverId)) {
                drivers.get(rideInfo.driverId).data.status = 'available';
              }
            } else if (canceledBy === 'driver' && rideInfo.clientId) {
              sendToClient(rideInfo.clientId, {
                type: 'ride_canceled',
                rideId,
                reason,
                canceledBy
              });
            }
            
            // Delete from active and pending rides
            activeRides.delete(rideId);
            rides.delete(rideId);
            console.log(`Ride ${rideId} canceled by ${canceledBy}. Reason: ${reason}`);
          }
          break;
        }

        case 'ping':
          send(ws, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 ${type} ${id} disconnected`);
    if (type === 'driver') drivers.delete(id);
    if (type === 'client') clients.delete(id);
  });

  ws.on('error', (err) => console.error(`⚠️ WebSocket error:`, err));
});

// -------------------------
// Cleanup disconnected clients/drivers every 30s
// -------------------------
setInterval(() => {
  drivers.forEach((driver, id) => {
    if (driver.ws.readyState !== WebSocket.OPEN) drivers.delete(id);
  });
  clients.forEach((client, id) => {
    if (client.ws.readyState !== WebSocket.OPEN) clients.delete(id);
  });
}, 30000);

// Handle process termination
process.on('SIGTERM', () => wss.close());
process.on('SIGINT', () => wss.close());
