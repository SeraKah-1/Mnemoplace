# Security Spec

## Data Invariants
- A memory cannot exist without a valid user ID that belongs to the authenticated user.
- The `userId` of a memory MUST match the `{userId}` in the collection path.
- The `userId` of a memory MUST match `request.auth.uid`.
- `content` must be a string <= 10000 characters.
- `category` must be a string <= 100 characters.
- `status` must be 'generating', 'completed', or 'error'.
- `operationName` (if present) must be a string <= 200 characters.
- `createdAt` and `updatedAt` must be accurate server timestamps.

## The Dirty Dozen Payloads
1. **Ghost Field**: Adding `isAdmin: true` to the payload.
2. **Identity Spoofing (Create)**: `userId` set to another user's UID.
3. **Identity Spoofing (Update)**: Attempting to change `userId` during an update.
4. **Invalid Type**: `content` as a number or boolean.
5. **Length Violation**: `content` exceeding 10000 characters.
6. **State Violation**: Setting `status` to an invalid enum string like 'pending'.
7. **Unverified Email**: A user with `email_verified: false` attempting a write.
8. **Missing Required Fields**: Creating without a `category`.
9. **Tampering with Timestamps**: Sending a client-side timestamp instead of `request.time`.
10. **Unauthenticated Access**: Attempting read/write without a valid auth token.
11. **Path mismatch**: Creating a memory where the document data's `userId` doesn't match the path's `{userId}` variable.
12. **Blanket Read Access**: Attempting to list all memories of another user.

## Test Runner
(Will be implemented via testing if needed)
