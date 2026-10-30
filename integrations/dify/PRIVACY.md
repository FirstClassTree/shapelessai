# Privacy

This plugin sends requests only to `https://shapelessai.com`, the ShapelessAI API, using the API key you enter.

What it sends:

- Your ShapelessAI API key, in the `Authorization` header.
- For Create post: the account id, the post text, and the time or queue choice you or the agent set.
- For List posts: the status filter and limit.

What it does not send or keep: your Dify account details, prompts, conversation history, or files. The plugin stores nothing itself and logs nothing; the key is held by Dify as a secret credential and never appears in tool output or error messages.

ShapelessAI stores the posts you create and publishes them to the social accounts you connected. How ShapelessAI handles that data is described in its privacy policy: https://shapelessai.com/privacy
