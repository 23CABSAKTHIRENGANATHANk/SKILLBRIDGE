<?php
declare(strict_types=1);

/**
 * SkillBridge Input Validator
 * Centralised, chainable server-side validation for all API endpoints.
 * Returns structured errors compatible with the standard API response format.
 */
class Validator {
    private array $errors = [];
    private array $data = [];

    public function __construct(private array $input) {}

    // -----------------------------------------------------------------------
    // Rule Methods
    // -----------------------------------------------------------------------

    public function required(string $field, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->input[$field] ?? null;
        if ($val === null || $val === '' || (is_string($val) && trim($val) === '')) {
            $this->errors[$field] = "{$label} is required.";
        } else {
            $this->data[$field] = is_string($val) ? trim($val) : $val;
        }
        return $this;
    }

    public function email(string $field, string $label = ''): static {
        $label = $label ?: 'Email';
        $val = trim($this->input[$field] ?? '');
        if (!isset($this->errors[$field]) && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "{$label} must be a valid email address.";
        } else {
            $this->data[$field] = strtolower($val);
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? '');
        if (!isset($this->errors[$field]) && strlen((string)$val) < $min) {
            $this->errors[$field] = "{$label} must be at least {$min} characters.";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? '');
        if (!isset($this->errors[$field]) && strlen((string)$val) > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max} characters.";
        }
        return $this;
    }

    public function in(string $field, array $allowed, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? null);
        if (!isset($this->errors[$field]) && $val !== null && !in_array($val, $allowed, true)) {
            $list = implode(', ', $allowed);
            $this->errors[$field] = "{$label} must be one of: {$list}.";
        } else {
            $this->data[$field] = $val;
        }
        return $this;
    }

    public function integer(string $field, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->input[$field] ?? null;
        if (!isset($this->errors[$field]) && $val !== null) {
            if (!is_numeric($val)) {
                $this->errors[$field] = "{$label} must be a valid integer.";
            } else {
                $this->data[$field] = (int)$val;
            }
        }
        return $this;
    }

    public function min(string $field, int $min, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? null);
        if (!isset($this->errors[$field]) && $val !== null && (int)$val < $min) {
            $this->errors[$field] = "{$label} must be at least {$min}.";
        }
        return $this;
    }

    public function max(string $field, int $max, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? null);
        if (!isset($this->errors[$field]) && $val !== null && (int)$val > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max}.";
        }
        return $this;
    }

    public function url(string $field, string $label = ''): static {
        $label = $label ?: ucwords(str_replace('_', ' ', $field));
        $val = $this->data[$field] ?? ($this->input[$field] ?? null);
        if (!isset($this->errors[$field]) && $val !== null && $val !== '') {
            if (!filter_var($val, FILTER_VALIDATE_URL)) {
                $this->errors[$field] = "{$label} must be a valid URL.";
            }
        }
        return $this;
    }

    public function optional(string $field, mixed $default = null): static {
        $val = $this->input[$field] ?? $default;
        if ($val !== null) {
            $this->data[$field] = is_string($val) ? trim($val) : $val;
        } else {
            $this->data[$field] = $default;
        }
        return $this;
    }

    public function boolean(string $field, string $label = ''): static {
        $val = $this->input[$field] ?? null;
        if ($val !== null) {
            $this->data[$field] = filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }
        return $this;
    }

    // -----------------------------------------------------------------------
    // Result Methods
    // -----------------------------------------------------------------------

    public function passes(): bool {
        return empty($this->errors);
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function validated(): array {
        return $this->data;
    }

    public function get(string $field, mixed $default = null): mixed {
        return $this->data[$field] ?? $this->input[$field] ?? $default;
    }

    /**
     * Fail immediately with structured 422 error response if validation fails.
     */
    public function failOrProceed(): void {
        if ($this->fails()) {
            http_response_code(422);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'success'    => false,
                'error'      => 'Validation failed. Please correct the highlighted fields.',
                'code'       => 'VALIDATION_ERROR',
                'errors'     => $this->errors,
                'timestamp'  => date('c'),
                'request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
}
