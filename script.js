// Reference to the static text box for behavior notes
const behaviourTextBox = document.getElementById("static_text_box");

// Array of animal behaviour notes
const behaviourNotes = [
  "Animals are most active at dawn and dusk.",
  "Weather conditions significantly impact animal movement.",
  "Animals are active feeding on new spring growth right now.",
  "Tahr have been sighted feeding around 900m elevation.",
  "Stags are feeding in open country within bachelor groups.",
  "Hinds are preferring dense vegetation as they birth and raise their fawns."
];

// Set an interval to cycle through the notes every 5 seconds (5000 ms)
let noteIndex = 0;
setInterval(() => {
  // Update the text content with the current note
  behaviourTextBox.textContent = behaviourNotes[noteIndex];
  
  // Increment the index and reset if it exceeds the number of notes
  noteIndex = (noteIndex + 1) % behaviourNotes.length;
}, 5000); // Change text every 5 seconds

// Modal Popup Logic
const modal = document.getElementById('popupModal'); // Reference to the modal element
const infoButton = document.getElementById('infoButton'); // Reference to the "Info" button
const closeModal = document.querySelector('.close'); // Reference to the close (X) button

// Show the modal when the page loads
window.addEventListener('load', function() {
    modal.style.display = 'block'; // Show the modal
    initializeMap(); // Initialize the map and display behavior decisions
});

// When the user clicks the "Info" button, show the modal
infoButton.onclick = function() {
    modal.style.display = 'block'; // Show the modal when Info button is clicked
};

// When the user clicks on the close button (x), hide the modal
closeModal.onclick = function() {
    modal.style.display = 'none'; // Hide the modal when the close button is clicked
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none'; // Hide the modal if the user clicks outside the modal
    }
};

// Initialize the map and set its view to New Zealand with a zoom level
var map = L.map("map").setView([-43.446754, 171.592242], 7);

// Add a tile layer from OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// Create layer group for the behaviour circles
var behaviourCirclesLayer = L.layerGroup().addTo(map);

// Fetch the behaviour data from movement.json
const getBehaviourData = async () => {
    try {
        const res = await fetch("data/movement.json"); // Corrected path
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

// Adjust date forward by offset days
const adjustDate = (date, offset) => {
    const newDate = new Date(date); // Create a new Date object to avoid mutating the original
    newDate.setDate(newDate.getDate() + offset);
    return newDate;
};

// Define the time periods based on your requirements
const timePeriods = [
    '00:00 to 03:00',
    '03:00 to 06:00',
    '06:00 to 09:00',
    '09:00 to 11:00',
    '11:00 to 14:00',
    '14:00 to 17:00',
    '17:00 to 21:00',
    '21:00 to 24:00',
];

// Function to display behaviour decisions based on the selected day and time period
async function displayBehaviourDecision(dayOffset, timePeriod) {
    const behaviourPayload = await getBehaviourData();

    // Check if the payload is valid and is an array
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
        // Check if the location has a forecast array
        if (Array.isArray(location.forecast)) {
            location.forecast.forEach(spot => {
                const { date, decision, lat, lon, radius, time_period, movement_score, temperature, rain, snow, wind_speed, wind_direction, condition, most_influential_factors } = spot;

                // Filter by date and time period
                if (lat !== undefined && lon !== undefined && date === targetDateString && time_period === timePeriod) {
                    console.log("Rendering behaviour circle at:", lat, lon, "Color:", decision);

                    const circle = L.circle([lat, lon], {
                        color: decision,
                        fillColor: decision,
                        fillOpacity: 0.5,
                        radius: radius || 5000
                    });

                  // Add popup information for each behavior circle with enhanced data
                circle.bindPopup(`
                     <div class="popup-content">
                         <b>Behaviour Decision:</b> ${decision}<br>
                         <b>Date:</b> ${date}<br>
                         <b>Movement Score:</b> ${movement_score}<br>
                         <b>Temperature:</b> ${temperature}°C<br>
                         <b>Rain:</b> ${rain}mm<br>
                         <b>Snow:</b> ${snow}cm<br>
                         <b>Wind Speed:</b> ${wind_speed} km/h<br>
                         <b>Wind Direction:</b> ${wind_direction}<br>
                         <b>Condition:</b> ${condition}<br>
                         <b>Most Influential Factors:</b> ${Array.isArray(most_influential_factors) ? most_influential_factors.join(', ') : 'None'}
                     </div>
                `);
                
                    behaviourCirclesLayer.addLayer(circle);
                }
            });
        } else {
            console.warn("No forecast array in location:", location);
        }
    });

    console.log(`Added ${behaviourCirclesLayer.getLayers().length} behaviour circles to the map.`);
}

// Function to initialize the map and display initial behavior decisions
async function initializeMap() {
    // Define default dayOffset and timePeriod
    currentDayOffset = 0;
    currentSelectedTimePeriod = timePeriods[2]; // '06:00 to 09:00' as default

    // Display initial behaviour decisions
    await displayBehaviourDecision(currentDayOffset, currentSelectedTimePeriod);
}

// Function to format date as 'Day of the week, Month Day'
const formatDateDisplay = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-NZ', options); // 'en-NZ' for New Zealand locale
};

// Adjust date by dayOffset and return a new Date object
const getAdjustedDate = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset); // Adjust the date by the given offset
    return date;
};

// Get slider and text elements
const timeSlider = document.getElementById('timeSlider');
const dayTimeText = document.getElementById('day-time-text');

// Global variables to keep track of current day offset and time period
let currentDayOffset = 0;
let currentSelectedTimePeriod = timePeriods[2]; // '06:00 to 09:00' as default

// Function to handle slider input for day and time period selection
timeSlider.addEventListener('input', async () => {
    const sliderValue = parseInt(timeSlider.value, 10);
    const dayOffset = Math.floor(sliderValue / 8); // 0, 1, 2, 3 for 4 days
    const timeIndex = sliderValue % 8; // 0 to 7 for 8 time ranges

    // Mapping timeIndex to actual time period
    const selectedTimePeriod = timePeriods[timeIndex]; // Ensure this matches your JSON structure

    // Update global variables
    currentDayOffset = dayOffset;
    currentSelectedTimePeriod = selectedTimePeriod;

    // Get the adjusted date based on the offset
    const adjustedDate = getAdjustedDate(dayOffset);
    const formattedDate = formatDateDisplay(adjustedDate); // Format date to a readable string

    // Update the day-time-text element with the formatted date and time period
    dayTimeText.textContent = `${formattedDate} - ${selectedTimePeriod}`;

    // Call the display function with the selected day and time period
    await displayBehaviourDecision(dayOffset, selectedTimePeriod);
});

// Toggle Behaviour Circles and highlight button
document.getElementById("toggleBehaviourCircles").addEventListener("click", async function () {
    const behaviourButton = this; // Reference the clicked button

    if (map.hasLayer(behaviourCirclesLayer)) {
        map.removeLayer(behaviourCirclesLayer);
        behaviourButton.classList.remove("selected"); // Remove selected class when layer is hidden
    } else {
        await displayBehaviourDecision(currentDayOffset, currentSelectedTimePeriod);
        map.addLayer(behaviourCirclesLayer);
        behaviourButton.classList.add("selected"); // Add selected class when layer is shown
    }
});
