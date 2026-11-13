<!-- STEP id="s1" -->
## The Whole Program

You have now met every kind of line in this program. It starts with `top` at 0, looks at each mark in turn, and uses an `if` line to decide whether to change `top`.

```python
marks = [78, 91, 66]
top = 0
for m in marks:
    if m > top:
        top = m
print(top)
```

**Predict:** What will this program print?
