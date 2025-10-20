import { z } from 'zod';

/**
 * Validation result type for consistent error handling
 */
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: z.ZodError;
};

/**
 * Safe validation wrapper that returns a consistent result type
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: formatZodError(result.error),
        details: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  
  return issues.join(', ');
}

/**
 * Extract field-specific errors from Zod validation
 */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  error.issues.forEach(issue => {
    const fieldPath = issue.path.join('.');
    if (fieldPath) {
      fieldErrors[fieldPath] = issue.message;
    }
  });
  
  return fieldErrors;
}

/**
 * Validate and transform data with custom error handling
 */
export function validateAndTransform<T, U>(
  schema: z.ZodSchema<T>,
  data: unknown,
  transform?: (data: T) => U
): ValidationResult<U extends undefined ? T : U> {
  const validation = safeValidate(schema, data);
  
  if (!validation.success) {
    return validation;
  }
  
  try {
    const transformedData = transform ? transform(validation.data) : validation.data;
    return {
      success: true,
      data: transformedData as U extends undefined ? T : U,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transformation error',
    };
  }
}

/**
 * Create a validation middleware for API routes
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      throw new Error(`Validation failed: ${formatZodError(result.error)}`);
    }
    
    return result.data;
  };
}

/**
 * Validate file uploads with magic byte checking
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSize: number): ValidationResult<File> {
  // Check file size
  if (file.size > maxSize) {
    return {
      success: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`,
    };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  return {
    success: true,
    data: file,
  };
}

/**
 * Validate magic bytes for additional security
 */
export async function validateMagicBytes(file: File): Promise<ValidationResult<boolean>> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    
    // Common image magic bytes
    const magicBytes = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
    };
    
    const isValidImage = Object.values(magicBytes).some(signature => 
      signature.every((byte, index) => bytes[index] === byte)
    );
    
    if (!isValidImage) {
      return {
        success: false,
        error: 'File does not appear to be a valid image based on its content',
      };
    }
    
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate file content',
    };
  }
}

/**
 * Batch validation for multiple items
 */
export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): ValidationResult<T[]> {
  const validatedItems: T[] = [];
  const errors: string[] = [];
  
  items.forEach((item, index) => {
    const result = safeValidate(schema, item);
    if (result.success) {
      validatedItems.push(result.data);
    } else {
      errors.push(`Item ${index}: ${result.error}`);
    }
  });
  
  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('; '),
    };
  }
  
  return {
    success: true,
    data: validatedItems,
  };
}