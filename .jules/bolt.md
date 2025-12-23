## 2024-05-23 - [Hydration Mismatch & Re-render Loop]
**Learning:** Time-dependent components (like Clocks) in SSR apps cause hydration mismatches if initialized with `new Date()`. Also, updating state every second for minute-resolution UI is wasteful.
**Action:** Use empty initial state + `useEffect` for client-side time. Update state only when the *formatted string* changes, not on every tick.
