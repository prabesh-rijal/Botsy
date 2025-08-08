
# 📌 Iteration 01 – Bot Menu Options & Chat UI Enhancements

## 🎯 Goal

Enable business users to define and manage optional predefined menu options, add greeting messages, bot avatars, and improve chat controls (restart & clear).

---

## 1. Features in This Iteration

### Menu Options (Optional)

- **Definition:**  
    Each bot can have zero or more menu options.

- **Option Structure:**  
    - `option_name`: Text displayed to the user.
    - `prompt`: Hidden instruction sent to the LLM when the option is clicked.

- **Behavior:**  
    - If no options are defined, only the greeting message is shown.

- **CRUD Operations:**  
    - **Add:** Create new menu options.
    - **Edit:** Modify existing options.
    - **Delete:** Remove options.

- **Update Rules:**  
    - If `menu_options` is omitted in an update, existing options are retained.
    - If `menu_options` is set to `[]`, all options are removed.
    - If `menu_options` is a list, all options are replaced with the new list.

---

### Greeting Message

- Optional text shown at the top of the chat when a new session starts or after restart.
- Appears before menu options (if any).

---

### Bot Avatar

- Each bot can have a custom avatar URL.
- Displayed in greeting and alongside bot responses.

---

### Restart Button

- Icon on the left of the chat input.
- **On click:**  
    - Clears the current session.
    - Re-displays greeting and menu options.

---

### Clear Chat Button

- Icon in the top-right of chat UI.
- **On click:**  
    - Completely wipes conversation history.
    - Optionally reloads greeting and menu.

