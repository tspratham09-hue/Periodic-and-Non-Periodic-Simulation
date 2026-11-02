# Signals & Systems PBL — 3D Fourier Domain Visualizer

**Live Interactive Simulation:** [https://tspratham09-hue.github.io/Periodic-and-Non-Periodic-Simulation/](https://tspratham09-hue.github.io/Periodic-and-Non-Periodic-Simulation/)

## Project Overview
This project investigates **why periodic and non-periodic continuous-time signals behave differently in the frequency domain** using **Continuous-Time Fourier Series (CTFS)** and **Continuous-Time Fourier Transform (CTFT)** concepts.

* **Periodic Signals ($\tilde{x}(t) = \tilde{x}(t + T_0)$):** Repeat continuously over all time ($0 < P < \infty$, $E = \infty$) and produce a **discrete harmonic line spectrum** at integer multiples of the fundamental frequency $\omega_0 = \frac{2\pi}{T_0}$.
* **Non-Periodic Signals ($x(t)$):** Exist for a finite duration ($0 < E < \infty$, $P = 0$) and produce a **continuous spectral density** $X(j\omega)$ across all real frequencies.
* **The Bridge Relation:** As the repetition period $T_0 \to \infty$, the harmonic spacing $\omega_0 = \frac{2\pi}{T_0} \to 0$, and the scaled Fourier Series coefficients converge to the continuous Fourier Transform envelope:
  $$T_0 \cdot c_k = X(j\omega)\big|_{\omega = k\omega_0}$$

---

## Repository File Structure

| File Name | Description |
| :--- | :--- |
| `index.html` | Main application layout, control sidebar, and harmonic verification table modal |
| `style.css` | Stylesheet supporting both Dark Lab Mode and Classroom Projector Light Mode |
| `signals_math.js` | Mathematical engine for CTFS, CTFT, Parseval's power capture, and `.CSV` data export |
| `app_3d.js` | Three.js 3D volumetric tube/cylinder renderer and synchronized 2D oscilloscope |
| `pbl_3d_python_generator.py` | Companion Python (`numpy` + `matplotlib`) 3D visualization script for VS Code |

---

## Key Interactive Features
1. **3 Specialized 3D Modes:**
   * **Mode 1:** 3D Time-Frequency Decomposition (Time wall + 3D harmonic waves + Frequency wall)
   * **Mode 2:** 3D Period Waterfall ($T_0 \to \infty$ transition from discrete CTFS to continuous CTFT)
   * **Mode 3:** 3D Complex Phase Helix ($X(j\omega)e^{-j\omega t_0}$ showing the time-shift property)
2. **7 Analytical Waveforms:** Rectangular, Triangular, Gaussian, Modulated Cosine Burst, Double-Sided Exponential, Sinc Pulse, and Damped Cosine.
3. **Parseval's Power Meter & CSV Export:** Displays the exact percentage of signal power captured by $N$ harmonics and exports the harmonic table to `.CSV` for Excel/MATLAB verification.
