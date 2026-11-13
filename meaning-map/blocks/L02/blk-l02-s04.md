<!-- STEP id="s1" -->
## Where the List Comes From

Here is a short text, broken into single letters. The recipe for a token list starts here, with one job: find the pair of neighbouring pieces that comes most often. It knows nothing about meaning, because it only counts.

Which pair do you expect to win? Tap one, and the counts appear.

**The recipe only counts, so it needs no knowledge of meaning.**

<!-- STEP id="s2" -->
## Join the Top Pair

Press Join. Every copy of the winning pair becomes one piece, and that piece is added to the list as a new token.

The recipe then counts again, because a joined piece can pair up too. So a and t become at, and later c and at become cat. Keep pressing and watch the list grow.

**Each join adds one token to the list, and no person picks it.**

<!-- STEP id="s3" -->
## Try Your Own Text

Press Run to the end, then type your own text or switch to code and run it again. The recipe stops when no pair repeats, because there is nothing left to count. Different text gives different tokens. Our real list used this recipe on about 27 lakh characters of text and stopped at 3,000 tokens.

**Different text gives a different token list.**
