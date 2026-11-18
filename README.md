# ML-Trading-Bot-Trainer

The authenticated frontend provides an NSE candlestick chart for manually labeling long and short entry points. Search for an instrument, select a weekday, load the session, and click candles to set their labels. The Entry, Entry Type, and Exit datasets remain separate.

When `DEV_MODE` is enabled, generated sample candles are shown for chart development only; sample labels cannot be saved. Loading a real session enables **Save labels**, which sends the three datasets to `PUT /api/save-labels`. The backend updates the corresponding `Data/{SYMBOL}_Entry.csv`, `Data/{SYMBOL}_Entry_Type.csv`, and `Data/{SYMBOL}_Exit.csv` files, replacing rows for the selected date while retaining other dates.
