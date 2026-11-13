<!-- STEP id="s1" -->
## Tokens Become Numbers

Tokens are still text, and a computer needs numbers, so each token is swapped for a number called its token id. The words The cat sat become four tokens, because cat splits into c and at: The, c, at and sat. Those four tokens become [482, 250, 239, 1184], and from this point on the model never sees letters, only this list.

**A model receives a list of token ids.**

<!-- STEP id="s2" -->
## One Big List

The recipe made our token list once, long before any sentence arrived, and it holds 3,000 tokens numbered 0 to 2999. A sentence brings only a few tokens, and each one is looked up in that big list.

Its id is its number there, the way your roll number is your number in the class register. So The is number 482 out of 3,000. Press Look up and follow each token.

**A token id is the token's number in the big token list, not its place in the sentence.**

<!-- STEP id="s3" -->
## Only a Label

You might expect next-door numbers to hold similar tokens, like books on a library shelf. They do not. Number 464 is ind and number 465 is ok, which have nothing in common, because the order only shows when the recipe made each token. A roll number tells you nothing about a student, and a token id is the same.

**A token id is only a label, and it says nothing about meaning.**

<!-- STEP id="s4" -->
## Hindi Costs More Here

Press each sentence and compare the counts. The Hindi sentence needs far more tokens on our list, because that list was counted from English text and holds no joined Hindi pieces. A list counted from Hindi text needs far fewer. One real tool shows the same gap, and many paid AI tools charge by the token, so a Hindi message can cost more.

**A token list works best on the languages it was counted from.**

<!-- STEP id="s5" -->
## The Real Size

Our list of 3,000 tokens is small. Real tools use far larger lists, about 50,000 to 2,00,000 tokens or more, so more words stay whole, though the recipe is the same.

Now the text is a list of numbers, and each number is only a label. So how could a model learn to do anything useful with them?

**Ours has 3,000 tokens, and real tools have far more.**
