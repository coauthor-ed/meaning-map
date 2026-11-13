<!-- STEP id="s1" -->
## All It Can Read

Everything a model can read at one moment is called its context window. The shaded lines are inside it, and here they hold all five lines of a story. Many real models hold 1,00,000 tokens or more, which is about one long book, so this small window is only a picture of the idea. Look at the bars for the next line: green is tall because line 1 says the scales are green.

**The context window is all the text the model can read right now.**

<!-- STEP id="s2" -->
## Past the Edge

Drag the slider to 4 lines, so that line 1 falls past the edge of the window. This can look like forgetting, but no memory was involved. Scores come from the text inside the window, so for this next token the line plays no part. Look at the bars, which we wrote by hand for both cases.

**Text past the edge plays no part in the next score.**

<!-- STEP id="s3" -->
## A Range of Results

The window stays at 4 lines. Press Write five times and read the colours that come out, because one press would suggest a single result. A pick may even say green by chance, and that would not mean the model recovered the fact. Long chats can reach this edge too, and apps often drop or shorten the oldest text.

**Past the edge, the result depends on patterns and chance, so it can be right or wrong.**
