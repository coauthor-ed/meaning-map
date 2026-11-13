<!-- STEP id="s1" -->
## A Much Bigger Picture

This dragon was made at 512 by 512 pixels, with three numbers in each pixel, so it is a list of 7,86,432 numbers. The ball shrank to three numbers because a person knew its choices.

**No person can list the choices in a dragon, so how could this picture be squeezed?**

<!-- STEP id="s2" -->
## Two Parts and a Narrow Middle

The answer is to let training find them. Join an encoder and a decoder with a narrow middle, so that fewer numbers can pass through than go in. Both parts are one network, which is a model made of many settings. At first the settings are random, so the picture that comes out looks like nothing.

**Fewer numbers can pass through the middle than go in.**

<!-- STEP id="s3" -->
## Guess, Check, Nudge Again

This is the Gym's training again, now on a small drawn ball. The encoder squeezes the ball, the decoder opens it, and the opened picture is the guess. The check compares the guess with the original, and the meter shows the wrongness.

The nudge then moves the settings in both parts a little, so that the next guess can be closer. Press Next round, or Play, and watch the meter. A real pair needs a huge pile of pictures and many thousands of rounds before the encoder learns what to keep for the decoder.

**No person chooses these hidden numbers. Training finds them.**

<!-- STEP id="s4" -->
## The Real Sizes

Stable Diffusion 1.5 made the pictures in this course. Its middle is a grid of 64 by 64 with 4 numbers in each place, which is 16,384 numbers. That list is a picture's latent code, and it is 48 times smaller than the picture. Unlike your three sliders, these numbers have no names, so no person can say what one number does.

**A latent code is a picture held in 16,384 numbers.**
