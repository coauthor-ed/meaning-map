<!-- STEP id="s1" -->
## Run All Three Tests

Choose each test with the buttons at the top, press Run line to the end, and compare the two numbers the scene shows. Each one is a recorded run of the same five lines, and only the numbers in lines 1 and 2 change.

Keep count of how many tests the program passes.

**A test is useful only if it can fail.**

<!-- STEP id="s2" -->
## Why Two Tests Passed

In the 200-run test, `played` and `full` both hold 20, so dividing by the wrong box gives the same result. In the 0-run test, 0 divided by any number is 0, so the wrong box makes no difference.

Only the 15-over test has values that show the mistake. Its wrong answer still looks like a sensible run rate, so reading the number alone would not catch it.

**A good test uses values where the right program and the wrong one disagree.**

<!-- STEP id="s3" -->
## Fixing It

Choose Corrected. Ravi told the model what he expected and what the program printed, and this Example reply changes line 4 to `runs / played`. The green line is the changed one.

Python reported no error at any point. The failed test gave Ravi the fact that an error message would have given him.

**A failed test gives you something to act on, even when the run shows no error.**
