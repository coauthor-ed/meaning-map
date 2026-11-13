<!-- STEP id="s1" -->
## Check Each Card

Press Check on each answer, one at a time. For the first three, the scene looks in a source outside the model, and for the program it runs the code on an ordinary computer. We wrote these search results by hand too, as samples of what you would find.

**A check that counts comes from outside the model.**

<!-- STEP id="s2" -->
## Zero Warnings

All four failed. The bridge opened in 1943, not 1902, and the book, the person and the tool do not exist. Yet the model gave no warning on any card, and the reason lies in its writing loop. It scores every token, picks one and adds it, and in pretraining no step in that loop asks whether the sentence is true.

A later lesson shows one kind of extra training that does check, for maths and code.

**A wrong answer comes from the same loop as a right one, so it sounds just as sure.**

<!-- STEP id="s3" -->
## The Shape of a Life

Why would it invent a whole person? A pile holds many short lives written in one shape: a name, two years, a birthplace and a job. After an unknown name, tokens that fit this shape still get high scores, so a smooth life story comes out with no facts behind it. A false detail may also come from a line in the pile, and the reply will not show which.

This confident, made-up answer is called a hallucination, and it is the normal writing loop at work, not a broken part.

**The shape comes from the pile, and the details have no support.**

<!-- STEP id="s4" -->
## Asking Again

One common test is to ask three times, so pick each question here and compare. When three answers match, you have learned little, because the same scores can repeat a true fact or a false one. When answers differ, take that as a warning. Often the pile gave no strong pattern for that question, so several tokens score about the same and random picking changes the details.

**Answers that agree are not proof, and answers that disagree are a warning.**
