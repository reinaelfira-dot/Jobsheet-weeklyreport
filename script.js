/* -----------------------------------------------------------
      GLOBAL SETTINGS
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
      LOAD ALL DATA
------------------------------------------------------------*/
async function loadData() {
  try {
    // LOAD ASSET
    const a = await fetch(API_URL + "?action=asset");
    const A = await a.json();
    assetData = A.data || [];

    // LOAD JOBSHEET
    const j = await fetch(API_URL + "?action=jobsheet");
    const J = await j.json();
    jobsheetData = J.data || [];

    // TIMESTAMP UPDATE
    document.getElementById("lastAssetUpdate").innerText = nowLabel();

    // RENDER UI
    renderAssetCards();
    renderJobsheetSummary();
    renderAssetChart("status");

  } catch (err) {
    console.error("Load error:", err);
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
  const p1 = jobsheetData.filter((x) =>
    x["Category (P1,P2,P3/Ready Stock)"]?.includes("P1")
  );
  const p2 = jobsheetData.filter((x) =>
    x["Category (P1,P2,P3/Ready Stock)"]?.includes("P2")
  );
  const cash = jobsheetData.filter((x) =>
    x["Memo"]?.toLowerCase().includes("cash")
  );
  const repair = jobsheetData.filter((x) =>
    x["VCR"]?.toLowerCase().includes("repair")
  );

  const totalCost = jobsheetData.reduce((sum, x) => {
    return (
      sum +
      (Number(
        String(x["Cost Estimation"]).replace(/[^\d]/g, "")
      ) || 0)
    );
  }, 0);

  document.getElementById("p1CountJS").innerText = p1.length;
  document.getElementById("p2CountJS").innerText = p2.length;
  document.getElementById("cashCountJS").innerText = cash.length;
  document.getElementById("repairCountJS").innerText = repair.length;

  document.getElementById("totalCostJS").innerText =
    "Rp " + formatNumber(totalCost);
}

/* -----------------------------------------------------------
      CHART (CANVA STYLE)
------------------------------------------------------------*/
let assetChart = null;

function renderAssetChart(type) {
  let key = "";
  if (type === "status") key = "Status";
  if (type === "customer") key = "Customer";
  if (type === "location") key = "Location";
  if (type === "vehicle") key = "VehicleType";
  if (type === "year") key = "Year";

  const map = {};
  assetData.forEach((r) => {
    const val = r[key] || "Unknown";
    map[val] = (map[val] || 0) + 1;
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
          borderRadius: 9,
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

document
  .getElementById("chartSelector")
  .addEventListener("change", (e) => {
    renderAssetChart(e.target.value);
  });
