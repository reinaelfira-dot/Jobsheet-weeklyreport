/* -----------------------------------------------------------
      GLOBAL SETTINGS
------------------------------------------------------------*/
const API_URL = "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";

let assetData = [];
let jobsheetData = [];
let p2Data = [];
let p3Data = [];

/* SPINNER */
function showLoading(target) {
    document.getElementById(target).innerHTML = `<div class="spinner"></div>`;
}

/* FORMATTER */
function formatNumber(num) {
    return num.toLocaleString("id-ID");
}

/* TODAY DATE LABEL */
function nowLabel() {
    const now = new Date();
    return now.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* -----------------------------------------------------------
      LOAD DATA FROM GOOGLE SHEETS
------------------------------------------------------------*/
async function loadData() {
    showLoading("statusUnitBody");
    showLoading("customerBody");
    showLoading("locationBody");
    showLoading("vehicleTypeBody");
    showLoading("yearBody");

    showLoading("jobsheetSummary");
    showLoading("jobsheetChart");
    showLoading("jobsheetSiteChartBody");
    showLoading("jobsheetCategoryChartBody");

    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        assetData = data.assets || [];
        jobsheetData = data.jobsheet || [];
        p2Data = data.p2 || [];
        p3Data = data.p3 || [];

        document.getElementById("lastUpdate").innerHTML = nowLabel();

        renderAssetOverview();
        renderJobsheetOverview();

    } catch (err) {
        console.error("Error loading data:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadData);


/* -----------------------------------------------------------
      ASSET OVERVIEW – LIST CARDS (CANVA STYLE)
------------------------------------------------------------*/

function buildListCard(target, title, icon, items, valueKey) {
    let total = items.reduce((sum, x) => sum + Number(x[valueKey] || 0), 0);

    let html = `
    <div class="canva-card scroll-card">
        <div class="card-title">${icon} ${title}</div>
        <div class="unit-badge">${formatNumber(total)} Units</div>

        <div class="scroll-body">
    `;

    items.forEach(row => {
        html += `
        <div class="list-item">
            <span>${row.name}</span>
            <span class="item-badge">${formatNumber(row[valueKey])}</span>
        </div>
        `;
    });

    html += `
        </div>
    </div>
    `;

    document.getElementById(target).innerHTML = html;
}

function renderAssetOverview() {
    // Grouping helper
    function groupBy(data, key) {
        const result = {};
        data.forEach(row => {
            const val = row[key] || "Unknown";
            if (!result[val]) result[val] = 0;
            result[val]++;
        });
        return Object.entries(result).map(([k, v]) => ({ name: k, count: v }));
    }

    buildListCard("statusUnitBody", "Status Unit", "📊", groupBy(assetData, "Status"), "count");
    buildListCard("customerBody", "Customer", "👥", groupBy(assetData, "Customer"), "count");
    buildListCard("locationBody", "Location", "📍", groupBy(assetData, "Location"), "count");
    buildListCard("yearBody", "Year", "📅", groupBy(assetData, "Year"), "count");
    buildListCard("vehicleTypeBody", "Vehicle Type", "🚙", groupBy(assetData, "VehicleType"), "count");
}



/* -----------------------------------------------------------
      JOBSHEET OVERVIEW (SUMMARY CARDS)
------------------------------------------------------------*/
function renderJobsheetOverview() {
    const p1 = jobsheetData.filter(x => x.Priority === "P1");
    const p2 = jobsheetData.filter(x => x.Priority === "P2");
    const cash = jobsheetData.filter(x => x.Priority === "Cash");
    const repair = jobsheetData.filter(x => x.Priority === "Repair");

    const totalCost = jobsheetData.reduce((sum, x) => sum + Number(x.Cost || 0), 0);

    document.getElementById("jobsheetSummary").innerHTML = `
        <div class="row g-3">

            <div class="col-md-3">
                <div class="summary-card" onclick="openDetail('P1')">
                    <div class="summary-title">P1 PRIORITY</div>
                    <div class="summary-value">${formatNumber(p1.length)}</div>
                    <div class="summary-sub">High Priority - Click for details</div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="summary-card" onclick="openDetail('P2')">
                    <div class="summary-title">P2 PRIORITY</div>
                    <div class="summary-value">${formatNumber(p2.length)}</div>
                    <div class="summary-sub">Medium Priority - Click for details</div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="summary-card" onclick="openDetail('Cash')">
                    <div class="summary-title">CASH ON SITE</div>
                    <div class="summary-value">${formatNumber(cash.length)}</div>
                    <div class="summary-sub">On-site payment jobs</div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="summary-card" onclick="openDetail('Repair')">
                    <div class="summary-title">REPAIR</div>
                    <div class="summary-value">${formatNumber(repair.length)}</div>
                    <div class="summary-sub">Total Repairs</div>
                </div>
            </div>
        </div>

        <div class="mt-4">
            <h4>💰 Total Cost Estimation</h4>
            <h2 style="color:#A60000; font-weight:900;">
                Rp ${formatNumber(totalCost)}
            </h2>
        </div>
    `;
}



/* -----------------------------------------------------------
      JOBSHEET CHART (BAR DISTRIBUTION BY SITE)
------------------------------------------------------------*/
function renderJobsheetSiteChart() {
    const group = {};

    jobsheetData.forEach(row => {
        const site = row.Site || "Unknown";
        if (!group[site]) group[site] = 0;
        group[site]++;
    });

    let html = "";

    Object.entries(group).forEach(([site, count]) => {
        const percent = ((count / jobsheetData.length) * 100).toFixed(1);

        html += `
        <div class="list-item">
            <span>${site}</span>
            <span class="item-badge">${formatNumber(count)}</span>
        </div>
        `;
    });

    document.getElementById("jobsheetSiteChartBody").innerHTML = html;
}


/* -----------------------------------------------------------
      OPEN DETAIL POPUP
------------------------------------------------------------*/
function openDetail(type) {
    alert("Detail for: " + type);
}
/* -----------------------------------------------------------
     CHART ENGINE – CANVA STYLE
------------------------------------------------------------*/

let assetChart = null;

// Helper: Grouping
function groupByCount(data, key) {
    const obj = {};
    data.forEach(row => {
        const v = row[key] || "Unknown";
        if (!obj[v]) obj[v] = 0;
        obj[v]++;
    });
    return Object.entries(obj).map(([k, v]) => ({ name: k, value: v }));
}

// Build chart
function renderAssetChart(type = "status") {
    let grouped = [];

    if (type === "status") grouped = groupByCount(assetData, "Status");
    if (type === "customer") grouped = groupByCount(assetData, "Customer");
    if (type === "location") grouped = groupByCount(assetData, "Location");
    if (type === "vehicle") grouped = groupByCount(assetData, "VehicleType");
    if (type === "year") grouped = groupByCount(assetData, "Year");

    grouped.sort((a,b)=>b.value - a.value); // sort descending

    const labels = grouped.map(x => x.name);
    const values = grouped.map(x => x.value);
    const total = values.reduce((a,b)=>a+b,0);
    const percentages = values.map(v => ((v/total)*100).toFixed(1));

    const ctx = document.getElementById("assetChart").getContext("2d");

    // Destroy existing chart
    if (assetChart !== null) assetChart.destroy();

    assetChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Count",
                data: values,
                backgroundColor: function(context) {
                    const idx = context.dataIndex;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, "#E23939");
                    gradient.addColorStop(1, "#A60000");
                    return gradient;
                },
                borderRadius: 10,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 1200,
                easing: "easeOutQuart"
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#333",
                        callback: function(value) {
                            return value.toLocaleString("id-ID");
                        }
                    }
                },
                x: {
                    ticks: {
                        color: "#333",
                        maxRotation: 50,
                        minRotation: 0
                    }
                }
            },

            plugins: {
                legend: { display: false },

                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const value = ctx.raw;
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${value.toLocaleString("id-ID")} units (${pct}%)`;
                        }
                    }
                },

                datalabels: {
                    anchor: 'end',
                    align: 'end'
                }
            }
        }
    });
}

/* Dropdown listener */
document.addEventListener("DOMContentLoaded", () => {
    const sel = document.getElementById("chartSelector");

    if (sel) {
        sel.addEventListener("change", function () {
            renderAssetChart(this.value);
        });
    }
});
