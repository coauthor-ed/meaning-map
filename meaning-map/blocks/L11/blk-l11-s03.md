<!-- STEP id="s1" -->
## Match the Target

Test your answer with three sliders: left-right, up-down and size. The left picture is the target, and the right picture is yours. Move the sliders until your ball sits exactly on the target. The meter counts the pixels that still differ, so a taller bar means more wrong.

**Can three numbers match this picture?**

<!-- STEP id="s2" -->
## Why Three Were Enough

Your three numbers are now sent to another computer, and a small program there visits every pixel in turn, row by row. For each pixel it asks one question: is this pixel inside the circle? If it is, the pixel gets the ball colour, and if not, the background colour.

In about a second, 3 numbers become 4,096 pixels, which is 12,288 numbers. Guessing about 12,000 was reasonable, but nearly all of those numbers follow from the three.

**Only three numbers were real choices, and the program works out the rest.**

<!-- STEP id="s3" -->
## Latent Numbers

Look through the 12,288 numbers and you will not find one called "size". Yet size is there, because it decides thousands of pixels. Numbers that you do not see in a picture, but which control it, are called latent numbers, and latent simply means hidden.

**Latent numbers are hidden numbers that control a picture.**

<!-- STEP id="s4" -->
## You Have Used a Decoder

The small program on the other computer has a name. A decoder takes latent numbers and opens them out into the full picture, here from 3 numbers to 12,288. Match the next target, and when you let go of the slider, the decoder draws your numbers again, pixel by pixel. A person wrote this decoder by hand, so it can draw nothing except this ball.

**A decoder opens latent numbers into a full picture.**
