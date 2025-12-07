/*************************************************
 * GLOBAL API BASE
 *************************************************/
const API_BASE =
  "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

/*************************************************
 * UNIVERSAL FETCH WRAPPER — FIX CORS & ERRORS
 *************************************************/
async function fetchData(action) {
  try {
    const url = `${API_BASE}?action=${action}`;
    console.log("Fetching:", url);

    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("HTTP " + res.status);

    return await res.json();
  } catch (err) {
    console.error("FETCH ERROR:", err);
    return null;
  }
}

/*************************************************
 * LOAD ASSET OVERVIEW
 *************************************************/
async function loadAssetData() {
  const json = await fetchData("asset");
  if (!json || !json.data) return;

  const rows = json.data;

  // FILL HUB
  const hubSet = new Set(rows.map((r) => r["HUB"] || "-"));
  const hubFilter = document.getElementById("hubFilter");
  hubFilter.innerHTML = `<option value="">All HUB</option>`;
  hubSet.forEach((h) => (hubFilter.innerHTML += `<option>${h}</option>`));

  // FILL SITE
  const siteSet = new Set(rows.map((r) => r["Site"] || "-"));
  const siteFilter = document.getElementById("siteFilter");
  siteFilter.innerHTML = `<option value="">All Site</option>`;
  siteSet.forEach((s) => (siteFilter.innerHTML += `<option>${s}</option>`));

  // LAST UPDATE
  document.getElementById("lastAssetUpdate").textContent =
    new Date().toLocaleString();

  renderAssetLists(rows);
  renderAssetChart(rows);
}

function renderAssetLists(rows) {
  renderGroup(rows, "Status Unit", "statusUnitList", "statusUnitTotal");
  renderGroup(rows, "Customer", "customerList", "customerTotal");
  renderGroup(rows, "Location", "locationList", "locationTotal");
  renderGroup(rows, "Year", "yearList", "yearTotal");
  renderGroup(rows, "Vehicle Type", "vehicleList", "vehicleTotal");
}

function renderGroup(rows, field, listID, totalID) {
  const list = document.getElementById(listID);
  const total = document.getElementById(totalID);

  const map = {};
  rows.forEach((r) => {
    const v = r[field] || "-";
    map[v] = (map[v] || 0) + 1;
  });

  list.innerHTML = "";
  Object.entries(map).forEach(([k, v]) => {
    list.innerHTML += `<div class="item-row"><span>${k}</span><span>${v}</span></div>`;
  });

  total.textContent = `${rows.length} Units`;
}

/*************************************************
 * ASSET CHART
 *************************************************/
let assetChart;

function renderAssetChart(rows) {
  const selector = document.getElementById("assetChartSelector");
  const keyMap = {
    year: "Year",
    status: "Status Unit",
    customer: "Customer",
    location: "Location",
    vehicle: "Vehicle Type",
  };

  const field = keyMap[selector.value] || "Year";

  const group = {};
  rows.forEach((r) => {
    const v = r[field] || "-";
    group[v] = (group[v] || 0) + 1;
  });

  const labels = Object.keys(group);
  const values = Object.values(group);

  const ctx = document.getElementById("assetChartLarge");

  if (assetChart) assetChart.destroy();

  assetChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: field,
          data: values,
          backgroundColor: "#A60000",
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
}

/*************************************************
 * JOBSHEET SUMMARY
 *************************************************/
let fullJobsheet = [];
let p2Data = [];
let p3Data = [];

async function loadJobsheetSummary() {
  const json = await fetchData("jobsheet");
  if (!json || !json.data) return;

  fullJobsheet = json.data;
  renderJobsheetCards(fullJobsheet);
}

