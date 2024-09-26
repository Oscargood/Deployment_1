// Modal Popup Logic
const modal = document.getElementById('popupModal'); // Reference to the modal element
const infoButton = document.getElementById('infoButton'); // Reference to the "Info" button
const closeModal = document.querySelector('.close'); // Reference to the close (X) button

// Show the modal when the page loads
window.onload = function() {
    modal.style.display = 'block'; // Show the modal
}

// When the user clicks the "Info" button, show the modal
infoButton.onclick = function() {
    modal.style.display = 'block'; // Show the modal when Info button is clicked
}

// When the user clicks on the close button (x), hide the modal
closeModal.onclick = function() {
    modal.style.display = 'none'; // Hide the modal when the close button is clicked
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none'; // Hide the modal if the user clicks outside the modal
    }
}

// Initialize the map and set its view to New Zealand with a zoom level
var map = L.map("map").setView([-43.446754, 171.592242], 7);

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

// Define the time periods based on your requirements
const timePeriods = [
    "06:00 to 09:00", // Morning
    "09:00 to 12:00", // Late Morning
    "12:00 to 15:00", // Afternoon
    "15:00 to 18:00", // Early Evening
    "18:00 to 21:00", // Evening
    "21:00 to 24:00", // Night
    "00:00 to 03:00", // Late Night
    "03:00 to 06:00"  // Dawn
];

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

// Toggle Weather Circles and highlight button
document.getElementById("toggleWeatherCircles").addEventListener("click", function () {
    const weatherButton = this; // Reference the clicked button

    if (map.hasLayer(weatherCirclesLayer)) {
        map.removeLayer(weatherCirclesLayer);
        weatherButton.classList.remove("selected"); // Remove selected class when layer is hidden
    } else {
        map.addLayer(weatherCirclesLayer);
        weatherButton.classList.add("selected"); // Add selected class when layer is shown
    }
});

// Toggle Behaviour Circles and highlight button
document.getElementById("toggleBehaviourCircles").addEventListener("click", function () {
    const behaviourButton = this; // Reference the clicked button

    if (map.hasLayer(behaviourCirclesLayer)) {
        map.removeLayer(behaviourCirclesLayer);
        behaviourButton.classList.remove("selected"); // Remove selected class when layer is hidden
    } else {
        map.addLayer(behaviourCirclesLayer);
        behaviourButton.classList.add("selected"); // Add selected class when layer is shown
    }
});

// Function to handle slider input for day and time period selection
const timeSlider = document.getElementById("timeSlider");
timeSlider.addEventListener('input', async () => {
    const sliderValue = parseInt(timeSlider.value, 10);
    const dayOffset = Math.floor(sliderValue / 8); // 0, 1, 2 for 3 days
    const timeIndex = sliderValue % 8; // 0 to 7 for 8 time ranges

    // Mapping timeIndex to actual time period (assuming they correspond)
    const selectedTimePeriod = timePeriods[timeIndex]; // Ensure this matches your JSON structure
    document.getElementById('day-time-text').textContent = `Day ${dayOffset + 1} ${selectedTimePeriod}`;

    // Call the display function with the selected time period
    await displayWeatherDecision(dayOffset, selectedTimePeriod);
    await displayBehaviourDecision(dayOffset, selectedTimePeriod);
});

// Array of animal behaviour notes
const behaviourNotes = [
  "Animals are most active at dawn and dusk.",
  "Weather conditions can significantly impact animal movement.",
  "Animals are active feeding on spring growth",
  "Tahr have been sighted feeding around 900m elevation",
  "Stags are feeding in open country with bachelor groups",
  "Hinds are preffering dense vegetation as they birth and raise their fawns"
];

// Reference to the static text box
const behaviourTextBox = document.getElementById("static_text_box");

// Set an interval to cycle through the notes every 5 seconds (5000 ms)
let noteIndex = 0;
setInterval(() => {
  // Update the text content with the current note
  behaviourTextBox.textContent = behaviourNotes[noteIndex];
  
  // Increment the index and reset if it exceeds the number of notes
  noteIndex = (noteIndex + 1) % behaviourNotes.length;
}, 5000); // Change text every 5 seconds

// Initialize map view and display initial weather and behavior decisions
window.onload = async function() {
    await displayWeatherDecision(0, timePeriods[0]); // Display default for Day 1, Morning
    await displayBehaviourDecision(0, timePeriods[0]); // Display default behaviour for Day 1, Morning
};

