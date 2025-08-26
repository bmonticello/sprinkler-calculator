const zonesContainer = document.getElementById("sprinklerZones");
const resultsDiv = document.getElementById("results");
const zipcodeInput = document.getElementById("zipcode");
const latInput = document.getElementById("latitude");
const lonInput = document.getElementById("longitude");
const wateringFrequencyInput = document.getElementById("wateringFrequency");
const etReplacementInput = document.getElementById("etReplacement");
const formulaInput = document.getElementById("formulaInput");
const addZoneBtn = document.getElementById("addZoneBtn");

// Add a sprinkler zone input row
function addZone(name = "", rate = "") {
  const div = document.createElement("div");
  div.classList.add("zone-row");
  div.innerHTML = `
    <input type="text" class="zone-name" placeholder="Zone name" value="${name}" />
    <input type="number" class="zone-rate" min="0" placeholder="Minutes per 1 inch" value="${rate}" />
    <button type="button" title="Remove zone" aria-label="Remove zone">×</button>
  `;
  const btn = div.querySelector("button");
  btn.onclick = () => div.remove();
  zonesContainer.appendChild(div);
}

// Start with one empty zone on page load
addZone();

// Location button - get user's current location, then reverse geocode to ZIP
document.getElementById("locationBtn").addEventListener("click", async () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      latInput.value = lat;
      lonInput.value = lon;

      // Try to reverse geocode to ZIP code using Nominatim
      let zip = "";
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.address && data.address.postcode) {
            zip = data.address.postcode.match(/^\d{5}/) ? data.address.postcode.substring(0, 5) : "";
            zipcodeInput.value = zip;
          }
        }
      } catch (e) {
        // If reverse geocode fails, leave ZIP blank
      }
    },
    (err) => alert("Could not get location: " + err.message)
  );
});

// Add zone button
addZoneBtn.addEventListener("click", () => addZone());

// Helper functions
function sumArray(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function formatMinutes(mins) {
  if (mins <= 0) return "0 min";
  let hrs = Math.floor(mins / 60);
  let minutes = Math.round(mins % 60);
  return hrs > 0 ? `${hrs} hr ${minutes} min` : `${minutes} min`;
}

async function fetchWeatherData(lat, lon) {
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDateObj = new Date();
  endDateObj.setDate(today.getDate() + 6);
  const endDate = endDateObj.toISOString().slice(0, 10);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,et0_fao_evapotranspiration&forecast_days=7&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&models=gfs_seamless`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch weather data");
  return resp.json();
}

// Get lat/lon for a zipcode using Nominatim
async function getLatLonFromZip(zip) {
  // Nominatim limits: 1 request/sec for fair use
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=us&format=jsonv2&limit=1`);
  if (!resp.ok) throw new Error("Failed to look up ZIP code location");
  const data = await resp.json();
  if (!data || !data.length) throw new Error("Could not find location for ZIP code");
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

// Evaluate formula safely with user input
function evaluateFormula(formula, vars) {
  try {
    let exp = formula;
    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      exp = exp.replace(regex, val);
    }
    if (!/^[0-9+\-*/().\s]+$/.test(exp)) {
      throw new Error("Invalid characters in formula.");
    }
    // eslint-disable-next-line no-new-func
    return Function(`"use strict";return (${exp})`)();
  } catch {
    throw new Error("Formula evaluation failed. Please check your formula syntax.");
  }
}

// Validate that either ZIP or both lat/lon are entered
function getUserLocationInput() {
  const zip = zipcodeInput.value.trim();
  const latVal = latInput.value.trim();
  const lonVal = lonInput.value.trim();

  if (zip && zip.match(/^\d{5}$/)) {
    // Prefer ZIP, ignore lat/lon unless user enters both and not zip
    return { mode: "zip", zip };
  }
  if (latVal && lonVal && !zip) {
    const lat = parseFloat(latVal);
    const lon = parseFloat(lonVal);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { mode: "latlon", lat, lon };
    }
  }
  // If neither, error
  return null;
}

