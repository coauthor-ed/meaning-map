<!-- STEP id="s1" -->
## Asking a Model for a Program

Meena has three marks and wants their average, which means adding them up and dividing by how many there are. She asks a chatbot to write a Python program for this.

The panel called context window holds her request and the model's reply. The reply here is hand-written for this course, which is why the scene is tagged Example.

**A model's reply is text, even when the text is a program.**

<!-- STEP id="s2" -->
## Running the Text

Text does nothing until something runs it. We call that ordinary computer the runner, and it is separate from the model. Read the program first: `total` collects the sum, `count` should hold how many marks there are, and `/` means divide.

The runner plays a recorded run of real Python with these exact lines. Press Run line until it stops, watching `total` and `count` as you go.

**The model writes the program, and the runner runs it.**

<!-- STEP id="s3" -->
## Reading an Error Message

The run stopped, and Python printed an error message instead of an answer. A message like this can look frightening, but you need only the two brighter lines. The line starting `File` says where the problem is, and the last line says what went wrong.

Tap the line of the program that the message names.

**An error message tells you where and what.**

<!-- STEP id="s4" -->
## The Line That Fails and the Line That Is Wrong

The last line says division by zero, because `count` was 0 and no number can be divided by 0. Python stopped at line 6, but line 6 is not the real mistake.

Press Back and watch `count` while the loop runs. No line in the loop ever adds to it, so it stays at 0.

**The line that fails is not always the line that is wrong.**
