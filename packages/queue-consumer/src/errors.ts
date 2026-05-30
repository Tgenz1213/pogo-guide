export class PermanentMessageError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "PermanentMessageError";
  }
}

export class TransientMessageError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "TransientMessageError";
  }
}

export class DuplicateMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateMessageError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class DownstreamContractError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "DownstreamContractError";
  }
}
