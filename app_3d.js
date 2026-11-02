// =========================================================================
// app_3d.js
// 3D WebGL Renderer (Three.js), Volumetric Tube & Pillar Generators,
// Synchronized 2D Reference Scope, and Interactive UI Controls
// =========================================================================

const container = document.getElementById('viewer-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 250);
camera.position.set(20, 13.5, 23);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.update();

// Scene Lighting for 3D Tubes and Cylinders
const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight1.position.set(20, 30, 25);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x58a6ff, 0.35);
dirLight2.position.set(-20, 15, -15);
scene.add(dirLight2);

let gridHelper = new THREE.GridHelper(22, 22, 0x30363d, 0x1c2128);
scene.add(gridHelper);

const plotGroup = new THREE.Group();
scene.add(plotGroup);

let isLightMode = false;

// --- 3D Geometry Helper Functions ---
function create3DTube(points, radius, colorHex, opacity = 1.0) {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = Math.min(points.length * 2, 380);
    const geometry = new THREE.TubeGeometry(curve, segments, radius, 8, false);
    const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.32,
        metalness: 0.15,
        transparent: opacity < 1.0,
        opacity: opacity
    });
    return new THREE.Mesh(geometry, material);
}

function create3DRibbon(points, colorHex, opacity = 0.20) {
    const vertices = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        vertices.push(
            p1.x, 0, p1.z,
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p1.x, 0, p1.z,
            p2.x, p2.y, p2.z,
            p2.x, 0, p2.z
        );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    return new THREE.Mesh(geo, mat);
}

function create3DPillar(x, z, height, radius, colorHex) {
    const group = new THREE.Group();
    const absH = Math.abs(height);
    if (absH > 0.01) {
        const cylGeo = new THREE.CylinderGeometry(radius, radius, absH, 12);
        const cylMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.3,
            metalness: 0.2
        });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.set(x, height / 2.0, z);
        group.add(cyl);
    }
    const sphGeo = new THREE.SphereGeometry(radius * 1.65, 12, 12);
    const sphMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: colorHex,
        emissiveIntensity: 0.45,
        roughness: 0.2
    });
    const sph = new THREE.Mesh(sphGeo, sphMat);
    sph.position.set(x, height, z);
    group.add(sph);
    return group;
}

function createTextLabel(text, x, y, z, colorStr = "#8b949e", scaleSize = 1.6) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = "bold 26px Consolas, Arial";
    ctx.fillStyle = colorStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(scaleSize * 2.2, scaleSize * 0.55, 1);
    return sprite;
}

