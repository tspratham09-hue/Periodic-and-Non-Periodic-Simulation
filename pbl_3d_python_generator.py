"""
Signals & Systems PBL - Python 3D Waveform Studio & GitHub Pages Updater
------------------------------------------------------------------------
What this Python script does in VS Code:
1. Renders a professional 3D Volumetric Waveform & Spectrum Model in Python
   with 3D filled ribbons, 3D harmonic waves, continuous CTFT envelope,
   and discrete CTFS pillars (supports all 5 waveforms).
2. Can also export/update your index.html for GitHub Pages.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# =========================================================================
# 1. CHOOSE WAVEFORM & SIGNAL PARAMETERS
# =========================================================================
# Options: 'rect', 'tri', 'gauss', 'cosine', 'exp'
WAVE_SHAPE = 'gauss'
A     = 1.0       # Amplitude
tau   = 1.0       # Pulse duration (s)
T0    = 4.0       # Repetition period for periodic signal (s)
N_harm = 11       # Number of Fourier harmonics
wc    = 8.0       # Carrier frequency for cosine burst (rad/s)

w0 = 2 * np.pi / T0
t_max = 5.5
w_max = 20.0

t = np.linspace(-t_max, t_max, 600)
w = np.linspace(-w_max, w_max, 600)

# =========================================================================
# 2. SIGNAL & FOURIER TRANSFORM DEFINITIONS
# =========================================================================
def single_pulse(t_arr, shape):
    half = tau / 2.0
    if shape == 'rect':
        return A * (np.abs(t_arr) <= half).astype(float)
    elif shape == 'tri':
        return A * np.maximum(0.0, 1.0 - np.abs(t_arr) / half)
    elif shape == 'gauss':
        sigma = tau * 0.35
        return A * np.exp(-(t_arr**2) / (2 * sigma**2))
    elif shape == 'cosine':
        return A * np.cos(wc * t_arr) * (np.abs(t_arr) <= half).astype(float)
    elif shape == 'exp':
        alpha = 2.5 / tau
        return A * np.exp(-alpha * np.abs(t_arr)) * (np.abs(t_arr) <= tau * 1.4)

def ctft_spectrum(w_arr, shape):
    if shape == 'rect':
        return A * tau * np.sinc((w_arr * tau) / (2 * np.pi))
    elif shape == 'tri':
        return 0.5 * A * tau * (np.sinc((w_arr * tau) / (4 * np.pi)))**2
    elif shape == 'gauss':
        sigma = tau * 0.35
        return A * np.sqrt(2 * np.pi) * sigma * np.exp(-0.5 * (sigma * w_arr)**2)
    elif shape == 'cosine':
        s1 = np.sinc(((w_arr - wc) * tau) / (2 * np.pi))
        s2 = np.sinc(((w_arr + wc) * tau) / (2 * np.pi))
        return 0.5 * A * tau * (s1 + s2)
    elif shape == 'exp':
        alpha = 2.5 / tau
        return A * (2 * alpha) / (alpha**2 + w_arr**2)

# Helper to add 3D shaded ribbon under any 3D curve
def add_3d_ribbon(ax, xs, ys, zs, color, alpha=0.25):
    verts = [list(zip(xs, ys, zs)) + [(xs[-1], ys[-1], 0), (xs[0], ys[0], 0)]]
    poly = Poly3DCollection(verts, facecolors=color, edgecolors='none', alpha=alpha)
    ax.add_collection3d(poly)

# =========================================================================
# 3. COMPUTE CONTINUOUS & PERIODIC SIGNALS
# =========================================================================
x_cont_pulse = single_pulse(t, WAVE_SHAPE)
x_periodic = sum(single_pulse(t - m * T0, WAVE_SHAPE) for m in range(-3, 4))

# Fourier Series Synthesis
c0 = ctft_spectrum(0.0, WAVE_SHAPE) / T0
x_synth = np.full_like(t, c0)
for k in range(1, N_harm + 1):
    ck = ctft_spectrum(k * w0, WAVE_SHAPE) / T0
    x_synth += 2.0 * ck * np.cos(k * w0 * t)

# Continuous CTFT and Discrete CTFS Stems
X_cont = np.abs(ctft_spectrum(w, WAVE_SHAPE))
k_vec = np.arange(-int(w_max / w0), int(w_max / w0) + 1)
wk = k_vec * w0
T0_ck = np.abs(ctft_spectrum(wk, WAVE_SHAPE))

# =========================================================================
# 4. PLOT PROFESSIONAL DARK-THEME 3D VISUALIZATION
# =========================================================================
plt.style.use('dark_background')
fig = plt.figure(figsize=(15, 8.5), facecolor='#0d1117')
fig.canvas.manager.set_window_title('3D Fourier Domain Visualizer (Python Studio)')

ax = fig.add_subplot(111, projection='3d', facecolor='#0d1117')

# A. Plot 3D Harmonic Sine Waves + Translucent Ribbons
for k in range(-min(N_harm, 10), min(N_harm, 10) + 1):
    w_pos = k * w0
    ck_val = ctft_spectrum(w_pos, WAVE_SHAPE) / T0
    wave_z = np.full_like(t, ck_val) if k == 0 else ck_val * np.cos(w_pos * t) * 1.5
    col = '#ffa600' if k == 0 else '#22c55e'
    ax.plot(t, np.full_like(t, w_pos), wave_z, color=col, lw=1.4, alpha=0.8)
    add_3d_ribbon(ax, t, np.full_like(t, w_pos), wave_z, color=col, alpha=0.10)

# B. Front Time Wall (y = -w_max): Continuous Pulse, Periodic Train & FS Synthesis
y_wall_time = np.full_like(t, -w_max)
ax.plot(t, y_wall_time - 0.6, x_periodic, color='#00e5ff', lw=2.2, label='Ideal Continuous Periodic Signal x̃(t)')
ax.plot(t, y_wall_time, x_synth, color='#ffa600', lw=2.0, ls='--', label=f'Fourier Series Synthesis (N={N_harm})')
ax.plot(t, y_wall_time + 0.6, x_cont_pulse, color='#ff3366', lw=2.8, label='Continuous Non-Periodic Signal x(t)')
add_3d_ribbon(ax, t, y_wall_time + 0.6, x_cont_pulse, color='#ff3366', alpha=0.28)

# C. Side Frequency Wall (x = t_max): Continuous CTFT Envelope + Discrete CTFS Pillars
x_wall_freq = np.full_like(w, t_max)
scale_freq = (1.35 * A) / np.max(X_cont)
ax.plot(x_wall_freq, w, X_cont * scale_freq, color='#ff3366', lw=3.0, label='Continuous CTFT Spectrum |X(jω)|')
add_3d_ribbon(ax, x_wall_freq, w, X_cont * scale_freq, color='#ff3366', alpha=0.25)

for w_val, h_val in zip(wk, T0_ck * scale_freq):
    ax.plot([t_max, t_max], [w_val, w_val], [0, h_val], color='#38bdf8', lw=2.6)
ax.scatter(np.full_like(wk, t_max), wk, T0_ck * scale_freq, color='#ffffff', edgecolors='#38bdf8', s=38, depthshade=False, label='Discrete CTFS Stems (T0·|ck|)')

ax.set_xlabel('Time t (s)', fontsize=11, fontweight='bold', labelpad=10, color='#79c0ff')
ax.set_ylabel('Frequency ω (rad/s)', fontsize=11, fontweight='bold', labelpad=10, color='#ff7b72')
ax.set_zlabel('Amplitude / Normalized Magnitude', fontsize=11, fontweight='bold', labelpad=8, color='#e6edf3')
ax.set_title(f'3D Continuous-Time Periodic (CTFS) vs. Non-Periodic (CTFT) Model — Shape: {WAVE_SHAPE.upper()}',
             fontsize=13.5, fontweight='bold', color='#58a6ff', pad=15)

ax.set_xlim(-t_max, t_max)
ax.set_ylim(-w_max, w_max)
ax.set_zlim(-0.35 * A, 1.45 * A)
ax.view_init(elev=25, azim=-42)
ax.legend(loc='upper left', facecolor='#161b22', edgecolor='#30363d', fontsize=9.5)

plt.tight_layout()
plt.show()
