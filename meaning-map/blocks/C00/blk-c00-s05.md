<!-- STEP id="s1" -->
## The First Mark

Press Run line until `top` changes. Lines 1 and 2 fill two boxes, and then the loop takes 78. Line 4 asks whether 78 is more than 0, and the answer is yes, so line 5 stores 78 in `top`.

Starting `top` at 0 makes sure the first mark counts, because every mark here is more than 0.

**`top` holds the highest mark seen so far.**

<!-- STEP id="s2" -->
## The Second Mark

The loop goes back to line 3 and takes the second mark. Press Run line, and before Python answers the `if` line, the scene will ask you what it will do.

Use only the two boxes to decide, because they hold everything Python can see at that moment.

**Python decides from the values in the boxes, and from nothing else.**

<!-- STEP id="s3" -->
## The Third Mark

Many people expect the last mark to win, because 66 is the last mark the loop touches. Step on and look closely. `m` does change, but `m` and `top` are different boxes, and the scene will ask you about line 4 again.

Line 3 only fills `m`. To reach `top`, a mark must get a yes from the `if` line.

**Being last does not put a mark in `top`. Only line 5 can do that.**

<!-- STEP id="s4" -->
## One Line, Run Once

Press Run line to the end. Line 6 has no indent, so it is outside the loop, and it runs once after all three marks are done. That is why the program prints one number and not three.

The computer never knew what a top mark was, because it only followed six lines exactly as written. The idea of a top mark came from the person who wrote them.

**The computer follows the lines. The meaning comes from the writer.**