// --- Main Plot Update Function ---
function updatePlot() {
    while (plotGroup.children.length > 0) {
        const obj = plotGroup.children[0];
        plotGroup.remove(obj);
    }

    const mode = document.getElementById('viewMode').value;
    const shape = document.getElementById('pulseShape').value;
    const A = parseFloat(document.getElementById('A_slider').value);
    const T0 = parseFloat(document.getElementById('T0_slider').value);
    let tau = parseFloat(document.getElementById('tau_slider').value);
    const N = parseInt(document.getElementById('N_slider').value);
    const t0 = parseFloat(document.getElementById('t0_slider').value);
    const wc = parseFloat(document.getElementById('wc_slider').value);

    document.getElementById('carrier_group').style.display =
        (shape === 'cosine' || shape === 'damped') ? 'block' : 'none';

    if (tau >= T0 - 0.2) {
        tau = +(T0 - 0.2).toFixed(1);
        document.getElementById('tau_slider').value = tau;
    }

    const showContPulse = document.getElementById('showContPulse').checked;
    const showIdealPeriodic = document.getElementById('showIdealPeriodic').checked;
    const showFourierSum = document.getElementById('showFourierSum').checked;
    const showSineWaves = document.getElementById('showSineWaves').checked;
    const showContSpectrum = document.getElementById('showContSpectrum').checked;
    const showDiscreteStems = document.getElementById('showDiscreteStems').checked;
    const showSigned = document.getElementById('showSigned').checked;

    const w0 = (2 * Math.PI) / T0;
    const info = getWaveformDetails(A, tau, shape);
    const totalPower = info.energy / T0;
    const parsevalPct = computeParsevalCapture(A, T0, tau, N, shape, wc, totalPower);

    // Update UI Readouts
    document.getElementById('formula_display').innerText = info.formula;
    document.getElementById('A_val').innerText = A.toFixed(1);
    document.getElementById('T0_val').innerText = T0.toFixed(1) + " s";
    document.getElementById('tau_val').innerText = tau.toFixed(1) + " s";
    document.getElementById('N_val').innerText = N;
    document.getElementById('t0_val').innerText = t0.toFixed(2) + " s";
    document.getElementById('wc_val').innerText = wc.toFixed(1) + " rad/s";

    document.getElementById('out_w0').innerText = w0.toFixed(2) + " rad/s";
    document.getElementById('out_bw').innerText = info.bw.toFixed(2) + " rad/s";
    document.getElementById('out_duty').innerText = ((tau / T0) * 100).toFixed(1) + " %";
    document.getElementById('out_energy').innerText = info.energy.toFixed(2) + " J";
    document.getElementById('out_power').innerText = totalPower.toFixed(3) + " W";
    document.getElementById('out_parseval').innerText = parsevalPct.toFixed(1) + " %";
    document.getElementById('parseval_bar').style.width = parsevalPct.toFixed(0) + "%";

    updateHarmonicsTable(A, T0, tau, N, t0, shape, wc);

    const timeLimit = 5.5;
    const freqLimit = 22.0;
    const scaleX = 11.0 / timeLimit;
    const scaleZ = 11.0 / freqLimit;
    const scaleY = 3.2;

    const refFreq = (shape === 'cosine' || shape === 'damped') ? wc : 0;
    const peakCTFT = Math.max(0.2, Math.abs(calculateCTFT(refFreq, A, tau, shape, wc)));
    const freqScaleY = 5.2 / peakCTFT;

    // Mode 1: Standard 3D Time-Frequency Decomposition
    if (mode === 'standard') {
        const zTimeWall = 11.0;
        const xFreqWall = -11.0;

        plotGroup.add(createTextLabel("Time t (s) →", 0, -0.7, zTimeWall + 1.2, "#38bdf8", 1.7));
        plotGroup.add(createTextLabel("← Frequency ω (rad/s)", xFreqWall - 1.5, -0.7, 0, "#ff3366", 1.7));

        const numTimeSamples = 250;

        if (showIdealPeriodic) {
            const pts = [];
            for (let i = 0; i <= numTimeSamples; i++) {
                const t = -timeLimit + (2 * timeLimit * i) / numTimeSamples;
                let val = 0.0;
                for (let m = -3; m <= 3; m++) {
                    val += evaluateSinglePulse(t - t0 - m * T0, A, tau, shape, wc);
                }
                pts.push(new THREE.Vector3(t * scaleX, val * scaleY, zTimeWall - 0.55));
            }
            plotGroup.add(create3DTube(pts, 0.065, 0x00e5ff, 0.85));
            plotGroup.add(create3DRibbon(pts, 0x00e5ff, 0.12));
        }

        if (showContPulse) {
            const pts = [];
            for (let i = 0; i <= numTimeSamples; i++) {
                const t = -timeLimit + (2 * timeLimit * i) / numTimeSamples;
                const val = evaluateSinglePulse(t - t0, A, tau, shape, wc);
                pts.push(new THREE.Vector3(t * scaleX, val * scaleY, zTimeWall + 0.55));
            }
            plotGroup.add(create3DTube(pts, 0.085, 0xff3366, 1.0));
            plotGroup.add(create3DRibbon(pts, 0xff3366, 0.24));
        }

        if (showFourierSum) {
            const pts = [];
            const c0 = calculateCTFT(0, A, tau, shape, wc) / T0;
            for (let i = 0; i <= numTimeSamples; i++) {
                const t = -timeLimit + (2 * timeLimit * i) / numTimeSamples;
                let sum = c0;
                for (let k = 1; k <= N; k++) {
                    const wk = k * w0;
                    const ck = calculateCTFT(wk, A, tau, shape, wc) / T0;
                    sum += 2 * ck * Math.cos(wk * (t - t0));
                }
                pts.push(new THREE.Vector3(t * scaleX, sum * scaleY, zTimeWall));
            }
            plotGroup.add(create3DTube(pts, 0.075, 0xffa600, 1.0));
        }

        if (showSineWaves) {
            const maxK = Math.min(N, Math.floor(freqLimit / w0));
            for (let k = -maxK; k <= maxK; k++) {
                const wk = k * w0;
                const zPos = wk * scaleZ;
                const ck = calculateCTFT(wk, A, tau, shape, wc) / T0;
                const wavePts = [];

                for (let i = 0; i <= 130; i++) {
                    const t = -timeLimit + (2 * timeLimit * i) / 130;
                    const yVal = (k === 0) ? ck : ck * Math.cos(wk * (t - t0));
                    wavePts.push(new THREE.Vector3(t * scaleX, yVal * scaleY * 1.6, zPos));
                }

                const waveColor = (k === 0) ? 0xffa600 : 0x22c55e;
                plotGroup.add(create3DTube(wavePts, 0.045, waveColor, 0.85));
                plotGroup.add(create3DRibbon(wavePts, waveColor, 0.14));
            }
        }

        if (showContSpectrum) {
            const envPts = [];
            const numFreq = 250;
            for (let i = 0; i <= numFreq; i++) {
                const w = -freqLimit + (2 * freqLimit * i) / numFreq;
                const rawX = calculateCTFT(w, A, tau, shape, wc);
                const val = showSigned ? rawX : Math.abs(rawX);
                envPts.push(new THREE.Vector3(xFreqWall, val * freqScaleY, w * scaleZ));
            }
            plotGroup.add(create3DTube(envPts, 0.085, 0xff3366, 1.0));
            plotGroup.add(create3DRibbon(envPts, 0xff3366, 0.25));
        }

        if (showDiscreteStems) {
            const maxHarm = Math.floor(freqLimit / w0);
            for (let k = -maxHarm; k <= maxHarm; k++) {
                const wk = k * w0;
                const zPos = wk * scaleZ;
                const rawT0_ck = calculateCTFT(wk, A, tau, shape, wc);
                const val = showSigned ? rawT0_ck : Math.abs(rawT0_ck);
                const h = val * freqScaleY;
                plotGroup.add(create3DPillar(xFreqWall + 0.18, zPos, h, 0.09, 0x38bdf8));
            }
        }
    }

    // Mode 2: 3D Period Waterfall (T0 -> Infinity)
    else if (mode === 'waterfall') {
        const periods = [2.0, 3.5, 5.5, 9.0, T0];
        const sliceXPositions = [-8.5, -4.5, -0.5, 3.5, 7.2];
        const sliceColors = [0x38bdf8, 0x22c55e, 0xa855f7, 0xffa600, 0x00e5ff];

        for (let s = 0; s < periods.length; s++) {
            const P_curr = periods[s];
            const xSlice = sliceXPositions[s];
            const w0_curr = (2 * Math.PI) / P_curr;

            const envPts = [];
            for (let i = 0; i <= 150; i++) {
                const w = -freqLimit + (2 * freqLimit * i) / 150;
                const rawX = calculateCTFT(w, A, tau, shape, wc);
                const val = showSigned ? rawX : Math.abs(rawX);
                envPts.push(new THREE.Vector3(xSlice, val * freqScaleY, w * scaleZ));
            }
            plotGroup.add(create3DTube(envPts, 0.04, 0xff3366, 0.45));

            const maxH = Math.floor(freqLimit / w0_curr);
            for (let k = -maxH; k <= maxH; k++) {
                const wk = k * w0_curr;
                const rawVal = calculateCTFT(wk, A, tau, shape, wc);
                const val = showSigned ? rawVal : Math.abs(rawVal);
                plotGroup.add(create3DPillar(xSlice, wk * scaleZ, val * freqScaleY, 0.075, sliceColors[s]));
            }

            const lbl = (s === 4) ? `Your T0=${P_curr.toFixed(1)}s` : `T0=${P_curr.toFixed(1)}s`;
            plotGroup.add(createTextLabel(lbl, xSlice, -0.8, 11.2, "#38bdf8", 1.35));
        }

        const infPts = [];
        for (let i = 0; i <= 240; i++) {
            const w = -freqLimit + (2 * freqLimit * i) / 240;
            const rawX = calculateCTFT(w, A, tau, shape, wc);
            const val = showSigned ? rawX : Math.abs(rawX);
            infPts.push(new THREE.Vector3(10.5, val * freqScaleY, w * scaleZ));
        }
        plotGroup.add(create3DTube(infPts, 0.1, 0xff3366, 1.0));
        plotGroup.add(create3DRibbon(infPts, 0xff3366, 0.35));
        plotGroup.add(createTextLabel("T0 → ∞ (CTFT)", 10.5, -0.8, 11.2, "#ff3366", 1.45));
    }

    // Mode 3: 3D Complex Phase Helix
    else if (mode === 'phasor') {
        const helixPts = [];
        const realShadowPts = [];
        const imagShadowPts = [];
        const envMagPts = [];

        const numFreq = 350;
        for (let i = 0; i <= numFreq; i++) {
            const w = -freqLimit + (2 * freqLimit * i) / numFreq;
            const zPos = w * scaleZ;
            const X_real_base = calculateCTFT(w, A, tau, shape, wc);
            const phase = -w * t0;

            const reVal = X_real_base * Math.cos(phase) * freqScaleY * 0.75;
            const imVal = X_real_base * Math.sin(phase) * freqScaleY * 0.75;
            const magVal = Math.abs(X_real_base) * freqScaleY * 0.75;

            helixPts.push(new THREE.Vector3(imVal, reVal + 3.5, zPos));
            realShadowPts.push(new THREE.Vector3(-8.5, reVal + 3.5, zPos));
            imagShadowPts.push(new THREE.Vector3(imVal, 0.05, zPos));
            envMagPts.push(new THREE.Vector3(0, magVal + 3.5, zPos));
        }

        plotGroup.add(create3DTube(helixPts, 0.09, 0xff3366, 1.0));
        plotGroup.add(create3DTube(envMagPts, 0.05, 0xffa600, 0.75));
        plotGroup.add(create3DTube(realShadowPts, 0.045, 0x22c55e, 0.7));
        plotGroup.add(create3DTube(imagShadowPts, 0.045, 0xa855f7, 0.7));

        const maxHarm = Math.floor(freqLimit / w0);
        for (let k = -maxHarm; k <= maxHarm; k++) {
            const wk = k * w0;
            const zPos = wk * scaleZ;
            const X_val = calculateCTFT(wk, A, tau, shape, wc);
            const phase = -wk * t0;
            const reVal = X_val * Math.cos(phase) * freqScaleY * 0.75;
            const imVal = X_val * Math.sin(phase) * freqScaleY * 0.75;

            const spokePts = [
                new THREE.Vector3(0, 3.5, zPos),
                new THREE.Vector3(imVal, reVal + 3.5, zPos)
            ];
            plotGroup.add(create3DTube(spokePts, 0.04, 0x38bdf8, 0.95));
        }

        plotGroup.add(createTextLabel("3D Complex Helix X(jω)·e^(-jωt0)", 0, 8.2, 0, "#ffa600", 1.8));
    }

    draw2DScope(A, T0, tau, N, t0, wc, shape, showSigned);
}

