<!-- STEP id="s1" -->
## Read the Pile

Read the 8 lines of the pile. We drew a dashed edge around the false line so that you can find it. The model gets no such mark, and to it this is one more line of text.

After training you will see three possible answers, each with its chance out of 100. The chances show how the model divides its guess.

**To the model, a false line looks like any other line.**

<!-- STEP id="s2" -->
## Run Training

Press Run training and watch the chances and the meter. This meter is labelled "Differs from the pile", because that is all wrongness can ever measure. When training ends, read the label beside the top answer. It says "matches the pile", and it does not say "right", because nothing in this process checked the answer against the world.

**Wrongness measures distance from the pile, not distance from the truth.**

<!-- STEP id="s3" -->
## Change One Line

In our Toy, whose numbers we set by hand, France reached a chance of 88, so the false answer has a tall, steady bar. Now use the switch to make the line say India. The switch starts the training again by itself. Compare the two runs, and look for any sign that one answer is true.

In a real pile true lines often outnumber a false one, but a false claim repeated often enough can win.

**Training rewards matching the pile, so a false line is learned as smoothly as a true one.**
