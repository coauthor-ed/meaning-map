<!-- STEP id="s1" -->
## Does It Plan?

When a chatbot answers, the words often appear one after another, as if someone were typing. It can look as if the whole paragraph is ready and is only being shown slowly. Press Step through and watch this sentence grow. Each coloured block is one token.

**A model writes one token at a time, and the next token does not exist until it is made.**

<!-- STEP id="s2" -->
## A Score for Each Token

Before each token, the model gives a score to every token in its list, as the Gym did for its 10 words. We show 20 of those scores here, though real lists are far longer. Unlike the Gym's, these scores have no 0 to 100 scale, because only their sizes against each other matter.

Tap a bar to read one. We wrote these bars by hand, so the tag says Example.

**A tall bar means the token is expected here. It does not mean the token is true.**

<!-- STEP id="s3" -->
## Pick One

The tallest bar may seem certain to win every time, but the pick has real randomness in it. Taller bars are more likely to be picked, so the tallest usually wins and sometimes does not. Press Pick once, and the picked token joins the text.

**Score every token, pick one, add it to the text.**

<!-- STEP id="s4" -->
## Then All Over Again

A real model now reads all the text again, with attention, and scores every token afresh. No finished plan is written anywhere before it starts: each token comes from the text so far. Can a loop this simple write a program or solve a maths problem? Hold that question.

Our Example cannot show the reading, since we wrote one list for each step. Keep pressing Pick until the sentence ends, and notice that the last bars stay on the screen.

**Read, score, pick, add: a paragraph is this loop, repeated.**
