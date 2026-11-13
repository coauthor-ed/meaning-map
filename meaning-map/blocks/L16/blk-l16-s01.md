<!-- STEP id="s1" -->
## Stage 1: Words Become Numbers

Now follow one prompt, "a green dragon", all the way to a picture. The text is split into tokens. A separate text model then turns each token into a list of 768 numbers, after reading the prompt with attention. So these lists are closer to working copies than to the fixed embeddings you met.

This machine always fills 77 slots, even for a short prompt, while our word map used only 300 numbers for each word.

**Stage 1 turns three words into 59,136 numbers.**

<!-- STEP id="s2" -->
## Stage 2: The Seed Makes the Noise

The seed is one number, and it fixes a long list of random numbers, the starting noise. The work happens on latent codes, so the list holds 64 x 64 x 4 = 16,384 numbers and not a full picture. The words play no part here, which is why two different prompts on one seed started from identical noise.

**Stage 2 makes 16,384 random numbers, and it does not depend on stage 1.**

<!-- STEP id="s3" -->
## Stage 3: The Walk

Here the two meet. At each step the model reads the noisy numbers and the prompt's numbers, and it makes its two noise guesses. It then pushes along the difference and removes a little noise.

Press **Run the walk** and watch the count, since each step needs two guesses. This stage takes most of the time, and the frames are opened only for you to look at.

**The walk changes the 16,384 numbers 30 times, and the list never gets longer.**

<!-- STEP id="s4" -->
## Stage 4: The Decoder

When the walk ends there is a latent code and still no pixels. Here are its real 16,384 numbers, drawn as grey squares for its 4 channels. You can see the dragon's outline, because the latent code keeps the layout of the picture.

The decoder opens it into 512 x 512 x 3 = 7,86,432 numbers, which is 48 times more. The decoder fills in the extra detail from what it learned in training. Press **Open with the decoder**.

**Only the decoder makes pixels, so it comes last.**