// --- Synchronized 2D Reference Scope ---
function draw2DScope(A, T0, tau, N, t0, wc, shape, showSigned) {
    const canvas = document.getElementById('scopeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const midX = W / 2;
    ctx.strokeStyle = isLightMode ? "#cbd5e1" : "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, 0); ctx.lineTo(midX, H);
    ctx.moveTo(0, H * 0.65); ctx.lineTo(W, H * 0.65);
    ctx.stroke();

    ctx.fillStyle = isLightMode ? "#334155" : "#8b949e";
    ctx.font = "10px Arial";
    ctx.fillText("Time: x(t) [Red] vs x̃(t) [Cyan]", 8, 13);
    ctx.fillText("Freq: |X(jω)| [Red] vs T0|ck| [Blue]", midX + 8, 13);

    const tMax = 4.5;
    ctx.strokeStyle = "#00b4d8";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let px = 6; px < midX - 6; px++) {
        const t = -tMax + (2 * tMax * (px - 6)) / (midX - 12);
        let v = 0;
        for (let m = -2; m <= 2; m++) v += evaluateSinglePulse(t - t0 - m * T0, A, tau, shape, wc);
        const py = H * 0.65 - (v / 2.0) * (H * 0.42);
        if (px === 6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = "#ff3366";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let px = 6; px < midX - 6; px++) {
        const t = -tMax + (2 * tMax * (px - 6)) / (midX - 12);
        const v = evaluateSinglePulse(t - t0, A, tau, shape, wc);
        const py = H * 0.65 - (v / 2.0) * (H * 0.42);
        if (px === 6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const wMax = 20.0;
    const refFreq = (shape === 'cosine' || shape === 'damped') ? wc : 0;
    const peak = Math.max(0.2, Math.abs(calculateCTFT(refFreq, A, tau, shape, wc)));

    ctx.strokeStyle = "#ff3366";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let px = midX + 6; px < W - 6; px++) {
        const w = -wMax + (2 * wMax * (px - midX - 6)) / (midX - 12);
        const raw = calculateCTFT(w, A, tau, shape, wc);
        const val = showSigned ? raw : Math.abs(raw);
        const py = H * 0.65 - (val / peak) * (H * 0.45);
        if (px === midX + 6) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const w0 = (2 * Math.PI) / T0;
    const maxK = Math.floor(wMax / w0);
    ctx.strokeStyle = "#0284c7";
    ctx.fillStyle = "#38bdf8";
    ctx.lineWidth = 1.4;
    for (let k = -maxK; k <= maxK; k++) {
        const wk = k * w0;
        const px = midX + 6 + ((wk + wMax) / (2 * wMax)) * (midX - 12);
        const raw = calculateCTFT(wk, A, tau, shape, wc);
        const val = showSigned ? raw : Math.abs(raw);
        const py = H * 0.65 - (val / peak) * (H * 0.45);
        ctx.beginPath();
        ctx.moveTo(px, H * 0.65);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// --- UI Actions, Theme Toggle & Animations ---
function changeCamera(view) {
    if (view === '3d') camera.position.set(20, 13.5, 23);
    else if (view === 'time') camera.position.set(0, 2.8, 30);
    else if (view === 'freq') camera.position.set(-28, 3.5, 0);
    else if (view === 'top') camera.position.set(0, 34, 0.01);
    controls.target.set(0, 2.0, 0);
    controls.update();
}

function toggleTheme() {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode', isLightMode);
    document.getElementById('themeBtn').innerText = isLightMode ? "🌙 Dark" : "☀️ Light";

    scene.background = new THREE.Color(isLightMode ? 0xf1f5f9 : 0x0d1117);
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(
        22, 22,
        isLightMode ? 0x94a3b8 : 0x30363d,
        isLightMode ? 0xcbd5e1 : 0x1c2128
    );
    scene.add(gridHelper);
    updatePlot();
}

function toggleTableModal() {
    const modal = document.getElementById('tableModal');
    modal.style.display = (modal.style.display === 'none') ? 'flex' : 'none';
}

function toggleScope() {
    const show = document.getElementById('show2DScope').checked;
    document.getElementById('scopePanel').style.display = show ? 'block' : 'none';
}

function saveScreenshot() {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'Signals_Systems_3D_Plot.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

let activeAnim = null;
let lastStepTime = 0;

function toggleAnimation(type) {
    const btns = ['T0', 'N', 't0'];
    if (activeAnim === type) {
        activeAnim = null;
    } else {
        activeAnim = type;
        if (type === 't0') document.getElementById('viewMode').value = 'phasor';
    }
    btns.forEach(b => {
        const el = document.getElementById('btn_anim_' + b);
        if (el) el.classList.toggle('active-btn', activeAnim === b);
    });
    updatePlot();
}

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (activeAnim && timestamp - lastStepTime > 70) {
        lastStepTime = timestamp;
        if (activeAnim === 'T0') {
            const sl = document.getElementById('T0_slider');
            let v = parseFloat(sl.value) + 0.15;
            if (v > 12.0) v = 2.0;
            sl.value = v.toFixed(2);
            updatePlot();
        } else if (activeAnim === 'N') {
            const sl = document.getElementById('N_slider');
            let v = parseInt(sl.value) + 1;
            if (v > 30) v = 1;
            sl.value = v;
            updatePlot();
        } else if (activeAnim === 't0') {
            const sl = document.getElementById('t0_slider');
            let v = parseFloat(sl.value) + 0.05;
            if (v > 1.5) v = -1.5;
            sl.value = v.toFixed(2);
            updatePlot();
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

updatePlot();
requestAnimationFrame(animate);
