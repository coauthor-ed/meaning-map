# Identical re-run (B3)

## rerun-a-green.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 2
prompt: a green dragon
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: this run (no choosing)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Run 2: Real output of Stable Diffusion 1.5, seed 2

## comparison
run_1_file: L13/walk/a-green/f30.jpg
run_1_sha256: 3a3d37fbb82eec8bbec3d3d5393398bbb372ba07618f83a33f21427559e7a773
run_2_file: L15/rerun-a-green.jpg
run_2_sha256: 3a3d37fbb82eec8bbec3d3d5393398bbb372ba07618f83a33f21427559e7a773
byte_identical: yes
device: NVIDIA GeForce GTX 1660 SUPER

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media.zip. Made by tools/v2-images/shrink.py.
delivered: rerun-a-green.jpg, 384x384 JPEG quality 75, downscaled for delivery from the generated original
delivered_sha256: 7b8489fb066ca5d78d35b852b62047416d3a0c1cbca270793d53fcd8f2023107, both files
