// =========================================================================
// signals_math.js
// Mathematical functions for Continuous-Time Fourier Series (CTFS),
// Continuous-Time Fourier Transform (CTFT), Parseval's Theorem & CSV Export
// =========================================================================

// Normalized sinc function: sinc(x) = sin(pi * x) / (pi * x)
function sinc(x) {
    if (Math.abs(x) < 1e-6) return 1.0;
    return Math.sin(Math.PI * x) / (Math.PI * x);
}

// Evaluate single isolated continuous-time pulse x(t) centered at t = 0
function evaluateSinglePulse(t, A, tau, shape, wc) {
    const half = tau / 2.0;

    if (shape === 'rect') {
        return (Math.abs(t) <= half) ? A : 0.0;
    } else if (shape === 'tri') {
        return (Math.abs(t) <= half) ? A * (1.0 - Math.abs(t) / half) : 0.0;
    } else if (shape === 'gauss') {
        const sigma = tau * 0.35;
        return A * Math.exp(-(t * t) / (2 * sigma * sigma));
    } else if (shape === 'cosine') {
        return (Math.abs(t) <= half) ? A * Math.cos(wc * t) : 0.0;
    } else if (shape === 'exp') {
        const alpha = 2.5 / tau;
        return (Math.abs(t) <= tau * 1.4) ? A * Math.exp(-alpha * Math.abs(t)) : 0.0;
    } else if (shape === 'sinc_pulse') {
        return A * sinc((2.0 * t) / tau);
    } else if (shape === 'damped') {
        const alpha = 1.8 / tau;
        return (Math.abs(t) <= tau * 1.3) ? A * Math.exp(-alpha * Math.abs(t)) * Math.cos(wc * t) : 0.0;
    }
    return 0.0;
}

// Evaluate analytical Continuous-Time Fourier Transform X(jw)
function calculateCTFT(w, A, tau, shape, wc) {
    if (shape === 'rect') {
        return A * tau * sinc((w * tau) / (2 * Math.PI));
    } else if (shape === 'tri') {
        const s = sinc((w * tau) / (4 * Math.PI));
        return 0.5 * A * tau * s * s;
    } else if (shape === 'gauss') {
        const sigma = tau * 0.35;
        return A * Math.sqrt(2 * Math.PI) * sigma * Math.exp(-0.5 * sigma * sigma * w * w);
    } else if (shape === 'cosine') {
        const s1 = sinc(((w - wc) * tau) / (2 * Math.PI));
        const s2 = sinc(((w + wc) * tau) / (2 * Math.PI));
        return 0.5 * A * tau * (s1 + s2);
    } else if (shape === 'exp') {
        const alpha = 2.5 / tau;
        return A * (2 * alpha) / (alpha * alpha + w * w);
    } else if (shape === 'sinc_pulse') {
        const W_cut = (2.0 * Math.PI) / tau;
        return (Math.abs(w) <= W_cut) ? (0.5 * A * tau) : 0.0;
    } else if (shape === 'damped') {
        const alpha = 1.8 / tau;
        const L1 = alpha / (alpha * alpha + (w - wc) * (w - wc));
        const L2 = alpha / (alpha * alpha + (w + wc) * (w + wc));
        return A * (L1 + L2);
    }
    return 0.0;
}

