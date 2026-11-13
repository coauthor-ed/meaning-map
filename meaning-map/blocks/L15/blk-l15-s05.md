<!-- STEP id="s1" -->
## Count the Digits

Words steer the walk, but they do not check the result. We asked for "a photo of an open hand, palm facing the camera, fingers spread". Tap each finger and the thumb on this close view, then press **Check my count**.

**Count them yourself before the scene tells you.**

<!-- STEP id="s2" -->
## Why Hands Can Go Wrong

We made 32 tries and picked this one because the fault is easy to see, so it shows that this can happen, not how often. In the pile, fingers appear in many positions and often hide each other. A likely reason is that the model learned "finger beside finger" better than it learned "five in all". Newer models often do better at this.

**Guidance pushes toward what fits the words, and no step counts the fingers.**

<!-- STEP id="s3" -->
## Mixing Two Prompts

Words reach the noise guess as numbers, so we can change those numbers directly. A text model turns each token of a prompt into a list of numbers, after reading the prompt.

We took two prompts, one for an orange dragon and one for a white horse. Then we made a new set of lists that is half of each. Press **Blend the two prompts**.

**We blended the prompts' numbers, not the two pictures.**

<!-- STEP id="s4" -->
## Numbers No One Typed

The walk ran as usual, with two guesses at every step, but its lists of numbers came from no sentence that anyone typed. We picked this result from 12 tries, so not every blend comes out so clean. You have now met every part: numbers for words, a seed, the steps, guidance and a decoder.

**You have met each part, so how do they fit together from start to finish?**
