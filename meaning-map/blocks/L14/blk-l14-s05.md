<!-- STEP id="s1" -->
## Different Noise, Different Picture
The steps end on one picture, but which one? That depends on the starting noise, which is random in the same way as the pick in the writing loop. A computer works out random numbers from one starting number, called the seed, so one seed fixes all the starting noise.

The same seed, with the same model and number of steps, should give the same run. Press **New seed** twice to see what a new seed does, with no words in any of these runs.

**The seed decides which picture the steps reach.**

<!-- STEP id="s2" -->
## Nothing Was Hiding
You might think each seed holds a finished picture that the model uncovers. It does not, because pure noise keeps nothing of any picture.

Small chance differences in the noise lead to different first big shapes. Each step then builds on those shapes, so a room, a car or a porch is made during the walk.

**The picture was never inside the noise.**

<!-- STEP id="s3" -->
## The Whole Method
You have now met every part of the method: add noise to pictures, train a model to guess that noise, then walk back from pure noise in small steps. This method is called diffusion, named after the way a drop of ink spreads through water.

So far the model makes a picture, but you have had no say in what it shows. The seed chooses by chance, so you cannot ask it for a cricket match.

**How can words change what the steps reach?**
