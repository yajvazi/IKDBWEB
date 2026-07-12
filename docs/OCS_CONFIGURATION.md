# OCS Configuration

The upstream source of truth inspected for this implementation is `https://github.com/yajvazi/ocs-api`, specifically `doc/v2/API.md`.

Documented live commands wired into the adapter:

- `listSubscriberPrepaidPackages`
- `moveSubscriberRangeToAccount` as a restricted admin-only placeholder surface

The production authentication mechanism is not defined by the public documentation, so the adapter supports configurable strategies:

- `none`
- `basic`
- `bearer`
- `custom-header`

Operations not documented by the public repository are represented as internal interfaces with mock implementations. They must not be marked live until Telco-vision provides command names, parameters, response objects, and idempotency guarantees.

`ENABLE_OCS_SUBSCRIBER_TRANSFER=false` keeps subscriber transfer disabled by default because moving subscribers between resellers can remove prepaid packages.
