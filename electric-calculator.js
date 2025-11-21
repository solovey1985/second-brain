// --- NAVIGATION ---
function switchTab(id) {
    document
        .querySelectorAll(".tab-content")
        .forEach((el) => el.classList.remove("active"));
    document.getElementById("tab-" + id).classList.add("active");

    document
        .querySelectorAll(".nav-btn")
        .forEach((el) => el.classList.remove("active"));
    document.getElementById("btn-" + id).classList.add("active");
}

// --- 1. POWER CALCULATION ---
function calcPower(source) {
    const phase = document.querySelector('input[name="phase"]:checked').value;
    const cos = parseFloat(document.getElementById("p-cos").value) || 0.95;

    let pInput = document.getElementById("p-kw");
    let iInput = document.getElementById("p-amp");

    const voltage = phase === "1" ? 230 : 380; // 230V vs Line-to-Line 380/400V
    const root3 = phase === "3" ? 1.732 : 1;

    if (source === "kw") {
        // KW -> Amps
        // P = U * I * cos * root3
        // I = (P * 1000) / (U * root3 * cos)
        const kw = parseFloat(pInput.value);
        if (kw > 0) {
            const amps = (kw * 1000) / (voltage * root3 * cos);
            iInput.value = amps.toFixed(1);
        }
    } else {
        // Amps -> KW
        // P = (I * U * root3 * cos) / 1000
        const amps = parseFloat(iInput.value);
        if (amps > 0) {
            const kw = (amps * voltage * root3 * cos) / 1000;
            pInput.value = kw.toFixed(2);
        }
    }

    recommendBreaker();
}

function recommendBreaker() {
    const i = parseFloat(document.getElementById("p-amp").value);
    const el = document.getElementById("rec-breaker");

    if (!i || i <= 0) {
        el.innerText = "-- A";
        return;
    }

    // Standard breaker sizes
    const breakers = [6, 10, 16, 20, 25, 32, 40, 50, 63];
    let rec = breakers.find((b) => b >= i);

    if (!rec) rec = "> 63";

    el.innerText = rec + " A";

    // Visual toggle
    const icon = document.getElementById("breaker-icon");
    if (i > rec) icon.classList.add("text-red-500");
    else icon.classList.remove("text-red-500");
}

// --- 2. CABLE SELECTION ---
function setLoad(val) {
    document.getElementById("c-load").value = val;
    calcCable();
}

function calcCable() {
    const amps = parseFloat(document.getElementById("c-load").value);
    const resText = document.getElementById("c-result");
    const maxText = document.getElementById("c-max");
    const viz = document.getElementById("c-cross-viz");

    if (!amps || amps <= 0) return;

    // Simplistic Lookup Table for Copper (Residential hidden wiring approx)
    // PUE table estimations
    const table = [
        { max: 14, size: 1.5 }, // Light
        { max: 19, size: 1.5 }, // Sometimes 1.5 is OK for up to 19A in open air, but stick to 2.5 for sockets
        { max: 21, size: 2.5 }, // Standard Sockets (usually limited by 16A breaker)
        { max: 27, size: 4.0 },
        { max: 34, size: 6.0 },
        { max: 50, size: 10.0 },
        { max: 80, size: 16.0 },
    ];

    // Logic: Find smallest size where max >= amps
    // But enforce 1.5 min for power circuits usually
    let found = table.find((x) => x.max >= amps);

    if (!found) {
        resText.innerText = "> 16 мм²";
        maxText.innerText = "Див. таблиці";
        viz.innerText = "XL";
    } else {
        resText.innerText = found.size + " мм²";
        maxText.innerText = found.max + " А";
        viz.innerText = found.size;
    }
}

// --- 3. VOLTAGE DROP ---
function calcDrop() {
    const len = parseFloat(document.getElementById("d-len").value); // meters
    const s = parseFloat(document.getElementById("d-cross").value); // mm2
    const kw = parseFloat(document.getElementById("d-load").value); // kW

    if (len > 0 && s > 0 && kw > 0) {
        // Formula: dU = (2 * L * P * 1000) / (gamma * U * S)
        // Using P in Watts.
        // Assuming single phase 230V.
        // Gamma Copper = 56 m/(Ohm*mm2) approx

        const watts = kw * 1000;
        const voltage = 230;
        const gamma = 50; // Copper conductivity (rough conservative)

        // Simplifed formula for Voltage Drop in Volts
        // dU = 2 * I * L * R_per_meter?
        // dU = (2 * L * Watts) / (gamma * S * voltage)

        const dropV = (2 * len * watts) / (gamma * s * voltage);
        const dropPerc = (dropV / voltage) * 100;
        const endV = voltage - dropV;

        document.getElementById("d-res-v").innerText = endV.toFixed(1) + " V";
        document.getElementById("drop-v-end").textContent =
            endV.toFixed(0) + " V";
        document.getElementById("d-res-perc").innerText =
            dropPerc.toFixed(1) + " %";

        const status = document.getElementById("d-status");
        if (dropPerc > 5) {
            status.innerText = "Критична втрата! Збільшіть переріз.";
            status.className = "text-xs mt-2 text-red-400 font-bold";
        } else {
            status.innerText = "В межах норми (< 5%)";
            status.className = "text-xs mt-2 text-green-400";
        }
    }
}

// --- 4. LIGHTING ---
function calcLight() {
    const area = parseFloat(document.getElementById("l-area").value);
    const lux = parseFloat(document.getElementById("l-type").value);
    const lumensPerLamp = parseFloat(document.getElementById("l-lumens").value);

    if (area > 0 && lux > 0 && lumensPerLamp > 0) {
        const totalLumensNeeded = area * lux;
        // Safety factor / utilization factor approx 1.2 (walls absorb light)
        const finalLumens = totalLumensNeeded * 1.1;

        const lamps = Math.ceil(finalLumens / lumensPerLamp);

        document.getElementById("l-total").innerText = Math.round(finalLumens);
        document.getElementById("l-count").innerText = lamps + " шт";
    }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    calcPower("kw");
    calcCable();
    calcDrop();
    calcLight();
});
