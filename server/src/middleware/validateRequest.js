import { AppError } from '../utils/appError.js';

export function validateRequest(schema, property) {
  return (request, _response, next) => {
    const result = schema.safeParse(request[property]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field:
          issue.code === 'unrecognized_keys'
            ? issue.keys.join(', ')
            : issue.path.join('.'),
        message: issue.message,
      }));

      return next(new AppError(400, 'Request validation failed', errors));
    }

    request.validated ??= {};
    request.validated[property] = result.data;
    return next();
  };
}
