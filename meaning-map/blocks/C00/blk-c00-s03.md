<!-- STEP id="s1" -->
## Asking a Yes or No Question

To find the top mark, a program must compare two numbers and then choose what to do. Line 3 does this: `if m > top:` asks "is `m` more than `top`?". The sign `>` means "more than", so the answer can only be yes or no.

If the answer is yes, the indented line below runs. If the answer is no, Python skips that line. Press Run line three times to reach the question.

**An `if` line runs its indented lines only when the answer is yes.**

<!-- STEP id="s2" -->
## When the Answer Is Yes

In this run `m` holds 91 and `top` holds 78. Keep pressing Run line and watch the marker as it moves through the last two lines.

Line 4 is `top = m`, which copies the value from one box into the other. Both boxes keep a value afterwards, so `m` is not emptied by the copy.

**`top = m` copies a value from the box on the right to the box on the left.**

<!-- STEP id="s3" -->
## When the Answer Is No

Now choose the run where `m` is 66, using the buttons at the top. Only one number has changed, and every other line is the same as before.

Press Run line to the end, and see which line the marker jumps over. A skipped line does nothing at all, so `top` keeps the value it already had.

**The same lines can take a different path when the values change.**
