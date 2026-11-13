<!-- STEP id="s1" -->
## A Program for the Scorer

Run rate means runs scored per over played, and Ravi scores for his school's 20-over matches. He asks a model for a program to work it out. This reply is an Example, like the ones before.

It has three boxes: `runs`, `played` for the overs played so far, and `full` for all 20 overs. Line 4 works out `rate`, and `/` means divide. Read the five lines first.

**Run rate is runs divided by overs played.**

<!-- STEP id="s2" -->
## Ravi's First Test

Ravi tests it with the end of an innings: 120 runs from 20 overs. He works this out by hand first, and 120 divided by 20 is 6, so he expects 6.0. An answer worked out by hand like this is called the expected answer.

Press Run line to the end, and compare what the program prints with what Ravi expects.

**An expected answer is worked out before the program runs.**

<!-- STEP id="s3" -->
## A Hidden Mistake

The answer matched and the run gave no error, so Ravi is happy. Now read line 4 again. It divides by `full`, but run rate needs `played`.

The mistake did no harm in this test, because at the end of an innings both boxes hold 20. One passing test can hide a bug in exactly this way.

**A test can pass even though the program is wrong.**
