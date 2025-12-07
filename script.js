/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];
let filteredAssetData = [];

/* FORMAT NUMBER */
function formatNumber(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

/* TIMESTAMP */
function nowLabel() {
  const now = new Date();
  return now.toLocaleString("id-ID");
}

/* -----------------------------------------------------------
      LOAD DATA (ASSET + JOBSHEET)
------------------------------------------------------------*/
async function loadData() {
  try {
    console.log("Loading data...");

    // LOAD ASSET
    const assetReq = await fetch(API_URL + "?action=asset");
    const assetJson = await assetReq.json();
    assetData = assetJson.data || [];
    filteredAssetData = assetData;

    // LOAD JOBSHEET
    const jsReq = await fetch(API_URL + "?action=jobsheet");
    const jsJson = await jsReq.json();
    jobsheetData = jsJson.data || [];

    console.log("Asset Loaded:", assetData.length);
    console.log("Jobsheet Loaded:", jobsheetData.length);

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    populateFilters();
    renderAssetCards(assetData);
    renderJobsheetSummary();
    renderAssetChart("status");

  } catch (err) {
    console.error("LOAD ERROR:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadData);

/* -----------------------------------------------------------
   FILTER DROPDOWN POPULATION
------------------------------------------------------------*/
function populateFilters() {
    console.log("Populating filter dropdowns...");

    const hubSet = new Set(assetData.map(x => x["HUB"] || "Unknown"));
    const siteSet = new Set(assetData.map(x => x["Alt Location"] || "Unknown"));

    const hub = document.getElementById("hubFilter");
    const site = document.getElementById("siteFilter");

    hub.innerHTML = `<option value="All">All HUBs</option>`;
    site.innerHTML = `<option value="All">All Sites</option>`;

    hubSet.forEach(h => hub.innerHTML += `<option value="${h}">${h}</option>`);
    siteSet.forEach(s => site.innerHTML += `<option value="${s}">${s}</option>`);
}

/* -----------------------------------------------------------
   SITE follows HUB
------------------------------------------------------------*/
function updateSiteFilterByHub() {
    const selectedHub = document.getElementById("hubFilter").value;
    const site = document.getElementById("siteFilter");

    if (selectedHub === "All") {
        populateFilters();
        return;
    }

    const filteredSites = new Set(
        assetData
        .filter(x => x["HUB"] === selectedHub)
        .map(x => x["Alt Location"])
    );

    site.innerHTML = `<option value="All">All Sites</option>`;

    filteredSites.forEach(s => {
        site.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

/* -----------------------------------------------------------
   FILTER LOGIC
------------------------------------------------------------*/
function filterAssets() {
    let hub = document.getElementById("hubFilter").value;
    let site = document.getElementById("siteFilter").value;

    let data = [...assetData];

    if (hub !== "All") {
        data = data.filter(x => x["HUB"] === hub);
    }

    if (site !== "All") {
        data = data.filter(x => x["Alt Location"] === site);
    }

    filteredAssetData = data;

    renderAssetCards(filteredAssetData);
    renderAssetChart(document.getElementById("chartSelector").value);
}

/* -----------------------------------------------------------
   RESET FILTER
------------------------------------------------------------*/
function resetFilters() {
    populateFilters();
    filteredAssetData = assetData;
    renderAssetCards(assetData);
    renderAssetChart("status");
}

/* -----------------------------------------------------------
   RENDER GROUP (Status, Customer, Year, etc)
------------------------------------------------------------*/
function renderAssetCards(data) {
  function groupRender(listId, totalId, key) {
    const map = {};

    data.forEach(row => {
      const val = row[key] || "Unknown";
      map[val] = (map[val] || 0) + 1;
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

    document.getElementById(totalId).innerText = formatNumber(data.length) + " Units";

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

  groupRender("statusUnitList", "statusUnitTotal", "Status");
  groupRender("customerList", "customerTotal", "Customer");
  groupRender("locationList", "locationTotal", "Alt Location");
  groupRender("yearList", "yearTotal", "Year");
  groupRender("vehicleList", "vehicleTotal", "Vehicle Type");
}

/* -----------------------------------------------------------
      JOBSHEET SUMMARY
------------------------------------------------------------*/
function renderJobsheetSummary() {
  function countContains(col, str) {
    return jobsheetData.filter(x => x[col]?.toLowerCase().includes(str)).length;
  }

  const p1 = countContains("Category (P1,P2,P3/Ready Stock)", "p1");
  const p2 = countContains("Category (P1,P2,P3/Ready Stock)", "p2");
  const cash = countContains("Memo", "cash");
  const repair = countContains("VCR", "repair");

  const totalCost = jobsheetData.reduce((sum, x) => {
    return sum + (Number(String(x["Cost Estimation"]).replace(/[^\d]/g, "")) || 0);
  }, 0);

  document.getElementById("p1CountJS").innerText = p1;
  document.getElementById("p2CountJS").innerText = p2;
  document.getElementById("cashCountJS").innerText = cash;
  document.getElementById("repairCountJS").innerText = repair;
  document.getElementById("totalCostJS").innerText = "Rp " + formatNumber(totalCost);
}

/* -----------------------------------------------------------
      CHART (CANVA STYLE)
------------------------------------------------------------*/
let assetChart;

function renderAssetChart(type) {
  const keyMap = {
    status: "Status",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
    year: "Year"
  };

  const key = keyMap[type];
  const map = {};

  filteredAssetData.forEach(r => {
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
      datasets: [{
        label: "Units",
        data: values,
        backgroundColor: "#A60000",
        borderRadius: 10,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

/* -----------------------------------------------------------
      EVENT LISTENERS
------------------------------------------------------------*/
document.getElementById("hubFilter").addEventListener("change", updateSiteFilterByHub);
document.getElementById("applyAssetFilter").addEventListener("click", filterAssets);
document.getElementById("resetAssetFilter").addEventListener("click", resetFilters);

document.getElementById("chartSelector").addEventListener("change", (e) => {
  renderAssetChart(e.target.value);
});
