<!-- STEP id="s1" -->
## What Comes Next?

You have read the line `for m in marks:` several times now. Cover the end of it, so that only `for m` is left. You already know the next word must be `in`, because Python's rules allow nothing else in that place.

A model writing text scores every token in its token list, then picks one. A rule like this could make that job much easier.

**In code, the rules often leave very few tokens that fit.**

<!-- STEP id="s2" -->
## Counting a Small Pile

A pile of code lets us test this idea. We wrote 62 lines of Python, and a tool counted which token came after each prompt. Tap `for m` to see its count.

Each bar is one token, and a bar at full height means every line agreed. The lines that were counted are listed beside the bars, so you can check them.

**A rule of the language shows up as one tall bar.**

<!-- STEP id="s3" -->
## Habits as Well as Rules

Now tap `for m in`. Python allows any list name here, so no rule decides this token. The bars still lean one way, because people who write code reuse the same names.

We wrote this pile, so these habits are ours. Real code has its own habits, such as using `i` for a counter or `total` for a sum.

**Habits make the next token easier to guess, though less surely than a rule.**

<!-- STEP id="s4" -->
## Where Code Is Harder

Tap `print(`. What goes inside the brackets depends on what the program is for, so neither a rule nor a habit can settle it. Compare the height of these bars with the ones before.

This gives a useful split. The form of a line is often easy to guess, but what the program should do is harder. Is the Next Token Enough? showed one way a model copes with harder parts: it writes out small steps first.

**Code is easy to predict in its form, and harder in its purpose.**

<!-- STEP id="s5" -->
## Counts Are Not Scores

These bars are only counts from our 62 lines, which is why the scene is tagged as simplified. Real models do not count lines, and they do not keep a table like this one.

A real model has billions of settings, nudged during training on a pile larger than anyone could read. Code repeats the same forms so often that training meets them again and again. Is the Next Token Enough? showed why small guesses like these can add up to a whole answer.

**Our bars count lines. A real model's scores come from its settings.**
