# Currency and numerics

**Trigger:** currency, amount, balance, table, transaction, statement

Financial figures use tabular numerals and right alignment so that columns align on the
decimal point. This is a readability requirement from Accessibility, not a preference,
and it is enforced by `OV-05` (table cells) and `OV-16` (currency input).

Row heights in statement tables are fixed (44px header, 40px body) so that a 50-row
statement paginates predictably in print and PDF export. Changing them changes what
customers receive in the post.

If a migration changes how these render, that is a visual regression, not a cosmetic
difference.
