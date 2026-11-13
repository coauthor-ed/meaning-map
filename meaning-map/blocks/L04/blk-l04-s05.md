<!-- STEP id="s1" -->
## Another Word's Numbers

Why does cat have dog among its nearest words? Each word has its own list of 300 numbers, the list that training gave it, and nearness is worked out from those lists. This switch hands each word the list that belonged to another word, so no number changes, only which word owns it. Turn it on, then read cat's nearest words and the meter, which is taller when more are wrong.

**Cat is near dog only because of the numbers training gave cat. Hand those numbers to another word, and the neighbours stop making sense.**

<!-- STEP id="s2" -->
## Same Kinds of Sentences

A model uses a word's embedding to guess the next token. After "My cat" and "My dog" the next word is often the same. So a nudge that helps after cat tends to help after dog too. Over a huge pile, those nudges pull the two embeddings together, and GloVe gets a similar result by counting nearby words.

**Words used in the same kinds of sentences get nudged toward similar embeddings.**

<!-- STEP id="s3" -->
## Why Opposites Are Near

You might expect hot and cold to sit far apart. Yet cold is the nearest word to hot, because "This tea is too hot" works with either word. Tap the other words and look for each opposite. Kitten likely has the same cause: cat and dog probably fit more of the same sentences than cat and kitten do.

**Near means "used in similar sentences". It does not mean "the same meaning".**

<!-- STEP id="s4" -->
## What an Embedding Is

Every animal score had a name, because we wrote the questions. An embedding is different: number 1 does not mean size, or anything else with a name. What you can read is how one word's list compares with others.

**The numbers in an embedding have no names. Their meaning shows only when you compare words.**

So closeness tells you something about two words. Could anything else between them carry meaning?
