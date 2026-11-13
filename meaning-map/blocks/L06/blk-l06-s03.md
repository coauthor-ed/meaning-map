<!-- STEP id="s1" -->
## The Shares

The biggest shares go to cave and flew, with 33 and 24, while of gets only 3. Those two words say what kind of bat this is, and small words fit almost any sentence. We set these shares by hand to show what a trained model tends to do, so this is a Toy.

Our Toy reads both ways, so bat can take a share from cave, which comes after it. Chat models read only backwards: each word takes shares only from the words before it.

**Shares say how much each word gives to this working copy.**

<!-- STEP id="s2" -->
## Mixing the Numbers

To make the copy's first number, take 30% of bat's first number, 24% of flew's and 33% of cave's. Then add small parts of the others, and do the same for all 300 numbers. We did this sum with real GloVe embeddings, so the gold dot is a true result. We chose this flat view because it spreads the two meanings apart.

**A working copy is a mix: each word's numbers times its share, all added together.**

<!-- STEP id="s3" -->
## The Other Sentence

Press Cricket to read Priya's sentence, then compare the bars with the ones you just saw. Under the map you can read two numbers for each word: the first is for bat alone, and the second is for the working copy. Watch which way the gold dot goes, because different words now give the big shares.

**A new sentence means new shares, so it means a new working copy.**

<!-- STEP id="s4" -->
## Two Copies, One Embedding

Both copies are on the map now. The cricket copy's closeness to pitch rose from 0.50 to 0.62, and the cave copy's closeness to bird rose from 0.25 to 0.34. The cave copy is still closer to pitch than to bird, because a mix this simple goes only part of the way. The dot for bat stayed where it was, since each copy lasts for one reading and the table does not change.

**Attention changes a working copy, never the embedding.**
