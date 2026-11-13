<!-- STEP id="s1" -->
## One Giant Step
Here is the same run from the same pure noise, still with no words. Press **One giant step**, which takes away all the guessed noise at once at the very first step.

**Compare what comes out with your prediction.**

<!-- STEP id="s2" -->
## A Soft Blur
One giant step gives a soft blur with a few dark patches, and no clear room. Expecting the same picture faster was a reasonable idea, because the model is the same. It breaks at the first step, because that is where the noise is heaviest and many pictures fit.

**The first guess has the least to work with, because the noise is heaviest.**

<!-- STEP id="s3" -->
## The Safest Single Answer
Why is the first guess a blur? Think of a batter who has scored 10, 30 and 80, and one guess for her next score. Picture training measures a guess in three steps: find each miss, multiply each miss by itself, then add the results.

For a guess of 80 the misses are 70, 50 and 0. Multiplied by themselves they give 4,900, 2,500 and 0, so the total cost is 7,400. Each square in the scene has a miss as its side, so its area is that cost.

**Cost = each miss times itself, all added up.**

<!-- STEP id="s4" -->
## Big Misses Cost the Most
Now try 40. The misses are 30, 10 and 40, which give 900, 100 and 1,600, a total of only 2,600, though she never scored 40.

Multiplying a miss by itself makes a big miss cost far more than a small one, so the best guess stays close to every score. Drag the guess from 0 to 100 and watch the total, which is lowest at 40, the average of 10, 30 and 80. At heavy noise many pictures fit, so the first guess is their average, and that is soft.

**When many pictures fit, the safest single guess is their average.**

<!-- STEP id="s5" -->
## Why Small Steps Work
A small step moves only a little way towards that average, and then the model looks again at numbers with less noise. Fewer pictures fit now, so the next guess is narrower, and each step leaves fewer pictures that fit.

Both strips are open now. Press **Step** and watch the best guess change from a blur into one room.

**Small steps turn an average into one picture.**

<!-- STEP id="s6" -->
## Big Shapes First
Noise hides small things first, because a tiny detail changes only a few numbers. Large areas of light and dark change thousands of numbers together, so they survive much heavier noise.

Walking back therefore works in the opposite order. Press **Stop halfway**, then step on to 30, and look for when the table appears and when the pattern on the rug appears.

**Big shapes settle before details.**
