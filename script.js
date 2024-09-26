// Initialize the map and set its view to New Zealand with a zoom level
var map = L.map("map").setView([-43.446754, 171.592242], 1);

// Add a tile layer from OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Create layer groups for the circles
var weatherCirclesLayer = L.layerGroup().addTo(map);
var behaviourCirclesLayer = L.layerGroup().addTo(map);

// Fetch the weather data from the JSON file
const getWeatherData = async () => {
  try {
    const res = await fetch("./data/weatherdata.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("Weather data fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Error fetching weather data:", err);
  }
};

// Fetch the behavior data from another JSON file
const getBehaviourData = async () => {
  try {
    const res = await fetch("./data/behaviourdata.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("Behaviour data fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Error fetching behaviour data:", err);
  }
};

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

// Adjust date forward by one day
const adjustDate = (date, offset) => {
  date.setDate(date.getDate() + offset + 1);
  return date;
};

// Function to display weather decisions based on the selected day and time period
async function displayWeatherDecision(dayOffset, timePeriod) {
  const payload = await getWeatherData();

  if (!payload) {
    console.error("No weather payload data available.");
    return;
  }

  const targetDate = adjustDate(new Date(), dayOffset);
  const targetDateString = formatDate(targetDate);

  console.log("Weather Target Date:", targetDateString, "Time Period:", timePeriod);

  // Clear existing markers in the weather circles layer
  weatherCirclesLayer.clearLayers();

  // Filter locations for the target date and time period
  const filteredLocations = payload.filter(location =>
    location.forecast.some(huntingspot => {
      const datePart = huntingspot.date;
      return datePart === targetDateString && huntingspot.time_period === timePeriod;
    })
  );

  console.log("Filtered Weather Locations:", filteredLocations);

  if (filteredLocations.length === 0) {
    console.log(`No weather locations for ${targetDateString} and ${timePeriod}.`);
    return;
  }

  // Loop over filtered locations and render them on the map
  filteredLocations.forEach(location => {
    location.forecast.forEach(huntingspot => {
      const datePart = huntingspot.date;
      if (datePart === targetDateString && huntingspot.time_period === timePeriod) {
        let lat = huntingspot.lat;
        let lon = huntingspot.lon;
        let color = huntingspot.decision;

        console.log("Rendering weather circle at:", lat, lon, "Color:", color);

        var circle = L.circle([lat, lon], {
          color: color,
          fillColor: color,
          fillOpacity: 0.5,
          radius: huntingspot.radius || 5000
        });

        circle.bindPopup(`<b>Weather Decision:</b> ${color}<br><b>Date:</b> ${huntingspot.date}`);
        weatherCirclesLayer.addLayer(circle);
      }
    });
  });

  // Adjust map view to fit all filtered points
  const bounds = filteredLocations.flatMap(location =>
    location.forecast.map(huntingspot => [huntingspot.lat, huntingspot.lon])
  );

  if (bounds.length > 0) {
    map.fitBounds(bounds);
  }
}

// Function to display behaviour decisions based on the selected day and time period
async function displayBehaviourDecision(dayOffset, timePeriod) {
  const behaviourPayload = await getBehaviourData();

  if (!behaviourPayload || !Array.isArray(behaviourPayload)) {
    console.error("Invalid behaviour payload data:", behaviourPayload);
    return;
  }

  // Clear existing markers in the behaviour circles layer
  behaviourCirclesLayer.clearLayers();

  // Determine target date
  const targetDate = adjustDate(new Date(), dayOffset);
  const targetDateString = formatDate(targetDate);
  console.log("Behaviour Target Date:", targetDateString, "Time Period:", timePeriod);

  // Loop over behavior spots and render them on the map based on date and time period
  behaviourPayload.forEach(location => {
    location.forecast.forEach(spot => {
      const { lat, lon, decision, radius, date, time_period } = spot;

      // Filter by date and time period
      if (lat !== undefined && lon !== undefined && date === targetDateString && time_period === timePeriod) {
        console.log("Rendering behaviour circle at:", lat, lon, "Color:", decision);

        const circle = L.circle([lat, lon], {
          color: decision,
          fillColor: decision,
          fillOpacity: 0.5,
          radius: radius || 5000
        });

        // Add popup information for each behavior circle
        circle.bindPopup(`<b>Behaviour Decision:</b> ${decision}<br><b>Date:</b> ${date}`);
        behaviourCirclesLayer.addLayer(circle);
      }
    });
  });

  console.log(`Added ${behaviourCirclesLayer.getLayers().length} behaviour circles to the map.`);
}

// Toggle function to show/hide the weather circles layer
function toggleWeatherCirclesLayer() {
  if (map.hasLayer(weatherCirclesLayer)) {
    map.removeLayer(weatherCirclesLayer);
  } else {
    map.addLayer(weatherCirclesLayer);
  }
}

// Toggle function to show/hide the behaviour circles layer
async function toggleBehaviourCirclesLayer() {
  console.log("Toggling Behaviour Circles Layer"); // Debug line
  if (map.hasLayer(behaviourCirclesLayer)) {
    map.removeLayer(behaviourCirclesLayer);
  } else {
    map.addLayer(behaviourCirclesLayer);
    await displayBehaviourDecision(0, 'morning'); // Call default behaviour decisions when the layer is added
  }
}

// Event listeners for toggling the layers
document.getElementById("toggleWeatherCircles").addEventListener("click", toggleWeatherCirclesLayer);
document.getElementById("toggleBehaviourCircles").addEventListener("click", toggleBehaviourCirclesLayer);

// Function to handle slider input
const timeSlider = document.getElementById('timeSlider');
const dayTimeText = document.getElementById('day-time-text');

// Define time options and their corresponding day offsets and periods
const timeOptions = [
  { label: 'Today Morning', dayOffset: 0, timePeriod: 'morning' },
  { label: 'Today Afternoon', dayOffset: 0, timePeriod: 'afternoon' },
  { label: 'Tomorrow Morning', dayOffset: 1, timePeriod: 'morning' },
  { label: 'Tomorrow Afternoon', dayOffset: 1, timePeriod: 'afternoon' },
  { label: 'Two Days Morning', dayOffset: 2, timePeriod: 'morning' },
  { label: 'Two Days Afternoon', dayOffset: 2, timePeriod: 'afternoon' }
];

// Update the text and map based on the slider value
timeSlider.addEventListener('input', async function() {
  const selectedOption = timeOptions[this.value];
  dayTimeText.textContent = selectedOption.label;
  await displayWeatherDecision(selectedOption.dayOffset, selectedOption.timePeriod);
  await displayBehaviourDecision(selectedOption.dayOffset, selectedOption.timePeriod);
});

// Initial call to display today's weather decisions for the morning
displayWeatherDecision(0, 'morning');
displayBehaviourDecision(0, 'morning');
