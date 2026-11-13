<!-- STEP id="s1" -->
## The Error Becomes Text

Meena could fix this herself, but she wants to see what the model does. Press Send the error, and the message moves from the runner into the context window.

Some apps send it by themselves, and in others people paste it in. Either way it arrives as tokens, the same kind of thing as her question.

**An error reaches the model as more text to read.**

<!-- STEP id="s2" -->
## Reading Everything Again

The model now scores its next tokens with the error in the context window. It reads the whole window, so the words about division by zero can raise the scores of tokens that deal with `count`.

The new reply has one new line, `count = count + 1`, which adds one each time the loop runs. This reply is hand-written too, so it is an Example of a fix.

**New text in the window is what changes the next reply.**

<!-- STEP id="s3" -->
## Running the New Version

Press Run line through this recorded run and watch `count` rise with each mark. The green line is the new one.

At the end, check that the printed answer really is `total` divided by `count`. Dividing in Python gives a decimal number, so expect a .0 at the end of the answer.

**A reply is only a claim until the runner has run it.**

<!-- STEP id="s4" -->
## Four Steps That Repeat

The pattern has four steps: write, run, read the result, then write again. Some coding apps repeat these steps by themselves until a run succeeds or they give up.

This can look as though the app is thinking about the bug. The model is still picking tokens at every step, and the runner is what finds out what happened.

A whole app goes through the same loop, one part at a time, and a later slide in this lesson shows how.

**The runner finds the error. The model only reads about it.**
