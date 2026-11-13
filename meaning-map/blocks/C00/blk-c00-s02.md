<!-- STEP id="s1" -->
## Many Marks in One Box

A class has many marks, and making a new box for each one would be slow. Line 1 uses square brackets to make a list, which is one box holding several values in order, with commas between them.

Press Run line, and the whole list goes into a box named `marks`.

**A list keeps several values together, in order.**

<!-- STEP id="s2" -->
## Doing the Same Thing for Each Mark

Line 2 is a loop. You can read it as "for each mark in the list, call it `m`, then run the lines under this one". Line 3 starts four spaces further in, which is called an indent. The indent tells Python that line 3 belongs to the loop.

Press Run line twice. The lit cell in the list shows which mark the loop is using.

**A loop repeats its indented lines, once for each value in the list.**

<!-- STEP id="s3" -->
## Going Back to the Top

You might expect a computer to read a program straight down, as you read a page. A loop breaks that idea. After line 3, Python does not move on to line 4, because the list still has marks left. It jumps back to line 2 and takes the next one.

Press Run line, and the scene will ask you what `m` holds now.

**The order in which lines run is not always the order on the page.**

<!-- STEP id="s4" -->
## Leaving the Loop

Keep pressing Run line until the run ends. When the list has no marks left, the loop is over, and Python moves to the first line after it that has no indent.

Line 4 prints a word. Words inside quote marks are printed exactly as they are written, so Python does not look for a box with that name. Because line 4 has no indent, it runs only once.

**The indent decides which lines repeat.**
