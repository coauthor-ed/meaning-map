# Noise guess (F1)
10 files: noise-true.jpg, noisy-t200.jpg, noisy-t500.jpg, noisy-t800.jpg, guess-t200.jpg, guess-t500.jpg, guess-t800.jpg, clean-t200.jpg, clean-t500.jpg, clean-t800.jpg

## noise-guess (10 files)
kind: noise guess, no walk
method: z0 = vae.encode of the source; noise from the seed below; noisy = add_noise(z0, noise, t); one UNet pass with the empty prompt; clean = (noisy - sqrt(1-a) * guess) / sqrt(a), a = alphas_cumprod[t]
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIM alphas_cumprod and add_noise only, no walk
steps: none (no walk)
cfg_scale: none (empty prompt only, one pass)
size: 512x512
precision: float32
seed: 7001 (noise only)
prompt: (empty)
negative_prompt: none (one pass)
date: 2026-10-31
tries: 1
picked: all 10 kept, none chosen
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5: its noise guess for this picture at one noise level. No words were given.
source_file: L12/map/horse-01.jpg
encode: vae.encode, latent mean, no resize; noise-true and guess-* are 4 channels shown as 4 grey tiles, shared scale (mean +/- 3 standard deviations of that tensor)
note: measured, guess vs true noise: t200: pearson(guess, true noise) 0.8514, mean squared error 0.2748; t500: pearson(guess, true noise) 0.9622, mean squared error 0.0742; t800: pearson(guess, true noise) 0.9936, mean squared error 0.0127

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media-F.zip. Made by tools/v2-images/shrink.py.
delivered: 10 files, 384x384 JPEG quality 70, downscaled for delivery from the generated original
