export class AppError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}
