<!-- STEP id="s1" -->
## One Word, Two Meanings

Read these two sentences: "Priya hit the ball with her bat" and "The bat flew out of the cave". You know at once that the first bat is made of wood and the second is an animal. The model has one embedding for the word bat, so both sentences begin from the same 300 numbers. Switch sentence and watch the dot.

**The same word starts from the same embedding in every sentence.**

<!-- STEP id="s2" -->
## One List Leans One Way

You might think the model keeps a second list for the animal, but the embedding table has only one embedding for each token. This list leans towards cricket: its closeness to pitch is double its closeness to bird. If the model used these numbers unchanged, a bat in a cave would look like a bat in a stadium.

**One embedding cannot hold the right meaning for every sentence.**

<!-- STEP id="s3" -->
## A Working Copy

So the model leaves the embedding as it is and builds a working copy of bat, which lasts for this one sentence. Every word in Priya's sentence gives a share of its numbers, and bat keeps a share of its own. All the shares add up to 100. Taking from the other words in this way is called attention.

Press Add to build the copy one word at a time, and watch its numbers and its dot change.

**Attention gives a word a working copy, mixed from the words around it.**
