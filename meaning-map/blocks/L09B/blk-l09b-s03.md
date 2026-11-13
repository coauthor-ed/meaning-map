<!-- STEP id="s1" -->
## Working Off

Our toy is told which two numbers to read at each step. Press Run. With working off, it writes the answer at once.

The last digit is right: 7 x 6 = 42 is in the pile. The rest are weak guesses.

**With no working, only the last digit comes from a fact in the pile.**

<!-- STEP id="s2" -->
## Working On

Now switch working on and press Run. It is the same toy and the same sum.

It writes one small fact per token. Each token reads the lines above it. Check your prediction.

**With its working written first, the toy gets every digit right.**

<!-- STEP id="s3" -->
## The Same Work for Every Token

A model does the same fixed amount of work for each token: dozens of rounds, never more. A whole big sum rarely fits into one token's work. Working spreads the sum over many tokens.

**More tokens means more small steps of work.**

<!-- AUTHOR NOTE: ideas 2 and 3 of reports/NEXT-TOKEN-GAP-PLAN.md. The scene's beat 3 shows the two token counts, computed. Never say the working is the thinking. -->
