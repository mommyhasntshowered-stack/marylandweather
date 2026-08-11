/* Shared weather engine — Open-Meteo (forecast) + NWS (alerts). No API key required. */
(function (global) {
  "use strict";

  const CITIES = [
    { id: "baltimore",     name: "Baltimore",     lat: 39.2904, lon: -76.6122 },
    { id: "annapolis",     name: "Annapolis",     lat: 38.9784, lon: -76.4922 },
    { id: "ocean-city",    name: "Ocean City",    lat: 38.3365, lon: -75.0849 },
    { id: "rockville",     name: "Rockville",     lat: 39.0840, lon: -77.1528 },
    { id: "frederick",     name: "Frederick",     lat: 39.4143, lon: -77.4105 },
    { id: "salisbury",     name: "Salisbury",     lat: 38.3607, lon: -75.5994 },
    { id: "hagerstown",    name: "Hagerstown",    lat: 39.6418, lon: -77.7200 },
    { id: "columbia",      name: "Columbia",      lat: 39.2037, lon: -76.8610 },
    { id: "silver-spring", name: "Silver Spring", lat: 38.9907, lon: -77.0261 },
    { id: "gaithersburg",  name: "Gaithersburg",  lat: 39.1434, lon: -77.2014 },
    { id: "bethesda",      name: "Bethesda",      lat: 38.9847, lon: -77.0947 },
    { id: "cumberland",    name: "Cumberland",    lat: 39.6528, lon: -78.7625 },
    { id: "bowie",         name: "Bowie",         lat: 38.9426, lon: -76.7302 },
    { id: "cambridge",     name: "Cambridge",     lat: 38.5632, lon: -76.0788 },
    { id: "college-park",  name: "College Park",  lat: 38.9807, lon: -76.9369 },
    { id: "waldorf",       name: "Waldorf",       lat: 38.6246, lon: -76.9391 }
  ];

  // WMO weather codes → icon + description
  const WEATHER_CODES = {
    0:  ["☀️", "Clear sky"],
    1:  ["🌤️", "Mainly clear"],
    2:  ["⛅", "Partly cloudy"],
    3:  ["☁️", "Overcast"],
    45: ["🌫️", "Fog"],
    48: ["🌫️", "Depositing rime fog"],
    51: ["🌦️", "Light drizzle"],
    53: ["🌦️", "Drizzle"],
    55: ["🌦️", "Dense drizzle"],
    56: ["🌧️", "Freezing drizzle"],
    57: ["🌧️", "Freezing drizzle"],
    61: ["🌧️", "Light rain"],
    63: ["🌧️", "Rain"],
    65: ["🌧️", "Heavy rain"],
    66: ["🌧️", "Freezing rain"],
    67: ["🌧️", "Freezing rain"],
    71: ["🌨️", "Light snow"],
    73: ["🌨️", "Snow"],
    75: ["🌨️", "Heavy snow"],
    77: ["🌨️", "Snow grains"],
    80: ["🌦️", "Rain showers"],
    81: ["🌦️", "Rain showers"],
    82: ["⛈️", "Violent rain showers"],
    85: ["🌨️", "Snow showers"],
    86: ["🌨️", "Snow showers"],
    95: ["⛈️", "Thunderstorm"],
    96: ["⛈️", "Thunderstorm with hail"],
    99: ["⛈️", "Thunderstorm with hail"]
  };

  function weatherInfo(code) {
    return WEATHER_CODES[code] || ["❓", "Unknown"];
  }

  async function fetchForecast(lat, lon) {
    const url = "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation" +
      "&hourly=temperature_2m,weather_code,precipitation_probability" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch" +
      "&timezone=America%2FNew_York&forecast_days=8";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast request failed (" + res.status + ")");
    return res.json();
  }

  async function fetchAlerts(lat, lon) {
    const url = "https://api.weather.gov/alerts/active?point=" + lat + "," + lon;
    const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data && data.features) || [];
  }

  function fmtHour(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", timeZone: "America/New_York" });
  }

  function fmtDay(iso, index) {
    if (index === 0) return "Today";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" });
  }

  // ---------- Rendering ----------

  function renderCurrent(root, data, cityName) {
    const cur = data.current;
    const [icon, desc] = weatherInfo(cur.weather_code);
    root.querySelector("#current-icon").textContent = icon;
    root.querySelector("#current-temp").textContent = Math.round(cur.temperature_2m) + "°";
    root.querySelector("#current-desc").textContent = desc + (cityName ? " in " + cityName : "");
    root.querySelector("#stat-feels").textContent = Math.round(cur.apparent_temperature) + "°";
    root.querySelector("#stat-humidity").textContent = Math.round(cur.relative_humidity_2m) + "%";
    root.querySelector("#stat-wind").textContent = Math.round(cur.wind_speed_10m) + " mph";
    const precipNow = data.hourly && data.hourly.precipitation_probability ? data.hourly.precipitation_probability[0] : null;
    root.querySelector("#stat-precip").textContent = (precipNow != null ? precipNow : 0) + "%";
    const updated = root.querySelector("#last-updated");
    if (updated) {
      updated.textContent = "Updated " + new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }) + " ET";
    }
  }

  function renderForecast(root, daily) {
    const container = root.querySelector("#forecast-row");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < Math.min(7, daily.time.length); i++) {
      const [icon] = weatherInfo(daily.weather_code[i]);
      const card = document.createElement("div");
      card.className = "day-card";
      card.innerHTML =
        '<div class="day-name">' + fmtDay(daily.time[i], i) + "</div>" +
        '<div class="day-icon" aria-hidden="true">' + icon + "</div>" +
        '<div class="day-hi">' + Math.round(daily.temperature_2m_max[i]) + "°</div>" +
        '<div class="day-lo">' + Math.round(daily.temperature_2m_min[i]) + "°</div>" +
        '<div class="day-precip">' + Math.round(daily.precipitation_probability_max[i] || 0) + "% rain</div>";
      container.appendChild(card);
    }
  }

  function renderAlerts(root, features) {
    const banner = root.querySelector("#alert-banner");
    if (!banner) return;
    if (!features || !features.length) {
      banner.hidden = true;
      banner.innerHTML = "";
      return;
    }
    const rank = { Extreme: 3, Severe: 3, Moderate: 2, Minor: 1, Unknown: 1 };
    let worst = 1;
    const items = features.slice(0, 4).map(function (f) {
      const p = f.properties;
      const sev = rank[p.severity] || 1;
      worst = Math.max(worst, sev);
      const icon = sev === 3 ? "⛔" : sev === 2 ? "⚠️" : "ℹ️";
      return '<div class="alert-item"><span class="alert-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="alert-body"><strong>' + p.event + '</strong><span>' + (p.headline || p.areaDesc || "") + '</span></span></div>';
    });
    banner.className = "alert-banner " + (worst === 3 ? "sev-critical" : worst === 2 ? "sev-warning" : "");
    banner.innerHTML = items.join("");
    banner.hidden = false;
  }

  // ---------- Hourly SVG chart ----------
  // Single-series line chart, per house style: 2px rounded line, 10% area wash,
  // hairline gridlines, crosshair + tooltip on hover, no legend (one series).

  function renderHourlyChart(container, hourly, hoursAhead) {
    hoursAhead = hoursAhead || 24;
    container.innerHTML = "";

    const now = new Date();
    let startIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]) >= now) { startIdx = i; break; }
    }
    const times = hourly.time.slice(startIdx, startIdx + hoursAhead);
    const temps = hourly.temperature_2m.slice(startIdx, startIdx + hoursAhead);
    if (!times.length) return;

    const W = 640, H = 220;
    const padL = 34, padR = 12, padT = 16, padB = 26;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    const min = Math.min.apply(null, temps);
    const max = Math.max.apply(null, temps);
    const niceMin = Math.floor((min - 3) / 5) * 5;
    const niceMax = Math.ceil((max + 3) / 5) * 5;

    function x(i) { return padL + (i / (temps.length - 1)) * plotW; }
    function y(t) { return padT + (1 - (t - niceMin) / (niceMax - niceMin)) * plotH; }

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Hourly temperature forecast, " + Math.round(min) + " to " + Math.round(max) + " degrees Fahrenheit over the next " + hoursAhead + " hours");

    const gridGroup = document.createElementNS(svgNS, "g");
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const t = niceMin + (s / steps) * (niceMax - niceMin);
      const gy = y(t);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", padL); line.setAttribute("x2", W - padR);
      line.setAttribute("y1", gy); line.setAttribute("y2", gy);
      line.setAttribute("stroke", "var(--gridline)");
      line.setAttribute("stroke-width", "1");
      gridGroup.appendChild(line);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", padL - 8); label.setAttribute("y", gy + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "chart-axis-label");
      label.textContent = Math.round(t) + "°";
      gridGroup.appendChild(label);
    }
    svg.appendChild(gridGroup);

    // x-axis hour labels, roughly every 4 hours
    const xLabelGroup = document.createElementNS(svgNS, "g");
    for (let i = 0; i < times.length; i += 4) {
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x(i));
      label.setAttribute("y", H - 6);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "chart-axis-label");
      label.textContent = fmtHour(times[i]);
      xLabelGroup.appendChild(label);
    }
    svg.appendChild(xLabelGroup);

    // area fill
    let areaPath = "M " + x(0) + " " + y(temps[0]);
    for (let i = 1; i < temps.length; i++) areaPath += " L " + x(i) + " " + y(temps[i]);
    areaPath += " L " + x(temps.length - 1) + " " + (H - padB) + " L " + x(0) + " " + (H - padB) + " Z";
    const area = document.createElementNS(svgNS, "path");
    area.setAttribute("d", areaPath);
    area.setAttribute("fill", "var(--series-1-wash)");
    area.setAttribute("stroke", "none");
    svg.appendChild(area);

    // line
    let linePath = "M " + x(0) + " " + y(temps[0]);
    for (let i = 1; i < temps.length; i++) linePath += " L " + x(i) + " " + y(temps[i]);
    const line = document.createElementNS(svgNS, "path");
    line.setAttribute("d", linePath);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "var(--series-1)");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    // end marker
    const endDot = document.createElementNS(svgNS, "circle");
    endDot.setAttribute("cx", x(temps.length - 1));
    endDot.setAttribute("cy", y(temps[temps.length - 1]));
    endDot.setAttribute("r", 4);
    endDot.setAttribute("fill", "var(--series-1)");
    endDot.setAttribute("stroke", "var(--surface-1)");
    endDot.setAttribute("stroke-width", "2");
    svg.appendChild(endDot);

    // crosshair (hidden until hover)
    const crosshair = document.createElementNS(svgNS, "line");
    crosshair.setAttribute("y1", padT); crosshair.setAttribute("y2", H - padB);
    crosshair.setAttribute("stroke", "var(--baseline)");
    crosshair.setAttribute("stroke-width", "1");
    crosshair.setAttribute("opacity", "0");
    svg.appendChild(crosshair);

    const hoverDot = document.createElementNS(svgNS, "circle");
    hoverDot.setAttribute("r", 5);
    hoverDot.setAttribute("fill", "var(--series-1)");
    hoverDot.setAttribute("stroke", "var(--surface-1)");
    hoverDot.setAttribute("stroke-width", "2");
    hoverDot.setAttribute("opacity", "0");
    svg.appendChild(hoverDot);

    // hit overlay
    const overlay = document.createElementNS(svgNS, "rect");
    overlay.setAttribute("x", padL); overlay.setAttribute("y", padT);
    overlay.setAttribute("width", plotW); overlay.setAttribute("height", plotH);
    overlay.setAttribute("fill", "transparent");
    svg.appendChild(overlay);

    container.appendChild(svg);

    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.innerHTML = '<span class="tt-time"></span><br><span class="tt-temp"></span>';
    container.style.position = "relative";
    container.appendChild(tooltip);

    function pointerMove(evt) {
      const rect = svg.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const px = ((clientX - rect.left) / rect.width) * W;
      let idx = Math.round(((px - padL) / plotW) * (temps.length - 1));
      idx = Math.max(0, Math.min(temps.length - 1, idx));

      crosshair.setAttribute("x1", x(idx));
      crosshair.setAttribute("x2", x(idx));
      crosshair.setAttribute("opacity", "1");
      hoverDot.setAttribute("cx", x(idx));
      hoverDot.setAttribute("cy", y(temps[idx]));
      hoverDot.setAttribute("opacity", "1");

      tooltip.querySelector(".tt-time").textContent = idx === 0 ? "Now" : fmtHour(times[idx]);
      tooltip.querySelector(".tt-temp").textContent = Math.round(temps[idx]) + "°F";
      tooltip.classList.add("visible");
      const leftPct = (x(idx) / W) * 100;
      tooltip.style.left = leftPct + "%";
      tooltip.style.top = ((y(temps[idx]) / H) * 100) + "%";
    }
    function pointerLeave() {
      crosshair.setAttribute("opacity", "0");
      hoverDot.setAttribute("opacity", "0");
      tooltip.classList.remove("visible");
    }
    overlay.addEventListener("mousemove", pointerMove);
    overlay.addEventListener("mouseleave", pointerLeave);
    overlay.addEventListener("touchmove", pointerMove, { passive: true });
    overlay.addEventListener("touchend", pointerLeave);
  }

  async function loadCity(root, cityMeta) {
    const errorState = function (msg) {
      const desc = root.querySelector("#current-desc");
      if (desc) desc.textContent = msg;
    };
    try {
      const [forecast, alerts] = await Promise.all([
        fetchForecast(cityMeta.lat, cityMeta.lon),
        fetchAlerts(cityMeta.lat, cityMeta.lon).catch(function () { return []; })
      ]);
      renderCurrent(root, forecast, cityMeta.name);
      const chartEl = root.querySelector("#hourly-chart");
      if (chartEl) renderHourlyChart(chartEl, forecast.hourly, 24);
      renderForecast(root, forecast.daily);
      renderAlerts(root, alerts);
    } catch (err) {
      errorState("Couldn't load live weather right now. Please try again shortly.");
    }
  }

  function initCityPicker(root, selectEl, storageKey) {
    selectEl.innerHTML = CITIES.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + "</option>";
    }).join("");

    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("city");
    const fromStorage = storageKey ? localStorage.getItem(storageKey) : null;
    const initialId = (fromQuery && CITIES.some(c => c.id === fromQuery)) ? fromQuery
      : (fromStorage && CITIES.some(c => c.id === fromStorage)) ? fromStorage
      : "baltimore";

    selectEl.value = initialId;
    loadCity(root, CITIES.find(c => c.id === initialId));

    selectEl.addEventListener("change", function () {
      const city = CITIES.find(c => c.id === selectEl.value);
      if (!city) return;
      if (storageKey) localStorage.setItem(storageKey, city.id);
      const url = new URL(location.href);
      url.searchParams.set("city", city.id);
      history.replaceState(null, "", url);
      loadCity(root, city);
    });
  }

  global.MDWeather = {
    CITIES: CITIES,
    weatherInfo: weatherInfo,
    fetchForecast: fetchForecast,
    fetchAlerts: fetchAlerts,
    renderCurrent: renderCurrent,
    renderForecast: renderForecast,
    renderAlerts: renderAlerts,
    renderHourlyChart: renderHourlyChart,
    loadCity: loadCity,
    initCityPicker: initCityPicker
  };
})(window);
