<!-- STEP id="s1" -->
## Take a Word Away

To learn what one word gives, we can take it away and do the sum again. Tap cave to grey it. Its share then spreads over the words that remain, each growing in proportion to its own share. Watch the bars change, then look at where the gold dot lands and at its closeness to pitch.

**Grey a word and the shares change, so the working copy is worked out again.**

<!-- STEP id="s2" -->
## Even a Small Word Counts

You might expect nothing at all to happen when a small word goes. Tap of and read how far the copy moved, then compare that with the move for cave. The move is small because the share was small. It is still not zero, since every word in the sentence has some part in the mix.

**Taking a word away changes the copy by a large or a small amount, not by nothing.**

<!-- STEP id="s3" -->
## Where Shares Come From

We chose the shares in this lesson by hand, but a real model works out its own shares from its settings. Training uses the same loop as the Gym: the model guesses the next token, checks its wrongness, and nudges its settings. Some of those settings make the shares, so a nudge changes the shares too.

Shares that lead to a better guess give lower wrongness, so training keeps them. Press Run once and follow the loop.

**Training learns the settings that make the shares.**

<!-- STEP id="s4" -->
## Every Word Gets a Copy

So far we built a copy for bat alone. A real model builds a working copy for every word in the sentence, all at the same time. Then it does the whole job again: in round 2, each new copy mixes the copies from round 1, not the embeddings.

Press Next round to watch. Real models repeat this for many rounds, often dozens.

**Every word gets a working copy, and each round mixes the copies from the round before.**

All of this came from training, and training had only the pile. What happens if the pile is wrong?
