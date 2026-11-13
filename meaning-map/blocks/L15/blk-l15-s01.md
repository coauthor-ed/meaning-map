<!-- STEP id="s1" -->
## One Seed, Two Runs

The last lesson ended with a problem: the model can walk from noise to a picture, but nothing decides what that picture shows. So we ran it twice from seed 2, which means from the same starting noise. One run had no words, and the other had the words "a green dragon".

**Both runs start from exactly the same noise, as step 0 shows.**

<!-- STEP id="s2" -->
## Where They Part

Suppose the words were only added at the very end, like a label on a finished picture. Then the two runs would match for most of the walk and split only near step 30. Press **Run to end** and watch both frames together.

**Look for the first step where you can tell the two runs apart.**

<!-- STEP id="s3" -->
## How the Words Got In

During training, each picture in the pile came with a caption that people had written. The model saw a noisy picture along with its caption, so it learned which noise guess fits those words. Sometimes the caption was left out, so it also learned to guess with no words at all. The twelve pictures here only stand in for that pile, which holds hundreds of millions of pairs.

**One model can make a noise guess with your words or without them.**
