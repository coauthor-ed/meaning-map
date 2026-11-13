<!-- STEP id="s1" -->
## One City, Two Names

The pile shapes embeddings as well as answers, and we can see this with real GloVe numbers. Calcutta and Kolkata are the same city, so you might expect the two names to share one embedding. Their dots almost touch on the map. Choose your answer before you go on: do they have one list of numbers, or two?

**Choose first: one list, or two?**

<!-- STEP id="s2" -->
## Two Separate Lists

They have two lists, because every word has its own embedding in the embedding table. Nothing told the table that these names mean one city. The first 8 numbers are similar but not the same. Their closeness is 0.73, which is high, though it is far from the top value of 1.

**Two names get two embeddings, even for one city.**

<!-- STEP id="s3" -->
## Close Because of the Text

Each name is the other's nearest word, and after that both have the same four words: Delhi, Mumbai, Chennai and India. People have written about both names in nearly the same kinds of sentences. Embeddings record how words were used, so they carry the pile's habits and its mistakes.

**An embedding is a record of the text, not of the world.**

So far the model has guessed one token at a time, and only in short lines. How does one guess become a whole paragraph?
