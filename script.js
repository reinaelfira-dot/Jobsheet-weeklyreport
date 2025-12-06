/* -----------------------------------------------------------
      API URL
------------------------------------------------------------*/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];

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

    // LOAD JOBSHEET
    const jsReq = await fetch(API_URL + "?action=jobsheet");
    const jsJson = await jsReq.json();
    jobsheetData = jsJson.data || [];

    console.log("Asset Loaded:", assetData.length);
    console.log("Jobsheet Loaded:", jobsheetData.length);

    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    renderAssetCards();
    renderJobsheetSummary();
    renderAssetChart("status");

  } catch (err) {
    console.error("LOAD ERROR:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadData);

/* -----------------------------------------------------------
   ASSET OVERVIEW LIST RENDER
------------------------------------------------------------*/
function renderGroup(listId, totalId, key) {
  const map = {};

  assetData.forEach((row) => {
    const val = row[key] || "Unknown";
    map[val] = (map[val] || 0) + 1;
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  document.getElementById(totalId).innerText =
    formatNumber(assetData.length) + " Units";

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

function renderAssetCards() {
  renderGroup("statusUnitList", "statusUnitTotal", "Status");
  renderGroup("customerList", "customerTotal", "Customer");
  renderGroup("locationList", "locationTotal", "Location");
  renderGroup("yearList", "yearTotal", "Year");
  renderGroup("vehicleList", "vehicleTotal", "VehicleType");
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
      (Number(
        String(x["Cost Estimation"]).replace(/[^\d]/g, "")
      ) || 0)
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

function renderAssetChart(type) {
  const key = {
    status: "Status",
    customer: "Customer",
    location: "Location",
    vehicle: "VehicleType",
    year: "Year"
  }[type];

  const map = {};
  assetData.forEach((r) => {
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
  renderAssetChart(e.target.value);
});
