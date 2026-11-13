# Strength of the prompt (F3)
Same seed and prompt, only cfg_scale changes. All real runs.

## cfg-01.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 1
size: 512x512
precision: float32
seed: 2
prompt: a green dragon
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: cfg-01.jpg
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5, seed 2, cfg_scale 1. Only the strength of the prompt differs between the three.
note: cfg 1 means the model runs once per step, with the prompt only. The second pass and the negative prompt are skipped.

## cfg-03.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 3
size: 512x512
precision: float32
seed: 2
prompt: a green dragon
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: cfg-03.jpg
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5, seed 2, cfg_scale 3. Only the strength of the prompt differs between the three.

## cfg-15.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 15
size: 512x512
precision: float32
seed: 2
prompt: a green dragon
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: cfg-15.jpg
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5, seed 2, cfg_scale 15. Only the strength of the prompt differs between the three.

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media-F.zip. Made by tools/v2-images/shrink.py.
delivered: 3 files, 384x384 JPEG quality 70, downscaled for delivery from the generated original
