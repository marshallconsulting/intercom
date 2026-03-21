# IntercomMessage Schema

## Definition

```typescript
interface IntercomMessage {
  id: string        // Unique message ID: `${timestamp}-${sender-agent-id}`
  from: string      // Sender agent ID
  to: string        // Recipient agent ID
  message: string   // Message content (plain text)
  ts: string        // ISO 8601 timestamp
}
```

## Example

```json
{
  "id": "1773977619162-team-cto",
  "from": "team-cto",
  "to": "team-cmo",
  "message": "Hey CMO — give me a quick update on the pipeline. What are you focused on right now?",
  "ts": "2026-03-20T03:33:39.162Z"
}
```

## File Naming

Message files are named `{id}.json` where `id` is `{unix-timestamp-ms}-{sender-agent-id}`. This ensures:
- Chronological ordering when sorted alphabetically
- No collisions (timestamp + sender is unique)
- Easy identification of sender from filename

## Channel Notification Format

When delivered, the message appears in the recipient's conversation as:

```xml
<channel source="intercom" from="team-cto" to="team-cmo" message_id="1773977619162-team-cto" ts="2026-03-20T03:33:39.162Z">
Hey CMO — give me a quick update on the pipeline. What are you focused on right now?
</channel>
```

## Broadcast Messages

Broadcast messages are sent as individual direct messages to each registered agent. There is no special broadcast message type. The `to` field is set to each recipient individually.