function renderJobsheetCards(rows) {
  const p1 = rows.filter((r) =>
    String(r["Category (P1,P2,P3/Ready Stock)"]).includes("P1")
  );

  const p2 = rows.filter((r) =>
    String(r["Category (P1,P2,P3/Ready Stock)"]).includes("P2")
  );

  const cash = rows.filter((r) =>
    String(r["Category (P1,P2,P3/Ready Stock)"]).toLowerCase().includes("cash")
  );

  const repair = rows.filter((r) => String(r["VCR"]).toLowerCase().includes("part"));

  document.getElementById("p1Count").textContent = p1.length;
  document.getElementById("p2Count").textContent = p2.length;

  document.getElementById("cashCount").textContent = cash.length;
  document.getElementById("repairCount").textContent = repair.length;

  // NEXT: P3 from separate sheet
}

/*************************************************
 * LOAD P2 DATA
 *************************************************/
async function loadP2Data() {
  const json = await fetchData("p2");
  if (json && json.data) p2Data = json.data;
}

/*************************************************
 * LOAD P3 DATA
 *************************************************/
async function loadP3Data() {
  const json = await fetchData("p3");
  if (json && json.data) {
    p3Data = json.data;
    document.getElementById("p3Count").textContent = p3Data.length;
    renderP3PieChart();
  }
}

/*************************************************
 * PIE CHART — P3 Distribution by Site
 *************************************************/
let p3PieChart;

function renderP3PieChart() {
  const map = {};

  p3Data.forEach((row) => {
    const site = row["Site"] || "-";
    map[site] = (map[site] || 0) + 1;
  });

  const labels = Object.keys(map);
  const values = Object.values(map);

  const ctx = document.getElementById("p3PieChart");

  if (p3PieChart) p3PieChart.destroy();

  p3PieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#FF5555", "#CC0000", "#990000", "#660000", "#330000"],
        },
      ],
    },
  });
}

/*************************************************
 * MODAL OPEN / CLOSE
 *************************************************/
const modal = document.getElementById("detailModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
document.getElementById("closeModal").onclick = () =>
  modal.classList.remove("active");

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.classList.add("active");
}

/*************************************************
 * CARD CLICK HANDLERS – P1 / P2 / P3 / CASH / REPAIR
 *************************************************/
document.getElementById("cardP1").onclick = () => {
  const rows = fullJobsheet.filter((r) =>
    String(r["Category (P1,P2,P3/Ready Stock)"]).includes("P1")
  );

  let html = "";
  rows.forEach((r) => {
    html += `
      <div class="modal-item">
        <h4>Job No. ${r["Job No."]}</h4>
        <p><b>Hub:</b> ${r["HUB"]}</p>
        <p><b>Work:</b> ${r["Work To Be Performed"]}</p>
        <p><b>Cost:</b> Rp ${r["Cost Estimation"] || 0}</p>
      </div>
    `;
  });

  openModal(`P1 Priority – Details (${rows.length})`, html);
};

document.getElementById("cardP2").onclick = () => {
  let html = "";

  p2Data.forEach((r) => {
    html += `
    <div class="modal-item">
      <h4>${r["TK NO"] || "-"}</h4>
      <p><b>Lokasi:</b> ${r["LOKASI"]}</p>
      <p><b>Part Name:</b> ${r["PART NAME"]}</p>
      <p><b>Qty:</b> ${r["QTY"]}</p>
      <p><b>MR:</b> ${r["No. MR (Material Request)"]}</p>
    </div>
    `;
  });

  openModal(`P2 Priority – Details (${p2Data.length})`, html);
};

document.getElementById("cardP3").onclick = () => {
  let html = "";

  p3Data.forEach((r) => {
    html += `
    <div class="modal-item">
      <h4>P3 Case – ${r["MR No."]}</h4>
      <p><b>Received:</b> ${r["Tgl Received"]}</p>
      <p><b>Site:</b> ${r["Site"]}</p>
      <p><b>Sent to WHS:</b> ${r["Send to Warehouse"]}</p>
    </div>
    `;
  });

  openModal(`P3 Case – Details (${p3Data.length})`, html);
};

/*************************************************
 * INIT LOAD
 *************************************************/
window.onload = async function () {
  await loadAssetData();
  await loadJobsheetSummary();
  await loadP2Data();
  await loadP3Data();
};
