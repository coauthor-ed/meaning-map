<!-- STEP id="s1" -->
## Two First Guesses

At the start of this course you saw a dragon made from twelve words. People usually explain this in one of two ways. Either the machine looks the answer up in a store, or it copies pieces of pictures it has seen. You can now test both ideas against what you have seen.

**Each idea holds some truth, and each one breaks at a clear point.**

<!-- STEP id="s2" -->
## "It Looks It Up"

This idea has a true part, because many apps search the web and paste what they find into the context window. That job belongs to the app. The model's own numbers look nothing up, so its answer is calculated from settings, with no list inside to open. This is why a false line cannot be found and corrected, and only new training on a better pile can change it.

**The app may look things up, but the model calculates its answer from settings.**

<!-- STEP id="s3" -->
## "It Copies Pictures"

This idea is also partly true, because people's pictures shaped every setting in the model, often without anyone asking them. A very common image can even come out as a near copy. Such cases are uncommon, though, and the model keeps no folder and joins no pieces. A run begins from noise, and the picture does not exist until the steps have made it.

**It learned from people's pictures, but it makes a new picture step by step.**

<!-- STEP id="s4" -->
## How the Dragon Was Made

Now you can answer the first question. The twelve words became tokens and then lists of 768 numbers, and the seed gave 16,384 random numbers. At each of 30 steps the model made two noise guesses, pushed along their difference and took away a little noise. The decoder then opened those numbers into 7,86,432 numbers, and those numbers are the picture.

Writing and drawing share one idea: each runs one fixed-size network many times, and each run builds on the last run's output.

**A machine did that with numbers, and billions of small nudges had set them.**
