---
description: Use this skill to remember important facts, lessons, and project-specific quirks. It serves as the living persistent memory bank for the agent.
---
# Persistent Agent Memory

## Purpose
This file acts as a persistent memory bank for this project workspace. It retains learned lessons across isolated agent conversations so the agent does not repeat mistakes.

## Important Rules to Remember
1. **Always apply `e.preventDefault()` inside button HTML Event Listeners** unless specifically required not to, especially when not within a form tag where defaults might be unreliable.
2. **Apple Developer Account Configuration:** App Store Connect integrations usually require waiting for Apple propagation metadata, and often need the Privacy Policy explicitly checked.
3. **Workspace Isolation:** Antigravity agent instances operate within designated workspaces. If you attempt to access paths outside the `/home/guy/` bounds, you will receive workspace directory validation errors. Use `.agents/workflows` *inside* the active workspace to configure new skills.

## Update Ritual
Whenever you learn a new important lesson or identify a recurring error pattern the agent should know about in the future:
1. Edit this `memory.md` file.
2. Add the lesson sequentially to the `Important Rules to Remember` list.
3. Save the file. Because it is placed in `.agents/workflows`, the Antigravity system will automatically index its instructions when relevant context calls arise.
