/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];

/* -----------------------------------------------------------
      FORMATTER
------------------------------------------------------------*/
function formatNumber(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

function nowLabel() {
  return new Date().toLocaleString("id-ID");
}

/* -----------------------------------------------------------
      LOADER UI FUNCTIONS
------------------------------------------------------------*/
function showConnection(status = "connecting") {
  const box = document.getElementById("connectionStatus");

  if (status === "connecting") {
    box.classList.remove("hidden");
    box.innerHTML = `<span class="dot"></span> Connecting...`;
  }
  if (status === "hide") {
    box.classList.add("hidden");
  }
}

function showLoadedSummary(text) {
  const box = document.getElementById("loadedSummary");
  document.getElementById("loadedMessage").innerText = text;

  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 5000);
}

function showCardLoading() {
  const ids = [
    "statusUnitList",
    "customerList",
    "locationList",
    "yearList",
    "vehicleList"
  ];

  ids.forEach(id => {
    document.getElementById(id).innerHTML = `
      <div class="card-loading">
        <div class="loader"></div>
        <p>Loading data...</p>
      </div>
    `;
  });
}

/* -----------------------------------------------------------
      LOAD DATA (ASSET + JOBSHEET)
------------------------------------------------------------*/
async function loadData() {
  showConnection("connecting");
  showCardLoading();

  try {
    // LOAD ASSETS
    const assetReq = await fetch(API_URL + "?action=asset");
    const assetJson = await assetReq.json();
    assetData = assetJson.data || [];

    // LOAD JOBSHEET
    const jsReq = await fetch(API_URL + "?action=jobsheet");
    const jsJson = await jsReq.json();
    jobsheetData = jsJson.data || [];

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    populateHubFilter();
    renderAssetCards();
    renderJobsheetSummary();
    renderAssetChart("status");

    showConnection("hide");

    showLoadedSummary(
      `Data loaded: ${assetData.length} assets, ${jobsheetData.length} jobsheets`
    );

  } catch (err) {
    console.error("LOAD ERROR:", err);
    showLoadedSummary("❌ Failed to load data");
  }
}

document.addEventListener("DOMContentLoaded", loadData);

/* -----------------------------------------------------------
      FILTER HANDLING (HUB → SITE)
------------------------------------------------------------*/
function populateHubFilter() {
  const hubs = [...new Set(assetData.map(a => a["HUB"] || "Unknown"))].sort();
  const hubFilter = document.getElementById("hubFilter");

  hubFilter.innerHTML = `<option value="ALL">All HUBs</option>` +
    hubs.map(h => `<option value="${h}">${h}</option>`).join("");

  populateSiteFilter("ALL");
}

function populateSiteFilter(selectedHub) {
  let filtered = assetData;

  if (selectedHub !== "ALL") {
    filtered = assetData.filter(a => a["HUB"] === selectedHub);
  }

  const sites = [...new Set(filtered.map(a => a["Alt Location"] || "Unknown"))].sort();

  const siteFilter = document.getElementById("siteFilter");
  siteFilter.innerHTML =
    `<option value="ALL">All Sites</option>` +
    sites.map(s => `<option value="${s}">${s}</option>`).join("");
}

document.getElementById("hubFilter").addEventListener("change", (e) => {
  populateSiteFilter(e.target.value);
});

/* -----------------------------------------------------------
      APPLY FILTER
------------------------------------------------------------*/
document.getElementById("applyAssetFilter").addEventListener("click", () => {
  const hub = document.getElementById("hubFilter").value;
  const site = document.getElementById("siteFilter").value;

  let filtered = assetData;

  if (hub !== "ALL") filtered = filtered.filter(r => r["HUB"] === hub);
  if (site !== "ALL") filtered = filtered.filter(r => r["Alt Location"] === site);

  renderAssetCards(filtered);
  renderAssetChart("status", filtered);
});

document.getElementById("resetAssetFilter").addEventListener("click", () => {
  document.getElementById("hubFilter").value = "ALL";
  populateSiteFilter("ALL");
  renderAssetCards(assetData);
  renderAssetChart("status", assetData);
});

/* -----------------------------------------------------------
   ASSET OVERVIEW LIST RENDER
------------------------------------------------------------*/
function renderGroup(listId, totalId, key, dataset = assetData) {
  const map = {};

  dataset.forEach((row) => {
    const val = row[key] || "Unknown";
    map[val] = (map[val] || 0) + 1;
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  document.getElementById(totalId).innerText =
    formatNumber(dataset.length) + " Units";

  let html = "";
  sorted.forEach(([name, count]) => {
    html += `
      <div class="list-item">
          <span>${name}</span>
          <span class="item-badge">${formatNumber(count)}</span>
      </div>`;
  });

  document.getElementById(listId).innerHTML = html;
}

function renderAssetCards(dataset = assetData) {
  renderGroup("statusUnitList", "statusUnitTotal", "Status", dataset);
  renderGroup("customerList", "customerTotal", "Customer", dataset);
  renderGroup("locationList", "locationTotal", "Alt Location", dataset);
  renderGroup("yearList", "yearTotal", "Year", dataset);
  renderGroup("vehicleList", "vehicleTotal", "Vehicle Type", dataset);
}

/* -----------------------------------------------------------
      JOBSHEET SUMMARY RENDER
------------------------------------------------------------*/
function renderJobsheetSummary() {
  function countContains(col, str) {
    return jobsheetData.filter((x) => x[col]?.toLowerCase().includes(str)).length;
  }

  const p1 = countContains("Category (P1,P2,P3/Ready Stock)", "p1");
  const p2 = countContains("Category (P1,P2,P3/Ready Stock)", "p2");
  const cash = countContains("Memo", "cash");
  const repair = countContains("VCR", "repair");

  const totalCost = jobsheetData.reduce((sum, x) => {
    return (
      sum +
      (Number(String(x["Cost Estimation"]).replace(/[^\d]/g, "")) || 0)
    );
  }, 0);

  document.getElementById("p1CountJS").innerText = p1;
  document.getElementById("p2CountJS").innerText = p2;
  document.getElementById("cashCountJS").innerText = cash;
  document.getElementById("repairCountJS").innerText = repair;
  document.getElementById("totalCostJS").innerText = "Rp " + formatNumber(totalCost);
}

/* -----------------------------------------------------------
      CANVA-STYLE BAR CHART
------------------------------------------------------------*/
let assetChart;

function renderAssetChart(type, dataset = assetData) {
  const key = {
    status: "Status",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
    year: "Year"
  }[type];

  const map = {};
  dataset.forEach((r) => {
    const v = r[key] || "Unknown";
    map[v] = (map[v] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);

  const ctx = document.getElementById("assetChart").getContext("2d");
  if (assetChart) assetChart.destroy();

  assetChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Units",
          data: values,
          backgroundColor: "#A60000",
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

document.getElementById("chartSelector").addEventListener("change", (e) => {
  renderAssetChart(e.target.value);
});
