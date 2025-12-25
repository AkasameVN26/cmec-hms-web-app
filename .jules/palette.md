## 2024-05-24 - [Login Page Focus & Clearance]
**Learning:** Adding `autoFocus` to the primary input on login pages reduces interaction cost by one click. `allowClear` on inputs (especially email) helps users quickly correct typos without manual deletion, significantly improving mobile UX.
**Action:** Always add `autoFocus` to the first field of "dedicated" pages (like Login/Register) and `allowClear` to text inputs where full replacement is common.

## 2025-12-25 - [Async Modal Feedback & Table Clutter]
**Learning:** Users often double-submit forms in Modals if there is no immediate visual feedback. Simply closing the modal after async completion causes a "jerk" effect. Also, repeating 4+ text buttons in every table row creates massive visual noise.
**Action:** Always bind async actions to `confirmLoading` in Modals. Convert repetitive row actions into Icon Buttons with Tooltips to reduce cognitive load and save horizontal space.
