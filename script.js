const API_URL = "https://script.google.com/macros/s/AKfycbxdX3eMLwH_zCC73FkUmVn40D2z1Fr5eJrutpTdGk00Wy3bLaer5--_5BOaE1Jf-q3owQ/exec";  // <--- GANTI

async function fetchData(action) {
    const res = await fetch(`${API_URL}?action=${action}`);
    return res.json();
}

async function loadDashboard() {
    try {
        const jobsheetSummary = await fetchData("jobsheetsummary");
        const p2Data = await fetchData("p2");
        const p3Data = await fetchData("p3");
        const jobsheet = await fetchData("jobsheet");

        updateSummary(jobsheetSummary.summary);
        renderWeeklyChart(jobsheet.data);
        renderP3Chart(p3Data.data);
        populateTable(jobsheet.data);

    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

function updateSummary(sum) {
    document.getElementById("p1Count").innerText = "P1: " + sum.p1;
    document.getElementById("p2Count").innerText = "P2: " + sum.p2;
    document.getElementById("cashCount").innerText = "Cash: " + sum.cash;
    document.getElementById("repairCount").innerText = "Repair: " + sum.repair;
    document.getElementById("pettyCount").innerText = "Petty: " + sum.petty;
    document.getElementById("hoCount").innerText = "HO: " + sum.ho;
    document.getElementById("totalCost").innerText = "Total Cost: Rp " + sum.totalCost.toLocaleString();
}

function renderWeeklyChart(jobsheetRows) {
    const counts = {};

    jobsheetRows.forEach(item => {
        if (!item.Received) return;
        const week = item.Received.substring(0, 7); 
        counts[week] = (counts[week] || 0) + 1;
    });

    new Chart(document.getElementById("weeklyChart"), {
        type: "bar",
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: "Jobsheet per Week",
                data: Object.values(counts),
                backgroundColor: "rgba(200,0,0,0.7)",
            }]
        }
    });
}

function renderP3Chart(p3Rows) {
    const partCount = {};

    p3Rows.forEach(item => {
        const part = item["Part Name"] || "Unknown";
        partCount[part] = (partCount[part] || 0) + 1;
    });

    const top = Object.entries(partCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

    new Chart(document.getElementById("p3Chart"), {
        type: "pie",
        data: {
            labels: top.map(x => x[0]),
            datasets: [{
                data: top.map(x => x[1]),
                backgroundColor: [
                    "#b30000", "#d9534f", "#ff9999", "#cc0000",
                    "#660000", "#990000", "#ff6666", "#ff3333"
                ]
            }]
        }
    });
}

function populateTable(rows) {
    if (!rows.length) return;

    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");

    const headers = Object.keys(rows[0]);

    tableHead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;

    tableBody.innerHTML = rows
        .map(r => `<tr>${headers.map(h => `<td>${r[h] || ""}</td>`).join("")}</tr>`)
        .join("");
}

loadDashboard();
