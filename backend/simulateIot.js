const axios = require('axios');

const SENSOR_COUNT = 91;
const API_URL = 'http://localhost:5000/api/dashboard/iot-update';

const locations = [
  { name: 'Koramangala Block 5', zone: 'Koramangala North', lat: 12.9344, lng: 77.6221, ward: 'Ward 147' },
  { name: 'Koramangala BDA Complex', zone: 'Koramangala North', lat: 12.9354, lng: 77.6241, ward: 'Ward 147' },
  { name: '100ft Road', zone: 'Indiranagar', lat: 12.9784, lng: 77.6408, ward: 'Ward 88' },
  { name: 'CMH Road', zone: 'Indiranagar', lat: 12.9794, lng: 77.6388, ward: 'Ward 88' },
  { name: 'ITPB Main Gate', zone: 'Whitefield', lat: 12.9854, lng: 77.7348, ward: 'Ward 84' },
  { name: 'Hope Farm Circle', zone: 'Whitefield', lat: 12.9824, lng: 77.7308, ward: 'Ward 84' },
  { name: '4th Block Complex', zone: 'Jayanagar', lat: 12.9298, lng: 77.5800, ward: 'Ward 169' },
  { name: 'South End Circle', zone: 'Jayanagar', lat: 12.9388, lng: 77.5805, ward: 'Ward 169' }
];

let sensors = Array.from({ length: SENSOR_COUNT }).map((_, i) => {
  const loc = locations[Math.floor(Math.random() * locations.length)];
  return {
    binId: `BIN-${1000 + i}`,
    fillLevel: Math.floor(Math.random() * 40),
    wasteType: wasteTypes[Math.floor(Math.random() * wasteTypes.length)],
    ward: loc.ward,
    zone: loc.zone,
    location: loc.name,
    lat: loc.lat + (Math.random() - 0.5) * 0.03, // random jitter
    lng: loc.lng + (Math.random() - 0.5) * 0.03, // random jitter
    batteryLevel: Math.floor(Math.random() * 40) + 60, // 60-100%
    sensorStatus: Math.random() > 0.95 ? 'faulty' : 'active'
  };
});

console.log(`[IoT Simulator] Starting fleet size: ${SENSOR_COUNT} bins.`);

const simulateTick = async () => {
  const numUpdates = Math.floor(Math.random() * 8) + 1;
  const metrics = [];

  for (let i = 0; i < numUpdates; i++) {
    const sensorIdx = Math.floor(Math.random() * SENSOR_COUNT);
    const sensor = sensors[sensorIdx];

    if (sensor.sensorStatus === 'faulty') {
      if (Math.random() > 0.8) sensor.sensorStatus = 'active';
    } else {
      if (Math.random() > 0.98) sensor.sensorStatus = 'faulty';
    }

    if (sensor.sensorStatus === 'active') {
      sensor.fillLevel += Math.floor(Math.random() * 20) + 2; // Accelerated fill
      if (Math.random() > 0.9) sensor.fillLevel += 40; // Sudden dumping simulation
      if (sensor.fillLevel > 100) sensor.fillLevel = 100;
      
      // Battery algorithm
      if (Math.random() > 0.5) sensor.batteryLevel -= 1;
      if (Math.random() > 0.95) sensor.batteryLevel -= 15; // Hardware anomaly drain
      
      if (sensor.batteryLevel < 0) sensor.batteryLevel = 0;
      if (sensor.batteryLevel === 0) sensor.sensorStatus = 'faulty';
    }

    try {
      await axios.post(API_URL, {
        binId: sensor.binId,
        fillLevel: sensor.fillLevel,
        wasteType: sensor.wasteType,
        sensorStatus: sensor.sensorStatus,
        ward: sensor.ward,
        location: sensor.location,
        lat: sensor.lat,
        lng: sensor.lng,
        batteryLevel: sensor.batteryLevel,
        zone: sensor.zone
      });
      process.stdout.write(`\r[IoT Simulator] Updated ${sensor.binId} to ${sensor.fillLevel}% (Battery: ${sensor.batteryLevel}%)`);
    } catch (err) { }
  }
  console.log(`[IoT] Tick ->`, metrics.join(', '));
};

// Initial sync
(async () => {
  console.log('[IoT Simulator] Initializing fleet datastore...');
  for (const s of sensors) {
    try { await axios.post(API_URL, s); } catch (e) {}
  }
  console.log('[IoT Simulator] System Online. Ticking every 3.5s.');
  setInterval(simulateTick, 3500);
})();
