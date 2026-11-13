<!-- STEP id="s1" -->
## Dog Comes First

Dog is the nearest word to cat, with a closeness of 0.68. Closeness is a number that compares two lists: its top value is 1, and higher means more alike. Kitten was a sensible guess, yet it reaches only 0.43, below all five words here. This lesson will explain why.

**The nearest word is not always the word closest in meaning.**

<!-- STEP id="s2" -->
## Numbers with No Names

Each word here has a list of 300 numbers, and you can see the first 8. They came from GloVe, an older tool, not from a next-token model or our Gym. Our animal scores had names, but no person chose these numbers. A program started from random numbers and changed them by many small nudges.

**Even the people who built this tool cannot say what any one number means.**

<!-- STEP id="s3" -->
## The Word for This List

A list of numbers that training gives to a word is called an embedding, and all the lists together form the embedding table. A model has one embedding for each token, and those numbers are settings. The token id only says which embedding to read. Ours have 300 numbers, and big models use longer ones.

**An embedding is a word's list of numbers, learned by nudges. The token id only finds it.**

<!-- STEP id="s4" -->
## Read Some Neighbours

Choose other words now, or type one from our list, and read the list of nearest words. Try cricket, then another word from the list. GloVe holds 4,00,000 words and we brought 238 into this lesson, so a word we left out could easily push into a top five.

**Nearest here means nearest among our 238 words, not among all 4,00,000.**
