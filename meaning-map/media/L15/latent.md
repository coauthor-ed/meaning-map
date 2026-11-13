# Final latent (F4)

## latent-a-green.jpg
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
label: Real output of Stable Diffusion 1.5: the 16,384 numbers of this picture's latent code, before the decoder. 4 channels, 64 x 64 each.
encode: final latents as they come out of the walk, 4 channels of 64 x 64 shown as 4 grey tiles, shared scale (mean +/- 3 standard deviations)
note: seed name A; the decoded picture is not saved, only compared with the walk's last frame

## comparison
compared_with: L13/walk/a-green/f30.jpg
this_run_final_sha256: d8886c5e3d08e2762166b3125b97c4d8a349dcaffee735ef9f226187955d3430
compared_file_sha256: 3a3d37fbb82eec8bbec3d3d5393398bbb372ba07618f83a33f21427559e7a773
byte_identical: NO

## delivered
The size field above is the generated original (512x512), kept in meaning-map-media-F.zip. Made by tools/v2-images/shrink.py.
delivered: latent-a-green.jpg, 384x384 JPEG quality 75, downscaled for delivery from the generated original
