<!-- STEP id="s1" -->
## No One Typed the Answers

You might think programmers typed every answer into a model, but no team could write answers for every sentence people might send. A model starts instead with a large collection of text, called its practice pile. The moving picture on this page shows a small model at practice, and we call it the Gym. A gym is where you repeat one exercise until you improve, and this model repeats one small game with a pile of 12 sentences.

**A model learns from a pile of text, not from typed answers.**

<!-- STEP id="s2" -->
## Cover the Last Word

Practice begins with a simple game. We take one sentence from the pile and cover its last word, so the model sees only "Amma drank a hot cup of". Its job is to guess the next token, which is the piece of text that comes next. In this Gym every token is one whole word, because that keeps the picture easy to read.

**Each sentence in the pile becomes one question: what comes next?**

<!-- STEP id="s3" -->
## The First Guess

Press Guess to see the top three words. The model gives every word in its list a number called a score, and the highest score is its guess.

You might expect chai on top, but this model has not practised yet. The numbers inside it start as random numbers, so its scores are random too, and chai sits near the bottom of the list. The model never looks in the pile for an answer.

**Before any practice, the guess is just whichever word got the highest random score.**

<!-- STEP id="s4" -->
## Check Against the Pile

Why cover a word that was in the pile all along? Covering turns the sentence into a practice question with a known answer, like hiding the answers in a workbook before you try. A model that could see chai would just copy it and learn nothing about guessing.

Press Check: the cover lifts, and the guess is marked against the hidden word. The pile is only the answer key, and the reward comes later, on new text where nothing is covered.

**Covering a word makes a practice question, and the pile marks the answer.**

The guess was wrong, but knowing that changes nothing until something inside the model changes.
