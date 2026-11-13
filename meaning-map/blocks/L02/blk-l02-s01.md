<!-- STEP id="s1" -->
## Guess the Count

Text has to become numbers, and the first step is to cut it into pieces. Keep the sentence in the box or type your own, and guess how many pieces it will become. Most people say one piece for each word, which seems natural. Press Split it to see.

**Make your guess before you press Split it.**

<!-- STEP id="s2" -->
## Tokens

The pieces are called tokens, and every model cuts text into tokens before it does anything else. You can picture each token as a small chip with some text printed on it.

The sentence we gave you has 6 words but 9 tokens. Cat and mat each split in two, and the full stop is a token too. A dot on a tile marks a space.

**A model reads tokens, and a token is not always a word.**

<!-- STEP id="s3" -->
## Strange Cuts

Press the words above the tiles. The word unbelievable splits into un, believ and able, which looks almost sensible. New Delhi gives New, Del and hi, and that last token has nothing to do with saying hello. So the cuts do not follow meaning, and the next slide asks what they do follow.

**A token is a piece of text, and it need not mean anything.**

<!-- STEP id="s4" -->
## Code Too

Now look at a short program. Code is text, so it gets cut in the same way, and even the four spaces at the start of a line become a token. You can change the code in the box and watch the tiles change. Some words stayed whole and others split, and there must be a reason for that.

**Everything a model reads, even code, is cut into tokens first.**
