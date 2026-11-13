<!-- STEP id="s1" -->
## Try a Round Trip

Pick a picture, press Squeeze, and then press Open. The left picture is the original, and the right picture is what the real decoder made from the latent code alone. Compare the two carefully before you go on.

**What came back from the latent code alone?**

<!-- STEP id="s2" -->
## Look Closer

The round trip comes back almost the same, with tiny changes. Press Look closer to enlarge both pictures, and search the thin lines and small patterns for what changed. Expecting a blurry copy is reasonable, because a small photo goes blurry when you stretch it. A decoder does not stretch anything, since it has learned to draw detail back in.

**A decoder draws detail back in, so it does not blur like a stretched photo.**

<!-- STEP id="s3" -->
## Why Squeezing Works, and What It Costs

Squeezing works because real pictures are not random. Neighbouring pixels usually agree, as they did in the ball, so most of the 7,86,432 numbers repeat what others already say. The cost is that the finest detail does not fit in the latent code, and the decoder redraws it from what it learned in training.

**The latent code keeps what is in the picture, and the decoder redraws the fine detail.**