document.getElementById("calculateBtn").addEventListener("click", async () => {
  resultsDiv.style.display = "block";
  resultsDiv.textContent = "Validating location input...";

  // Location logic
  const loc = getUserLocationInput();
  let lat, lon;
  if (!loc) {
    resultsDiv.textContent = "Please enter a valid ZIP code (5 digits) or both latitude and longitude.";
    // Scroll to results for error message
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (loc.mode === "zip") {
    try {
      resultsDiv.textContent = "Looking up ZIP code location...";
      const res = await getLatLonFromZip(loc.zip);
      lat = res.lat;
      lon = res.lon;
      // Also fill lat/lon fields for clarity
      latInput.value = lat.toFixed(4);
      lonInput.value = lon.toFixed(4);
    } catch (e) {
      resultsDiv.textContent = "Could not find latitude/longitude for ZIP code: " + e.message;
      resultsDiv.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  } else if (loc.mode === "latlon") {
    lat = loc.lat;
    lon = loc.lon;
  }

  let W = parseFloat(wateringFrequencyInput.value);
  if (isNaN(W) || W <= 0) W = 2;

  let ETrepl = parseFloat(etReplacementInput.value);
  if (isNaN(ETrepl) || ETrepl < 0 || ETrepl > 100) ETrepl = 75;
  ETrepl = ETrepl / 100;

  const formulaRaw = formulaInput.value.trim();
  const formula = formulaRaw || "(W / 7) * (ET * ETrepl - R) * Rate";

  // Read sprinkler zones
  const zones = [];
  const rows = zonesContainer.querySelectorAll(".zone-row");
  for (const row of rows) {
    const name = row.querySelector(".zone-name").value.trim();
    const rateStr = row.querySelector(".zone-rate").value;
    const rate = parseFloat(rateStr);
    if (!name || isNaN(rate) || rate < 0) {
      resultsDiv.textContent = "Please enter valid zone names and runtimes.";
      resultsDiv.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    zones.push({ name, rate });
  }

  try {
    resultsDiv.textContent = "Fetching weather data...";
    const data = await fetchWeatherData(lat, lon);

    if (!data.daily || !data.daily.precipitation_sum || !data.daily.et0_fao_evapotranspiration) {
      resultsDiv.textContent = "Incomplete weather data received.";
      resultsDiv.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const weeklyRainfall = sumArray(data.daily.precipitation_sum);
    const weeklyET = sumArray(data.daily.et0_fao_evapotranspiration);

    // Calculate runtimes
    const resultLines = zones.map(({ name, rate }) => {
      const vars = {
        W,
        ET: weeklyET,
        R: weeklyRainfall,
        Rate: rate,
        ETrepl,
      };
      let runtime;
      try {
        runtime = evaluateFormula(formula, vars);
      } catch (err) {
        resultsDiv.textContent = err.message;
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
        throw err;
      }
      if (runtime < 0) runtime = 0;
      return `${name}: ${formatMinutes(runtime)}`;
    });

    resultsDiv.innerHTML =
      `<strong>Weekly ET (evapotranspiration):</strong> ${weeklyET.toFixed(3)} inches<br>` +
      `<strong>Predicted 7-Day Rainfall:</strong> ${weeklyRainfall.toFixed(3)} inches<br><br>` +
      `<strong>Sprinkler Runtime (every ${W} days, ${Math.round(ETrepl * 100)}% weekly ET replacement):</strong><br>` +
      resultLines.join("<br>");
    // Scroll to the results (even on success)
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    if (!resultsDiv.textContent.includes("Formula evaluation failed")) {
      resultsDiv.textContent = `Error fetching weather data: ${error.message}`;
    }
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
  }
});

// If user enters ZIP, clear lat/lon; if user enters lat/lon, clear ZIP (for clarity)
zipcodeInput.addEventListener("input", function() {
  if (zipcodeInput.value.trim().length === 5) {
    latInput.value = "";
    lonInput.value = "";
  }
});
function clearZipIfLatLon() {
  if (latInput.value.trim() && lonInput.value.trim()) {
    zipcodeInput.value = "";
  }
}
latInput.addEventListener("input", clearZipIfLatLon);
lonInput.addEventListener("input", clearZipIfLatLon);

// RESET BUTTON FUNCTIONALITY
document.getElementById("resetBtn").addEventListener("click", function() {
  // Clear all inputs
  zipcodeInput.value = "";
  latInput.value = "";
  lonInput.value = "";
  wateringFrequencyInput.value = "";
  etReplacementInput.value = "";
  formulaInput.value = "";

  // Remove all zone rows
  const zoneRows = zonesContainer.querySelectorAll(".zone-row");
  zoneRows.forEach(row => row.remove());

  // Add back one empty zone
  addZone();

  // Hide results
  resultsDiv.style.display = "none";
  resultsDiv.textContent = "";

  // Scroll to top of page smoothly
  // Prefer scrolling to the main container's top (or the heading)
  const pageTop = document.getElementById("pageTop");
  if (pageTop && typeof pageTop.scrollIntoView === "function") {
    pageTop.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* Mobile-friendly navigation toggle */
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  const mq = window.matchMedia('(min-width: 768px)');

  function setOpen(isOpen) {
    toggle.setAttribute('aria-expanded', String(isOpen));
    const sr = toggle.querySelector('.sr-only');
    if (sr) sr.textContent = isOpen ? 'Close menu' : 'Open menu';
    nav.classList.toggle('open', isOpen);
  }

  function syncToViewport() {
    // Always reset to closed when switching contexts
    setOpen(false);
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!expanded);
  });

  // Close when clicking a link (on mobile)
  nav.addEventListener('click', (e) => {
    const link = e.target instanceof Element && e.target.closest('a');
    if (!mq.matches && link) setOpen(false);
  });

  // Close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Click outside to close (on mobile)
  document.addEventListener('click', (e) => {
    if (mq.matches) return;
    const insideHeader = e.target instanceof Element && e.target.closest('.site-header');
    if (!insideHeader && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
    }
  });

  if (mq.addEventListener) mq.addEventListener('change', syncToViewport);
  else if (mq.addListener) mq.addListener(syncToViewport);

  syncToViewport();
})();
