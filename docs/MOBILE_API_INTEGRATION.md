# Mobile API Integration

Mobile and website clients should call only `/api/v1` endpoints and should never call the raw OCS command API.

All responses use:

```ts
type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};
```

Errors use:

```ts
type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

OpenAPI JSON is available at `/api/openapi.json`; the admin documentation UI is at `/admin/api-docs`.
