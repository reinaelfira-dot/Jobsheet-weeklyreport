/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let filteredAsset = [];
let jobsheetData = [];

/* -----------------------------------------------------------
      FORMAT NUMBER
------------------------------------------------------------*/
function formatNumber(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

/* -----------------------------------------------------------
      TIMESTAMP
------------------------------------------------------------*/
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
    filteredAsset = assetData;

    // LOAD JOBSHEET
    const jsReq = await fetch(API_URL + "?action=jobsheet");
    const jsJson = await jsReq.json();
    jobsheetData = jsJson.data || [];

    console.log("Asset Loaded:", assetData.length);
    console.log("Jobsheet Loaded:", jobsheetData.length);

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    populateHubDropdown();
    populateSiteDropdown(); // initial all sites
    renderAssetCards(filteredAsset);
    renderJobsheetSummary();
    renderAssetChart("status", filteredAsset);

  } catch (err) {
    console.error("LOAD ERROR:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadData);

/* -----------------------------------------------------------
      POPULATE HUB DROPDOWN
------------------------------------------------------------*/
function populateHubDropdown() {
  const hubSelect = document.getElementById("hubFilter");
  hubSelect.innerHTML = `<option value="ALL">All HUBs</option>`;

  const uniqueHubs = [...new Set(assetData.map((row) => row["HUB"] || "Unknown"))];

  uniqueHubs.forEach((hub) => {
    hubSelect.innerHTML += `<option value="${hub}">${hub}</option>`;
  });
}

/* -----------------------------------------------------------
      POPULATE SITE DROPDOWN (FOLLOW HUB)
------------------------------------------------------------*/
function populateSiteDropdown(selectedHub = "ALL") {
  const siteSelect = document.getElementById("siteFilter");
  siteSelect.innerHTML = `<option value="ALL">All Sites</option>`;

  let filtered = assetData;

  if (selectedHub !== "ALL") {
    filtered = assetData.filter((r) => r["HUB"] === selectedHub);
  }

  const uniqueSites = [...new Set(filtered.map((row) => row["Alt Location"] || "Unknown"))];

  uniqueSites.forEach((site) => {
    siteSelect.innerHTML += `<option value="${site}">${site}</option>`;
  });
}

/* UPDATE SITE WHEN HUB CHANGES */
document.getElementById("hubFilter").addEventListener("change", function () {
  const selectedHub = this.value;
  populateSiteDropdown(selectedHub);
});

/* -----------------------------------------------------------
      APPLY FILTER
------------------------------------------------------------*/
document.getElementById("applyAssetFilter").addEventListener("click", function () {
  const hub = document.getElementById("hubFilter").value;
  const site = document.getElementById("siteFilter").value;

  filteredAsset = assetData.filter((row) => {
    const matchHub = hub === "ALL" ? true : row["HUB"] === hub;
    const matchSite = site === "ALL" ? true : row["Alt Location"] === site;
    return matchHub && matchSite;
  });

  console.log("Filtered:", filteredAsset.length);

  renderAssetCards(filteredAsset);
  renderAssetChart("status", filteredAsset);
});

/* -----------------------------------------------------------
      RESET FILTER
------------------------------------------------------------*/
document.getElementById("resetAssetFilter").addEventListener("click", function () {
  filteredAsset = assetData;

  document.getElementById("hubFilter").value = "ALL";
  populateSiteDropdown("ALL");
  document.getElementById("siteFilter").value = "ALL";

  renderAssetCards(filteredAsset);
  renderAssetChart("status", filteredAsset);
});

/* -----------------------------------------------------------
      RENDER GROUP LIST CARD
------------------------------------------------------------*/
function renderGroup(listId, totalId, key, data) {
  const map = {};

  data.forEach((row) => {
    const val = row[key] || "Unknown";
    map[val] = (map[val] || 0) + 1;
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  document.getElementById(totalId).innerText =
    formatNumber(data.length) + " Units";

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

function renderAssetCards(data) {
  renderGroup("statusUnitList", "statusUnitTotal", "Status Unit 1", data);
  renderGroup("customerList", "customerTotal", "Customer", data);
  renderGroup("locationList", "locationTotal", "Alt Location", data);
  renderGroup("yearList", "yearTotal", "Year", data);
  renderGroup("vehicleList", "vehicleTotal", "Vehicle Type", data);
}

/* -----------------------------------------------------------
      JOBSHEET SUMMARY
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

function renderAssetChart(type, data) {
  const keyMap = {
    status: "Status Unit 1",
    customer: "Customer",
    location: "Alt Location",
    vehicle: "Vehicle Type",
    year: "Year"
  };

  const key = keyMap[type];

  const map = {};
  data.forEach((r) => {
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
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

document.getElementById("chartSelector").addEventListener("change", (e) => {
  renderAssetChart(e.target.value, filteredAsset);
});
