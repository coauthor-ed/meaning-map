<!-- STEP id="s1" -->
## A Sum with No Calculator

In the last lesson, an app sent 48,276 x 37 to a calculator. Could a model do that sum alone? Our toy tries. It counts a made-up pile of worked sums.

**Our toy guesses each next token by counting its pile.**

<!-- STEP id="s2" -->
## A Sum Nobody Wrote

Tap `4817 x 36 =`. It has no bars, because no line in the pile holds this sum. There are about 8 lakh sums of this size. No pile can hold them all.

**Most big sums are new, so no pile holds their answer.**

<!-- STEP id="s3" -->
## A Step Everyone Writes

Now tap `7 x 6 =`. Its bar is full, because 42 came next every time. The whole sum was new to the pile. The small steps inside it were not.

**The small steps inside a big sum appear again and again.**

<!-- STEP id="s4" -->
## Isn't It Just Autocomplete?

Real models do not count. But the game is the same as your phone keyboard's: guess the next token. For a sum, the next digit depends on carried numbers.

**The game is simple, but playing it well on hard text takes skill.**

<!-- AUTHOR NOTE: idea 1 of reports/NEXT-TOKEN-GAP-PLAN.md (hard blanks reward methods) sits in beat 4. Counts on screen come from the bundled made-up pile, computed live. -->
