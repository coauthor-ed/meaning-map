# Walk run none-a (B1)
All 31 frames come from one real run.

## run
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
picked: this run (no choosing)
licence: CreativeML OpenRAIL-M (outputs may be redistributed, under the use limits in the model card)
label: Real run of Stable Diffusion 1.5, seed 2, 30 steps. Preview = the model's numbers decoded after each step.
note: seed name A; timesteps [958, 925, 892, 859, 826, 793, 760, 727, 694, 661, 628, 595, 562, 529, 496, 463, 430, 397, 364, 331, 298, 265, 232, 199, 166, 133, 100, 67, 34, 1]

## eye checks
one_change: Yes, the pose is roughly similar and the colour changed
one_change_miss: Wings changed
pose_differs: Yes, limb positions are different 
green_finals: Yes, three different dragons
f15_half_formed: Yes, all six are soft
giant_blur: Yes, all three are blurs
none_a_subject: Living room with furniture

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media.zip. Made by tools/v2-images/shrink.py.
delivered: 30 files, 320x320 JPEG quality 60, downscaled for delivery from the generated original
delivered: f30.jpg, 384x384 JPEG quality 75, downscaled for delivery from the generated original
