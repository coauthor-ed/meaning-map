<!-- STEP id="s1" -->
## How Wrong Was It?

To improve, the model needs one number for how bad the whole guess was, and we call that number wrongness. The Gym works it out from the right word alone. Chai's score is 12 out of 100, so 88 of its track is empty, and that empty 88 is the wrongness of this guess. The scores of the wrong words do not enter this number at all.

**Wrongness is one number for the whole guess: 100 minus the right word's score.**

A taller wrongness meter always means more wrong, in every scene of this course.

<!-- STEP id="s2" -->
## The Settings

The scores come from numbers inside the model, called settings, and the technical word is parameters. We draw each setting as a small slider, like the volume slider on a phone. Our Toy has a list of 10 words, and each word has 3 sliders, so it has 30 settings. The highlighted slider is the one in use for this kind of sentence, and the height of its knob is that word's score.

**Scores come from settings, so better scores need different settings.**

<!-- STEP id="s3" -->
## One Small Change

Press Nudge, then compare the right word's row with the row of the top wrong guess. Each highlighted slider moved, a faint line marks where its knob was, and each bar moved with its slider. Wrongness changed with them.

We call this change a nudge. It is small on purpose, because one sentence should not undo what other sentences taught.

**A nudge is one small change to the settings that would have made this guess better.**

<!-- STEP id="s4" -->
## The Next Sentence

One nudge helps only a little, since chai still has a low score. So the model takes the next line from the pile and repeats the same three steps. Press Guess, Check and Nudge for this cricket sentence, and notice which slider is highlighted now, because the kind of sentence decides that.

**Guess, check, nudge is the whole loop.**

<!-- STEP id="s5" -->
## Run It

Press Run to play the loop through every line of the pile twice, with no stops. Each step adds one point to the graph of wrongness, and the graph falls as the right words climb. This whole process is called training, and the pile is known as the training data. Now the model does well on sentences it has practised, which leaves a harder question about the sentences it has not.

**Training is guess, check and nudge, repeated until wrongness falls.**
