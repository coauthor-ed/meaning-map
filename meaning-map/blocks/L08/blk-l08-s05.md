<!-- STEP id="s1" -->
## Tokens Are Not Letters

Ask "How many r's are in strawberry?" and chatbots have often answered 2. Counting may seem the easy part, but the model works with tokens. Our own token list splits this word into straw and berry, so the letters are not laid out for the model to look at. We wrote the wrong answer shown here, so the tag says Example.

**A model reads tokens, so the letters inside a word are hard for it to count.**

<!-- STEP id="s2" -->
## Try Another Word

Type a word of your own and choose a letter. The tiles come from our own token list, and the letter count is ordinary counting that a computer does for certain. Token lists differ between models, so a real model may split a word in another way. Newer models may work around this by writing out the word one letter at a time first, and we come back to writing it out.

**Letter puzzles are often hard for a model, and newer models may work around them.**

<!-- STEP id="s3" -->
## Let a Computer Count

A model that often miscounts letters may still write a good program, because it has seen a great deal of code. We come back to why that can work. This short program runs on an ordinary computer, which does the counting. So the right answer comes from running the code, not from the model's guess.

**Asking for a program moves the counting from the model to the computer.**

The scores always have a tallest bar, so the model always has a next token to add. What does it write when it has no true fact to use?
