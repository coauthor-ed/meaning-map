# Short prompt (F5)
Pairs with L01/hook-dragon.jpg: same seed and negative prompt, shorter prompt.

## expander-short.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 6104
prompt: a green dragon
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: expander-short.jpg
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5, seed 6104. Same seed as the longer prompt beside it.

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media-F.zip. Made by tools/v2-images/shrink.py.
delivered: expander-short.jpg, 384x384 JPEG quality 75, downscaled for delivery from the generated original
