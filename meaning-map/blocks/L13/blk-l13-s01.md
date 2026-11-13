<!-- STEP id="s1" -->
## Spoiling Is Easy
To go from random numbers to a picture, first look at the opposite journey. Spoiling a picture takes no skill, because you only change its numbers at random. Could a model be trained to undo that?

A picture is a grid of numbers from 0 to 255. This scene uses a 256 by 256 copy, which has 65,536 pixels, and the patch shows the red numbers of 64 of them. Tap a few squares.

**A picture is only numbers, so changing the numbers changes the picture.**

<!-- STEP id="s2" -->
## Adding Random Numbers
Now give every number in the picture a random number of its own, and add the two together. These random numbers are called noise.

Drag the slider up a little and read the sum beside the patch. The picture number also fades towards the middle value, which keeps the new numbers from growing without limit.

**Noise is random numbers added to a picture's numbers.**

<!-- STEP id="s3" -->
## All the Way Up
Drag the slider to the top, then tap the three rows of the sum to see each set of numbers in the patch.

Real models add noise in this same way, but to the latent code from the last lesson. We use pixels here because you can see them, and the idea is the same.

**Watch what happens to the picture numbers at the top.**

<!-- STEP id="s4" -->
## Nothing Left of the Beach
At the top, every picture number has faded to about 128, so each new number is almost entirely random. The beach may seem to be hidden inside, but no number still depends on it.

Now switch between Beach, Bus and Horse, and look for anything that tells you which picture you are on.

**Check whether any of the three can still be told apart.**

<!-- STEP id="s5" -->
## Every Picture Ends the Same Way
Each picture received its own random numbers, so the three are not identical. They look like the same kind of noise because the picture's numbers have gone from all three.

Going forward is easy, and a computer can do it with no training. The hard question is how far back anyone can come.

**Every picture ends in much the same noise.**
