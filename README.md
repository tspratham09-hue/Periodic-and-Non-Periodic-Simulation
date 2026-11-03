# Signals & Systems PBL — 3D Fourier Domain Visualizer

**Live Interactive Simulation:** [https://tspratham09-hue.github.io/Periodic-and-Non-Periodic-Simulation/](https://tspratham09-hue.github.io/Periodic-and-Non-Periodic-Simulation/)

## Project Overview
This project investigates **why periodic and non-periodic continuous-time signals behave differently in the frequency domain** using **Continuous-Time Fourier Series (CTFS)** and **Continuous-Time Fourier Transform (CTFT)** concepts.

* **Periodic Signals ($	ilde{x}(t) = 	ilde{x}(t + T_0)$):** Repeat continuously over all time ($0 < P < \infty$, $E = \infty$) and produce a **discrete harmonic line spectrum** at integer multiples of the fundamental frequency $\omega_0 = rac{2\pi}{T_0}$.
* **Non-Periodic Signals ($x(t)$):** Exist for a finite duration ($0 < E < \infty$, $P = 0$) and produce a **continuous spectral density** $X(j\omega)$ across all real frequencies.
* **The Bridge Relation:** As the repetition period $T_0 	o \infty$, the harmonic spacing $\omega_0 = rac{2\pi}{T_0} 	o 0$, and the scaled Fourier Series coefficients converge to the continuous Fourier Transform envelope:
  $$T_0 \cdot c_k = X(j\omega)ig|_{\omega = k\omega_0}$$

---

## Repository File Structure

| File Name | Description |
| :--- | :--- |
| `index.html` | Main application layout, experiment presets, theory sheet, and harmonics table |
| `style.css` | Stylesheet supporting both Dark Lab Mode and Classroom Projector Light Mode |
| `signals_math.js` | Mathematical engine for CTFS, CTFT, MSE, Parseval's power capture, and `.CSV` export |
| `app_3d.js` | Three.js 3D volumetric tube/cylinder renderer, harmonic inspector, and 2D scope |
| `pbl_3d_python_generator.py` | Companion Python (`numpy` + `matplotlib`) 3D visualization script for VS Code |
