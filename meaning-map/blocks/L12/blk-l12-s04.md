<!-- STEP id="s1" -->
## Halfway Between Two Latent Codes

A latent code is a list of numbers, so you can do sums with it. Take the latent codes of two pictures, average each pair of numbers, and you have a new latent code exactly halfway between them. Pick a pair and press Halfway to see where it leads.

**What does a latent code halfway between two pictures open into?**

<!-- STEP id="s2" -->
## How This Picture Was Made

This picture needed more than the decoder. A plain average usually opens into two faint pictures laid over each other, so the picture model then cleaned up the halfway latent code. We kept the best of 12 tries, and later lessons explain that cleaning. Even so, the start was a real average, and the result holds something of both pictures.

**This picture came from a real average, then a clean-up by the picture model.**

<!-- STEP id="s3" -->
## Why Models Work With Latent Codes

Picture models work on latent codes instead of pixels. A latent code has 48 times fewer numbers, so every step is far cheaper. The decoder also takes care of the fine detail, so the model can spend its effort on what the picture shows. You saw the same idea when Random 3 numbers beat Random.

**Models work on latent codes because they hold the picture in far fewer numbers.**

<!-- STEP id="s4" -->
## Not the Same as a Word Embedding

A latent code and a word embedding are both lists of numbers found by training, so they are easy to mix up. An embedding is fixed: a word has one list, kept in the embedding table. A latent code is worked out fresh for each picture and opens straight into pixels. Each part of a latent code matches a part of the picture, so two dragons facing opposite ways can have very different latent codes.

**A word has one fixed embedding, but each picture gets its own latent code.**
