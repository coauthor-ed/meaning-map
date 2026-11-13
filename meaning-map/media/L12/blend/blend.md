# Halfway blends (A3)
Read each method line. Text-embedding blends are blends of two prompts' codes, not of two pictures.

## dragon-01+horse-01.jpg
kind: generated
method: text-embedding blend: 50/50 mean of the two prompts' CLIP text embeddings, then one normal walk. Not an image-embedding blend, not a VAE latent blend.
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 2103
prompt_a: a friendly green dragon standing on grass, side view, one animal, one head, four legs, whole body in frame, storybook painting, plain pale background
prompt_b: a friendly brown horse standing on grass, side view, one animal, one head, four legs, whole body in frame, storybook painting, plain pale background
negative_prompt: lowres, worst quality, jpeg artifacts, watermark, text, letters, words, numbers, sign, logo, caption, blurry, deformed
date: 2026-10-31
tries: 12
picked: c04 of 12 (dragon-01+horse-01.jpg)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5: the halfway point between two prompts' codes.

## dragon-02+horse-02.jpg
kind: generated
method: text-embedding blend: 50/50 mean of the two prompts' CLIP text embeddings, then one normal walk. Not an image-embedding blend, not a VAE latent blend.
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 2106
prompt_a: a friendly orange dragon standing on grass, three-quarter view, one animal, one head, four legs, whole body in frame, storybook painting, plain pale background
prompt_b: a friendly white horse standing on grass, three-quarter view, one animal, one head, four legs, whole body in frame, storybook painting, plain pale background
negative_prompt: lowres, worst quality, jpeg artifacts, watermark, text, letters, words, numbers, sign, logo, caption, blurry, deformed
date: 2026-10-31
tries: 12
picked: c07 of 12 (dragon-02+horse-02.jpg)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5: the halfway point between two prompts' codes.

## dragon-01+dragon-02.jpg
kind: generated
method: true latent midpoint of the two A1 files' VAE latents, then a real denoise at strength 0.5 toward the mean of the two prompts' text embeddings
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 2106
prompt_a: a friendly green dragon, storybook painting, plain pale background
prompt_b: a friendly orange dragon, storybook painting, plain pale background
negative_prompt: lowres, worst quality, jpeg artifacts, watermark, text, letters, words, numbers, sign, logo, caption, blurry, deformed
date: 2026-10-31
tries: 12
picked: c07 of 12 (dragon-01+dragon-02.jpg)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5: the halfway point between two pictures' codes.

## beach-01+bus-01.jpg
kind: generated
method: true latent midpoint of the two A1 files' VAE latents, then a real denoise at strength 0.5 toward the mean of the two prompts' text embeddings
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 2103
prompt_a: an empty sandy beach under a clear blue sky, documentary photo
prompt_b: a yellow school bus under a clear blue sky, documentary photo
negative_prompt: lowres, worst quality, jpeg artifacts, watermark, text, letters, words, numbers, sign, logo, caption, blurry, deformed
date: 2026-10-31
tries: 12
picked: c04 of 12 (beach-01+bus-01.jpg)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real output of Stable Diffusion 1.5: the halfway point between two pictures' codes.

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media.zip. Made by tools/v2-images/shrink.py.
delivered: 4 files, 384x384 JPEG quality 75, downscaled for delivery from the generated original
