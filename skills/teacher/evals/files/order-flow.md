# Teaching fixture: order submission

This is a hypothetical system for a teaching exercise, not a production specification.
The facts below are the complete supplied description; unspecified behavior is unknown.

## Components

- A browser submits an order to `POST /orders` on the Order API.
- The Order API uses Order Store to save a pending order and return its `orderId`.
- The Order API publishes `OrderCreated(orderId)` to a queue and waits for enqueue acknowledgment.
- After enqueue acknowledgment, the Order API returns HTTP 202 with `orderId` to the browser.
- Independently, a worker consumes `OrderCreated` and calls the Mail Service.
- There is no direct browser-to-worker or Order API-to-Mail Service call.

## Ordering and limits

Use `order-42` as the example throughout the lesson.
Saving precedes publishing; enqueue acknowledgment precedes the API's HTTP response.
Worker execution can interleave with sending the HTTP response: the description does not
guarantee whether the email is sent before or after the browser receives that response.
HTTP 202 is not confirmation that the email was sent.

The description makes no guarantee about delivery count, retries, worker completion,
payment, or a transaction spanning Order Store and the queue. Do not invent those guarantees.
