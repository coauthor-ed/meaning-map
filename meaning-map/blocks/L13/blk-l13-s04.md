<!-- STEP id="s1" -->
## The Noise Guess
You might expect the model to be asked for the clean picture. Stable Diffusion 1.5, the model behind this course's pictures, is instead asked to estimate the random numbers that were added, and this estimate is called the noise guess.

This real example uses one horse picture and no words. The noise sits in the latent code, which has 16,384 numbers in 4 layers called channels, so you see four grey squares. Press **Take the guess away**.

**The model guesses the noise, not the picture.**

<!-- STEP id="s2" -->
## Free Answers
The Gym needed a right answer to check every guess, and the pile of text supplied it. Here we added the noise ourselves, so the true noise is known, and you can see it beside the guess.

Training then follows the steps of the Gym: guess, check, nudge. One picture can be used many times, with fresh noise at a new level, so no person has to mark anything.

**Training has free answers, because we made the noise.**

<!-- STEP id="s3" -->
## Three Noise Levels
You have just seen level 200, where 1,000 would be pure noise. Now tap the other two levels and look at what is left each time.

The noise is the same in all three, so the level is the only change. Do you expect the noise guess itself to get better or worse as the noise grows?

**Compare what is left at each level before you read on.**

<!-- STEP id="s4" -->
## The Guess Improves, the Picture Does Not
At 800 only a brown blur came back, yet the left meter shows the noise guess missed least, since almost every number is noise. How can a better guess give a worse picture?

What is left is the noisy numbers minus the noise guess. At 800 the picture's part has faded to about a fifth of its size, so what is left is enlarged five times. Any small miss in the guess grows with it, as zooming into a tiny photo enlarges its smudges.

**At heavy noise, a small miss in the guess becomes a large miss in the picture.**

<!-- STEP id="s5" -->
## A Good Guess Is Still a Guess
Light noise leaves one clear answer, so what is left is close to the picture. Heavy noise leaves many possible pictures, and no training can tell the model which one was there.

One noise guess can therefore take away a little noise. A model that starts from pure noise has a harder problem, because there is no picture underneath at all.

**How could guessing lead from pure noise to a picture?**
