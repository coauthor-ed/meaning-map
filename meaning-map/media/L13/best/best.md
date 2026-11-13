# Best guess, no words (F2)
One real run for the strip; the other two are finals only.

## none-a-s01 ... -s30 (8 files)
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
prompt: (empty)
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: this run (no choosing), 8 steps kept
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real run of Stable Diffusion 1.5 with no words, seed 2. Best guess = the model's estimate of the finished picture at that step.
note: seed name A; best guess (decoded x0 estimate) after steps [1, 3, 6, 10, 15, 20, 25, 30]; the last one is the estimate at step 30, not the final picture

## comparison
compared_with: L13/walk/none-a/f30.jpg
this_run_final_sha256: 89b17170d77e0313d6fab010ff81fade13e591b1c5afeeef2cf108e13fcf3d65
compared_file_sha256: ad8dcdd2afd2e346cd5693ba2d25a08075eb5acfee12ff5e620590107c7e428b
byte_identical: NO

## none-b.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 20
prompt: (empty)
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: this run (no choosing)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real run of Stable Diffusion 1.5 with no words, seed 20. Best guess = the model's estimate of the finished picture at that step.
note: seed name B; final picture after 30 steps

## none-c.jpg
kind: generated
model: Stable Diffusion 1.5
model_revision: stable-diffusion-v1-5/stable-diffusion-v1-5 @ 451f4fe16113bff5a5d2269ed5ad43b0592e9a14
vae: stable-diffusion-v1-5/stable-diffusion-v1-5 vae (AutoencoderKL, same revision)
scheduler: DDIMScheduler (eta 0, leading timesteps)
steps: 30
cfg_scale: 7.5
size: 512x512
precision: float32
seed: 23
prompt: (empty)
negative_prompt: lowres, worst quality, jpeg artifacts, watermark
date: 2026-10-31
tries: 1
picked: this run (no choosing)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real run of Stable Diffusion 1.5 with no words, seed 23. Best guess = the model's estimate of the finished picture at that step.
note: seed name C; final picture after 30 steps

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media-F.zip. Made by tools/v2-images/shrink.py.
delivered: 7 files, 320x320 JPEG quality 60, downscaled for delivery from the generated original
delivered: 3 files, 384x384 JPEG quality 75, downscaled for delivery from the generated original