// Return analytical formula string, main-lobe bandwidth, and pulse energy
function getWaveformDetails(A, tau, shape) {
    if (shape === 'rect') {
        return { formula: "X(jω) = A·τ·sinc(ωτ / 2π)", bw: (4 * Math.PI) / tau, energy: A * A * tau };
    } else if (shape === 'tri') {
        return { formula: "X(jω) = (Aτ/2)·sinc²(ωτ / 4π)", bw: (8 * Math.PI) / tau, energy: (A * A * tau) / 3.0 };
    } else if (shape === 'gauss') {
        const sigma = tau * 0.35;
        return { formula: "X(jω) = A√(2π)σ·exp(-σ²ω²/2)", bw: 4.0 / sigma, energy: A * A * sigma * Math.sqrt(Math.PI) };
    } else if (shape === 'cosine') {
        return { formula: "X(jω) = (Aτ/2)[sinc(ω-ωc) + sinc(ω+ωc)]", bw: (4 * Math.PI) / tau, energy: 0.5 * A * A * tau };
    } else if (shape === 'exp') {
        const alpha = 2.5 / tau;
        return { formula: "X(jω) = 2Aα / (α² + ω²)", bw: 2.0 * alpha, energy: (A * A) / alpha };
    } else if (shape === 'sinc_pulse') {
        return { formula: "X(jω) = (Aτ/2)·rect(ωτ / 4π)", bw: (4 * Math.PI) / tau, energy: 0.5 * A * A * tau };
    } else {
        const alpha = 1.8 / tau;
        return { formula: "X(jω) = Aα/[α²+(ω-ωc)²] + Aα/[α²+(ω+ωc)²]", bw: 4.0 * alpha, energy: (0.5 * A * A) / alpha };
    }
}

// Compute Parseval's Theorem power percentage captured by N harmonics
function computeParsevalCapture(A, T0, tau, N, shape, wc, totalPower) {
    if (totalPower <= 1e-9) return 100.0;
    const w0 = (2 * Math.PI) / T0;
    const c0 = calculateCTFT(0, A, tau, shape, wc) / T0;
    let pCaptured = c0 * c0;

    for (let k = 1; k <= N; k++) {
        const ck = calculateCTFT(k * w0, A, tau, shape, wc) / T0;
        pCaptured += 2.0 * (ck * ck);
    }
    return Math.min(100.0, (pCaptured / totalPower) * 100.0);
}

// Populate the HTML Harmonics Verification Table
function updateHarmonicsTable(A, T0, tau, N, t0, shape, wc) {
    const tbody = document.getElementById('harmonicsTableBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const w0 = (2 * Math.PI) / T0;
    for (let k = 0; k <= N; k++) {
        const wk = k * w0;
        const X_val = calculateCTFT(wk, A, tau, shape, wc);
        const ck_mag = Math.abs(X_val) / T0;
        const scaled_ck = T0 * ck_mag;
        const phase = -wk * t0 + (X_val < 0 ? Math.PI : 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>k = ${k}</td>
            <td>${wk.toFixed(3)}</td>
            <td>${ck_mag.toFixed(4)}</td>
            <td>${scaled_ck.toFixed(4)}</td>
            <td>${Math.abs(X_val).toFixed(4)}</td>
            <td>${phase.toFixed(3)}</td>
        `;
        tbody.appendChild(row);
    }
}

// Export the current Fourier Series & CTFT comparison table to a CSV file
function exportHarmonicsCSV() {
    const shape = document.getElementById('pulseShape').value;
    const A = parseFloat(document.getElementById('A_slider').value);
    const T0 = parseFloat(document.getElementById('T0_slider').value);
    const tau = parseFloat(document.getElementById('tau_slider').value);
    const N = parseInt(document.getElementById('N_slider').value);
    const t0 = parseFloat(document.getElementById('t0_slider').value);
    const wc = parseFloat(document.getElementById('wc_slider').value);

    const w0 = (2 * Math.PI) / T0;
    let csvContent = "Harmonic_k,Frequency_rad_s,CTFS_Mag_ck,Scaled_CTFS_T0_ck,CTFT_Mag_X_jkw0,Phase_rad\n";

    for (let k = -N; k <= N; k++) {
        const wk = k * w0;
        const X_val = calculateCTFT(wk, A, tau, shape, wc);
        const ck_mag = Math.abs(X_val) / T0;
        const scaled_ck = T0 * ck_mag;
        const phase = -wk * t0 + (X_val < 0 ? Math.PI : 0);
        csvContent += `${k},${wk.toFixed(4)},${ck_mag.toFixed(6)},${scaled_ck.toFixed(6)},${Math.abs(X_val).toFixed(6)},${phase.toFixed(4)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Fourier_Harmonics_${shape}_T0_${T0}s.csv`;
    link.click();
}
