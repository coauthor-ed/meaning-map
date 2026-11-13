<!-- STEP id="s1" -->
## Judge It Yourself

Runs 1 and 2 are your prediction: seed 2, with one word changed. Runs 3 and 4 repeat the test from seed 20. Press **Run** on both of them, then decide for each seed whether the pose stayed, which means how the head, body and wings are placed.

**Make your own call for each seed before you read on.**

<!-- STEP id="s2" -->
## What the Four Runs Show

The colour followed the word in both pairs, so the guidance worked as we expected. The pose did not behave the same way in both. With seed 2 the layout stayed fairly close, but with seed 20 the whole body changed. A tidy rule such as "the seed sets the pose and the words set the colour" fits the first pair and breaks on the second.

**One word can change more than the thing it names.**

<!-- STEP id="s3" -->
## Why One Word Reaches So Far

The words enter the noise guess at every step, so a new word changes the guess at step 1. That changes the numbers that step 2 starts from, and so step 2 changes too. These small changes build on each other across all 30 steps. The seed and the words do not act separately, because each step depends on both.

**A changed word can change every step, so no part of the picture is promised to stay.**
