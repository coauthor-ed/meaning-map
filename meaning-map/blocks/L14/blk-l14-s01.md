<!-- STEP id="s1" -->
## Starting from Pure Noise
Take pure noise, with no picture underneath. There is nothing here to recover, so you might expect a model to return only more noise.

A prompt is the text a person types to ask a model for something. This real run had no prompt, only our short standard list of things to avoid, such as "lowres", which means low quality. It has 30 steps, and these numbers are opened with the decoder so that you can look at them.

**Can a model that only guesses noise turn pure noise into a picture?**

<!-- STEP id="s2" -->
## One Small Step
At each step the model looks at the current numbers and makes a noise guess. It takes away only a small part of that guess, because a guess at heavy noise is rough, and the next guess then has more to work with.

This journey from noise to picture is called walking back. Press **Step** and keep going, even though the first few steps seem to change nothing.

**Each step removes a little noise, then the model looks again.**

<!-- STEP id="s3" -->
## The Best Guess
At any step we can ask: if all the guessed noise were taken away now, what would remain? The answer is the best guess, the model's current estimate of the final picture.

It is a view for us, because each step still removes only a small part of the noise. The strip of best guesses stays shut for now, because the next slide asks you to predict one of them.

**The best guess shows where the steps are heading so far.**
