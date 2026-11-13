<!-- STEP id="s1" -->
## Try It with the Error Hidden

The Hide error switch is on, so nothing from the runner reaches the model. Press Ask again, read what was added to the context window, and compare the second reply with the first.

**With the switch on, the only new text is her short request.**

<!-- STEP id="s2" -->
## Why the Bug Stayed

"Try again" tells the model that something failed, but not what failed. This Example shows the same program, because nothing new in the window points at `count`.

Picking has some randomness, so a real model may write something different. Its own code is still in the window, so the scores may even lead to the missing line. That would not come from the error.

**Without the message, a fix can come only from the code already in the window.**

<!-- STEP id="s3" -->
## Now Send the Error

Turn Hide error off and press Ask again. It is the same model and the same first program, and only one thing differs, which is the message in the window.

Using the switch starts a new try at attempt 1, so the two tries can be compared fairly. Look at the runner as well as the reply.

**The error message is the new fact that makes a fix likely.**
