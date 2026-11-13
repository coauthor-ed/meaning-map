<!-- STEP id="s1" -->
## Two Rows

The new row is each token's chance of being picked, worked out from the scores. It is the same idea as the chances in the France Gym. Move the slider, compare the two rows, and check your prediction. A person or an app sets temperature, and no training changed it, so it is a run option and not a learned setting.

**Move the slider, and watch both rows as it moves.**

<!-- STEP id="s2" -->
## High Temperature

The slider changed the second row and left the scores as they were.

Temperature is now 1.6. Press Step through, and compare the text with your last run. Low bars have a bigger chance now, so unusual tokens get picked and the text wanders away from the expected path. We put some silly tokens in these lists, so this Example wanders more than many real models would.

**Temperature changes the chances, never the scores, so a higher temperature helps low-scoring tokens.**

<!-- STEP id="s3" -->
## Temperature 0

At temperature 0 the tallest bar always wins, so no randomness is left. Press Step through, press Start again, then run it once more. Look at how each run ends, because always taking the tallest bar can make text repeat itself.

Tools that write code may keep temperature low, because they want the expected token. Many chat apps keep some randomness, so one question can get two different answers.

**The random pick is one reason why one question can get two different answers.**
