<!-- STEP id="s1" -->
## Two Guesses at Every Step

You might imagine the words as instructions, as if "dragon" told the model to draw a wing here and a tail there. The model makes no such plan.

At each of the 30 steps it looks at the noisy numbers and makes a noise guess twice. One guess uses your words, and the other does not. In our runs that second guess did use a short list of things to avoid, such as "lowres".

**Every step makes two noise guesses: one with the words and one without.**

<!-- STEP id="s2" -->
## What the Words Added

Each guess is a long list of numbers, and the two lists are close, because most of the noise looks the same either way. If you subtract one list from the other, only the change made by your words is left. Take a single number as an example: without words the guess is 10, and with words it is 12, so the words added 2.

**The difference between the two guesses is what the words added.**

<!-- STEP id="s3" -->
## A Push Along the Difference

The obvious plan is to use the guess with words and throw the other away. The model does something stronger. It starts from the guess without words and goes further along the difference, by an amount called the strength. Our runs used a strength of 7.5, so our example becomes 10 + 7.5 x 2 = 25, which is far past 12.

**This is guidance: two guesses, then a push along their difference.**

<!-- STEP id="s4" -->
## How Hard to Push

You choose the strength when you run the model, just as you choose the temperature for a writing model, so training does not set it. At strength 1 the sum gives 12, which is simply the guess with words.

These real pictures share one seed and one prompt, so the strength is the only change. Tap 1, 3 and 15, and compare each with the picture at 7.5.

**Look for the strength where one green dragon appears.**

<!-- STEP id="s5" -->
## Stronger Is Not Simply Better

At strength 1 the guess with words alone gave a grey tangle with little dragon in it, so the obvious plan fails here. Strength 3 gave several dragons, and 7.5 gave one. A stronger push usually follows the words more closely, because they count for more at every step.

This may suggest that higher is always better, but 15 only made this dragon sharper and harder in colour. This is one seed, so it is an example and not a rule.

**So what should happen to a picture if you change only one word?**
